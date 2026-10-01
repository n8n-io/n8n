/**
 * Saved workflow JSON back to `@n8n/workflow-sdk/next` source, so an edit keeps the typed
 * format. Every part is checked against the saved JSON: the flow replays to the same graph,
 * and each lambda compiles back to the same expression. A workflow that the format cannot
 * express gives `undefined`.
 */
import * as acorn from 'acorn';
import isEqual from 'lodash/isEqual';

import {
	BRANCH_NODE,
	branchParameters,
	MANUAL_NODE,
	SET_NODE,
	setParameters,
	startFlow,
	type Flow,
	type Step,
} from './flow';
import { BUILTINS, childNodes, compileLambdaSource } from './lambda';
import { prepareSourceForLint } from '../lint/sdk/workflow-sdk-lint';
import type { IConnections, NodeJSON, WorkflowJSON } from '../types/base';

/** The typed module factory for a contract node type. */
export interface ContractFactory {
	/** The module export and its import path, e.g. `notion` from `@n8n/nodes/notion`. */
	readonly module: string;
	readonly from: string;
	/** The factory in the module, e.g. `databasePage.getAll`. */
	readonly path: string;
	/** The action version that the factory pins. */
	readonly version: number;
	/** The parameters the factory takes. The host sets the others, e.g. `authentication`. */
	readonly inputKeys: readonly string[];
}

type NamedNode = NodeJSON & { name: string };

interface Edge {
	readonly from: string;
	readonly output: number;
	readonly to: string;
}

interface Tail {
	readonly node: string;
	readonly output: number;
}

/** A lambda or other source text inside a parameter tree. */
class Code {
	constructor(readonly text: string) {}
}

type Tree = string | number | boolean | null | Code | Tree[] | { [key: string]: Tree };

type Shape =
	| { readonly kind: 'manual' }
	| { readonly kind: 'trigger' }
	| { readonly kind: 'branch'; readonly condition: string }
	| { readonly kind: 'set'; readonly fields: Tree; readonly keepAll: boolean }
	| { readonly kind: 'contract'; readonly factory: ContractFactory; readonly parameters: Tree }
	| { readonly kind: 'node'; readonly parameters: Tree };

type Segment =
	| { readonly kind: 'step'; readonly node: NamedNode }
	| {
			readonly kind: 'branch';
			readonly node: NamedNode;
			readonly then: readonly Segment[];
			readonly else?: readonly Segment[];
	  }
	| { readonly kind: 'orElse'; readonly handler: readonly Segment[] };

interface Chain {
	readonly segments: readonly Segment[];
	readonly tails: readonly Tail[];
}

interface Graph {
	readonly nodes: ReadonlyMap<string, NamedNode>;
	readonly edges: readonly Edge[];
	readonly shapes: ReadonlyMap<string, Shape>;
}

