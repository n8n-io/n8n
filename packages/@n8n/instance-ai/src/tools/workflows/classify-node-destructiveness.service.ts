/**
 * Node Destructiveness Classification
 *
 * Decides, per main-flow node, whether a verification execution may run the
 * node for real (`execute`) or must mock its output via per-execution pin
 * data (`simulate`) because the node would create, update, or delete data in
 * an external system.
 *
 * Hybrid strategy (see `.claude/specs/instance-ai-simulated-verification.md`):
 * 1. Deterministic floor — known-safe transform nodes, unambiguous read/write
 *    operation names, HTTP method semantics, IO-free Code nodes.
 * 2. Batched LLM call for the ambiguous middle (non-GET HTTP Request, Code
 *    with IO, community/unknown node types).
 * 3. Fail-destructive fallback — when classification is unavailable or
 *    low-signal, the node is simulated. Losing verification coverage is
 *    recoverable; running a destructive operation against user data is not.
 */

import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IConnections } from 'n8n-workflow';
import { z } from 'zod';

import { isTriggerNodeType } from './workflow-json-utils';
import { HAIKU_MODEL } from '../../utils/eval-agents';
import { generateValidatedJson } from '../../utils/generate-validated-json';
import type { NodeSimulationVerdict } from '../../workflow-loop/workflow-loop-state';

type WorkflowNode = WorkflowJSON['nodes'][number];

export interface ClassifyNodesForSimulationInput {
	workflow: WorkflowJSON;
	/** Node names whose credentials were mocked — always simulated. */
	mockedNodeNames?: string[];
}

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';

/** Transform/control nodes with no external side effects. */
const SAFE_NODE_TYPES = new Set([
	'n8n-nodes-base.set',
	'n8n-nodes-base.if',
	'n8n-nodes-base.filter',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.merge',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.splitOut',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.aggregate',
	'n8n-nodes-base.summarize',
	'n8n-nodes-base.sort',
	'n8n-nodes-base.limit',
	'n8n-nodes-base.removeDuplicates',
	'n8n-nodes-base.itemLists',
	'n8n-nodes-base.renameKeys',
	'n8n-nodes-base.dateTime',
	'n8n-nodes-base.html',
	'n8n-nodes-base.markdown',
	'n8n-nodes-base.xml',
	'n8n-nodes-base.crypto',
	'n8n-nodes-base.compareDatasets',
	'n8n-nodes-base.extractFromFile',
	'n8n-nodes-base.convertToFile',
	'n8n-nodes-base.editImage',
	'n8n-nodes-base.stopAndError',
	// Responds to the workflow's own caller — part of the trigger contract.
	'n8n-nodes-base.respondToWebhook',
	// AI processing nodes: they call an LLM (read-only towards user systems).
	// Write operations living as agent *tools* are a known gap — see spec.
	'@n8n/n8n-nodes-langchain.agent',
	'@n8n/n8n-nodes-langchain.chainLlm',
	'@n8n/n8n-nodes-langchain.chainSummarization',
	'@n8n/n8n-nodes-langchain.informationExtractor',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.sentimentAnalysis',
]);

/** Node types that are destructive by their very type (no operation param needed). */
const DESTRUCTIVE_NODE_TYPES = new Map<string, string>([
	['n8n-nodes-base.emailSend', 'Sends an email'],
	['n8n-nodes-base.executeCommand', 'Executes a shell command on the host'],
	['n8n-nodes-base.ssh', 'Runs commands on a remote machine'],
	// Simulating the call skips the sub-workflow entirely, side effects included.
	['n8n-nodes-base.executeWorkflow', 'Executes another workflow which may have side effects'],
]);

const CODE_NODE_TYPES = new Set([
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
]);

const FORM_NODE_TYPE = 'n8n-nodes-base.form';
const WAIT_NODE_TYPE = 'n8n-nodes-base.wait';

/**
 * A real wait this short is harmless during verification and — unlike a
 * simulated one — preserves pass-through data for downstream expressions.
 */
const MAX_EXECUTABLE_WAIT_SECONDS = 60;

const WAIT_UNIT_SECONDS: Record<string, number> = {
	seconds: 1,
	minutes: 60,
	hours: 3600,
	days: 86_400,
};

const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';

/** Operation/mode values that unambiguously read. */
const READ_OPERATIONS = new Set([
	'get',
	'getall',
	'getmany',
	'search',
	'list',
	'read',
	'lookup',
	'fetch',
	'download',
	'retrieve',
	'select',
	'query',
	'load',
]);

/** Operation/mode values that unambiguously write. */
const WRITE_OPERATIONS = new Set([
	'create',
	'update',
	'upsert',
	'delete',
	'deleterows',
	'insert',
	'send',
	'sendandwait',
	'post',
	'append',
	'appendorupdate',
	'write',
	'remove',
	'archive',
	'unarchive',
	'move',
	'add',
	'publish',
	'invite',
	'share',
	'complete',
	'cancel',
	'upload',
	'mark',
	'star',
	'assign',
]);

