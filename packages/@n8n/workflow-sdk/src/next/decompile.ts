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
	edgeKey,
	filterFragment,
	Flow,
	fromAiDescriptionOf,
	forEachFragment,
	loopFragment,
	MANUAL_NODE,
	mergeFragment,
	outputNamesOf,
	routeFragment,
	SET_NODE,
	setParameters,
	startFlow,
	PROVIDER_SLOTS,
	SLOT_OF_CONNECTION,
	switchFragment,
	type Fragment,
	type NodeSettings,
	type OutputList,
	type Step,
	type ProviderSlot,
} from './flow';
import { BUILTINS, childNodes, compileLambdaSource } from './lambda';
import {
	caseRouter,
	CHECK_DONE,
	FILTER_NODE,
	filterParameters,
	forEachParameters,
	LOOP_DONE,
	LOOP_EACH,
	LOOP_NODE,
	LOOP_STATE_NODE,
	loopCheckParameters,
	loopHeadParameters,
	loopLimitParameters,
	loopNextParameters,
	loopNextSuffix,
	loopNodeNames,
	mergeNodeOf,
	mergeParameters,
	noNextPage,
	samePass,
	STOP_NODE,
	SWITCH_NODE,
	WAIT_NODE,
	waitParameters,
	type Interval,
	type CaseRouter,
	type MergeJoin,
	type WaitUnit,
} from './regions';
import { escapeTemplateLiteral } from '../codegen/string-utils';
import { prepareSourceForLint } from '../lint/sdk/workflow-sdk-lint';
import type { IConnections, NodeJSON, WorkflowJSON } from '../types/base';

/** The typed module factory for a contract node type. */
export interface ContractFactory {
	/** The module export and its import path, e.g. `notion` from `@n8n/nodes/notion`. */
	readonly module: string;
	readonly from: string;
	/** The factory in the module, e.g. `databasePage.getAll`. */
	readonly path: string;
	/** The node version the factory emits: the action major, or the version of a composed node. */
	readonly version: number;
	/** The parameters the factory takes. The host sets the others, e.g. `authentication`. */
	readonly inputKeys: readonly string[];
	/** No host sets a parameter, as for a native node. A node with another parameter keeps its JSON. */
	readonly closed?: boolean;
	/** The inputs whose typed field takes an `=` expression string as its whole value. */
	readonly expressionKeys: readonly string[];
	/** The named outputs of a routed step; a node with a wired later output reads back as `route`. */
	readonly outputs?: OutputList;
	/**
	 * The factory takes its providers in one `providers` field, as a derived module does, not
	 * each in the input field of its slot. Its providers read back through the legacy reader.
	 */
	readonly groupsProviders?: true;
	/** The factory makes an agent tool: a field that is one `$fromAI()` call reads as `fromModel()`. */
	readonly tool?: true;
}

/**
 * A saved legacy node read as a typed factory call, e.g. a node of a derived module: the
 * factory and the parameters it takes. The reader returns nothing when the read is not lossless.
 */
export interface ContractRead {
	readonly factory: ContractFactory;
	readonly parameters: NonNullable<NodeJSON['parameters']>;
}

export type LegacyReader = (node: NodeJSON) => ContractRead | undefined;

/**
 * The `factories` key of an action that runs one resource and operation of a composed node
 * version. A contract node type is its own key.
 */
export const composedFactoryKey = (
	type: string,
	typeVersion: number,
	resource: string,
	operation: string,
) => `${type}@${typeVersion}/${resource}/${operation}`;

type NamedNode = NodeJSON & { name: string };

interface Edge {
	readonly from: string;
	readonly output: number;
	readonly to: string;
	readonly input: number;
}

interface Tail {
	readonly node: string;
	readonly output: number;
}

/** A lambda or other source text inside a parameter tree. */
class Code {
	constructor(readonly text: string) {}
}

/** A call such as `provider({ … })` inside a parameter tree. */
class Call {
	constructor(
		readonly callee: string,
		readonly argument: Tree,
	) {}
}

type Tree = string | number | boolean | null | Code | Call | Tree[] | { [key: string]: Tree };

/** A loop region read from its head node and the nodes named after it. */
type LoopShape = {
	readonly kind: 'loop';
	readonly maxIterations: number;
	/** The node that returns to the head. */
	readonly back: string;
	readonly check: string;
} & (
	| { readonly variant: 'loop'; readonly until: string; readonly next: string }
	| { readonly variant: 'paginate'; readonly next: string }
	| { readonly variant: 'pollUntil'; readonly until: string; readonly every: Interval }
);

type Shape =
	| { readonly kind: 'manual' }
	| { readonly kind: 'trigger' }
	| { readonly kind: 'branch'; readonly condition: string }
	| { readonly kind: 'filter'; readonly condition: string }
	| { readonly kind: 'set'; readonly fields: Tree; readonly keepAll: boolean }
	| { readonly kind: 'contract'; readonly factory: ContractFactory; readonly parameters: Tree }
	| { readonly kind: 'node'; readonly parameters: Tree }
	| { readonly kind: 'forEach'; readonly batchSize: number; readonly returns: readonly string[] }
	| LoopShape
	/** A node that a loop region owns: its check, next, wait, or limit node. */
	| { readonly kind: 'loopPart' }
	| {
			readonly kind: 'switch';
			readonly field: string;
			readonly keys: readonly string[];
			readonly router: CaseRouter;
	  }
	| { readonly kind: 'merge'; readonly join: MergeJoin };

type Segment =
	| { readonly kind: 'step'; readonly node: NamedNode }
	| {
			readonly kind: 'branch';
			readonly node: NamedNode;
			readonly then: readonly Segment[];
			readonly else?: readonly Segment[];
	  }
	| { readonly kind: 'orElse'; readonly handler: readonly Segment[] }
	| {
			readonly kind: 'forEach' | 'loop';
			readonly node: NamedNode;
			readonly body: readonly Segment[];
	  }
	| {
			readonly kind: 'switch';
			readonly node: NamedNode;
			readonly cases: ReadonlyArray<readonly Segment[]>;
			readonly fallback?: readonly Segment[];
	  }
	| {
			readonly kind: 'merge';
			readonly node: NamedNode;
			readonly branches: ReadonlyArray<readonly Segment[]>;
	  }
	| {
			readonly kind: 'route';
			readonly node: NamedNode;
			/** The output names in n8n order, and the flow of each output that has one. */
			readonly outputs: readonly string[];
			readonly routes: ReadonlyArray<{
				readonly name: string;
				readonly segments: readonly Segment[];
			}>;
	  };

interface Chain {
	readonly segments: readonly Segment[];
	readonly tails: readonly Tail[];
}

/** A provider and the slot of its parent that it fills. */
interface Child {
	readonly slot: ProviderSlot;
	readonly node: NamedNode;
}

