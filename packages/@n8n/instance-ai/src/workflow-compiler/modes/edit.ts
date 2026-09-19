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
import { incomingEdges, outgoingEdges, type WorkflowPatch } from './patch';
import { planActions, runDecision } from './plan-actions';

type NodeJSON = WorkflowJSON['nodes'][number];
type Values = Record<string, unknown>;

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

const KIND_CUES: Array<[EditKind, RegExp]> = [
	['rename_workflow', /\brename (the )?workflow\b|\bcall (the )?workflow\b/i],
	['remove_step', /\b(remove|delete|drop|get rid of)\b/i],
	[
		'update_parameter',
		/\b(change|update|set|switch|use|point|replace)\b.*\b(channel|table|url|path|method|cron|schedule|text|message|email|to|from)\b/i,
	],
	['add_step', /\b(add|insert|also|after|before|then|and)\b/i],
];

/** Value cues in the request text, keyed by parameter name; an optional cleaner trims the match. */
const VALUE_CUES: Array<[string, RegExp, ((value: string) => string)?]> = [
	['channel', /#[a-z0-9_-]+/i],
	['url', /https?:\/\/\S+/i, (value) => value.replace(/[.,)]$/, '')],
	['table', /\btable\s+["'`]?([a-z_][a-z0-9_]*)/i],
	['path', /\bpath\s+["'`]?(\/?[a-z0-9_\-/]+)/i, (value) => value.replace(/^\//, '')],
	['method', /\b(GET|POST|PUT|PATCH|DELETE)\b/],
	['text', /["“]([^"”]+)["”]/],
];

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

function extractedValues(text: string): Values {
	const values: Values = {};
	for (const [key, pattern, clean] of VALUE_CUES) {
		const match = text.match(pattern);
		const value = match?.[1] ?? match?.[0];
		if (value) values[key] = clean ? clean(value) : value;
	}
	return values;
}

/** Picks the values of the operation's parameters that the request or the answers supply. */
function pickParams(operation: NodeOperation, values: Values): Values {
	const params: Values = {};
	for (const definition of [...operation.requiredParameters, ...operation.optionalParameters]) {
		if (values[definition.name] !== undefined) params[definition.name] = values[definition.name];
	}
	return params;
}

/** Compiles the expressions in a bound parameter tree into node parameters. */
function compiledParameters(tree: Values): NodeJSON['parameters'] {
	return compileParameterTree(tree, () => undefined) as NodeJSON['parameters'];
}

/**
 * Edit mode: classify the change, locate the affected node (with a bounded decision when the text
 * is ambiguous) and produce a minimal patch set. The rest of the workflow is never regenerated.
 */
export async function planEdit(input: EditPlanInput): Promise<EditPlanResult> {
	const log: DecisionLogEntry[] = [];
	let waves = 0;
	const ask = (field: string, reason: string, question: string): EditPlanResult => ({
		status: 'needs_clarification',
		log,
		issues: [{ field, reason, question }],
	});
	const planned = (patches: WorkflowPatch[], summary: string): EditPlanResult => ({
		status: 'planned',
		patches,
		summary,
		log,
		waves,
	});
	const nodes = input.workflow.nodes.filter(
		(node) => node.name && node.type !== 'n8n-nodes-base.stickyNote',
	);
	const nodeList = nodes.map((node) => node.name).join(', ');
	const kind = KIND_CUES.find(([, pattern]) => pattern.test(input.request))?.[0];
	if (!kind) {
		return ask(
			'edit.kind',
			'The requested change is not recognized.',
			'Should I add a step, remove a step, change a node setting, or rename the workflow?',
		);
	}

	if (kind === 'rename_workflow') {
		const name = input.request.match(/\b(?:to|called|named)\s+["“]?([^"”]+?)["”]?\s*$/i)?.[1];
		if (!name) return ask('edit.name', 'No new name given.', 'What should the workflow be called?');
		return planned([{ op: 'rename_workflow', name }], `Renamed workflow to "${name}".`);
	}

	const target = await resolveTargetNode(input, nodes, kind, log);
	if (target.kind === 'ask') return { status: 'needs_clarification', log, issues: [target.issue] };
	if (target.kind === 'decided') waves += 1;
	const targetNode = target.node;

	if (kind === 'remove_step') {
		if (!targetNode) {
			return ask(
				'edit.target',
				'No node named.',
				`Which step should be removed? Nodes: ${nodeList}.`,
			);
		}
		const nodeName = targetNode.name ?? '';
		const summary = `Removed "${targetNode.name}" and reconnected its neighbours.`;
		return planned([{ op: 'remove_node', nodeName }], summary);
	}

	if (kind === 'update_parameter') {
		if (!targetNode) {
			return ask('edit.target', 'No node named.', `Which step should change? Nodes: ${nodeList}.`);
		}
		const operation = operationForNode(input.registry, targetNode);
		const values = { ...extractedValues(input.request), ...(input.answers ?? {}) };
		if (!operation) {
			return ask(
				'edit.parameter',
				'The node is outside the supported catalog.',
				`"${targetNode.name}" is not in the compiler catalog. Which parameter should change, and to what value?`,
			);
		}
		const definitions = [...operation.requiredParameters, ...operation.optionalParameters];
		const updates = pickParams(operation, values);
		if (Object.keys(updates).length === 0) {
			return ask(
				'edit.parameter',
				'No new value found in the request.',
				`What should change on "${targetNode.name}"? Settable values: ${definitions.map((d) => d.name).join(', ')}.`,
			);
		}
		const bound = bindParameters(operation, updates, { warnings: [] }, targetNode.name ?? '');
		const parameters: Values = {};
		for (const definition of definitions) {
			if (updates[definition.name] === undefined) continue;
			const top = definition.path.split('.')[0];
			parameters[top] = bound[top];
		}
		const patch: WorkflowPatch = {
			op: 'update_node',
			nodeName: targetNode.name ?? '',
			parameters: compiledParameters(parameters),
		};
		return planned([patch], `Updated ${Object.keys(updates).join(', ')} on "${targetNode.name}".`);
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
	if (planning.issues.length > 0) {
		return { status: 'needs_clarification', log, issues: planning.issues };
	}
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
	const params = pickParams(operation, values);
	if (operation.integration === 'slack' && params.text === undefined) {
		params.text = values.text ?? `Update from ${input.workflow.name}`;
	}
	const anchor = targetNode ?? lastMainNode(input.workflow, nodes);
	const before = /\bbefore\b/i.test(input.request);
	const name = uniqueName(operation.label ?? operation.title, nodes);
	const node: NodeJSON = {
		id: `edit-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
		name,
		type: operation.nodeType,
		typeVersion: operation.version,
		position: [(anchor?.position[0] ?? 0) + (before ? -260 : 260), anchor?.position[1] ?? 0],
		parameters: compiledParameters(bindParameters(operation, params, { warnings: [] }, name)),
	};
	const patches: WorkflowPatch[] = [{ op: 'add_node', node }];
	const anchorName = anchor?.name;
	if (anchorName) {
		// Splice the new node into every edge on the anchor's side; the anchor keeps its other wiring.
		const edges = before
			? incomingEdges(input.workflow, anchorName).map((edge) => ({ ...edge, to: anchorName }))
			: outgoingEdges(input.workflow, anchorName)
					.filter((edge) => edge.fromOutput === 0)
					.map((edge) => ({ ...edge, from: anchorName }));
		for (const edge of edges) {
			const spliced = before ? { ...edge, to: name, toInput: 0 } : { ...edge, from: name };
			patches.push({ op: 'remove_edge', ...edge }, { op: 'add_edge', ...spliced });
		}
		patches.push(
			before
				? { op: 'add_edge', from: name, fromOutput: 0, to: anchorName, toInput: 0 }
				: { op: 'add_edge', from: anchorName, fromOutput: 0, to: name, toInput: 0 },
		);
	}
	const summary = `Added "${name}" ${before ? 'before' : 'after'} "${anchor?.name ?? 'the end'}".`;
	return planned(patches, summary);
}

function uniqueName(base: string, nodes: readonly NodeJSON[]): string {
	const names = new Set(nodes.map((node) => node.name));
	let name = base;
	for (let n = 2; names.has(name); n += 1) name = `${base} ${n}`;
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
	const instructions = `Which node does this change refer to: "${input.request}"?`;
	const questions: DecisionQuestions = {
		target: { type: 'choice', instructions, criteria: withNoneOfThese(criteria) },
	};
	const outcome = await runDecision(input, 'workflow-compiler.edit-target', questions, log);
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
	const parts = ['resource', 'operation', 'path', 'httpMethod', 'url'].flatMap((key) => {
		const value = params[key];
		return typeof value === 'string' ? [`${key}=${value}`] : [];
	});
	return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}