interface FlowPlan {
	readonly root: NamedNode;
	readonly segments: readonly Segment[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

// ── Expressions to lambdas ──────────────────────────────────────────────────

/** n8n expression text → the `$.<key>` a lambda writes for it. */
const FROM_EXPRESSION = new Map(Object.entries(BUILTINS).map(([key, text]) => [text, `$.${key}`]));

interface Rewrite {
	readonly start: number;
	readonly end: number;
	readonly text: string;
	readonly reads: 'item' | '$';
}

/** The quoted name in `$("Node").item.json`, the compiled form of `$("Node")`. */
function nodeReference(node: acorn.MemberExpression, js: string): string | undefined {
	const item = node.object;
	if (node.computed || node.property.type !== 'Identifier' || node.property.name !== 'json') {
		return undefined;
	}
	if (item.type !== 'MemberExpression' || item.computed) return undefined;
	if (item.property.type !== 'Identifier' || item.property.name !== 'item') return undefined;
	const call = item.object;
	if (call.type !== 'CallExpression' || call.callee.type !== 'Identifier') return undefined;
	const [arg] = call.arguments;
	return call.callee.name === '$' && call.arguments.length === 1 && arg?.type === 'Literal'
		? js.slice(arg.start, arg.end)
		: undefined;
}

const combine = (parts: ReadonlyArray<Rewrite[] | undefined>): Rewrite[] | undefined =>
	parts.every((part) => part !== undefined) ? parts.flat() : undefined;

/** The rewrites from expression JavaScript to lambda JavaScript, or `undefined` if none fit. */
function rewritesOf(node: acorn.AnyNode, js: string): Rewrite[] | undefined {
	const at = { start: node.start, end: node.end };
	switch (node.type) {
		case 'Identifier': {
			if (node.name === '$json') return [{ ...at, text: 'item', reads: 'item' }];
			const builtin = FROM_EXPRESSION.get(node.name);
			if (builtin) return [{ ...at, text: builtin, reads: '$' }];
			// Other n8n variables ($input, $node, …) have no lambda form.
			return node.name.startsWith('$') ? undefined : [];
		}
		case 'MemberExpression': {
			const reference = nodeReference(node, js);
			if (reference) return [{ ...at, text: `$(${reference})`, reads: '$' }];
			const builtin =
				!node.computed && node.object.type === 'Identifier' && node.property.type === 'Identifier'
					? FROM_EXPRESSION.get(`${node.object.name}.${node.property.name}`)
					: undefined;
			if (builtin) return [{ ...at, text: builtin, reads: '$' }];
			return combine([
				rewritesOf(node.object, js),
				...(node.computed ? [rewritesOf(node.property, js)] : []),
			]);
		}
		case 'Property':
			return combine([
				...(node.computed ? [rewritesOf(node.key, js)] : []),
				rewritesOf(node.value, js),
			]);
		default:
			return combine(childNodes(node).map((child) => rewritesOf(child, js)));
	}
}

interface LambdaBody {
	readonly text: string;
	readonly reads: ReadonlySet<Rewrite['reads']>;
}

function lambdaBody(js: string): LambdaBody | undefined {
	const parsed = (() => {
		try {
			return acorn.parseExpressionAt(js, 0, { ecmaVersion: 'latest' });
		} catch {
			return undefined;
		}
	})();
	const rewrites = parsed ? rewritesOf(parsed, js) : undefined;
	if (!rewrites) return undefined;
	const text = [...rewrites]
		.sort((a, b) => b.start - a.start)
		.reduce((acc, { start, end, text: next }) => acc.slice(0, start) + next + acc.slice(end), js);
	return { text, reads: new Set(rewrites.map(({ reads }) => reads)) };
}

function lambdaOf(body: string, reads: ReadonlySet<Rewrite['reads']>): string {
	const params = reads.has('$') ? `(${reads.has('item') ? 'item' : '_item'}, $)` : '(item)';
	return `${reads.size === 0 ? '()' : params} => ${body}`;
}

/** A lambda whose compiled JavaScript is exactly `js`. */
function lambdaForJs(js: string, names: ReadonlySet<string>): string | undefined {
	const body = lambdaBody(js);
	const lambda = body ? lambdaOf(body.text, body.reads) : undefined;
	const compiled = lambda ? compileLambdaSource(lambda, names) : undefined;
	return compiled?.ok && compiled.js === js ? lambda : undefined;
}

const escapeTemplate = (text: string) =>
	text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

/** `=Hi {{ $json.name }}` → `` (item) => `Hi ${item.name}` ``. */
function templateLambda(expression: string): string | undefined {
	const parts = expression.slice(1).split(/\{\{ ([\s\S]*?) \}\}/);
	// Without text around it, `={{ x }}` is the value of x, not a string.
	if (parts.every((part, index) => index % 2 === 1 || part === '')) return undefined;
	const bodies = parts.map((part, index) => (index % 2 === 1 ? lambdaBody(part) : undefined));
	if (bodies.some((body, index) => index % 2 === 1 && body === undefined)) return undefined;
	const text = parts
		.map((part, index) => {
			const body = bodies[index];
			return body ? `\${${body.text}}` : escapeTemplate(part);
		})
		.join('');
	const reads = new Set(bodies.flatMap((body) => [...(body?.reads ?? [])]));
	return lambdaOf(`\`${text}\``, reads);
}

/** A lambda that compiles to exactly `expression`, else `undefined`. */
function lambdaForExpression(expression: string, names: ReadonlySet<string>): string | undefined {
	const whole = /^=\{\{ ([\s\S]*) \}\}$/.exec(expression)?.[1];
	const wholeBody = whole === undefined ? undefined : lambdaBody(whole);
	const candidates = [
		wholeBody ? lambdaOf(wholeBody.text, wholeBody.reads) : undefined,
		templateLambda(expression),
	];
	return candidates.find((lambda) => {
		const compiled = lambda ? compileLambdaSource(lambda, names) : undefined;
		return compiled?.ok && compiled.expression === expression;
	});
}

interface Converted {
	readonly tree: Tree;
	/** An expression stayed a string because no lambda compiles to it. */
	readonly raw: boolean;
}

interface ConvertOptions {
	/** Node names that `$("Node")` may read. Without them, expressions stay strings. */
	readonly names?: ReadonlySet<string>;
	/** `node()` parameters take no lambda directly in an array. */
	readonly arrayLambdas: boolean;
}

function convert(value: unknown, options: ConvertOptions): Converted {
	if (typeof value === 'string') {
		const { names } = options;
		const lambda = names && value.startsWith('=') ? lambdaForExpression(value, names) : undefined;
		return lambda
			? { tree: new Code(lambda), raw: false }
			: { tree: value, raw: value.startsWith('=') };
	}
	if (Array.isArray(value)) {
		const itemOptions = options.arrayLambdas ? options : { ...options, names: undefined };
		const items = value.map((item) =>
			typeof item === 'string' ? convert(item, itemOptions) : convert(item, options),
		);
		return { tree: items.map(({ tree }) => tree), raw: items.some(({ raw }) => raw) };
	}
	if (isRecord(value)) {
		const entries = Object.entries(value)
			.filter(([, entry]) => entry !== undefined)
			.map(([key, entry]) => ({ key, converted: convert(entry, options) }));
		return {
			tree: Object.fromEntries(entries.map(({ key, converted }) => [key, converted.tree])),
			raw: entries.some(({ converted }) => converted.raw),
		};
	}
	return {
		tree: typeof value === 'number' || typeof value === 'boolean' ? value : null,
		raw: false,
	};
}

/** A JSON value as a tree, with every string kept as it is. */
const plainTree = (value: unknown) => convert(value, { arrayLambdas: false }).tree;

// ── Node shapes ─────────────────────────────────────────────────────────────

function branchShape(node: NamedNode, names: ReadonlySet<string>): Shape | undefined {
	if (node.type !== BRANCH_NODE.type || node.typeVersion !== BRANCH_NODE.version) return undefined;
	if (node.onError !== undefined) return undefined;
	const conditions: unknown = node.parameters?.conditions;
	const list = isRecord(conditions) ? conditions.conditions : undefined;
	const first: unknown = Array.isArray(list) ? list[0] : undefined;
	const leftValue = isRecord(first) ? first.leftValue : undefined;
	const js =
		typeof leftValue === 'string' ? /^=\{\{ ([\s\S]*) \}\}$/.exec(leftValue)?.[1] : undefined;
	if (js === undefined || !isEqual(branchParameters(js), node.parameters)) return undefined;
	const condition = lambdaForJs(js, names);
	return condition ? { kind: 'branch', condition } : undefined;
}

/** A Set field: its JSON value, or the lambda that compiles to its JavaScript. */
function fieldOf(js: string, names: ReadonlySet<string>): Tree | undefined {
	const value = (() => {
		try {
			const parsed: unknown = JSON.parse(js);
			return JSON.stringify(parsed) === js ? plainTree(parsed) : undefined;
		} catch {
			return undefined;
		}
	})();
	if (value !== undefined) return value;
	const lambda = lambdaForJs(js, names);
	return lambda ? new Code(lambda) : undefined;
}

function setShape(node: NamedNode, names: ReadonlySet<string>): Shape | undefined {
	if (node.type !== SET_NODE.type || node.typeVersion !== SET_NODE.version) return undefined;
	const parameters = node.parameters ?? {};
	const { jsonOutput } = parameters;
	const body =
		typeof jsonOutput === 'string'
			? /^=\{\{ \(\{ ([\s\S]*) \}\) \}\}$/.exec(jsonOutput)?.[1]
			: undefined;
	const source = `({ ${body ?? ''} })`;
	const object = (() => {
		try {
			return body === undefined
				? undefined
				: acorn.parseExpressionAt(source, 0, { ecmaVersion: 'latest' });
		} catch {
			return undefined;
		}
	})();
	if (object?.type !== 'ObjectExpression') return undefined;
	const entries = object.properties.map((property) =>
		property.type === 'Property' &&
		!property.computed &&
		!property.shorthand &&
		property.key.type === 'Literal' &&
		typeof property.key.value === 'string'
			? { key: property.key.value, js: source.slice(property.value.start, property.value.end) }
			: undefined,
	);
	const keepAll = parameters.includeOtherFields === true;
	const fields = entries.flatMap((entry) => {
		const value = entry ? fieldOf(entry.js, names) : undefined;
		return entry && value !== undefined ? [{ ...entry, value }] : [];
	});
	if (fields.length !== entries.length) return undefined;
	const rebuilt = fields.map(({ key, js }) => `${JSON.stringify(key)}: ${js}`);
	if (!isEqual(setParameters(rebuilt, keepAll), parameters)) return undefined;
	return {
		kind: 'set',
		fields: Object.fromEntries(fields.map(({ key, value }) => [key, value])),
		keepAll,
	};
}

function contractShape(
	node: NamedNode,
	names: ReadonlySet<string>,
	factory: ContractFactory | undefined,
): Shape | undefined {
	if (factory?.version !== node.typeVersion) return undefined;
	const inputs = new Set(factory.inputKeys);
	const parameters = Object.fromEntries(
		Object.entries(node.parameters ?? {}).filter(([key]) => inputs.has(key)),
	);
	const converted = convert(parameters, { names, arrayLambdas: true });
	// A raw expression may not fit the typed field, so the node keeps its JSON in node().
	return converted.raw ? undefined : { kind: 'contract', factory, parameters: converted.tree };
}

function shapeOf(
	node: NamedNode,
	isRoot: boolean,
	names: ReadonlySet<string>,
	factories: ReadonlyMap<string, ContractFactory>,
): Shape {
	if (isRoot) {
		const isManual =
			node.type === MANUAL_NODE.type &&
			node.typeVersion === MANUAL_NODE.version &&
			Object.keys(node.parameters ?? {}).length === 0;
		return { kind: isManual ? 'manual' : 'trigger' };
	}
	return (
		branchShape(node, names) ??
		setShape(node, names) ??
		contractShape(node, names, factories.get(node.type)) ?? {
			kind: 'node',
			parameters: convert(node.parameters ?? {}, { names, arrayLambdas: false }).tree,
		}
	);
}

// ── Graph to flows ──────────────────────────────────────────────────────────

/** Main connections into the first input. Others have no flow form. */
function edgesOf(connections: IConnections): Edge[] | undefined {
	const edges = Object.entries(connections).flatMap(([from, byType]) =>
		Object.entries(byType).flatMap(([type, outputs]) =>
			outputs.flatMap((targets, output) =>
				(targets ?? []).map((target) => ({
					from,
					output,
					to: target.node,
					fits: type === 'main' && target.type === 'main' && target.index === 0,
				})),
			),
		),
	);
	return edges.every(({ fits }) => fits)
		? edges.map(({ from, output, to }) => ({ from, output, to }))
		: undefined;
}

/** Node keys that the build sets or keeps from the saved workflow. */
const KNOWN_KEYS = new Set([
	'id',
	'name',
	'type',
	'typeVersion',
	'position',
	'parameters',
	'credentials',
	'webhookId',
	'onError',
]);

const isPlainNode = (node: NodeJSON): node is NamedNode =>
	typeof node.name === 'string' &&
	(node.onError === undefined || node.onError === 'continueErrorOutput') &&
	Object.entries(node).every(
		([key, value]) => KNOWN_KEYS.has(key) || value === undefined || value === false,
	);

const fromTail = (edge: Edge, tail: Tail) => edge.from === tail.node && edge.output === tail.output;

function stepChain(graph: Graph, node: NamedNode, seen: ReadonlySet<string>): Chain {
	if (graph.shapes.get(node.name)?.kind === 'branch') {
		const onTrue = chain(graph, [{ node: node.name, output: 0 }], seen);
		const hasElse = graph.edges.some((edge) => edge.from === node.name && edge.output === 1);
		const onFalse = hasElse ? chain(graph, [{ node: node.name, output: 1 }], seen) : undefined;
		return {
			segments: [
				{
					kind: 'branch',
					node,
					then: onTrue.segments,
					...(onFalse ? { else: onFalse.segments } : {}),
				},
			],
			tails: [...onTrue.tails, ...(onFalse?.tails ?? [])],
		};
	}
	const main = { node: node.name, output: 0 };
	if (node.onError !== 'continueErrorOutput') {
		return { segments: [{ kind: 'step', node }], tails: [main] };
	}
	const handler = chain(graph, [{ node: node.name, output: 1 }], seen);
	return {
		segments: [
			{ kind: 'step', node },
			{ kind: 'orElse', handler: handler.segments },
		],
		tails: [main, ...handler.tails],
	};
}

/** The flow from `tails` on. It stops at a node that another path also leads into. */
function chain(graph: Graph, tails: readonly Tail[], seen: ReadonlySet<string>): Chain {
	const next = graph.edges.filter((edge) => tails.some((tail) => fromTail(edge, tail)));
	const targets = [...new Set(next.map((edge) => edge.to))];
	const node = targets.length === 1 && targets[0] ? graph.nodes.get(targets[0]) : undefined;
	const ready =
		node !== undefined &&
		!seen.has(node.name) &&
		graph.edges.filter((edge) => edge.to === node.name).length === next.length &&
		tails.every((tail) => next.some((edge) => fromTail(edge, tail)));
	if (!node || !ready) return { segments: [], tails };
	const inner = new Set([...seen, node.name]);
	const own = stepChain(graph, node, inner);
	const rest = chain(graph, own.tails, inner);
	return { segments: [...own.segments, ...rest.segments], tails: rest.tails };
}

const placeholderStep = (node: NamedNode): Step<unknown, unknown, unknown, string> => ({
	name: node.name,
	spec: { name: node.name, type: node.type, version: node.typeVersion, parameters: () => ({}) },
});

function replay(
	flow: Flow<unknown, unknown>,
	segments: readonly Segment[],
): Flow<unknown, unknown> {
	return segments.reduce<Flow<unknown, unknown>>((current, segment) => {
		if (segment.kind === 'step') return current.andThen(placeholderStep(segment.node));
		if (segment.kind === 'orElse') {
			return current.orElse((failed) => replay(failed, segment.handler));
		}
		const { node, then, else: otherwise } = segment;
		const config = { name: node.name, if: () => true, then: (f: typeof flow) => replay(f, then) };
		return otherwise
			? current.branch({ ...config, else: (f) => replay(f, otherwise) })
			: current.branch(config);
	}, flow);
}

const edgeKey = (edge: Edge) => `${edge.from}\u0000${edge.output}\u0000${edge.to}`;

/** The flows build the saved graph: the same nodes, edges, and error outputs. */
function replaysGraph(graph: Graph, flows: readonly FlowPlan[]): boolean {
	const built = flows.map(
		({ root, segments }) =>
			replay(
				startFlow({
					name: root.name,
					type: root.type,
					version: root.typeVersion,
					parameters: () => ({}),
				}),
				segments,
			).graph,
	);
	const specs = built.flatMap(({ nodes }) => nodes);
	const saved = [...graph.nodes.values()];
	return (
		isEqual(new Set(specs.map(({ name }) => name)), new Set(graph.nodes.keys())) &&
		isEqual(
			new Set(specs.filter(({ onError }) => onError).map(({ name }) => name)),
			new Set(saved.filter(({ onError }) => onError).map(({ name }) => name)),
		) &&
		isEqual(
			new Set(built.flatMap(({ edges }) => edges.map(edgeKey))),
			new Set(graph.edges.map(edgeKey)),
		)
	);
}

// ── Source text ─────────────────────────────────────────────────────────────

const INDENT = '  ';

const keyText = (key: string) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key));