interface Graph {
	/** The nodes on main connections. Providers are in `children`. */
	readonly nodes: ReadonlyMap<string, NamedNode>;
	readonly edges: readonly Edge[];
	readonly shapes: ReadonlyMap<string, Shape>;
	/** The providers of each AI node and provider, by parent name. */
	readonly children: ReadonlyMap<string, readonly Child[]>;
	/** The contract shape of each provider that a contract node takes. */
	readonly providerShapes: ReadonlyMap<string, ContractShape>;
	readonly names: ReadonlySet<string>;
}

interface FlowPlan {
	readonly root: NamedNode;
	readonly segments: readonly Segment[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJson = (text: string | undefined): unknown => {
	try {
		return text === undefined ? undefined : JSON.parse(text);
	} catch {
		return undefined;
	}
};

// ── Expressions to lambdas ──────────────────────────────────────────────────

/** n8n expression text → the `$.<key>` a lambda writes for it. */
const FROM_EXPRESSION = new Map(Object.entries(BUILTINS).map(([key, text]) => [text, `$.${key}`]));

interface Rewrite {
	readonly start: number;
	readonly end: number;
	readonly text: string;
	readonly reads: 'item' | '$';
}

/**
 * The lambda text of `$("Node").item.json` and `$("Node").item.binary`, the compiled forms of
 * `$("Node")` and `$("Node").binary`.
 */
function nodeReference(node: acorn.MemberExpression, js: string): string | undefined {
	const item = node.object;
	const part = node.property.type === 'Identifier' ? node.property.name : '';
	if (node.computed || (part !== 'json' && part !== 'binary')) return undefined;
	if (item.type !== 'MemberExpression' || item.computed) return undefined;
	if (item.property.type !== 'Identifier' || item.property.name !== 'item') return undefined;
	const call = item.object;
	if (call.type !== 'CallExpression' || call.callee.type !== 'Identifier') return undefined;
	const [arg] = call.arguments;
	if (call.callee.name !== '$' || call.arguments.length !== 1 || arg?.type !== 'Literal') {
		return undefined;
	}
	const reference = `$(${js.slice(arg.start, arg.end)})`;
	return part === 'json' ? reference : `${reference}.binary`;
}

const combine = (parts: ReadonlyArray<Rewrite[] | undefined>): Rewrite[] | undefined =>
	parts.every((part) => part !== undefined) ? parts.flat() : undefined;

/** The rewrites from expression JavaScript to lambda JavaScript, or `undefined` if none fit. */
function rewritesOf(node: acorn.AnyNode, js: string): Rewrite[] | undefined {
	const at = { start: node.start, end: node.end };
	switch (node.type) {
		case 'Identifier': {
			if (node.name === '$json') return [{ ...at, text: 'item', reads: 'item' }];
			if (node.name === '$binary') return [{ ...at, text: 'item.binary', reads: 'item' }];
			const builtin = FROM_EXPRESSION.get(node.name);
			if (builtin) return [{ ...at, text: builtin, reads: '$' }];
			// Other n8n variables ($input, $node, …) have no lambda form.
			return node.name.startsWith('$') ? undefined : [];
		}
		case 'MemberExpression': {
			const reference = nodeReference(node, js);
			if (reference) return [{ ...at, text: reference, reads: '$' }];
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
			return body ? `\${${body.text}}` : escapeTemplateLiteral(part);
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

/**
 * Parameters as a tree: each expression that a lambda compiles to becomes that lambda.
 * `names` are the nodes that `$("Node")` may read. Without them, expressions stay strings.
 */
function convert(value: unknown, names?: ReadonlySet<string>): Tree {
	if (typeof value === 'string') {
		const lambda = names && value.startsWith('=') ? lambdaForExpression(value, names) : undefined;
		return lambda ? new Code(lambda) : value;
	}
	if (Array.isArray(value)) return value.map((item) => convert(item, names));
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, entry]) => entry !== undefined)
				.map(([key, entry]) => [key, convert(entry, names)]),
		);
	}
	return typeof value === 'number' || typeof value === 'boolean' ? value : null;
}

function hasRawExpression(tree: Tree): boolean {
	if (typeof tree === 'string') return tree.startsWith('=');
	if (Array.isArray(tree)) return tree.some(hasRawExpression);
	if (tree === null || typeof tree !== 'object' || tree instanceof Code || tree instanceof Call) {
		return false;
	}
	return Object.values(tree).some(hasRawExpression);
}

/** A JSON value as a tree, with every string kept as it is. */
const plainTree = (value: unknown) => convert(value);

// ── Node shapes ─────────────────────────────────────────────────────────────

/** The settings the build writes back for `node`: as the serializer, it drops unset values. */
function settingsOf(node: NodeJSON): NodeSettings {
	const {
		retryOnFail,
		maxTries,
		waitBetweenTries,
		alwaysOutputData,
		executeOnce,
		onError,
		notes,
		notesInFlow,
	} = node;
	return {
		...(retryOnFail ? { retryOnFail } : {}),
		...(typeof maxTries === 'number' ? { maxTries } : {}),
		...(typeof waitBetweenTries === 'number' ? { waitBetweenTries } : {}),
		...(alwaysOutputData ? { alwaysOutputData } : {}),
		...(executeOnce ? { executeOnce } : {}),
		...(onError === 'stopWorkflow' || onError === 'continueRegularOutput' ? { onError } : {}),
		...(notes ? { notes } : {}),
		...(notesInFlow ? { notesInFlow } : {}),
	};
}

const hasSettings = (node: NodeJSON) => Object.keys(settingsOf(node)).length > 0;

/** A region or built-in step takes no node settings, so a node with settings keeps its call. */
const isNodeType = (node: NodeJSON | undefined, type: { type: string; version: number }) =>
	node?.type === type.type &&
	node.typeVersion === type.version &&
	node.onError === undefined &&
	!hasSettings(node);

const expressionJs = (value: unknown) =>
	typeof value === 'string' ? /^=\{\{ ([\s\S]*) \}\}$/.exec(value)?.[1] : undefined;

/** The first condition of `list`, which `branch` and `filter` build with one condition. */
const firstOf = (list: unknown): unknown => (Array.isArray(list) ? list[0] : undefined);

/** The condition lambda of the IF contract that `branch` built. */
function branchShape(node: NamedNode, names: ReadonlySet<string>): Shape | undefined {
	if (!isNodeType(node, BRANCH_NODE)) return undefined;
	const where: unknown = node.parameters?.where;
	const first = firstOf(isRecord(where) ? where.conditions : undefined);
	const js = expressionJs(isRecord(first) ? first.left : undefined);
	if (js === undefined || !isEqual(branchParameters(js), node.parameters)) return undefined;
	const condition = lambdaForJs(js, names);
	return condition ? { kind: 'branch', condition } : undefined;
}

