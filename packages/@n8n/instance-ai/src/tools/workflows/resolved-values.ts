import { wrapUntrustedData } from '@n8n/agents';
import { actionOfNode } from '@n8n/nodes-base-next';
import { isRecord } from '@n8n/utils/is-record';
import { toEngineConnections, type WorkflowJSON } from '@n8n/workflow-sdk';
import {
	getParentNodes,
	mapConnectionsByDestination,
	NodeConnectionTypes,
	safeRegex,
} from 'n8n-workflow';

import { fieldReadsOf, outputOf, runsLocally, type FieldRead } from './next-workflow-build';
import { isTriggerNodeType } from './workflow-json-utils';
import type { ResolvedNodeParametersResult } from '../../types';
import type { WorkflowBuildOutcome } from '../../workflow-loop/workflow-loop-state';
import { unwrapUntrustedData } from '../orchestration/verification/analyze-result';

/**
 * Node contracts: the value that each mapped field of a write or condition node resolved to in
 * verification, with the output field it reads and where that value comes from. A run passes on
 * a schema-valid value of the wrong field, so the agent needs the field hint to see the mistake.
 */

type Outcome = Pick<
	WorkflowBuildOutcome,
	'nodeSimulationPlan' | 'simulationFixtures' | 'fixtureOrigins' | 'sampledKeys'
>;
type WorkflowNode = WorkflowJSON['nodes'][number];

const MAX_FIELD_LINES = 20;
const MAX_EXPRESSION_CHARS = 40;
const MAX_VALUE_CHARS = 40;
const MAX_HINT_CHARS = 60;
// A chain of local nodes longer than this is not traced further.
const MAX_HOPS = 10;

const CONDITION_ACTIONS: ReadonlySet<string> = new Set([
	'condition.if',
	'condition.filter',
	'condition.switch',
]);
const LEGACY_CONDITION_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.filter',
	'n8n-nodes-base.switch',
]);

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const WHOLE_EXPRESSION = /^=\{\{\s*([\s\S]*?)\s*\}\}$/;

const truncate = (text: string, max: number) =>
	text.length > max ? `${text.slice(0, max - 1)}…` : text;

const pathText = (parts: ReadonlyArray<string | number>) =>
	parts
		.map((part, index) =>
			typeof part === 'number'
				? `[${part}]`
				: IDENTIFIER.test(part)
					? `${index === 0 ? '' : '.'}${part}`
					: `[${JSON.stringify(part)}]`,
		)
		.join('');

interface ExpressionLeaf {
	readonly path: string;
	readonly raw: string;
	readonly value: unknown;
}

/** Each parameter that holds an expression, with its resolved value. Literals are left out. */
function expressionLeaves(
	raw: unknown,
	resolved: unknown,
	parts: ReadonlyArray<string | number> = [],
): ExpressionLeaf[] {
	if (typeof raw === 'string') {
		return raw.startsWith('=') && raw.includes('{{')
			? [{ path: pathText(parts), raw, value: resolved }]
			: [];
	}
	if (Array.isArray(raw)) {
		return raw.flatMap((item, index) =>
			expressionLeaves(item, Array.isArray(resolved) ? resolved[index] : undefined, [
				...parts,
				index,
			]),
		);
	}
	return isRecord(raw)
		? Object.entries(raw).flatMap(([key, item]) =>
				expressionLeaves(item, isRecord(resolved) ? resolved[key] : undefined, [...parts, key]),
			)
		: [];
}

function valueText(value: unknown): string {
	// The resolver replaces an oversized leaf with a preview marker.
	const shown = isRecord(value) && value._truncated === true ? value.preview : value;
	return truncate(shown === undefined ? 'undefined' : JSON.stringify(shown), MAX_VALUE_CHARS);
}

const expressionText = (raw: string) =>
	truncate(
		(WHOLE_EXPRESSION.exec(raw)?.[1] ?? raw.slice(1)).replace(/\s+/g, ' '),
		MAX_EXPRESSION_CHARS,
	);

function resolvedTreeOf(result: ResolvedNodeParametersResult): unknown {
	if (result.resolved === null) return undefined;
	const unwrapped = unwrapUntrustedData(result.resolved);
	return typeof unwrapped === 'string' ? undefined : unwrapped;
}

interface FieldSource {
	readonly nodeName: string;
	readonly key: string;
}