function renderTree(tree: Tree, indent: string): string {
	if (tree instanceof Code) return tree.text;
	const inner = indent + INDENT;
	if (Array.isArray(tree)) {
		if (tree.length === 0) return '[]';
		const items = tree.map((item) => `${inner}${renderTree(item, inner)},`);
		return `[\n${items.join('\n')}\n${indent}]`;
	}
	if (tree === null || typeof tree !== 'object') return JSON.stringify(tree);
	const entries = Object.entries(tree);
	if (entries.length === 0) return '{}';
	const lines = entries.map(
		([key, value]) => `${inner}${keyText(key)}: ${renderTree(value, inner)},`,
	);
	return `{\n${lines.join('\n')}\n${indent}}`;
}

const typedNode = (node: NamedNode, parameters: Tree): Tree => ({
	name: node.name,
	type: node.type,
	version: node.typeVersion,
	...(isRecord(parameters) && Object.keys(parameters).length === 0 ? {} : { parameters }),
});

function renderCall(node: NamedNode, shape: Shape, indent: string): string {
	switch (shape.kind) {
		case 'manual':
			return `manual({ name: ${JSON.stringify(node.name)} })`;
		case 'trigger':
			return `trigger(${renderTree(typedNode(node, plainTree(node.parameters ?? {})), indent)})`;
		case 'set': {
			const config = {
				name: node.name,
				fields: shape.fields,
				...(shape.keepAll ? { keep: 'all' } : {}),
			};
			return `set(${renderTree(config, indent)})`;
		}
		case 'contract': {
			const parameters = isRecord(shape.parameters) ? shape.parameters : {};
			const call = `${shape.factory.module}.${shape.factory.path}`;
			return `${call}(${renderTree({ name: node.name, ...parameters }, indent)})`;
		}
		case 'node':
			return `node(${renderTree(typedNode(node, shape.parameters), indent)})`;
		case 'branch':
			return '';
	}
}