/** The compiled JavaScript of a `where` with one `trueWhere` condition. */
const trueWhereJs = (where: unknown) => {
	const first = firstOf(isRecord(where) ? where.conditions : undefined);
	return expressionJs(isRecord(first) ? first.left : undefined);
};

/** The condition lambda of the Filter contract that `filter` built. */
function filterShape(node: NamedNode, names: ReadonlySet<string>): Shape | undefined {
	if (!isNodeType(node, FILTER_NODE)) return undefined;
	const js = trueWhereJs(node.parameters?.where);
	if (js === undefined || !isEqual(filterParameters(js), node.parameters)) return undefined;
	const condition = lambdaForJs(js, names);
	return condition ? { kind: 'filter', condition } : undefined;
}

function forEachShape(node: NamedNode): Shape | undefined {
	if (!isNodeType(node, LOOP_NODE)) return undefined;
	const { batchSize, options } = node.parameters ?? {};
	const reset = isRecord(options) ? options.reset : undefined;
	const list =
		typeof reset === 'string'
			? /^=\{\{ !(\[.*\])\.includes\(\$prevNode\.name\) \}\}$/.exec(reset)?.[1]
			: undefined;
	const returns = parseJson(list);
	if (typeof batchSize !== 'number' || !Array.isArray(returns)) return undefined;
	const names = returns.filter((name): name is string => typeof name === 'string');
	return isEqual(forEachParameters(batchSize, names), node.parameters)
		? { kind: 'forEach', batchSize, returns: names }
		: undefined;
}

/** The text between `prefix` and `suffix`, or `undefined` if `text` does not fit them. */
const between = (text: unknown, prefix: string, suffix: string) =>
	typeof text === 'string' &&
	text.length >= prefix.length + suffix.length &&
	text.startsWith(prefix) &&
	text.endsWith(suffix)
		? text.slice(prefix.length, text.length - suffix.length)
		: undefined;

const WAIT_UNITS: readonly WaitUnit[] = ['seconds', 'minutes', 'hours', 'days'];

function waitOf(node: NodeJSON | undefined): Interval | undefined {
	if (!isNodeType(node, WAIT_NODE)) return undefined;
	const { amount, unit } = node?.parameters ?? {};
	const known = WAIT_UNITS.find((each) => each === unit);
	if (typeof amount !== 'number' || !known) return undefined;
	const every = { amount, unit: known };
	return isEqual(waitParameters(every), node?.parameters) ? every : undefined;
}

/** A loop region whose head is `node`, read back from the nodes that `loopFragment` names. */
function loopShape(
	node: NamedNode,
	nodes: ReadonlyMap<string, NamedNode>,
	edges: readonly Edge[],
	names: ReadonlySet<string>,
): LoopShape | undefined {
	if (!isNodeType(node, LOOP_STATE_NODE)) return undefined;
	const head = node.name;
	const parts = loopNodeNames(head);
	const every = waitOf(nodes.get(parts.wait));
	const back = every ? parts.wait : parts.next;
	if (!isEqual(loopHeadParameters(head, back), node.parameters)) return undefined;

	const check = nodes.get(parts.check);
	const cases: unknown = check?.parameters?.cases;
	const [done, limitCase] = Array.isArray(cases) ? cases : [];
	const until = trueWhereJs(isRecord(done) ? done.where : undefined);
	const limitJs = trueWhereJs(isRecord(limitCase) ? limitCase.where : undefined);
	const max = limitJs === undefined ? undefined : / >= (\d+)$/.exec(limitJs)?.[1];
	const maxIterations = Number(max);
	if (!isNodeType(check, SWITCH_NODE) || until === undefined || max === undefined) {
		return undefined;
	}
	if (!isEqual(loopCheckParameters(head, until, maxIterations), check?.parameters))
		return undefined;

	const nextNode = nodes.get(parts.next);
	const next = between(nextNode?.parameters?.state, '={{ ({ ...(', loopNextSuffix(head));
	if (!isNodeType(nextNode, LOOP_STATE_NODE) || next === undefined) return undefined;
	if (!isEqual(loopNextParameters(head, next), nextNode?.parameters)) return undefined;

	const limit = nodes.get(parts.limit);
	if (!isNodeType(limit, STOP_NODE)) return undefined;
	if (!isEqual(loopLimitParameters(head, maxIterations), limit?.parameters)) return undefined;

	const kind = 'loop';
	const base = { maxIterations, back, check: parts.check };
	const untilLambda = lambdaForJs(until, names);
	if (every) {
		return next === samePass(head) && untilLambda
			? { kind, ...base, variant: 'pollUntil', until: untilLambda, every }
			: undefined;
	}
	const nextLambda = lambdaForJs(next, names);
	if (!nextLambda) return undefined;
	const emitsLast = edges.some((edge) => edge.from === parts.check && edge.output === CHECK_DONE);
	if (!emitsLast && until === noNextPage(next)) {
		return { kind, ...base, variant: 'paginate', next: nextLambda };
	}
	return untilLambda
		? { kind, ...base, variant: 'loop', until: untilLambda, next: nextLambda }
		: undefined;
}

/** The node names a loop region owns besides its head. */
const loopParts = (head: string, shape: LoopShape) => {
	const parts = loopNodeNames(head);
	return [
		parts.check,
		parts.next,
		parts.limit,
		...(shape.variant === 'pollUntil' ? [parts.wait] : []),
	];
};

/** The Switch contract always has a fallback output; the region has a default when it connects. */
function switchShape(node: NamedNode, edges: readonly Edge[]): Shape | undefined {
	const { cases } = node.parameters ?? {};
	if (!Array.isArray(cases)) return undefined;
	const keys = cases.map((entry: unknown) => (isRecord(entry) ? entry.output : undefined));
	const first: unknown = cases[0];
	const where = isRecord(first) && isRecord(first.where) ? first.where : undefined;
	const condition = firstOf(where?.conditions);
	const left = isRecord(condition) ? condition.left : undefined;
	const quoted = between(left, '={{ $json[', '] }}');
	const field = parseJson(quoted);
	const caseKeys = keys.filter((key): key is string => typeof key === 'string');
	if (typeof field !== 'string' || caseKeys.length !== keys.length) return undefined;
	const hasDefault = edges.some(
		(edge) => edge.from === node.name && edge.output === caseKeys.length,
	);
	const router = caseRouter(field, caseKeys, hasDefault);
	return isNodeType(node, router) && isEqual(router.parameters, node.parameters)
		? { kind: 'switch', field, keys: caseKeys, router }
		: undefined;
}

function mergeShape(node: NamedNode): Shape | undefined {
	const { by } = node.parameters ?? {};
	const join: MergeJoin | undefined = !isRecord(by)
		? 'append'
		: by.by === 'position'
			? 'position'
			: typeof by.left === 'string' && typeof by.right === 'string'
				? { left: by.left, right: by.right }
				: undefined;
	return join &&
		isNodeType(node, mergeNodeOf(join)) &&
		isEqual(mergeParameters(join), node.parameters)
		? { kind: 'merge', join }
		: undefined;
}

