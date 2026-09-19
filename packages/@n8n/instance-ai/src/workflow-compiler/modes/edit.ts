import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { NodeRegistry } from '../catalog/node-registry';
import type { NodeOperation } from '../catalog/types';
import { bindParameters } from '../compiler/compile';
import type { DecisionLogEntry, DecisionService } from '../decision/decision-service';
import { resolveChoice } from '../decision/policy';
import { withNoneOfThese, type DecisionQuestions } from '../decision/schemas';
import { compileParameterTree } from '../expressions/expression';
import { extractRequirements } from '../requirements/extract';
import type { RequirementIssue } from '../requirements/types';
import { DECISION_SCHEMA_VERSION } from '../versions';
import { incomingEdges, outgoingEdges, type WorkflowPatch } from './patch';
import { planActions } from './plan-actions';

type NodeJSON = WorkflowJSON['nodes'][number];

export type EditKind = 'add_step' | 'remove_step' | 'update_parameter' | 'rename_workflow';

export interface EditPlanInput {
	request: string;
	workflow: WorkflowJSON;
	registry: NodeRegistry;
	decisions: DecisionService;
	answers?: Record<string, unknown>;
	abortSignal?: AbortSignal;
}

export type EditPlanResult =
	| { status: 'needs_clarification'; issues: RequirementIssue[]; log: DecisionLogEntry[] }
	| {
			status: 'planned';
			patches: WorkflowPatch[];
			summary: string;
			log: DecisionLogEntry[];
			waves: number;
	  };

/** "after Insert Row," / "before the Respond step" — names the node a new step attaches to. */
const ANCHOR_CLAUSE =
	/\b(?:right\s+)?(after|before)\s+(?:the\s+)?([^,]+?)(?:\s+(?:step|node))?(?:,|\s+(?=(?:add|insert|put|place)\b)|$)/i;

const KIND_CUES: Array<{ kind: EditKind; pattern: RegExp }> = [
	{ kind: 'rename_workflow', pattern: /\brename (the )?workflow\b|\bcall (the )?workflow\b/i },
	{ kind: 'remove_step', pattern: /\b(remove|delete|drop|get rid of)\b/i },
	{
		kind: 'update_parameter',
		pattern:
			/\b(change|update|set|switch|use|point|replace)\b.*\b(channel|table|url|path|method|cron|schedule|text|message|email|to|from)\b/i,
	},
	{ kind: 'add_step', pattern: /\b(add|insert|also|after|before|then|and)\b/i },
];

function detectKind(text: string): EditKind | undefined {
	return KIND_CUES.find(({ pattern }) => pattern.test(text))?.kind;
}

function operationForNode(registry: NodeRegistry, node: NodeJSON): NodeOperation | undefined {
	const params = node.parameters ?? {};
	return registry
		.list()
		.filter((operation) => operation.nodeType === node.type)
		.find((operation) =>
			Object.entries(operation.baseParameters).every(
				([key, value]) => typeof value !== 'string' || params[key] === value,
			),
		);
}

function mentionedNodes(text: string, nodes: readonly NodeJSON[]): NodeJSON[] {
	const lower = text.toLowerCase();
	return nodes.filter((node) => {
		const name = node.name?.toLowerCase() ?? '';
		const typeWord = node.type.split('.').pop()?.toLowerCase() ?? '';
		return (name && lower.includes(name)) || (typeWord.length > 3 && lower.includes(typeWord));
	});
}