function renderSegments(graph: Graph, segments: readonly Segment[], indent: string): string {
	return segments
		.map((segment) => {
			if (segment.kind === 'orElse') {
				return `\n${indent}.orElse((failed) => failed${renderSegments(graph, segment.handler, indent + INDENT)})`;
			}
			const shape = graph.shapes.get(segment.node.name);
			if (segment.kind === 'step') {
				return shape ? `\n${indent}.andThen(${renderCall(segment.node, shape, indent)})` : '';
			}
			if (shape?.kind !== 'branch') return '';
			const inner = indent + INDENT + INDENT;
			const flowOf = (branch: readonly Segment[]) =>
				new Code(`(flow) => flow${renderSegments(graph, branch, inner)}`);
			const config = {
				name: segment.node.name,
				if: new Code(shape.condition),
				then: flowOf(segment.then),
				...(segment.else ? { else: flowOf(segment.else) } : {}),
			};
			return `\n${indent}.branch(${renderTree(config, indent)})`;
		})
		.join('');
}

const HELPERS = ['workflow', 'manual', 'trigger', 'set', 'node'];

function segmentNodes(segments: readonly Segment[]): NamedNode[] {
	return segments.flatMap((segment) => {
		if (segment.kind === 'orElse') return segmentNodes(segment.handler);
		if (segment.kind === 'step') return [segment.node];
		return [segment.node, ...segmentNodes(segment.then), ...segmentNodes(segment.else ?? [])];
	});
}