/** A Set field: its JSON value, or the lambda that compiles to its `={{ js }}` text. */
function fieldOf(value: unknown, names: ReadonlySet<string>): Tree | undefined {
	const js = typeof value === 'string' ? /^=\{\{ ([\s\S]*) \}\}$/.exec(value)?.[1] : undefined;
	if (js === undefined)
		return typeof value === 'string' && value.startsWith('=') ? undefined : plainTree(value);
	const lambda = lambdaForJs(js, names);
	return lambda ? new Code(lambda) : undefined;
}

function setShape(node: NamedNode, names: ReadonlySet<string>): Shape | undefined {
	if (node.type !== SET_NODE.type || node.typeVersion !== SET_NODE.version || hasSettings(node)) {
		return undefined;
	}
	const parameters = node.parameters ?? {};
	const { fields, include } = parameters;
	if (!isRecord(fields) || !isRecord(include)) return undefined;
	const keepAll = include.mode === 'all';
	const converted = Object.entries(fields).flatMap(([key, value]) => {
		const tree = /[.[\]]/.test(key) ? undefined : fieldOf(value, names);
		return tree === undefined ? [] : [[key, tree] as const];
	});
	if (converted.length !== Object.keys(fields).length) return undefined;
	if (!isEqual(setParameters(fields, keepAll), parameters)) return undefined;
	return { kind: 'set', fields: Object.fromEntries(converted), keepAll };
}

type ContractShape = Extract<Shape, { kind: 'contract' }>;

const fromModelCode = (description: string) =>
	new Code(description ? `fromModel(${JSON.stringify(description)})` : 'fromModel()');

const fillsFromModel = ({ parameters }: ContractShape) =>
	isRecord(parameters) &&
	Object.values(parameters).some(
		(value) => value instanceof Code && value.text.startsWith('fromModel('),
	);

function contractShape(
	node: NamedNode,
	names: ReadonlySet<string>,
	factory: ContractFactory | undefined,
): ContractShape | undefined {
	if (factory?.version !== node.typeVersion) return undefined;
	const inputs = new Set(factory.inputKeys);
	const unknownKey = Object.keys(node.parameters ?? {}).some((key) => !inputs.has(key));
	if (factory.closed && unknownKey) return undefined;
	const takesExpression = new Set(factory.expressionKeys);
	const parameters = Object.entries(node.parameters ?? {}).flatMap(([key, value]) => {
		if (!inputs.has(key) || value === undefined) return [];
		const description = factory.tool ? fromAiDescriptionOf(value) : undefined;
		const tree: Tree =
			description === undefined ? convert(value, names) : fromModelCode(description);
		return [[key, tree] as const];
	});
	// An expression without a lambda form stays a string where the typed field takes one, and the
	// build checks it there. Elsewhere (an enum, a nested field) tsc rejects it, so keep node().
	const typed = parameters.every(
		([key, tree]) =>
			(typeof tree === 'string' && takesExpression.has(key)) || !hasRawExpression(tree),
	);
	return typed
		? { kind: 'contract', factory, parameters: Object.fromEntries(parameters) }
		: undefined;
}

/** The slot decides first, so a legacy field of another slot never reads as contract input. */
function factoryOf(node: NamedNode, factories: ReadonlyMap<string, ContractFactory>) {
	const { resource, operation } = node.parameters ?? {};
	const composed =
		typeof resource === 'string' && typeof operation === 'string'
			? factories.get(composedFactoryKey(node.type, node.typeVersion, resource, operation))
			: undefined;
	return composed ?? factories.get(node.type);
}

function shapeOf(
	node: NamedNode,
	isRoot: boolean,
	names: ReadonlySet<string>,
	factories: ReadonlyMap<string, ContractFactory>,
	regions: ReadonlyMap<string, Shape>,
	edges: readonly Edge[],
	readLegacy: LegacyReader,
): Shape {
	const region = regions.get(node.name);
	if (region) return region;
	if (isRoot) {
		const isManual =
			isNodeType(node, MANUAL_NODE) && Object.keys(node.parameters ?? {}).length === 0;
		if (isManual) return { kind: 'manual' };
		// A contract trigger, e.g. the typed Webhook node, reads back as its module factory.
		return (
			contractShape(node, names, factoryOf(node, factories)) ??
			legacyShape(node, names, readLegacy) ?? { kind: 'trigger' }
		);
	}
	return (
		branchShape(node, names) ??
		filterShape(node, names) ??
		forEachShape(node) ??
		switchShape(node, edges) ??
		mergeShape(node) ??
		setShape(node, names) ??
		// A node() item is Loose, so a lambda over it can fail tsc (an implicit any) where the
		// saved expression is correct. The expression check reads a string in place.
		contractShape(node, names, factoryOf(node, factories)) ??
		legacyShape(node, names, readLegacy) ?? {
			kind: 'node',
			parameters: plainTree(node.parameters ?? {}),
		}
	);
}

/** A legacy node that the reader maps to a factory. It keeps its JSON when tsc would reject the read. */
function legacyShape(node: NamedNode, names: ReadonlySet<string>, readLegacy: LegacyReader) {
	const read = readLegacy(node);
	return read && contractShape({ ...node, parameters: read.parameters }, names, read.factory);
}

// ── Graph to flows ──────────────────────────────────────────────────────────

/** A provider connection: `from` fills `slot` of `to`. */
interface ProviderEdge {
	readonly from: string;
	readonly slot: ProviderSlot;
	readonly to: string;
}

/**
 * Main connections, and provider connections into the first input of their slot. Others have
 * no flow form.
 */
function edgesOf(
	connections: IConnections,
): { main: Edge[]; providers: ProviderEdge[] } | undefined {
	const edges = Object.entries(connections).flatMap(([from, byType]) =>
		Object.entries(byType).flatMap(([type, outputs]) =>
			outputs.flatMap((targets, output) =>
				(targets ?? []).map((target) => ({
					from,
					output,
					to: target.node,
					input: target.index,
					slot: SLOT_OF_CONNECTION.get(type),
					fits: target.type === type && (type === 'main' || (target.index === 0 && output === 0)),
					main: type === 'main',
				})),
			),
		),
	);
	if (!edges.every(({ fits, main, slot }) => fits && (main || slot !== undefined))) {
		return undefined;
	}
	return {
		main: edges
			.filter(({ main }) => main)
			.map(({ from, output, to, input }) => ({ from, output, to, input })),
		providers: edges.flatMap(({ from, to, slot }) => (slot ? [{ from, slot, to }] : [])),
	};
}

/** Slots that take more than one provider. */
const LIST_SLOTS: ReadonlySet<ProviderSlot> = new Set(['tools']);

/**
 * Providers by parent, when they form trees under main nodes: each provider fills one slot of
 * one parent and has no main connection.
 */