function extractedValues(text: string): Record<string, unknown> {
	const values: Record<string, unknown> = {};
	const channel = text.match(/#[a-z0-9_-]+/i)?.[0];
	if (channel) values.channel = channel;
	const url = text.match(/https?:\/\/\S+/i)?.[0];
	if (url) values.url = url.replace(/[.,)]$/, '');
	const table = text.match(/\btable\s+["'`]?([a-z_][a-z0-9_]*)/i)?.[1];
	if (table) values.table = table;
	const path = text.match(/\bpath\s+["'`]?(\/?[a-z0-9_\-/]+)/i)?.[1];
	if (path) values.path = path.replace(/^\//, '');
	const method = text.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/)?.[1];
	if (method) values.method = method;
	const quoted = text.match(/["“]([^"”]+)["”]/)?.[1];
	if (quoted) values.text = quoted;
	return values;
}

/**
 * Edit mode: classify the change, locate the affected node with a bounded
 * decision when the text is ambiguous, and produce a minimal patch set. The
 * rest of the workflow is never regenerated.
 */
export async function planEdit(input: EditPlanInput): Promise<EditPlanResult> {
	const log: DecisionLogEntry[] = [];
	const nodes = input.workflow.nodes.filter(
		(node) => node.name && node.type !== 'n8n-nodes-base.stickyNote',
	);
	const kind = detectKind(input.request);
	if (!kind) {
		return {
			status: 'needs_clarification',
			log,
			issues: [
				{
					field: 'edit.kind',
					reason: 'The requested change is not recognized.',
					question:
						'Should I add a step, remove a step, change a node setting, or rename the workflow?',
				},
			],
		};
	}

	if (kind === 'rename_workflow') {
		const name = input.request.match(/\b(?:to|called|named)\s+["“]?([^"”]+?)["”]?\s*$/i)?.[1];
		if (!name)
			return {
				status: 'needs_clarification',
				log,
				issues: [
					{
						field: 'edit.name',
						reason: 'No new name given.',
						question: 'What should the workflow be called?',
					},
				],
			};
		return {
			status: 'planned',
			patches: [{ op: 'rename_workflow', name }],
			summary: `Renamed workflow to "${name}".`,
			log,
			waves: 0,
		};
	}

	let waves = 0;
	const target = await resolveTargetNode(input, nodes, kind, log);
	if (target.kind === 'ask') return { status: 'needs_clarification', log, issues: [target.issue] };
	if (target.kind === 'decided') waves += 1;
	const targetNode = target.node;

	if (kind === 'remove_step') {
		if (!targetNode)
			return {
				status: 'needs_clarification',
				log,
				issues: [
					{
						field: 'edit.target',
						reason: 'No node named.',
						question: `Which step should be removed? Nodes: ${nodes.map((node) => node.name).join(', ')}.`,
					},
				],
			};
		return {
			status: 'planned',
			patches: [{ op: 'remove_node', nodeName: targetNode.name ?? '' }],
			summary: `Removed "${targetNode.name}" and reconnected its neighbours.`,
			log,
			waves,
		};
	}

	if (kind === 'update_parameter') {
		if (!targetNode)
			return {
				status: 'needs_clarification',
				log,
				issues: [
					{
						field: 'edit.target',
						reason: 'No node named.',
						question: `Which step should change? Nodes: ${nodes.map((node) => node.name).join(', ')}.`,
					},
				],
			};
		const operation = operationForNode(input.registry, targetNode);
		const values = { ...extractedValues(input.request), ...(input.answers ?? {}) };
		if (!operation) {
			return {
				status: 'needs_clarification',
				log,
				issues: [
					{
						field: 'edit.parameter',
						reason: 'The node is outside the supported catalog.',
						question: `"${targetNode.name}" is not in the compiler catalog. Which parameter should change, and to what value?`,
					},
				],
			};
		}
		const definitions = [...operation.requiredParameters, ...operation.optionalParameters];
		const updates: Record<string, unknown> = {};
		for (const definition of definitions)
			if (values[definition.name] !== undefined) updates[definition.name] = values[definition.name];
		if (Object.keys(updates).length === 0) {
			return {
				status: 'needs_clarification',
				log,
				issues: [
					{
						field: 'edit.parameter',
						reason: 'No new value found in the request.',
						question: `What should change on "${targetNode.name}"? Settable values: ${definitions.map((d) => d.name).join(', ')}.`,
					},
				],
			};
		}
		const bound = bindParameters(operation, updates, { warnings: [] }, targetNode.name ?? '');
		const parameters: Record<string, unknown> = {};
		for (const definition of definitions) {
			if (updates[definition.name] === undefined) continue;
			const top = definition.path.split('.')[0];
			parameters[top] = bound[top];
		}
		return {
			status: 'planned',
			patches: [
				{
					op: 'update_node',
					nodeName: targetNode.name ?? '',
					parameters: compileParameterTree(parameters, () => undefined) as NodeJSON['parameters'],
				},
			],
			summary: `Updated ${Object.keys(updates).join(', ')} on "${targetNode.name}".`,
			log,
			waves,
		};
	}

	// add_step: plan the new action with the same retrieval + decision path as create mode.
	const stepText = input.request.replace(ANCHOR_CLAUSE, '').trim();
	const requirements = extractRequirements(stepText);
	const actions =
		requirements.actions.length > 0
			? requirements.actions
			: [{ id: 'new-step', text: stepText, params: {} }];
	const planning = await planActions({
		request: stepText,
		actions: actions.slice(0, 1),
		registry: input.registry,
		decisions: input.decisions,
		abortSignal: input.abortSignal,
	});
	log.push(...planning.log);
	waves += planning.waves;
	if (planning.issues.length > 0)
		return { status: 'needs_clarification', log, issues: planning.issues };
	const action = planning.actions[0];
	const operation = input.registry.require(action.operationId ?? '');
	const values = { ...action.params, ...extractedValues(input.request), ...(input.answers ?? {}) };
	const missing = operation.requiredParameters.filter(
		(definition) => !definition.derivable && values[definition.name] === undefined,
	);
	if (missing.length > 0) {
		return {
			status: 'needs_clarification',
			log,
			issues: missing.map((definition) => ({
				field: `edit.step.${definition.name}`,
				reason: `Required by ${operation.title}.`,
				question: definition.question ?? `Provide ${definition.name}.`,
			})),
		};
	}
	const params: Record<string, unknown> = {};
	for (const definition of [...operation.requiredParameters, ...operation.optionalParameters])
		if (values[definition.name] !== undefined) params[definition.name] = values[definition.name];
	if (operation.integration === 'slack' && params.text === undefined)
		params.text = values.text ?? `Update from ${input.workflow.name}`;
	const anchor = targetNode ?? lastMainNode(input.workflow, nodes);
	const before = /\bbefore\b/i.test(input.request);
	const name = uniqueName(operation.label ?? operation.title, nodes);
	const node: NodeJSON = {
		id: `edit-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
		name,
		type: operation.nodeType,
		typeVersion: operation.version,
		position: [(anchor?.position[0] ?? 0) + (before ? -260 : 260), anchor?.position[1] ?? 0],
		parameters: compileParameterTree(
			bindParameters(operation, params, { warnings: [] }, name),
			() => undefined,
		) as NodeJSON['parameters'],
	};
	const patches: WorkflowPatch[] = [{ op: 'add_node', node }];
	if (anchor?.name) {
		if (before) {
			for (const edge of incomingEdges(input.workflow, anchor.name)) {
				patches.push({
					op: 'remove_edge',
					from: edge.from,
					fromOutput: edge.fromOutput,
					to: anchor.name,
					toInput: edge.toInput,
				});
				patches.push({
					op: 'add_edge',
					from: edge.from,
					fromOutput: edge.fromOutput,
					to: name,
					toInput: 0,
				});
			}
			patches.push({ op: 'add_edge', from: name, fromOutput: 0, to: anchor.name, toInput: 0 });
		} else {
			const successors = outgoingEdges(input.workflow, anchor.name).filter(
				(edge) => edge.fromOutput === 0,
			);
			for (const edge of successors) {
				patches.push({
					op: 'remove_edge',
					from: anchor.name,
					fromOutput: 0,
					to: edge.to,
					toInput: edge.toInput,
				});
				patches.push({
					op: 'add_edge',
					from: name,
					fromOutput: 0,
					to: edge.to,
					toInput: edge.toInput,
				});
			}
			patches.push({ op: 'add_edge', from: anchor.name, fromOutput: 0, to: name, toInput: 0 });
		}
	}
	return {
		status: 'planned',
		patches,
		summary: `Added "${name}" ${before ? 'before' : 'after'} "${anchor?.name ?? 'the end'}".`,
		log,
		waves,
	};
}

function uniqueName(base: string, nodes: readonly NodeJSON[]): string {
	const names = new Set(nodes.map((node) => node.name));
	let name = base;
	let n = 1;
	while (names.has(name)) {
		n += 1;
		name = `${base} ${n}`;
	}
	return name;
}

function lastMainNode(workflow: WorkflowJSON, nodes: readonly NodeJSON[]): NodeJSON | undefined {
	const withOutgoing = new Set(
		Object.keys(workflow.connections).filter((name) =>
			(workflow.connections[name].main ?? []).some((slot) => (slot ?? []).length > 0),
		),
	);
	const terminal = nodes.filter(
		(node) =>
			node.name && !withOutgoing.has(node.name) && node.type !== 'n8n-nodes-base.respondToWebhook',
	);
	return terminal[terminal.length - 1] ?? nodes[nodes.length - 1];
}

type TargetResolution =
	| { kind: 'none' | 'named'; node?: NodeJSON }
	| { kind: 'decided'; node: NodeJSON }
	| { kind: 'ask'; issue: RequirementIssue };

async function resolveTargetNode(
	input: EditPlanInput,
	nodes: readonly NodeJSON[],
	kind: EditKind,
	log: DecisionLogEntry[],
): Promise<TargetResolution> {
	if (kind === 'add_step') {
		const anchorName = input.request.match(ANCHOR_CLAUSE)?.[2]?.trim().toLowerCase();
		if (anchorName) {
			const anchor =
				nodes.find((node) => node.name?.toLowerCase() === anchorName) ??
				nodes.find((node) => node.name?.toLowerCase().includes(anchorName));
			if (anchor) return { kind: 'named', node: anchor };
		}
	}
	const mentioned = mentionedNodes(input.request, nodes);
	if (mentioned.length === 1) return { kind: 'named', node: mentioned[0] };
	if (mentioned.length === 0 && kind === 'add_step') return { kind: 'none' };
	const candidates = mentioned.length > 1 ? mentioned : nodes;
	if (candidates.length === 1) return { kind: 'named', node: candidates[0] };
	const criteria: Record<string, string | null> = {};
	for (const node of candidates) criteria[node.name ?? ''] = `${node.type}${describeNode(node)}`;
	const questions: DecisionQuestions = {
		target: {
			type: 'choice',
			instructions: `Which node does this change refer to: "${input.request}"?`,
			criteria: withNoneOfThese(criteria),
		},
	};
	const outcome = await input.decisions.decide({
		name: 'workflow-compiler.edit-target',
		schemaVersion: DECISION_SCHEMA_VERSION,
		state: { request: input.request },
		questions,
		abortSignal: input.abortSignal,
	});
	log.push({
		name: 'workflow-compiler.edit-target',
		schemaVersion: DECISION_SCHEMA_VERSION,
		backend: input.decisions.kind,
		...(outcome.ok
			? { model: outcome.model, reads: outcome.reads }
			: { failureReason: outcome.reason }),
		latencyMs: outcome.latencyMs,
		ok: outcome.ok,
		questionNames: ['target'],
		answers: outcome.ok ? outcome.answers : {},
		policy: {},
	});
	const resolution = resolveChoice({
		allowed: candidates.map((node) => node.name ?? ''),
		answer: outcome.ok ? outcome.answers.target : undefined,
	});
	log[log.length - 1].policy.target =
		resolution.status === 'chosen' ? resolution.value : `abstain:${resolution.reason}`;
	if (resolution.status === 'chosen') {
		const node = candidates.find((candidate) => candidate.name === resolution.value);
		if (node) return { kind: 'decided', node };
	}
	return {
		kind: 'ask',
		issue: {
			field: 'edit.target',
			reason: 'The target node is ambiguous.',
			question: `Which step do you mean? Nodes: ${candidates.map((node) => node.name).join(', ')}.`,
			candidates: candidates.map((node) => node.name),
		},
	};
}

function describeNode(node: NodeJSON): string {
	const params = node.parameters ?? {};
	const parts: string[] = [];
	for (const key of ['resource', 'operation', 'path', 'httpMethod', 'url']) {
		const value = params[key];
		if (typeof value === 'string') parts.push(`${key}=${value}`);
	}
	return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}