function render(name: string, graph: Graph, flows: readonly FlowPlan[]): string {
	const shapes = flows
		.flatMap(({ root, segments }) => [root, ...segmentNodes(segments)])
		.flatMap((node) => {
			const shape = graph.shapes.get(node.name);
			return shape ? [shape] : [];
		});
	const kinds = new Set<string>(['workflow', ...shapes.map(({ kind }) => kind)]);
	const factories = [
		...new Map(
			shapes
				.flatMap((shape) =>
					shape.kind === 'contract' ? [{ key: shape.factory.module, factory: shape.factory }] : [],
				)
				.map(({ key, factory }) => [key, factory]),
		).values(),
	];
	const imports = [
		`import { ${HELPERS.filter((helper) => kinds.has(helper)).join(', ')} } from '@n8n/workflow-sdk/next';`,
		...factories.map(({ module, from }) => `import { ${module} } from '${from}';`),
	];
	const body = flows.map(({ root, segments }) => {
		const shape = graph.shapes.get(root.name) ?? { kind: 'trigger' };
		const indent = INDENT + INDENT;
		return `${INDENT}${renderCall(root, shape, INDENT)}${renderSegments(graph, segments, indent)},`;
	});
	return [
		...imports,
		'',
		'export default workflow(',
		`${INDENT}${JSON.stringify(name)},`,
		...body,
		');',
		'',
	].join('\n');
}