function childrenOf(
	nodes: ReadonlyMap<string, NamedNode>,
	main: readonly Edge[],
	providerEdges: readonly ProviderEdge[],
): Map<string, Child[]> | undefined {
	const providerNames = new Set(providerEdges.map(({ from }) => from));
	const onMain = new Set(main.flatMap(({ from, to }) => [from, to]));
	const parentOf = new Map(providerEdges.map(({ from, to }) => [from, to]));
	const reachesMain = (name: string, depth: number): boolean => {
		const parent = parentOf.get(name);
		if (parent === undefined || depth > providerNames.size) return false;
		return providerNames.has(parent) ? reachesMain(parent, depth + 1) : true;
	};
	const fits =
		parentOf.size === providerEdges.length &&
		[...providerNames].every((name) => !onMain.has(name) && reachesMain(name, 0));
	if (!fits) return undefined;
	const children = new Map<string, Child[]>();
	for (const node of nodes.values()) {
		const edge = providerEdges.find(({ from }) => from === node.name);
		if (edge) children.set(edge.to, [...(children.get(edge.to) ?? []), { slot: edge.slot, node }]);
	}
	const crowded = [...children.values()].some((list) =>
		list.some(
			({ slot }) => !LIST_SLOTS.has(slot) && list.filter((child) => child.slot === slot).length > 1,
		),
	);
	return crowded ? undefined : children;
}

/** Node keys that the build sets, keeps from the saved workflow, or reads from `settings`. */
const KNOWN_KEYS = new Set<string>([
	'id',
	'name',
	'type',
	'typeVersion',
	'position',
	'parameters',
	'credentials',
	'webhookId',
	'onError',
	...Object.keys({
		retryOnFail: true,
		maxTries: true,
		waitBetweenTries: true,
		alwaysOutputData: true,
		executeOnce: true,
		notes: true,
		notesInFlow: true,
	} satisfies Record<Exclude<keyof NodeSettings, 'onError'>, true>),
]);

/** n8n shows a sticky note on the canvas only; the flow format has no form for it. */
const STICKY_NOTE = 'n8n-nodes-base.stickyNote';

const isPlainNode = (node: NodeJSON): node is NamedNode =>
	typeof node.name === 'string' &&
	node.type !== STICKY_NOTE &&
	Object.entries(node).every(
		([key, value]) => KNOWN_KEYS.has(key) || value === undefined || value === false,
	);

const fromTail = (edge: Edge, tail: Tail) => edge.from === tail.node && edge.output === tail.output;

const shapeKind = (graph: Graph, name: string) => graph.shapes.get(name)?.kind;

/** A return edge of a region: from the body back to its Loop Over Items or loop head. */
function isBackEdge(graph: Graph, edge: Edge): boolean {
	const shape = graph.shapes.get(edge.to);
	if (shape?.kind === 'forEach') return shape.returns.includes(edge.from);
	return shape?.kind === 'loop' && shape.back === edge.from;
}

/**
 * The edges a chain follows from `tails`. A loop part is reached only from inside its loop
 * body, where it is in `seen` and ends the body. Elsewhere its edge is not a way on.
 */
const edgesFrom = (graph: Graph, tails: readonly Tail[], seen: ReadonlySet<string>) =>
	graph.edges.filter(
		(edge) =>
			tails.some((tail) => fromTail(edge, tail)) &&
			(shapeKind(graph, edge.to) !== 'loopPart' || seen.has(edge.to)),
	);

const forwardInto = (graph: Graph, name: string) =>
	graph.edges.filter((edge) => edge.to === name && !isBackEdge(graph, edge));

