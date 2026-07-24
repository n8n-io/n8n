// ---------------------------------------------------------------------------
// Workflow scenario execution
//
// Runs one execution scenario against a built workflow with LLM-mocked HTTP,
// routes multi-workflow builds to the right entry point, and assembles the
// verification artifact + checklist verification that scores the run.
// ---------------------------------------------------------------------------

import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { type EvalLogger } from './logger';
import { reseedScenarioTables, type ScenarioSeedContext } from './seed-tables';
import { isTransientExecutionAbort, MAX_EXEC_ATTEMPTS } from './transient-error';
import { buildWorkflowContextBlock } from './workflow-context';
import { isMockableTriggerNodeType } from '../../src/tools/workflows/workflow-json-utils';
import { type VerifierAttemptDebug, verifyChecklist } from '../checklist/verifier';
import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import type {
	BuildTrace,
	ChecklistItem,
	ChecklistResult,
	ExecutionScenarioResult,
	ExecutionScenario,
} from '../types';

const EVAL_DATA_DIR = path.join(__dirname, '..', '..', '.data');

function makeArtifactTimestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

function slugifyArtifactSegment(value: string, fallback: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);

	return slug.length > 0 ? slug : fallback;
}

export async function writeScenarioVerificationSnapshot(input: {
	testCaseName: string;
	scenarioName: string;
	workflowId: string;
	passed: boolean;
	result: ChecklistResult | undefined;
	verificationResults: ChecklistResult[];
	verifierAttempts: VerifierAttemptDebug[];
	buildTrace?: BuildTrace;
	logger: EvalLogger;
}): Promise<void> {
	const timestamp = makeArtifactTimestamp();
	const fileName = `${slugifyArtifactSegment(input.testCaseName, 'workflow')}_${slugifyArtifactSegment(input.scenarioName, 'scenario')}_${timestamp}.json`;
	const filePath = path.join(EVAL_DATA_DIR, fileName);

	try {
		await mkdir(EVAL_DATA_DIR, { recursive: true });
		await writeFile(
			filePath,
			JSON.stringify(
				{
					timestamp,
					workflowId: input.workflowId,
					testCaseName: input.testCaseName,
					scenarioName: input.scenarioName,
					passed: input.passed,
					result: input.result ?? null,
					verificationResults: input.verificationResults,
					verifierAttempts: input.verifierAttempts,
					buildTrace: input.buildTrace ?? null,
				},
				null,
				2,
			),
			'utf8',
		);
		input.logger.verbose(`    [${input.scenarioName}] wrote verifier snapshot: ${filePath}`);
	} catch (error) {
		input.logger.warn(
			`    [${input.scenarioName}] failed to write verifier snapshot: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Execute a single scenario against a pre-built workflow and verify the result.
 */
export async function executeScenario(
	client: N8nClient,
	workflowId: string,
	scenario: ExecutionScenario,
	workflowJsons: WorkflowResponse[],
	logger: EvalLogger,
	timeoutMs?: number,
	testCaseName?: string,
	buildTrace?: BuildTrace,
	pinAiRoots?: string[],
	seedContext?: ScenarioSeedContext,
): Promise<ExecutionScenarioResult> {
	return await runScenario(
		client,
		scenario,
		workflowId,
		workflowJsons,
		logger,
		timeoutMs,
		testCaseName,
		buildTrace,
		pinAiRoots,
		seedContext,
	);
}

// ---------------------------------------------------------------------------
// Scenario execution (internal)
// ---------------------------------------------------------------------------

const SCENARIO_MATCH_STOPWORDS = new Set([
	'the',
	'and',
	'for',
	'with',
	'that',
	'this',
	'from',
	'tool',
	'test',
	'node',
	'workflow',
	'when',
	'then',
	'should',
	'returns',
	'return',
]);

function scenarioMatchTokens(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((t) => t.length >= 3 && !SCENARIO_MATCH_STOPWORDS.has(t)),
	);
}

/** Workflow ids referenced by enabled Execute Workflow nodes (database source,
 *  plain string or resource-locator value) — those targets are dependencies of
 *  this workflow, not entry points. */
function executeWorkflowReferences(wf: WorkflowResponse): string[] {
	const ids: string[] = [];
	for (const node of wf.nodes) {
		if (node.disabled || node.type !== 'n8n-nodes-base.executeWorkflow') continue;
		const params = node.parameters ?? {};
		if (typeof params.source === 'string' && params.source !== 'database') continue;
		const raw = isRecord(params.workflowId) ? params.workflowId.value : params.workflowId;
		if (typeof raw === 'string' && raw.trim() !== '' && !raw.startsWith('=')) ids.push(raw.trim());
	}
	return ids;
}

/**
 * Compositional builds split the system across multiple workflows (SKILL.md
 * endorses this), but execution historically always ran `build.workflowId` —
 * scenarios targeting a sibling workflow failed as phantom builder issues
 * while the expectations judge (which sees every workflowJson) passed the
 * same build. Mirror reality instead: a caller hits the specific endpoint, so
 * route the scenario to the workflow whose trigger-bearing content best
 * matches it. Sub-workflows referenced by another candidate's Execute Workflow
 * node are dependencies, not entry points — executing one directly starts it
 * once with an empty payload, so they're demoted whenever an entry point
 * remains. A single-candidate pool routes to that candidate: `workflowId`
 * itself may be a sub-workflow (whichever the agent happened to save first).
 */
export function selectScenarioWorkflowId(
	scenario: ExecutionScenario,
	workflowId: string,
	workflowJsons: WorkflowResponse[],
	logger: EvalLogger,
): string {
	const candidates = workflowJsons.filter(
		(wf) =>
			wf?.id && Array.isArray(wf.nodes) && wf.nodes.some((n) => isMockableTriggerNodeType(n.type)),
	);
	if (candidates.length === 0) return workflowId;

	const referencedIds = new Set(candidates.flatMap(executeWorkflowReferences));
	const entryPoints = candidates.filter((wf) => !referencedIds.has(wf.id));
	const pool = entryPoints.length > 0 ? entryPoints : candidates;
	const fallbackId = pool.some((wf) => wf.id === workflowId) ? workflowId : pool[0].id;
	const scenarioTokens = scenarioMatchTokens(`${scenario.name} ${scenario.dataSetup}`);
	if (pool.length === 1 || scenarioTokens.size === 0) {
		if (fallbackId !== workflowId) {
			logger.info(
				`    [${scenario.name}] multi-workflow build: routing to entry point ${fallbackId}`,
			);
		}
		return fallbackId;
	}

	let bestId = fallbackId;
	let bestScore = -1;
	let tied = false;
	for (const wf of pool) {
		const haystackParts: string[] = [wf.name ?? ''];
		for (const node of wf.nodes) {
			haystackParts.push(String(node.name ?? ''));
			try {
				haystackParts.push(JSON.stringify(node.parameters ?? {}).slice(0, 500));
			} catch {
				// skip unserializable parameters
			}
		}
		const haystackTokens = scenarioMatchTokens(haystackParts.join(' '));
		let score = 0;
		for (const token of scenarioTokens) if (haystackTokens.has(token)) score++;
		if (score > bestScore) {
			bestScore = score;
			bestId = wf.id;
			tied = false;
		} else if (score === bestScore) {
			tied = true;
		}
	}

	if (tied || bestScore <= 0) bestId = fallbackId;
	if (bestId !== workflowId) {
		logger.info(
			`    [${scenario.name}] multi-workflow build: routing to workflow ${bestId} (score ${String(bestScore)})`,
		);
	}
	return bestId;
}

async function runScenario(
	client: N8nClient,
	scenario: ExecutionScenario,
	workflowId: string,
	workflowJsons: WorkflowResponse[],
	logger: EvalLogger,
	timeoutMs?: number,
	testCaseName?: string,
	buildTrace?: BuildTrace,
	pinAiRoots?: string[],
	seedContext?: ScenarioSeedContext,
): Promise<ExecutionScenarioResult> {
	const pinNodes = pinAiRoots && pinAiRoots.length > 0 ? pinAiRoots : undefined;
	const targetWorkflowId = selectScenarioWorkflowId(scenario, workflowId, workflowJsons, logger);

	// Reset + seed this scenario's declared rows into the tables the build bound,
	// just before it runs — clears any prior scenario's (or build-time) rows so
	// each scenario runs against exactly the state it declared (TRUST-311). Runs
	// serially per case (see scenariosRequireSerialSeeding) to avoid racing on the
	// shared table.
	if (seedContext) {
		await reseedScenarioTables(
			client,
			scenario,
			seedContext.threadId,
			seedContext.tableIdsByName,
			logger,
		);
	}

	const execStart = Date.now();
	let evalResult = await client.executeWithLlmMock(
		targetWorkflowId,
		scenario.dataSetup,
		timeoutMs,
		pinNodes,
	);
	// DB write races abort the execution before any node runs and are reported
	// in-band (success:false), bypassing the throw-based transient retry —
	// retry them here so they don't pollute builder reliability stats.
	for (
		let attempt = 1;
		!evalResult.success &&
		isTransientExecutionAbort(evalResult.errors) &&
		attempt < MAX_EXEC_ATTEMPTS;
		attempt++
	) {
		logger.warn(
			`    [${scenario.name}] execution aborted by transient DB error (attempt ${String(attempt)}/${String(MAX_EXEC_ATTEMPTS)}: ${evalResult.errors.join('; ')}); retrying`,
		);
		await delay(500 * attempt);
		evalResult = await client.executeWithLlmMock(
			targetWorkflowId,
			scenario.dataSetup,
			timeoutMs,
			pinNodes,
		);
	}
	const execMs = Date.now() - execStart;

	const pinTag = pinNodes ? ` pinned=${pinNodes.join(',')}` : '';
	logger.info(
		`    [${scenario.name}] exec=${String(Math.round(execMs / 1000))}s (${Object.keys(evalResult.nodeResults).length} nodes)${pinTag}`,
	);

	const verifyStart = Date.now();
	const artifact = buildVerificationArtifact(scenario, evalResult, workflowJsons, targetWorkflowId);
	const savedChars = artifact.truncationSavedChars ?? 0;
	if (savedChars > 0) {
		logger.info(
			`    [${scenario.name}] scenario context capped: saved ${String(savedChars)} chars (~${String(Math.round(savedChars / 4))} tokens)`,
		);
	}

	const scenarioChecklist: ChecklistItem[] = [
		{
			id: 1,
			description: scenario.successCriteria,
			category: 'execution',
			strategy: 'llm',
		},
	];

	const verification = await verifyChecklist(scenarioChecklist, artifact);
	const verificationResults = verification.results;

	const verifyMs = Date.now() - verifyStart;
	const passed = verificationResults.length > 0 && verificationResults[0].pass;
	const result = verificationResults[0];
	await writeScenarioVerificationSnapshot({
		testCaseName: testCaseName ?? `workflow-${workflowId}`,
		scenarioName: scenario.name,
		workflowId: targetWorkflowId,
		passed,
		result,
		verificationResults,
		verifierAttempts: verification.attempts,
		buildTrace,
		logger,
	});
	// Empty verification = the verifier itself failed after all attempts. The run
	// is excluded from scoring (mirrors incomplete build expectations) but stays
	// visible in console/report/artifact under `verification_failure`.
	const incomplete = verificationResults.length === 0;
	const attemptErrors = verification.attempts
		.map((a) => a.error)
		.filter((e): e is string => e !== null);
	const reasoning =
		result?.reasoning ??
		`No verification result — verifier exhausted all attempts${attemptErrors.length > 0 ? ` (${attemptErrors.join('; ')})` : ''}`;
	const failureCategory = result?.failureCategory ?? (result ? undefined : 'verification_failure');
	const rootCause = result?.rootCause;

	const categoryLabel = failureCategory ? ` [${failureCategory}]` : '';
	const statusLabel = incomplete ? 'INCOMPLETE (excluded from scoring)' : passed ? 'PASS' : 'FAIL';
	logger.info(
		`    [${scenario.name}] ${statusLabel}${categoryLabel} verify=${String(Math.round(verifyMs / 1000))}s`,
	);
	if (!passed) {
		logger.info(`    [${scenario.name}] ${reasoning}`);
	}

	return {
		scenario,
		success: passed,
		evalResult,
		workflowId: targetWorkflowId,
		score: passed ? 1 : 0,
		reasoning,
		failureCategory,
		rootCause,
		...(incomplete ? { incomplete: true } : {}),
	};
}

// ---------------------------------------------------------------------------
// Verification artifact builder
// ---------------------------------------------------------------------------

export interface VerificationArtifact {
	/** Workflow structure + connections + node configs. Stable across scenarios of the same build (cacheable). */
	workflowContext: string;
	/** Scenario + execution trace + errors. Fresh per scenario. */
	scenarioContext: string;
	/** Chars dropped from oversized JSON blocks / request lists (head/tail truncation). */
	truncationSavedChars?: number;
}

/** Per-JSON-block char cap in the scenario context (~1.5k tokens). */
const SCENARIO_JSON_BLOCK_CAP = 6_000;
/** Max intercepted requests rendered per node — first/last half beyond this. */
const MAX_RENDERED_REQUESTS_PER_NODE = 12;

/** Head/tail-truncate an oversized JSON block, keeping shape + boundaries. */
function capJsonBlock(json: string, saved: { chars: number }): string {
	if (json.length <= SCENARIO_JSON_BLOCK_CAP) return json;
	const half = Math.floor(SCENARIO_JSON_BLOCK_CAP / 2);
	const omitted = json.length - 2 * half;
	saved.chars += omitted;
	return `${json.slice(0, half)}\n… [${String(omitted)} chars truncated] …\n${json.slice(json.length - half)}`;
}

/** Keep the first/last half of an oversized list, dropping the middle. */
function elideMiddle<T>(items: T[], max: number): { head: T[]; tail: T[]; omitted: T[] } {
	if (items.length <= max) return { head: items, tail: [], omitted: [] };
	const half = Math.floor(max / 2);
	return {
		head: items.slice(0, half),
		tail: items.slice(items.length - half),
		omitted: items.slice(half, items.length - half),
	};
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNodeOutputs(value: unknown): value is Record<string, unknown[][]> {
	if (!isObjectRecord(value)) return false;
	return Object.values(value).every(
		(branches) => Array.isArray(branches) && branches.every((branch) => Array.isArray(branch)),
	);
}

function getNodeOutputs(value: unknown): Record<string, unknown[][]> {
	return isNodeOutputs(value) ? value : {};
}

function getNumber(value: unknown, fallback = 0): number {
	return typeof value === 'number' ? value : fallback;
}

function getOptionalBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

/** For a given node + connection type, return downstream node names per output port. */
function getDownstreamsByBranch(
	nodeName: string,
	connectionType: string,
	connections: Record<string, unknown> | undefined,
): string[][] {
	if (!connections) return [];
	const nodeConns = connections[nodeName];
	if (!isObjectRecord(nodeConns)) return [];
	const typeConns = nodeConns[connectionType];
	if (!Array.isArray(typeConns)) return [];
	return typeConns.map((branch) => {
		if (!Array.isArray(branch)) return [];
		const targets: string[] = [];
		for (const c of branch) {
			if (isObjectRecord(c) && typeof c.node === 'string') targets.push(c.node);
		}
		return targets;
	});
}

/** Render per-node outputs grouped by connection type + branch, with downstream labels. */
function renderNodeOutputs(
	nodeName: string,
	outputs: Record<string, unknown[][]>,
	outputCount: number,
	truncated: boolean | undefined,
	connections: Record<string, unknown> | undefined,
	saved: { chars: number },
): string[] {
	const lines: string[] = [];
	const connTypes = Object.keys(outputs);
	// "Output: none" only when no branches exist on any port — distinct from "branches exist but all empty".
	// An `outputs.main = [[]]` (one connected branch, zero items) falls through and renders as `Output [main]: 0 items`.
	if (connTypes.length === 0 || connTypes.every((k) => outputs[k].length === 0)) {
		lines.push('**Output:** none');
		return lines;
	}
	for (const connType of connTypes) {
		const branches = outputs[connType];
		if (branches.length === 0) continue;
		const downstreams = getDownstreamsByBranch(nodeName, connType, connections);
		const isMultiBranch = branches.length > 1 || connType !== 'main';
		if (!isMultiBranch) {
			lines.push(`**Output [${connType}]:** ${String(branches[0].length)} items`);
			lines.push('```json', capJsonBlock(JSON.stringify(branches[0], null, 2), saved), '```');
			continue;
		}
		for (let i = 0; i < branches.length; i++) {
			const branch = branches[i];
			const targets = downstreams[i] ?? [];
			const targetLabel =
				targets.length > 0 ? `→ ${targets.join(', ')}` : '→ (no downstream connection)';
			lines.push(
				`**Output [${connType} branch ${String(i)}] ${targetLabel}:** ${String(branch.length)} items`,
			);
			if (branch.length > 0) {
				lines.push('```json', capJsonBlock(JSON.stringify(branch, null, 2), saved), '```');
			}
		}
	}
	if (truncated) {
		lines.push(
			`_(items truncated for size; full count across all branches: ${String(outputCount)})_`,
		);
	}
	return lines;
}

/** Render the per-scenario context: scenario, pre-analysis, execution summary, errors, per-node trace. */
function buildScenarioContextBlock(
	scenario: ExecutionScenario,
	evalResult: InstanceAiEvalExecutionResult,
	wf: WorkflowResponse | undefined,
	saved: { chars: number },
): string {
	const sections: string[] = [];

	sections.push(
		'## Scenario',
		'',
		`**Name:** ${scenario.name} — ${scenario.description}`,
		`**Data setup:** ${scenario.dataSetup}`,
		'',
	);

	// Pre-analysis: programmatic flags
	const preAnalysis: string[] = [];
	if (evalResult.hints.warnings.length > 0) {
		for (const warning of evalResult.hints.warnings) {
			preAnalysis.push(`⚠ FRAMEWORK ISSUE: ${warning}`);
		}
	}
	if (Object.keys(evalResult.hints.triggerContent).length === 0) {
		preAnalysis.push(
			'⚠ FRAMEWORK ISSUE: Trigger content is empty — the start node received no input data. All downstream failures are likely caused by this, not by the workflow builder.',
		);
	}
	for (const [nodeName, nr] of Object.entries(evalResult.nodeResults)) {
		if (nr.configIssues && Object.keys(nr.configIssues).length > 0) {
			preAnalysis.push(
				`⚠ BUILDER ISSUE: "${nodeName}" has missing config: ${Object.values(nr.configIssues).flat().join('; ')}`,
			);
		}
		for (const req of nr.interceptedRequests) {
			if (
				typeof req.mockResponse === 'object' &&
				req.mockResponse !== null &&
				'_evalMockError' in (req.mockResponse as Record<string, unknown>)
			) {
				const msg = (req.mockResponse as Record<string, unknown>).message;
				const msgStr = typeof msg === 'string' ? msg : 'unknown';
				preAnalysis.push(
					`⚠ MOCK ISSUE: "${nodeName}" ${req.method} ${req.url} → mock generation failed: ${msgStr}`,
				);
			}
		}
	}
	if (preAnalysis.length > 0) {
		sections.push('## Pre-analysis (automated flags)', '', ...preAnalysis, '');
	}

	// Execution summary
	const mockedNodes: string[] = [];
	const pinnedNodes: string[] = [];
	const realNodes: string[] = [];
	const ranNodes = new Set<string>();
	for (const [nodeName, nr] of Object.entries(evalResult.nodeResults)) {
		if (nr.executionMode === 'mocked') mockedNodes.push(nodeName);
		else if (nr.executionMode === 'pinned') pinnedNodes.push(nodeName);
		else realNodes.push(nodeName);
		// Pinned nodes (trigger / bypass) get their data from pin data and never appear in runData,
		// so `iterationCount` stays 0 — count them as "ran" anyway to keep them out of `didNotRun`.
		if (nr.iterationCount > 0 || nr.executionMode !== 'real') ranNodes.add(nodeName);
	}
	const didNotRun: string[] =
		wf?.nodes
			.map((n) => n.name)
			.filter((name): name is string => typeof name === 'string' && !ranNodes.has(name)) ?? [];
	sections.push(
		'## Execution summary',
		'',
		`**Status:** ${evalResult.success ? 'success' : 'failed'}`,
		`**Mocked nodes** (HTTP intercepted): ${mockedNodes.join(', ') || 'none'}`,
		`**Pinned nodes** (synthetic input): ${pinnedNodes.join(', ') || 'none'}`,
		`**Real nodes** (executed with actual logic): ${realNodes.join(', ') || 'none'}`,
		`**Did not run** (no execution data): ${didNotRun.join(', ') || 'none'}`,
		'',
	);

	if (evalResult.errors.length > 0) {
		sections.push('## Errors', '', ...evalResult.errors.map((e) => `- ${e}`), '');
	}

	// Per-node execution trace, sorted by start time
	sections.push('## Execution trace', '');
	const sortedNodeResults = Object.entries(evalResult.nodeResults).sort(
		([, a], [, b]) => (a.startTime ?? 0) - (b.startTime ?? 0),
	);
	for (const [nodeName, nr] of sortedNodeResults) {
		const iterTag = nr.iterationCount > 1 ? ` · ran ${String(nr.iterationCount)}×` : '';
		const errTag =
			nr.firstErrorIteration !== undefined
				? ` · first error at iter ${String(nr.firstErrorIteration)}`
				: '';
		sections.push(`### ${nodeName} [${nr.executionMode}${iterTag}${errTag}]`);

		if (nr.configIssues && Object.keys(nr.configIssues).length > 0) {
			sections.push(`**Config issues:** ${Object.values(nr.configIssues).flat().join('; ')}`);
		}

		const renderRequest = (req: (typeof nr.interceptedRequests)[number]): void => {
			sections.push(`**Request:** ${req.method} ${req.url}`);
			if (req.requestBody) {
				sections.push(
					'```json',
					capJsonBlock(JSON.stringify(req.requestBody, null, 2), saved),
					'```',
				);
			}
			if (req.mockResponse !== undefined) {
				sections.push('**Mock response:**');
				sections.push(
					'```json',
					capJsonBlock(JSON.stringify(req.mockResponse, null, 2), saved),
					'```',
				);
			}
		};
		const reqs = elideMiddle(nr.interceptedRequests, MAX_RENDERED_REQUESTS_PER_NODE);
		for (const req of reqs.head) renderRequest(req);
		if (reqs.omitted.length > 0) {
			saved.chars += reqs.omitted.reduce((n, r) => n + JSON.stringify(r).length, 0);
			sections.push(`_… ${String(reqs.omitted.length)} further requests omitted for size …_`);
		}
		for (const req of reqs.tail) renderRequest(req);

		const nodeOutputs = getNodeOutputs(nr.outputs);
		const outputCount = getNumber(nr.outputCount);
		const truncated = getOptionalBoolean(nr.truncated);
		sections.push(
			...renderNodeOutputs(nodeName, nodeOutputs, outputCount, truncated, wf?.connections, saved),
		);

		sections.push('');
	}

	return sections.join('\n');
}

/** Build a verification artifact split into a cacheable workflow block + a fresh scenario block. */
export function buildVerificationArtifact(
	scenario: ExecutionScenario,
	evalResult: InstanceAiEvalExecutionResult,
	workflowJsons: WorkflowResponse[],
	workflowId?: string,
): VerificationArtifact {
	const wf = workflowJsons.find((w) => w.id === workflowId) ?? workflowJsons[0];
	const saved = { chars: 0 };
	return {
		workflowContext: buildWorkflowContextBlock(wf),
		scenarioContext: buildScenarioContextBlock(scenario, evalResult, wf, saved),
		truncationSavedChars: saved.chars,
	};
}