/**
 * `@n8n/workflow-sdk/next` source for a saved workflow, or `undefined` when the typed format
 * cannot express it (for example a Merge input, a sticky note, or a node setting such as
 * `retryOnFail`). `factories` maps each contract node type to its typed module factory.
 */
export function decompileWorkflow(
	json: WorkflowJSON,
	factories: ReadonlyMap<string, ContractFactory>,
): string | undefined {
	const edges = edgesOf(json.connections ?? {});
	const plain = json.nodes.filter(isPlainNode);
	const nodes = new Map(plain.map((node) => [node.name, node]));
	const fits =
		edges !== undefined &&
		plain.length === json.nodes.length &&
		nodes.size === plain.length &&
		(json.nodeGroups?.length ?? 0) === 0 &&
		edges.every((edge) => nodes.has(edge.from) && nodes.has(edge.to));
	if (!fits) return undefined;
	const names = new Set(nodes.keys());
	const targets = new Set(edges.map(({ to }) => to));
	const shapes = new Map(
		plain.map((node) => [node.name, shapeOf(node, !targets.has(node.name), names, factories)]),
	);
	const graph: Graph = { nodes, edges, shapes };
	const flows = plain
		.filter((node) => !targets.has(node.name))
		.map((root) => ({
			root,
			segments: chain(graph, [{ node: root.name, output: 0 }], new Set([root.name])).segments,
		}));
	if (flows.length === 0 || !replaysGraph(graph, flows)) return undefined;
	return render(json.name, graph, flows);
}