function stepChain(graph: Graph, node: NamedNode, seen: ReadonlySet<string>): Chain {
	const shape = graph.shapes.get(node.name);
	const from = (output: number, inside = seen) =>
		chain(graph, [{ node: node.name, output }], inside);
	if (shape?.kind === 'branch') {
		const onTrue = from(0);
		const hasElse = graph.edges.some((edge) => edge.from === node.name && edge.output === 1);
		const onFalse = hasElse ? from(1) : undefined;
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
	if (shape?.kind === 'switch') {
		const { caseOutputs, defaultOutput } = shape.router;
		const cases = caseOutputs.map((output) => from(output));
		const fallback = defaultOutput === undefined ? undefined : from(defaultOutput);
		return {
			segments: [
				{
					kind: 'switch',
					node,
					cases: cases.map(({ segments }) => segments),
					...(fallback ? { fallback: fallback.segments } : {}),
				},
			],
			tails: [...cases, ...(fallback ? [fallback] : [])].flatMap(({ tails }) => tails),
		};
	}
	if (shape?.kind === 'forEach') {
		const body = from(LOOP_EACH);
		return {
			segments: [{ kind: 'forEach', node, body: body.segments }],
			tails: [{ node: node.name, output: LOOP_DONE }],
		};
	}
	if (shape?.kind === 'loop') {
		const body = from(0, new Set([...seen, shape.check]));
		return {
			segments: [{ kind: 'loop', node, body: body.segments }],
			tails:
				shape.variant === 'paginate' ? body.tails : [{ node: shape.check, output: CHECK_DONE }],
		};
	}
	const outputs =
		shape?.kind === 'contract' && shape.factory.outputs
			? outputNamesOf(shape.factory.outputs, node.parameters ?? {})
			: [];
	const wired = (output: number) =>
		graph.edges.some((edge) => edge.from === node.name && edge.output === output);
	if (
		outputs.length > 1 &&
		outputs.some((_name, output) => output > 0 && wired(output)) &&
		node.onError !== 'continueErrorOutput'
	) {
		// Every output but the last needs a flow in route; an unwired one continues as it is.
		const routed = outputs.flatMap((name, output) =>
			wired(output) || output < outputs.length - 1 ? [{ name, chain: from(output) }] : [],
		);
		return {
			segments: [
				{
					kind: 'route',
					node,
					outputs,
					routes: routed.map(({ name, chain: { segments } }) => ({ name, segments })),
				},
			],
			tails: routed.flatMap(({ chain: { tails } }) => tails),
		};
	}
	const main = { node: node.name, output: 0 };
	if (node.onError !== 'continueErrorOutput') {
		return { segments: [{ kind: 'step', node }], tails: [main] };
	}
	const handler = from(1);
	return {
		segments: [
			{ kind: 'step', node },
			{ kind: 'orElse', handler: handler.segments },
		],
		tails: [main, ...handler.tails],
	};
}

/**
 * Branches that start at `tails` and meet again at one Merge node, one branch per Merge
 * input. A branch that goes straight to the Merge is empty.
 */
function mergeChain(graph: Graph, tails: readonly Tail[], seen: ReadonlySet<string>): Chain {
	const none = { segments: [], tails };
	const next = edgesFrom(graph, tails, seen);
	const targets = [...new Set(next.map((edge) => edge.to))];
	const fedByAll = (target: string) =>
		tails.every((tail) => next.some((edge) => edge.to === target && fromTail(edge, tail)));
	if (targets.length === 0 || !targets.every(fedByAll)) return none;

	const merges = targets.filter((target) => shapeKind(graph, target) === 'merge');
	const directInputs = new Map(
		next
			.filter((edge) => merges.includes(edge.to))
			.map((edge) => [`${edge.to}\u0000${edge.input}`, edge]),
	);
	const direct = [...directInputs.values()].map((edge) => ({
		merge: edge.to,
		input: edge.input,
		chain: none,
	}));
	const stepped = targets
		.filter((target) => !merges.includes(target))
		.map((target) => {
			const node = graph.nodes.get(target);
			if (!node || seen.has(target) || forwardInto(graph, target).length !== tails.length) {
				return undefined;
			}
			const inner = new Set([...seen, target]);
			const own = stepChain(graph, node, inner);
			const rest = chain(graph, own.tails, inner);
			const into = edgesFrom(graph, rest.tails, inner);
			const [first] = into;
			const oneInput =
				first && into.every((edge) => edge.to === first.to && edge.input === first.input);
			return oneInput
				? {
						merge: first.to,
						input: first.input,
						chain: { segments: [...own.segments, ...rest.segments], tails: rest.tails },
					}
				: undefined;
		});
	const branches = [...direct, ...stepped];
	const [first] = branches;
	if (!first || branches.some((branch) => branch?.merge !== first.merge)) return none;
	const node = graph.nodes.get(first.merge);
	const inputs = branches
		.flatMap((branch) => (branch ? [branch] : []))
		.sort((a, b) => a.input - b.input);
	const complete = inputs.every((branch, index) => branch.input === index);
	if (!node || seen.has(node.name) || inputs.length !== 2 || !complete) return none;
	if (
		forwardInto(graph, node.name).length !== inputs.reduce((n, b) => n + b.chain.tails.length, 0)
	) {
		return none;
	}
	const inner = new Set([...seen, node.name]);
	const rest = chain(graph, [{ node: node.name, output: 0 }], inner);
	return {
		segments: [
			{ kind: 'merge', node, branches: inputs.map((branch) => branch.chain.segments) },
			...rest.segments,
		],
		tails: rest.tails,
	};
}

/** The flow from `tails` on. It stops at a node that another path also leads into. */
function chain(graph: Graph, tails: readonly Tail[], seen: ReadonlySet<string>): Chain {
	const next = edgesFrom(graph, tails, seen);
	const targets = [...new Set(next.map((edge) => edge.to))];
	const node = targets.length === 1 && targets[0] ? graph.nodes.get(targets[0]) : undefined;
	const ready =
		node !== undefined &&
		!seen.has(node.name) &&
		shapeKind(graph, node.name) !== 'merge' &&
		forwardInto(graph, node.name).length === next.length &&
		tails.every((tail) => next.some((edge) => fromTail(edge, tail)));
	if (!node || !ready) return mergeChain(graph, tails, seen);
	const inner = new Set([...seen, node.name]);
	const own = stepChain(graph, node, inner);
	const rest = chain(graph, own.tails, inner);
	return { segments: [...own.segments, ...rest.segments], tails: rest.tails };
}

const placeholderStep = (node: NamedNode): Step<unknown, unknown, unknown, string> => ({
	name: node.name,
	spec: { name: node.name, type: node.type, version: node.typeVersion, parameters: () => ({}) },
});

/** Rebuild the graph of `segments` with the flow builders, without parameters. */
function replay(
	graph: Graph,
	from: Fragment,
	segments: readonly Segment[],
): Flow<unknown, unknown> {
	const again = (body: readonly Segment[]) => (flow: Fragment) => replay(graph, flow, body);
	const end = segments.reduce<Fragment>((current, segment) => {
		const flow = new Flow<unknown, unknown>(current.graph, current.tails);
		const shape = graph.shapes.get(segment.kind === 'orElse' ? '' : segment.node.name);
		switch (segment.kind) {
			case 'step':
				return shape?.kind === 'filter'
					? filterFragment(current, segment.node.name, () => '')
					: flow.andThen(placeholderStep(segment.node));
			case 'orElse':
				return flow.orElse(again(segment.handler));
			case 'branch': {
				const { node, then, else: otherwise } = segment;
				const config = { name: node.name, if: () => true, then: again(then) };
				return otherwise ? flow.branch({ ...config, else: again(otherwise) }) : flow.branch(config);
			}
			case 'forEach':
				return shape?.kind === 'forEach'
					? forEachFragment(current, segment.node.name, shape.batchSize, again(segment.body))
					: current;
			case 'loop':
				return shape?.kind === 'loop'
					? loopFragment(
							current,
							{
								name: segment.node.name,
								maxIterations: shape.maxIterations,
								emit: shape.variant === 'paginate' ? 'each' : 'last',
								...(shape.variant === 'pollUntil' ? { wait: shape.every } : {}),
								until: () => '',
								next: () => '',
							},
							again(segment.body),
						)
					: current;
			case 'switch':
				return shape?.kind === 'switch'
					? switchFragment(
							current,
							segment.node.name,
							shape.field,
							shape.keys.map((key, index): readonly [string, (flow: Fragment) => Fragment] => [
								key,
								again(segment.cases[index] ?? []),
							]),
							segment.fallback ? again(segment.fallback) : undefined,
						)
					: current;
			case 'merge':
				return shape?.kind === 'merge'
					? mergeFragment(current, segment.node.name, shape.join, segment.branches.map(again))
					: current;
			case 'route': {
				const flows = new Map(segment.routes.map(({ name, segments }) => [name, again(segments)]));
				return routeFragment(
					current,
					{ ...placeholderStep(segment.node), outputs: segment.outputs },
					(output, flow) => flows.get(output)?.(flow),
					[...flows.keys()],
				);
			}
		}
	}, from);
	return new Flow(end.graph, end.tails);
}

/** The flows build the saved graph: the same nodes, edges, and error outputs. */
function replaysGraph(graph: Graph, flows: readonly FlowPlan[]): boolean {
	const built = flows.map(
		({ root, segments }) =>
			replay(
				graph,
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
			new Set(
				saved.filter(({ onError }) => onError === 'continueErrorOutput').map(({ name }) => name),
			),
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
	if (tree instanceof Call) return `${tree.callee}(${renderTree(tree.argument, indent)})`;
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

/** The `providers` of a node, in slot order, or `undefined` when it has none. */
function providersTree(graph: Graph, name: string): Tree | undefined {
	const children = graph.children.get(name) ?? [];
	if (children.length === 0) return undefined;
	const call = (child: NamedNode): Tree =>
		new Call('provider', typedNode(graph, child, plainTree(child.parameters ?? {})));
	return Object.fromEntries(
		PROVIDER_SLOTS.flatMap(([slot]) => {
			const filled = children.filter((child) => child.slot === slot).map(({ node }) => call(node));
			if (filled.length === 0) return [];
			return [[slot, LIST_SLOTS.has(slot) ? filled : filled[0]]];
		}),
	);
}

/** The `settings` field of a node call, when the node has settings. */
const settingsField = (node: NodeJSON): { settings?: Tree } =>
	hasSettings(node) ? { settings: plainTree(settingsOf(node)) } : {};

function typedNode(graph: Graph, node: NamedNode, parameters: Tree): Tree {
	const providers = providersTree(graph, node.name);
	return {
		name: node.name,
		type: node.type,
		version: node.typeVersion,
		...(isRecord(parameters) && Object.keys(parameters).length === 0 ? {} : { parameters }),
		...settingsField(node),
		...(providers ? { providers } : {}),
	};
}

/**
 * A contract node call. A contract root node takes each contract provider in the input field
 * named by its slot, e.g. `model: openAi.chatModel({ … })`.
 */
function contractCall(graph: Graph, node: NamedNode, shape: ContractShape): Call {
	const parameters = isRecord(shape.parameters) ? shape.parameters : {};
	const children = graph.children.get(node.name) ?? [];
	const fields = PROVIDER_SLOTS.flatMap(([slot]) => {
		const calls = children.flatMap(({ slot: own, node: child }) => {
			const childShape = own === slot ? graph.providerShapes.get(child.name) : undefined;
			return childShape ? [contractCall(graph, child, childShape)] : [];
		});
		if (calls.length === 0) return [];
		return [[slot, LIST_SLOTS.has(slot) ? calls : calls[0]] as const];
	});
	const providers = shape.factory.groupsProviders
		? fields.length > 0
			? { providers: Object.fromEntries(fields) }
			: {}
		: Object.fromEntries(fields);
	return new Call(`${shape.factory.module}.${shape.factory.path}`, {
		name: node.name,
		...parameters,
		...providers,
		...settingsField(node),
	});
}

function renderCall(graph: Graph, node: NamedNode, shape: Shape, indent: string): string {
	switch (shape.kind) {
		case 'manual':
			return `manual({ name: ${JSON.stringify(node.name)} })`;
		case 'trigger':
			return `trigger(${renderTree(typedNode(graph, node, plainTree(node.parameters ?? {})), indent)})`;
		case 'set': {
			const config = {
				name: node.name,
				fields: shape.fields,
				...(shape.keepAll ? { keep: 'all' } : {}),
			};
			return `set(${renderTree(config, indent)})`;
		}
		case 'contract':
			return renderTree(contractCall(graph, node, shape), indent);
		case 'node':
			return `node(${renderTree(typedNode(graph, node, shape.parameters), indent)})`;
		default:
			// A region renders as a flow method, not as a step.
			return '';
	}
}

/** The method call of a region segment, such as `.forEach({ … })`. */
function renderRegion(
	graph: Graph,
	segment: Exclude<Segment, { kind: 'step' | 'orElse' }>,
	indent: string,
): string {
	const shape = graph.shapes.get(segment.node.name);
	const inner = indent + INDENT + INDENT;
	const flowOf = (param: string, body: readonly Segment[], at = inner) =>
		new Code(`(${param}) => ${param}${renderSegments(graph, body, at)}`);
	const call = (method: string, config: Tree) =>
		`\n${indent}.${method}(${renderTree(config, indent)})`;
	const name = segment.node.name;
	if (segment.kind === 'branch' && shape?.kind === 'branch') {
		return call('branch', {
			name,
			if: new Code(shape.condition),
			then: flowOf('flow', segment.then),
			...(segment.else ? { else: flowOf('flow', segment.else) } : {}),
		});
	}
	if (segment.kind === 'forEach' && shape?.kind === 'forEach') {
		return call('forEach', {
			name,
			batchSize: shape.batchSize,
			body: flowOf('each', segment.body),
		});
	}
	if (segment.kind === 'loop' && shape?.kind === 'loop') {
		const max = shape.maxIterations;
		switch (shape.variant) {
			case 'loop':
				return call('loop', {
					name,
					maxIterations: max,
					body: flowOf('pass', segment.body),
					until: new Code(shape.until),
					next: new Code(shape.next),
				});
			case 'paginate':
				return call('paginate', {
					name,
					maxPages: max,
					request: flowOf('page', segment.body),
					next: new Code(shape.next),
				});
			case 'pollUntil':
				return call('pollUntil', {
					name,
					maxAttempts: max,
					every: { ...shape.every },
					attempt: flowOf('attempt', segment.body),
					until: new Code(shape.until),
				});
		}
	}
	if (segment.kind === 'switch' && shape?.kind === 'switch') {
		const cases = shape.keys.map((key, index) => [key, flowOf('flow', segment.cases[index] ?? [])]);
		return call('switch', {
			name,
			on: shape.field,
			cases: Object.fromEntries(cases),
			...(segment.fallback ? { default: flowOf('flow', segment.fallback) } : {}),
		});
	}
	if (segment.kind === 'route' && shape) {
		const routes = Object.fromEntries(
			segment.routes.map(({ name: output, segments }) => [output, flowOf('flow', segments)]),
		);
		return `\n${indent}.route(${renderCall(graph, segment.node, shape, indent)}, ${renderTree(routes, indent)})`;
	}
	if (segment.kind === 'merge' && shape?.kind === 'merge') {
		return call('merge', {
			name,
			join: typeof shape.join === 'string' ? shape.join : { ...shape.join },
			branches: segment.branches.map((branch) => flowOf('flow', branch, inner + INDENT)),
		});
	}
	return '';
}

function renderSegments(graph: Graph, segments: readonly Segment[], indent: string): string {
	return segments
		.map((segment) => {
			if (segment.kind === 'orElse') {
				return `\n${indent}.orElse((failed) => failed${renderSegments(graph, segment.handler, indent + INDENT)})`;
			}
			if (segment.kind !== 'step') return renderRegion(graph, segment, indent);
			const shape = graph.shapes.get(segment.node.name);
			if (shape?.kind === 'filter') {
				const config = { name: segment.node.name, if: new Code(shape.condition) };
				return `\n${indent}.filter(${renderTree(config, indent)})`;
			}
			return shape ? `\n${indent}.andThen(${renderCall(graph, segment.node, shape, indent)})` : '';
		})
		.join('');
}

const HELPERS = ['workflow', 'manual', 'trigger', 'set', 'node', 'provider', 'fromModel'];

function segmentNodes(segments: readonly Segment[]): NamedNode[] {
	return segments.flatMap((segment) => {
		switch (segment.kind) {
			case 'orElse':
				return segmentNodes(segment.handler);
			case 'step':
				return [segment.node];
			case 'branch':
				return [segment.node, ...segmentNodes(segment.then), ...segmentNodes(segment.else ?? [])];
			case 'forEach':
			case 'loop':
				return [segment.node, ...segmentNodes(segment.body)];
			case 'switch':
				return [
					segment.node,
					...segment.cases.flatMap(segmentNodes),
					...segmentNodes(segment.fallback ?? []),
				];
			case 'merge':
				return [segment.node, ...segment.branches.flatMap(segmentNodes)];
			case 'route':
				return [
					segment.node,
					...segment.routes.flatMap(({ segments: inner }) => segmentNodes(inner)),
				];
		}
	});
}

function render(name: string, graph: Graph, flows: readonly FlowPlan[]): string {
	const shapes = flows
		.flatMap(({ root, segments }) => [root, ...segmentNodes(segments)])
		.flatMap((node) => {
			const shape = graph.shapes.get(node.name);
			return shape ? [shape] : [];
		});
	const legacyChildren = [...graph.children.values()]
		.flat()
		.some(({ node }) => !graph.providerShapes.has(node.name));
	const kinds = new Set<string>([
		'workflow',
		...shapes.map(({ kind }) => kind),
		...(legacyChildren ? ['provider'] : []),
		...([...graph.providerShapes.values()].some(fillsFromModel) ? ['fromModel'] : []),
	]);
	const factories = [
		...new Map(
			[...shapes, ...graph.providerShapes.values()]
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
		return `${INDENT}${renderCall(graph, root, shape, INDENT)}${renderSegments(graph, segments, indent)},`;
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
 * cannot express it (for example a sticky note, or a disabled node). Node settings such as
 * `retryOnFail` read back as `settings`. Loop Over Items, Switch, Filter, and Merge nodes
 * read back as regions when their wiring and parameters are what the region builds.
 * `node()` and `provider()` parameters keep their expressions as strings. `factories` maps
 * each contract node type, and each `composedFactoryKey`, to its typed module factory.
 * `readLegacy` reads other legacy nodes as factory calls, e.g. the nodes of derived modules.
 */
export function decompileWorkflow(
	json: WorkflowJSON,
	factories: ReadonlyMap<string, ContractFactory>,
	readLegacy: LegacyReader = () => undefined,
): string | undefined {
	const edges = edgesOf(json.connections ?? {});
	const plain = json.nodes.filter(isPlainNode);
	const all = new Map(plain.map((node) => [node.name, node]));
	const fits =
		edges !== undefined &&
		plain.length === json.nodes.length &&
		all.size === plain.length &&
		(json.nodeGroups?.length ?? 0) === 0 &&
		[...edges.main, ...edges.providers].every((edge) => all.has(edge.from) && all.has(edge.to));
	const children = fits ? childrenOf(all, edges.main, edges.providers) : undefined;
	if (!edges || !children) return undefined;
	const providerNames = new Set(edges.providers.map(({ from }) => from));
	const mainNodes = plain.filter((node) => !providerNames.has(node.name));
	const nodes = new Map(mainNodes.map((node) => [node.name, node]));
	const names = new Set(nodes.keys());
	const targets = new Set(edges.main.map(({ to }) => to));
	const loops = mainNodes.flatMap((node) => {
		const shape = loopShape(node, nodes, edges.main, names);
		return shape ? [{ head: node.name, shape }] : [];
	});
	const regions = new Map<string, Shape>([
		...loops.map(({ head, shape }): [string, Shape] => [head, shape]),
		...loops.flatMap(({ head, shape }) =>
			loopParts(head, shape).map((part): [string, Shape] => [part, { kind: 'loopPart' }]),
		),
	]);
	const shapes = new Map(
		mainNodes.map((node) => [
			node.name,
			shapeOf(node, !targets.has(node.name), names, factories, regions, edges.main, readLegacy),
		]),
	);
	// A provider of a contract node is a contract provider, and node() takes legacy providers only.
	// A derived node takes derived providers, so the legacy reader reads its providers.
	const providerEntries = (parent: string, derived: boolean): Array<[string, ContractShape]> =>
		(children.get(parent) ?? []).flatMap(({ node }) => {
			const shape =
				contractShape(node, names, factoryOf(node, factories)) ??
				(derived ? legacyShape(node, names, readLegacy) : undefined);
			return [
				...(shape ? [[node.name, shape] satisfies [string, ContractShape]] : []),
				...providerEntries(node.name, shape?.factory.groupsProviders === true),
			];
		});
	const providerShapes = new Map(
		mainNodes.flatMap((node) => {
			const shape = shapes.get(node.name);
			return providerEntries(
				node.name,
				shape?.kind === 'contract' && shape.factory.groupsProviders === true,
			);
		}),
	);
	const isContract = (parent: string) =>
		providerNames.has(parent)
			? providerShapes.has(parent)
			: shapes.get(parent)?.kind === 'contract';
	const hosted = [...children].every(([parent, list]) =>
		isContract(parent)
			? list.every(({ node }) => providerShapes.has(node.name))
			: (providerNames.has(parent) || shapes.get(parent)?.kind === 'node') &&
				list.every(({ node }) => !providerShapes.has(node.name)),
	);
	if (!hosted) return undefined;
	const graph: Graph = { nodes, edges: edges.main, shapes, children, providerShapes, names };
	const flows = mainNodes
		.filter((node) => !targets.has(node.name))
		.map((root) => ({
			root,
			segments: chain(graph, [{ node: root.name, output: 0 }], new Set([root.name])).segments,
		}));
	if (flows.length === 0 || !replaysGraph(graph, flows)) return undefined;
	return render(json.name, graph, flows);
}

const NODE_TYPE_CALLS = new Set(['node', 'provider', 'trigger']);

/**
 * The node name and 1-based line of each `…({ name: '…' })` call, in source order, and the
 * `type` that a `node()`, `provider()` or `trigger()` call names. A typed step can have an
 * input field named `type`, which is not a node type.
 */
export function locateNextNodes(
	source: string,
): Array<{ name: string; line: number; type?: string }> {
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
		const literal = (key: string) => {
			const property = config.properties.find(
				(each) =>
					each.type === 'Property' &&
					!each.computed &&
					each.key.type === 'Identifier' &&
					each.key.name === key,
			);
			const value = property?.type === 'Property' ? property.value : undefined;
			return value?.type === 'Literal' && typeof value.value === 'string' ? value.value : undefined;
		};
		const name = literal('name');
		const type =
			call.callee.type === 'Identifier' && NODE_TYPE_CALLS.has(call.callee.name)
				? literal('type')
				: undefined;
		// A chained call such as `.branch({…})` starts where the flow before it starts.
		const at = call.callee.type === 'MemberExpression' ? call.callee.property : call;
		return name !== undefined && at.loc
			? [{ name, line: at.loc.start.line, ...(type === undefined ? {} : { type }) }]
			: [];
	});
}