interface WorkflowView {
	readonly outcome: Outcome;
	node(name: string): WorkflowNode | undefined;
	mainParentOf(name: string): string | undefined;
	/** Verification pinned a fixture on the node instead of running it. */
	isSimulated(name: string): boolean;
}

function viewOf(workflow: WorkflowJSON, outcome: Outcome): WorkflowView {
	const byName = new Map(workflow.nodes.flatMap((node) => (node.name ? [[node.name, node]] : [])));
	const byDestination = mapConnectionsByDestination(toEngineConnections(workflow.connections));
	return {
		outcome,
		node: (name) => byName.get(name),
		mainParentOf: (name) => getParentNodes(byDestination, name, NodeConnectionTypes.Main, 1)[0],
		isSimulated: (name) => {
			const verdict = outcome.nodeSimulationPlan?.find(({ nodeName }) => nodeName === name);
			return (
				verdict?.verdict === 'simulate' &&
				verdict.haltBranch !== true &&
				(outcome.simulationFixtures?.[name]?.length ?? 0) > 0
			);
		},
	};
}

/** A write node or a condition node, contract or legacy. */
function isMappedNode(view: WorkflowView, node: WorkflowNode): boolean {
	const action = actionOfNode(node);
	if (action) return action.flow.effect === 'write' || CONDITION_ACTIONS.has(action.id);
	if (LEGACY_CONDITION_TYPES.has(node.type)) return true;
	// A legacy node has no declared effect: a simulated node with a generated fixture is one
	// that verification must not run.
	return (
		node.name !== undefined &&
		!isTriggerNodeType(node.type) &&
		view.isSimulated(node.name) &&
		view.outcome.fixtureOrigins?.[node.name] === undefined
	);
}

/** True when a Set node with this `include` keeps the input field `key`. */
function keepsInputField(include: unknown, key: string): boolean {
	if (!isRecord(include)) return false;
	const fields = Array.isArray(include.fields) ? include.fields : [];
	return (
		include.mode === 'all' ||
		(include.mode === 'selected' && fields.includes(key)) ||
		(include.mode === 'except' && !fields.includes(key))
	);
}

/**
 * The output field a read takes its value from. It follows local nodes that pass the item on,
 * and Set fields that copy one field, back to the node that made the value.
 */
function sourceOf(
	view: WorkflowView,
	readerName: string,
	read: FieldRead,
	hops = 0,
): FieldSource | undefined {
	const nodeName = read.nodeName ?? view.mainParentOf(readerName);
	if (nodeName === undefined) return undefined;
	const here = { nodeName, key: read.key };
	const node = view.node(nodeName);
	const action = node && actionOfNode(node);
	if (!node || !action || hops >= MAX_HOPS || view.isSimulated(nodeName) || !runsLocally(action)) {
		return here;
	}
	if (action.output.json['x-n8n-passed'] === true) {
		return sourceOf(view, nodeName, { key: read.key }, hops + 1);
	}
	if (action.id !== 'items.set') return here;
	const fields = isRecord(node.parameters?.fields) ? node.parameters.fields : {};
	const value = fields[read.key];
	if (value === undefined) {
		return keepsInputField(node.parameters?.include, read.key)
			? sourceOf(view, nodeName, { key: read.key }, hops + 1)
			: here;
	}
	const [copied] = typeof value === 'string' && value.startsWith('=') ? fieldReadsOf(value) : [];
	return copied ? sourceOf(view, nodeName, copied, hops + 1) : here;
}

function fieldSchemaOf(view: WorkflowView, { nodeName, key }: FieldSource) {
	const node = view.node(nodeName);
	const action = node && actionOfNode(node);
	if (!node || !action) return undefined;
	const schema = outputOf(action, node.parameters ?? {});
	return { schema, field: schema.properties?.[key] };
}

/** Where the value of the source field comes from in this run. */
function originOf(view: WorkflowView, source: FieldSource): string {
	const node = view.node(source.nodeName);
	const action = node && actionOfNode(node);
	if (!view.isSimulated(source.nodeName)) {
		if (!action) return 'ran';
		// A contract service node that ran gave a real response.
		return runsLocally(action) ? 'local run' : 'observed';
	}
	if (view.outcome.sampledKeys?.[source.nodeName]?.includes(source.key)) return 'sample';
	const fixture = view.outcome.fixtureOrigins?.[source.nodeName];
	if (fixture === undefined) return 'mock';
	if (fixture === 'sample') return 'sample';
	const described = fieldSchemaOf(view, source);
	if (!described) return fixture;
	const { schema, field } = described;
	if (field) {
		if (fixture === 'declared') return 'declared';
		return Array.isArray(field.examples) && field.examples.length > 0 ? 'example' : 'synthesized';
	}
	// A lookup closes the key space, so a key outside the schema is a property it listed.
	if (fixture === 'lookup') return 'lookup';
	const patterns = Object.keys(schema.patternProperties ?? {});
	if (patterns.some((pattern) => safeRegex.test(pattern, source.key))) return 'pattern key';
	return schema.additionalProperties ? 'open key' : 'not in output';
}