/** The node name and 1-based line of each `…({ name: '…' })` call, in source order. */
export function locateNextNodes(source: string): Array<{ name: string; line: number }> {
	const program = (() => {
		try {
			return acorn.parse(prepareSourceForLint(source).code, {
				ecmaVersion: 'latest',
				sourceType: 'module',
				locations: true,
			});
		} catch {
			return undefined;
		}
	})();
	const calls = (node: acorn.AnyNode): acorn.CallExpression[] => [
		...(node.type === 'CallExpression' ? [node] : []),
		...childNodes(node).flatMap(calls),
	];
	return (program ? calls(program) : []).flatMap((call) => {
		const [config] = call.arguments;
		if (config?.type !== 'ObjectExpression') return [];
		const name = config.properties.find(
			(property) =>
				property.type === 'Property' &&
				!property.computed &&
				property.key.type === 'Identifier' &&
				property.key.name === 'name',
		);
		const value = name?.type === 'Property' ? name.value : undefined;
		// A chained call such as `.branch({…})` starts where the flow before it starts.
		const at = call.callee.type === 'MemberExpression' ? call.callee.property : call;
		return value?.type === 'Literal' && typeof value.value === 'string' && at.loc
			? [{ name: value.value, line: at.loc.start.line }]
			: [];
	});
}