/** Tokens in Code-node source that indicate network/filesystem/process access. */
const CODE_IO_TOKENS = [
	'fetch',
	'axios',
	'http',
	'request',
	'helpers.',
	'child_process',
	'execsync',
	'fs.',
	'net.',
	'dgram',
	'websocket',
];

function getStringParam(node: WorkflowNode, key: string): string | undefined {
	const params = node.parameters;
	if (!isRecord(params)) return undefined;
	const value = params[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Node names reachable over `main` connections (sources and destinations).
 * Sub-nodes (ai_tool, ai_languageModel, …) and disconnected nodes never carry
 * pin data, so the plan excludes them.
 */
function collectMainFlowNodeNames(workflow: WorkflowJSON): Set<string> {
	const connections = (workflow.connections ?? {}) as IConnections;
	const names = new Set<string>();
	for (const [sourceName, outputs] of Object.entries(connections)) {
		const main = outputs.main;
		if (!main) continue;
		names.add(sourceName);
		for (const port of main) {
			for (const target of port ?? []) {
				names.add(target.node);
			}
		}
	}
	return names;
}

function deterministic(
	nodeName: string,
	verdict: 'simulate' | 'execute',
	reason: string,
): NodeSimulationVerdict {
	return { nodeName, verdict, reason, confidence: 'high', source: 'deterministic' };
}

function deterministicVerdict(
	node: WorkflowNode & { name: string },
	mockedNodeNames: Set<string>,
): NodeSimulationVerdict | 'ambiguous' {
	if (mockedNodeNames.has(node.name)) {
		return deterministic(node.name, 'simulate', 'Credentials are not configured for this node');
	}

	if (SAFE_NODE_TYPES.has(node.type)) {
		return deterministic(node.name, 'execute', 'Transforms data without touching external systems');
	}

	const destructiveByType = DESTRUCTIVE_NODE_TYPES.get(node.type);
	if (destructiveByType) {
		return deterministic(node.name, 'simulate', destructiveByType);
	}

	if (node.type === HTTP_REQUEST_NODE_TYPE) {
		const method = (getStringParam(node, 'method') ?? 'GET').toUpperCase();
		if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
			return deterministic(
				node.name,
				'execute',
				`HTTP ${method} request — read-only by HTTP semantics`,
			);
		}
		// POST/PUT/PATCH/DELETE can still be reads (e.g. POST /search) — let the
		// LLM judge URL + body; the fallback is simulate.
		return 'ambiguous';
	}

	// User-action nodes: nothing destructive about them, but executing one
	// parks the run in `waiting` and everything downstream is never verified.
	// Pinning them lets execution flow past (a pinned node never calls
	// putExecutionToWait).
	if (node.type === FORM_NODE_TYPE) {
		return deterministic(
			node.name,
			'simulate',
			'Displays a form page and waits for a user submission',
		);
	}

	if (node.type === WAIT_NODE_TYPE) {
		// Wait node defaults: resume='timeInterval', amount=1, unit='hours'.
		const params = isRecord(node.parameters) ? node.parameters : {};
		const resume = typeof params.resume === 'string' ? params.resume : 'timeInterval';
		if (resume === 'timeInterval') {
			const amount = typeof params.amount === 'number' ? params.amount : 1;
			const unit = typeof params.unit === 'string' ? params.unit : 'hours';
			const seconds = amount * (WAIT_UNIT_SECONDS[unit] ?? 3600);
			if (seconds <= MAX_EXECUTABLE_WAIT_SECONDS) {
				return deterministic(
					node.name,
					'execute',
					`Short wait (${seconds}s) — runs for real to preserve pass-through data`,
				);
			}
		}
		return deterministic(
			node.name,
			'simulate',
			resume === 'timeInterval' || resume === 'specificTime'
				? 'Pauses the workflow for longer than verification can wait'
				: 'Pauses the workflow until a user or external system resumes it',
		);
	}

	if (CODE_NODE_TYPES.has(node.type)) {
		const source = (
			getStringParam(node, 'jsCode') ??
			getStringParam(node, 'pythonCode') ??
			getStringParam(node, 'functionCode') ??
			''
		).toLowerCase();
		const hasIo = CODE_IO_TOKENS.some((token) => source.includes(token));
		if (!hasIo) {
			return deterministic(node.name, 'execute', 'Code without network or filesystem access');
		}
		return 'ambiguous';
	}

	const operation = (getStringParam(node, 'operation') ?? getStringParam(node, 'mode'))
		?.toLowerCase()
		.replace(/[^a-z]/g, '');
	if (operation) {
		if (WRITE_OPERATIONS.has(operation)) {
			return deterministic(
				node.name,
				'simulate',
				`The "${operation}" operation modifies external data`,
			);
		}
		if (READ_OPERATIONS.has(operation)) {
			return deterministic(node.name, 'execute', `The "${operation}" operation only reads data`);
		}
	}

	return 'ambiguous';
}

const FALLBACK_REASON =
	'Could not determine whether this node modifies external data — simulated for safety';

function fallbackVerdict(nodeName: string): NodeSimulationVerdict {
	return {
		nodeName,
		verdict: 'simulate',
		reason: FALLBACK_REASON,
		confidence: 'low',
		source: 'fallback',
	};
}

const LlmVerdictSchema = z.record(
	z.string(),
	z.object({
		verdict: z.enum(['simulate', 'execute']),
		reason: z.string(),
		confidence: z.enum(['high', 'low']).optional(),
	}),
);

const SYSTEM_INSTRUCTIONS = `You classify n8n workflow nodes by whether executing them would CREATE, UPDATE, DELETE, or SEND data in an external system (destructive), or only READ/transform data (safe).

Rules:
- "simulate" = destructive: the node writes, sends, deletes, uploads, or otherwise mutates state outside the workflow. Reads that consume or mutate state (marking items read, consuming queue messages, acknowledging events) count as destructive.
- "execute" = safe: the node only reads or transforms data.
- For HTTP requests, judge the URL, method, and body semantics (e.g. POST to a /search or /query endpoint is a read).
- For code, judge what the code actually does with its network/filesystem access.
- When uncertain, prefer "simulate" with confidence "low". Never guess "execute" when uncertain.
- "reason" must be one short user-facing sentence describing what the node would do (e.g. "Sends a message to a Slack channel").

Output: a single JSON object keyed by node name, each value {"verdict": "simulate"|"execute", "reason": string, "confidence": "high"|"low"}. Return only the JSON object — no prose, no markdown fences.`;

function formatNodeBlock(node: WorkflowNode & { name: string }): string {
	const params = isRecord(node.parameters)
		? JSON.stringify(node.parameters).slice(0, 800)
		: '(none)';
	return [`Node name: ${node.name}`, `Node type: ${node.type}`, `Parameters: ${params}`].join('\n');
}

async function classifyAmbiguousNodes(
	nodes: Array<WorkflowNode & { name: string }>,
): Promise<NodeSimulationVerdict[]> {
	const userText = [
		'Classify the following n8n workflow nodes.',
		'',
		nodes.map(formatNodeBlock).join('\n\n'),
		'',
		`Output a single JSON object with exactly these keys: ${nodes.map((n) => `"${n.name}"`).join(', ')}.`,
	].join('\n');

	const result = await generateValidatedJson('verification-destructiveness-classifier', {
		model: HAIKU_MODEL,
		instructions: SYSTEM_INSTRUCTIONS,
		userText,
		schema: LlmVerdictSchema,
	});
	const parsed = result.ok ? result.data : undefined;

	return nodes.map((node) => {
		const entry = parsed?.[node.name];
		if (!entry) return fallbackVerdict(node.name);
		return {
			nodeName: node.name,
			verdict: entry.verdict,
			reason: entry.reason,
			confidence: entry.confidence ?? 'low',
			source: 'llm',
		};
	});
}

function nodeHasName(node: WorkflowNode): node is WorkflowNode & { name: string } {
	return typeof node.name === 'string' && node.name.length > 0;
}

/**
 * Classify every main-flow, non-trigger node of the workflow. Returns one
 * verdict per node, ordered as the nodes appear in the workflow. Triggers and
 * user-action nodes are out of scope (Mechanism A handles them); sub-nodes
 * and disconnected nodes are excluded because pin data cannot apply to them.
 */
export async function classifyNodesForSimulation(
	input: ClassifyNodesForSimulationInput,
): Promise<NodeSimulationVerdict[]> {
	const mainFlowNames = collectMainFlowNodeNames(input.workflow);
	const mockedNodeNames = new Set(input.mockedNodeNames ?? []);

	const candidates = (input.workflow.nodes ?? []).filter(
		(node): node is WorkflowNode & { name: string } =>
			nodeHasName(node) &&
			node.disabled !== true &&
			node.type !== STICKY_NOTE_TYPE &&
			!isTriggerNodeType(node.type) &&
			mainFlowNames.has(node.name),
	);
	if (candidates.length === 0) return [];

	const verdictByName = new Map<string, NodeSimulationVerdict>();
	const ambiguous: Array<WorkflowNode & { name: string }> = [];
	for (const node of candidates) {
		const verdict = deterministicVerdict(node, mockedNodeNames);
		if (verdict === 'ambiguous') {
			ambiguous.push(node);
		} else {
			verdictByName.set(node.name, verdict);
		}
	}

	if (ambiguous.length > 0) {
		// The LLM path must never abort the whole plan: with the marker channel
		// retired, the plan is the only source of verification pin data, so a
		// throw here would leave every node executing for real. Fail destructive.
		try {
			for (const verdict of await classifyAmbiguousNodes(ambiguous)) {
				verdictByName.set(verdict.nodeName, verdict);
			}
		} catch {
			for (const node of ambiguous) {
				verdictByName.set(node.name, fallbackVerdict(node.name));
			}
		}
	}

	return candidates
		.map((node) => verdictByName.get(node.name))
		.filter((v): v is NodeSimulationVerdict => v !== undefined);
}