function hintOf(view: WorkflowView, source: FieldSource): string | undefined {
	const field = fieldSchemaOf(view, source)?.field;
	const hint = field?.['x-n8n-hint'] ?? field?.description;
	return typeof hint === 'string' ? truncate(hint, MAX_HINT_CHARS) : undefined;
}

function fieldLine(view: WorkflowView, nodeName: string, leaf: ExpressionLeaf): string {
	const head = `  ${leaf.path} <- ${expressionText(leaf.raw)} = ${valueText(leaf.value)}`;
	const [read] = fieldReadsOf(leaf.raw);
	const source = read && sourceOf(view, nodeName, read);
	if (!source) return head;
	const hint = hintOf(view, source);
	return `${head}  [${source.nodeName}.${source.key}${hint ? `: ${hint}` : ''}; ${originOf(view, source)}]`;
}

/** The names of the write and condition nodes, in workflow order. */
export function mappedNodeNames(workflow: WorkflowJSON, outcome: Outcome): string[] {
	const view = viewOf(workflow, outcome);
	return workflow.nodes.flatMap((node) =>
		node.name !== undefined && isMappedNode(view, node) ? [node.name] : [],
	);
}

/**
 * One header for each mapped node, and one line for each field that holds an expression, at most
 * {@link MAX_FIELD_LINES}. A node with no resolution, e.g. one the run did not reach, is left out.
 */
export function resolvedValueLines(
	workflow: WorkflowJSON,
	outcome: Outcome,
	resolutions: ReadonlyMap<string, ResolvedNodeParametersResult>,
): string[] {
	const view = viewOf(workflow, outcome);
	const groups = mappedNodeNames(workflow, outcome).flatMap((nodeName) => {
		const result = resolutions.get(nodeName);
		if (!result || result.suppressed || result.parameters === null) return [];
		const lines = expressionLeaves(result.parameters, resolvedTreeOf(result)).map((leaf) =>
			fieldLine(view, nodeName, leaf),
		);
		const header = `${nodeName} (${view.isSimulated(nodeName) ? 'simulated' : 'ran'})`;
		return lines.length > 0 ? [{ header, lines }] : [];
	});
	const total = groups.reduce((sum, { lines }) => sum + lines.length, 0);
	const shown = groups.reduce<{ lines: string[]; room: number }>(
		({ lines, room }, group) =>
			room <= 0
				? { lines, room }
				: {
						lines: [...lines, group.header, ...group.lines.slice(0, room)],
						room: room - group.lines.length,
					},
		{ lines: [], room: MAX_FIELD_LINES },
	).lines;
	const fieldCount = Math.min(total, MAX_FIELD_LINES);
	return total > fieldCount
		? [...shown, `… ${total - fieldCount} more mapped fields not shown`]
		: shown;
}

/**
 * The resolved values block for a build result, or `undefined` when no mapped field resolved.
 * With `reached`, only the nodes that the run reached are resolved.
 */
export async function resolvedValuesBlock(args: {
	workflow: WorkflowJSON;
	outcome: Outcome;
	reached?: readonly string[];
	resolve: (nodeName: string) => Promise<ResolvedNodeParametersResult>;
}): Promise<string | undefined> {
	const { workflow, outcome, reached, resolve } = args;
	const resolved = await Promise.all(
		mappedNodeNames(workflow, outcome)
			.filter((nodeName) => reached?.includes(nodeName) ?? true)
			.map(async (nodeName) => [nodeName, await resolve(nodeName).catch(() => undefined)] as const),
	);
	const resolutions = new Map(
		resolved.flatMap(([nodeName, result]) => (result ? [[nodeName, result] as const] : [])),
	);
	const lines = resolvedValueLines(workflow, outcome, resolutions);
	return lines.length > 0
		? wrapUntrustedData(lines.join('\n'), 'verification', 'resolved-values')
		: undefined;
}
