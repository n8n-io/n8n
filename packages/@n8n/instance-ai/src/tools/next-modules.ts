/**
 * Discovery over the typed node modules of the first-party contract packages. The agent imports a
 * module as `@n8n/nodes/<nodeId>`, and `tsc` checks the workflow against the same text.
 */
import {
	connectionsOf,
	deriveModuleVersion,
	outputSchemaFrom,
	readLegacyParameters,
	toGeneratedAction,
	type DerivedAction,
} from '@n8n/node-contract-compat';
import { isRecord } from '@n8n/utils/is-record';
import { once } from '@n8n/utils/once';
import { sublimeSearch } from '@n8n/utils/search/sublime-search';
import type { OutputSchemaLookup } from '@n8n/workflow-sdk';
import { FIRST_PARTY_PACKAGES, type ContractRead } from '@n8n/workflow-sdk/next';
import { isNodeParameters, type INodeTypeDescription, type INodeTypes } from 'n8n-workflow';
import type { Action } from '@n8n/node-sdk';
import {
	generatedTriggersOfEntry,
	generateNodeModule,
	providedKindOf,
	PROVIDER_CONNECTIONS,
	toTs,
	type GeneratedAction,
} from '@n8n/node-sdk/codegen';
import { toContract } from '@n8n/node-sdk/registry';

import {
	contractActions,
	firstPartyCatalog,
	isContractNodeType,
	migratedTargetOf,
	nodeTypeOf,
	toolActions,
	toolTypeOf,
} from './contract-catalog';

/** Every action, as the sandbox modules and get-as-code read them. */
export const nextActions = (): readonly Action[] => contractActions();

/**
 * Module actions that a flow step emits with better types, with the catalog node type of that
 * step in `CORE_NODE_STEPS`. Discovery does not offer them. The sandbox module keeps them, so a
 * source that get-as-code reads back still builds.
 */
const FLOW_STEP_OF_ACTION: ReadonlyMap<string, string> = new Map([
	['items.set', 'n8n-nodes-base.set'],
	['merge.append', 'n8n-nodes-base.merge'],
	['merge.combine', 'n8n-nodes-base.merge'],
	['merge.combineByPosition', 'n8n-nodes-base.merge'],
	['loopState.set', 'n8n-nodes-base.splitInBatches'],
]);

/** The actions that discovery offers. */
const offeredActions = once(() => nextActions().filter(({ id }) => !FLOW_STEP_OF_ACTION.has(id)));

/**
 * The native contracts that a construct of the typed flow emits, so no module has a factory for
 * them: `manual()` emits the Manual Trigger, and `forEach` emits Loop Over Items.
 */
const FLOW_NATIVES: ReadonlySet<string> = new Set(['manual.trigger', 'loop.batches']);

/** A trigger of a module, from its manifest: a trigger with a bundle, or a native trigger. */
interface ModuleTrigger {
	readonly id: string;
	readonly node: { readonly id: string; readonly displayName: string };
	readonly trigger: string;
	readonly summary: string;
	/** The node type of a trigger with a bundle, e.g. `@n8n/nodes-integrations.githubRepositoryEvent`. */
	readonly nodeType: string;
	/** The legacy node types that a native trigger and its reply step emit. */
	readonly nativeTypes: readonly string[];
	/** The factories of the trigger and of the reply step of a native trigger. */
	readonly factories: readonly GeneratedAction[];
}

export interface NextNodeModule {
	readonly node: string;
	readonly import: string;
	readonly module: string;
}

/** The triggers of all modules, from the catalog. */
const allTriggers: readonly ModuleTrigger[] = firstPartyCatalog().entries.flatMap((entry) => {
	const { manifest, nodeType } = entry;
	const { contract } = manifest;
	if (manifest.kind !== 'trigger' || FLOW_NATIVES.has(manifest.id)) return [];
	const nativeTypes =
		'native' in manifest
			? [manifest.native.type, ...(manifest.reply ? [manifest.reply.native.type] : [])]
			: [];
	return [
		{
			id: manifest.id,
			node: { id: contract.node, displayName: contract.nodeDisplayName },
			trigger: contract.action,
			summary: contract.summary,
			nodeType,
			nativeTypes,
			factories: generatedTriggersOfEntry(entry),
		},
	];
});

/** The ids of the typed node modules that discovery offers: `@n8n/nodes/<id>`. */
export const nextNodeIds: readonly string[] = [
	...new Set([
		...firstPartyCatalog().entries.flatMap(({ manifest }) => {
			const offered =
				'bundleHash' in manifest &&
				manifest.kind !== 'trigger' &&
				!FLOW_STEP_OF_ACTION.has(manifest.id);
			return offered ? [manifest.contract.node] : [];
		}),
		...allTriggers.map(({ node }) => node.id),
	]),
];

const actionsOfNode = (nodeId: string) =>
	offeredActions().filter((action) => action.node.id === nodeId);

const triggersOfNode = (nodeId: string) =>
	allTriggers.filter((trigger) => trigger.node.id === nodeId);

/** An action that owns a slot of a composed node emits that node, e.g. Notion v4. */
function generatedActionOf(action: Action): GeneratedAction {
	const { resource, operation, ui } = action;
	const contract = toContract(action);
	const target = migratedTargetOf(action);
	if (!target) return { contract, nodeType: nodeTypeOf(action), resource, operation, ui };
	const { nodeType, ...slot } = target;
	return { contract, nodeType, resource, operation, slot, ui };
}

/** The trigger factories of all modules, with the reply steps of native triggers. */
export const nextTriggerFactories: readonly GeneratedAction[] = allTriggers.flatMap(
	({ factories }) => factories,
);

/** A module has the given actions and every trigger of the node: a workflow starts at one. */
const moduleOf = (nodeId: string, own: readonly Action[]) =>
	generateNodeModule(nodeId, [
		...own.map(generatedActionOf),
		...triggersOfNode(nodeId).flatMap(({ factories }) => factories),
	]);

/** The sandbox module: every action and trigger of one node, also the actions discovery hides. */
export function nodeModuleText(nodeId: string): string | undefined {
	const own = nextActions().filter((action) => action.node.id === nodeId);
	return own.length || triggersOfNode(nodeId).length ? moduleOf(nodeId, own) : undefined;
}

/**
 * The node id for a node id, an action id, an executable node type of a contract package, or a
 * legacy node type that a native trigger types.
 */
function nextNodeIdOf(ref: string): string | undefined {
	return (
		nextActions().find(
			(action) => action.node.id === ref || action.id === ref || nodeTypeOf(action) === ref,
		)?.node.id ??
		allTriggers.find(
			(trigger) =>
				trigger.node.id === ref ||
				trigger.id === ref ||
				trigger.nodeType === ref ||
				trigger.nativeTypes.includes(ref),
		)?.node.id ??
		toolActions().find((action) => toolTypeOf(action) === ref)?.node.id
	);
}

/**
 * The module that discovery offers for a node id (`notion`), an action id, or a node type of a
 * contract package. A ref to an action that a flow step replaces has none.
 */
export function nextNodeModule(ref: string): NextNodeModule | undefined {
	const nodeId = nextNodeIdOf(ref);
	if (nodeId === undefined || flowStepRowOf(ref) !== undefined) return undefined;
	const own = actionsOfNode(nodeId);
	if (!own.length && !triggersOfNode(nodeId).length) return undefined;
	const module = moduleOf(nodeId, own);
	return { node: nodeId, import: `import { ${nodeId} } from '@n8n/nodes/${nodeId}';`, module };
}

/**
 * The SDK step row for a ref to a module action that a flow step replaces: its action id, its
 * node type, or a node id without other actions, e.g. `loopState`.
 */
export function flowStepRowOf(ref: string): string | undefined {
	const replaced = nextActions().find(
		(action) =>
			FLOW_STEP_OF_ACTION.has(action.id) &&
			(action.id === ref ||
				nodeTypeOf(action) === ref ||
				(action.node.id === ref && !stepsOfNode(ref).length)),
	);
	const nodeType = replaced && FLOW_STEP_OF_ACTION.get(replaced.id);
	return nodeType === undefined ? undefined : coreStepRowOf(nodeType);
}

interface ActionLine {
	readonly id: string;
	readonly action: string;
	readonly flow: { readonly effect: string; readonly cardinality: string };
}

const inputTypeOf = (action: ActionLine) => `${action.id.split('.').map(capitalize).join('')}Input`;

const otherActionLine = (action: ActionLine) =>
	`// ${action.id}(config: ${inputTypeOf(action)}) — ${action.action} (${action.flow.effect}, ${action.flow.cardinality})`;

/** A search view types at most this many actions of a module; the rest are one line each. */
const MAX_TYPED_ACTIONS = 3;

/**
 * The search view of a module: the first `shown` actions (or the first actions, when none is
 * shown) with their types, and one line for each other action. The view is a valid module with
 * fewer factories, so the agent can copy it. The sandbox module keeps all actions.
 */
export function nextNodeView(
	nodeId: string,
	shown: ReadonlySet<string>,
): NextNodeModule | undefined {
	const full = nextNodeModule(nodeId);
	const own = actionsOfNode(nodeId);
	const named = own.filter((action) => shown.has(action.id));
	const typed = (named.length ? named : own).slice(0, MAX_TYPED_ACTIONS);
	const others = own.filter((action) => !typed.includes(action));
	if (!full || !others.length) return full;
	const module = [
		moduleOf(nodeId, typed),
		`// Other actions. Get their types with type-definition "${nodeId}".`,
		...others.map(otherActionLine),
		'',
	].join('\n');
	return { ...full, module };
}

/** The module node of a native trigger that types the legacy node type, e.g. `webhook`. */
const nativeNodeIdOf = (nodeType: string) =>
	allTriggers.find((trigger) => trigger.nativeTypes.includes(nodeType))?.node.id;

/**
 * The module node that replaces a catalog node type. The legacy node of the same service
 * shares the node id, e.g. `n8n-nodes-base.notion` and `notion`.
 */
export function nextNodeIdOfNodeType(nodeType: string): string | undefined {
	if (isContractNodeType(nodeType)) return nextNodeIdOf(nodeType);
	// The tool variant of a legacy node goes with its node, e.g. `slackTool` with `slack`.
	const toolOf = nodeType.endsWith('Tool') ? nodeType.slice(0, -'Tool'.length) : undefined;
	const toolNodeId = toolOf && nextNodeIdOfNodeType(toolOf);
	if (toolNodeId) return toolNodeId;
	const native = nativeNodeIdOf(nodeType);
	if (native) return native;
	const replacing = nextActions().find(({ node }) => node.replaces?.includes(nodeType));
	if (replacing) return replacing.node.id;
	const [, nodeId] = /^n8n-nodes-base\.(\w+)$/.exec(nodeType) ?? [];
	return nodeId !== undefined && actionsOfNode(nodeId).length ? nodeId : undefined;
}

/** The contract actions that can do the job of a legacy node. */
export interface ContractReplacement {
	readonly nodeId: string;
	readonly actions: readonly Action[];
	/** The actions run the same resource and operation, so the node has one replacement. */
	readonly exact: boolean;
}

/** The factory of an action in its module, e.g. `databasePage.getAll` of `notion`. */
export const factoryPathOf = (action: Pick<Action, 'resource' | 'operation'>) =>
	[action.resource, action.operation].filter(Boolean).join('.');

const LEGACY_TYPE = /^(?:n8n-nodes-base|@n8n\/n8n-nodes-langchain)\.(\w+)$/;

/** The nodes whose actions each replace the legacy node of the action name, e.g. `items.sort`. */
const LEGACY_NAMED_NODE_IDS: readonly string[] = ['condition', 'items'];

/**
 * The contract actions that replace a legacy node. The legacy node of a service shares the node
 * id (`n8n-nodes-base.gmail` and `gmail`), a condition or items action shares the legacy node name
 * (`n8n-nodes-base.sort` and `items.sort`), and the resource and operation must match where the
 * actions have them.
 */
export function contractReplacementOf(node: {
	readonly type: string;
	readonly parameters?: unknown;
}): ContractReplacement | undefined {
	const [, name] = LEGACY_TYPE.exec(node.type) ?? [];
	if (name === undefined) return undefined;
	const named = offeredActions().find(
		(action) => LEGACY_NAMED_NODE_IDS.includes(action.node.id) && action.operation === name,
	);
	if (named) return { nodeId: named.node.id, actions: [named], exact: true };
	const own = actionsOfNode(name);
	if (own.length === 0) return undefined;
	const { resource, operation } = isRecord(node.parameters) ? node.parameters : {};
	const slotted = own.filter((action) => action.resource !== undefined);
	if (slotted.length === 0 || typeof resource !== 'string' || typeof operation !== 'string') {
		return { nodeId: name, actions: own, exact: false };
	}
	const same = slotted.filter(
		(action) => action.resource === resource && action.operation === operation,
	);
	return same.length > 0 ? { nodeId: name, actions: same, exact: true } : undefined;
}

export const actionRow = (action: Action) => `${action.id}: ${action.summary}`;

export const actionRowsOfNode = (nodeId: string) => actionsOfNode(nodeId).map(actionRow);

/** Steps and macros of `@n8n/workflow-sdk/next` that replace a core node, by SDK name. */
export const CORE_NODE_STEPS: ReadonlyArray<{
	readonly nodeType: string;
	readonly steps: readonly string[];
	readonly row: string;
}> = [
	{
		nodeType: 'n8n-nodes-base.manualTrigger',
		steps: ['manual'],
		row: "manual({ name, sample }): Starts the flow when the user clicks Execute. Import it from '@n8n/workflow-sdk/next'.",
	},
	{
		nodeType: 'n8n-nodes-base.set',
		steps: ['set'],
		row: "set({ name, fields, keep?, settings? }): Sets fields on each item; a key 'a.b' sets a nested field. keep: 'all' | { selected: ['id', 'a.b'] } | { except: [...] } keeps input fields. Import it from '@n8n/workflow-sdk/next'.",
	},
	{
		nodeType: 'n8n-nodes-base.if',
		steps: ['when'],
		row: 'when({ name, if: (item) => boolean }, { then: part, else: part }): Routes each item by a condition (an IF node).',
	},
	{
		nodeType: 'n8n-nodes-base.filter',
		steps: ['filter'],
		row: 'filter({ name, if: (item) => boolean }): Keeps the items that the condition holds for.',
	},
	{
		nodeType: 'n8n-nodes-base.switch',
		steps: ['switchOn'],
		row: "switchOn({ name, on: 'field' }, { value: part, fallback: part }): Routes each item by a string field.",
	},
	{
		nodeType: 'n8n-nodes-base.merge',
		steps: ['merge'],
		row: "merge({ name, join: 'append' | 'position' | { left, right } }, [part, part, …]): Runs 2 to 10 branches on the same items and joins them; { left, right } joins 2.",
	},
	{
		nodeType: 'n8n-nodes-base.splitInBatches',
		steps: ['forEach', 'loop'],
		row: "forEach({ name, batchSize }, body) runs batches; loop({ name, maxIterations, until, next?, onLimit? }, body) repeats a body until a condition holds; onLimit: 'continue' ends it at maxIterations.",
	},
	{
		nodeType: 'n8n-nodes-base.splitOut',
		steps: ['splitOut'],
		row: "splitOut({ name, field }): Emits one item for each element of a list field; field is a dot path, e.g. 'body.orders'. Import it from '@n8n/workflow-sdk/next'.",
	},
];

/** The SDK step row that replaces a core node type. A typed native trigger comes first. */
export function coreStepRowOf(nodeType: string): string | undefined {
	if (nativeNodeIdOf(nodeType)) return undefined;
	return CORE_NODE_STEPS.find((step) => step.nodeType === nodeType)?.row;
}

const words = (text: string) =>
	text
		.replace(/([a-z\d])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.split(/[^a-z\d]+/)
		.filter(Boolean);

/** `long` is a form of `short`: a short ending ("sheet", "sheets") or "-ing" ("send", "sending"). */
const isWordForm = (long: string, short: string) =>
	long.startsWith(short) &&
	(long.length - short.length <= 2 ||
		(short.length >= 4 && long.length - short.length === 3 && long.endsWith('ing')));

/**
 * Short query words ("a", "to") match too much prose, so they only match whole words. A longer
 * word matches its word forms, not another word: "database" does not name "data", and "append"
 * does not name WhatsApp by "app".
 */
const hits = (term: string, vocabulary: readonly string[]) =>
	vocabulary.some(
		(word) =>
			word === term ||
			(term.length >= 3 && word.length >= 3 && (isWordForm(word, term) || isWordForm(term, word))),
	);

/** An action or a trigger of a module, as the search reads it. */
type Step = Pick<Action, 'id' | 'summary'> & {
	readonly node: Pick<Action['node'], 'id' | 'displayName'>;
} & ({ readonly action: string } | { readonly trigger: string });

const nodeWords = (step: Step) => words(`${step.node.id} ${step.node.displayName}`);

const actionWords = (step: Step) =>
	words(`${step.id} ${'action' in step ? step.action : step.trigger} ${step.summary}`);

const stepsOfNode = (nodeId: string) => [...actionsOfNode(nodeId), ...triggersOfNode(nodeId)];

/**
 * Words that alone name no node: "trigger" names a kind of step ("webhook trigger" names only
 * `webhook`), and "items" and "condition" name what most steps handle ("split out items" names
 * the `splitOut` step, not the `items` node). Their word forms also name no node.
 */
const GENERIC_WORDS = ['trigger', 'items', 'condition'];

const scoreOf = (action: Action, terms: readonly string[]) =>
	terms.reduce(
		(total, term) =>
			total + (hits(term, nodeWords(action)) ? 2 : hits(term, actionWords(action)) ? 1 : 0),
		0,
	);

/** Words that join other words name no node, e.g. the "and" of "Stop and Error". */
const JOINING_WORDS = new Set(['and', 'or', 'the', 'for', 'with', 'from', 'into', 'then']);

const termsOf = (query: string) =>
	words(query).filter((term) => term.length >= 2 && !JOINING_WORDS.has(term));

/**
 * The actions of a node that the query names beyond the node name, e.g. `send` in
 * "gmail send message". All actions of the node when the query names none.
 */
function actionsNamedBy(nodeId: string, terms: readonly string[]): Action[] {
	const own = actionsOfNode(nodeId);
	const actionTerms = terms.filter((term) => !own.some((action) => hits(term, nodeWords(action))));
	const scored = own.map((action) => ({
		action,
		score: actionTerms.filter((term) => hits(term, actionWords(action))).length,
	}));
	const best = Math.max(0, ...scored.map(({ score }) => score));
	return best ? scored.filter(({ score }) => score === best).map(({ action }) => action) : own;
}

/** Actions that share words with the query. Node words weigh more than action words. */
export function findNextActions(query: string): Action[] {
	const terms = termsOf(query);
	return offeredActions()
		.map((action) => ({ action, score: scoreOf(action, terms) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ action }) => action);
}

const MAX_OTHER_ACTIONS = 3;

/**
 * One search query: the nodes whose module the query names, the ids of their actions that
 * the query names, and one-line rows for other matching actions. `coveredNodes` are module
 * nodes that the catalog search found, and `namedNodes` those of them that the query names by
 * their catalog display name. `coversQuery` is true when the named modules match every query word.
 * When the query names a module, other actions match only generic words such as "get",
 * so they are not listed.
 */
export function searchNextActions(
	query: string,
	coveredNodes: readonly string[] = [],
	namedNodes: readonly string[] = [],
) {
	const terms = termsOf(query);
	const matches = findNextActions(query);
	// Nodes with only triggers have no actions to match, so every node is a candidate.
	const named = [...new Set([...matches.map((action) => action.node.id), ...nextNodeIds])]
		.map((nodeId) => ({
			nodeId,
			terms: terms.filter((term) => stepsOfNode(nodeId).some((s) => hits(term, nodeWords(s)))),
		}))
		.filter(({ terms: own }) => own.some((term) => !hits(term, GENERIC_WORDS)));
	// "google sheets" names googleSheets, not also googleGemini through "google" alone.
	// A node with only triggers yields to a node with actions that the query names by the same
	// words: "google sheets" names googleSheets, "google sheets trigger" names googleSheetsTrigger.
	const yieldsTo = (own: (typeof named)[number], other: (typeof named)[number]) =>
		own.terms.every((term) => other.terms.includes(term)) &&
		(other.terms.length > own.terms.length ||
			(actionsOfNode(own.nodeId).length === 0 && actionsOfNode(other.nodeId).length > 0));
	const nodes = [
		...new Set([
			...named
				.filter((own) => !named.some((other) => yieldsTo(own, other)))
				.map(({ nodeId }) => nodeId),
			...namedNodes.filter((nodeId) => stepsOfNode(nodeId).length > 0),
		]),
	];
	const others = nodes.length
		? []
		: [...new Set([...matches, ...coveredNodes.flatMap(actionsOfNode)])];
	const moduleActions = nodes.flatMap(stepsOfNode);
	return {
		nodes,
		actions: nodes.flatMap((nodeId) => actionsNamedBy(nodeId, terms).map(({ id }) => id)),
		otherActions: others.slice(0, MAX_OTHER_ACTIONS).map(actionRow),
		coversQuery:
			nodes.length > 0 &&
			terms.every((term) =>
				moduleActions.some(
					(action) => hits(term, nodeWords(action)) || hits(term, actionWords(action)),
				),
			),
	};
}

/**
 * The sub-node actions of `nodeIds` that a root node takes on `connectionType`, e.g.
 * `ai_languageModel`. On `ai_tool`, each tool action also goes: its module has a tool factory.
 */
export function supplierActionsOf(nodeIds: readonly string[], connectionType: string): Action[] {
	return [...new Set(nodeIds)].flatMap((nodeId) =>
		actionsOfNode(nodeId).filter((action) => {
			const kind = providedKindOf(action.output.json);
			if (kind !== undefined) return PROVIDER_CONNECTIONS[kind] === connectionType;
			return connectionType === PROVIDER_CONNECTIONS.tool && toolActions().includes(action);
		}),
	);
}

/** The query names every word of the display name, e.g. "AI agent" names `AI Agent`. */
export const namesDisplayName = (query: string, displayName: string) => {
	const terms = termsOf(query);
	const own = words(displayName);
	return own.length > 0 && own.every((word) => hits(word, terms));
};

const MAX_CATALOG_ROWS = 3;

const localNameOf = (nodeType: string) => nodeType.slice(nodeType.lastIndexOf('.') + 1);

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/**
 * The AI-tool variants of a module node, e.g. `notionTool`, `toolHttpRequest` or an MCP `notion`.
 * A derived module node is its node type, e.g. `n8n-nodes-base.airtable` for `airtableTool`.
 */
const isToolVariantOf = (nodeType: string, nodeId: string) => {
	const name = localNameOf(nodeId);
	return [name, `${name}Tool`, `tool${capitalize(name)}`].includes(localNameOf(nodeType));
};

const isTriggerOf = (nodeType: string, nodeId: string) =>
	localNameOf(nodeType) === `${localNameOf(nodeId)}Trigger`;

/**
 * One-line catalog rows for a query that module `nodes` cover. The tool variants of these
 * nodes go, because the module replaces them. Their triggers come first, because a
 * workflow can start with one.
 */
export function catalogRowsBesideModules(
	hits: ReadonlyArray<{ name: string; displayName: string }>,
	nodes: readonly string[],
): string[] {
	const kept = hits.filter((hit) => !nodes.some((nodeId) => isToolVariantOf(hit.name, nodeId)));
	const isOwnTrigger = (hit: { name: string }) =>
		nodes.some((nodeId) => isTriggerOf(hit.name, nodeId));
	return [...kept.filter(isOwnTrigger), ...kept.filter((hit) => !isOwnTrigger(hit))]
		.slice(0, MAX_CATALOG_ROWS)
		.map((hit) => `${hit.name}: ${hit.displayName}`);
}

/**
 * Agents guess action ids from memory. For an unknown id, the actions of the same node
 * come first, then actions with the same operation name.
 */
export function nearestNextActions(id: string, limit = 3): Action[] {
	const [node, ...rest] = id.split('.');
	const operation = rest.at(-1);
	const score = (action: Action) =>
		(action.node.id === node ? 2 : 0) + (operation && action.id.endsWith(`.${operation}`) ? 1 : 0);
	return offeredActions()
		.filter((action) => score(action) > 0)
		.sort((a, b) => score(b) - score(a))
		.slice(0, limit);
}

/** What derives a module from the instance: its node types and their `__schema__` outputs. */
export interface DeriveSource {
	readonly nodeTypesProvider?: INodeTypes;
	readonly outputSchemaLookup?: OutputSchemaLookup;
}

/**
 * The import path of a derived module: the legacy node type with `/` before the name, e.g.
 * `n8n-nodes-base/airtable` or `@n8n/n8n-nodes-langchain/openAi`. A package name is unique and a
 * typed module id has no `/`, so no two modules share a path.
 */
export const derivedModulePath = (nodeType: string) => nodeType.replace(/\.(?=[^.]*$)/, '/');

/** The legacy node type of a derived module path, or undefined for a typed module id. */
export const nodeTypeOfModulePath = (path: string) =>
	path.includes('/') ? path.replace(/\/(?=[^/]*$)/, '.') : undefined;

interface DerivedNode {
	readonly nodeType: string;
	readonly name: string;
	readonly typeVersion: number;
	readonly actions: readonly DerivedAction[];
	readonly description: INodeTypeDescription;
}

const derivedNodes = new WeakMap<INodeTypes, Map<string, DerivedNode | undefined>>();

function outputSchemaOf(lookup: OutputSchemaLookup | undefined) {
	return (target: Parameters<OutputSchemaLookup>[0]) => {
		try {
			const raw = lookup?.(target);
			return raw ? outputSchemaFrom(raw) : undefined;
		} catch {
			return undefined;
		}
	};
}

/**
 * The derived actions of a catalog node type that has no typed module and no SDK step. A
 * derived root node takes only derived providers, so a provider also derives when a typed
 * module replaces its type; discovery shows the typed module first. Each node type and version
 * is derived once for each instance.
 */
function derivedNodeOf(
	nodeType: string,
	source: DeriveSource,
	version?: number,
): DerivedNode | undefined {
	const nodeTypes = source.nodeTypesProvider;
	if (!nodeTypes || coreStepRowOf(nodeType)) return undefined;
	const authored = nextNodeIdOfNodeType(nodeType) !== undefined;
	const cache = derivedNodes.get(nodeTypes) ?? new Map<string, DerivedNode | undefined>();
	derivedNodes.set(nodeTypes, cache);
	const key = `${nodeType}@${version ?? 'latest'}`;
	if (cache.has(key)) return cache.get(key);
	const description = (() => {
		try {
			return nodeTypes.getByNameAndVersion(nodeType, version).description;
		} catch {
			return undefined;
		}
	})();
	// Not cached: a community package can install the type later.
	if (!description) return undefined;
	const derived = (() => {
		try {
			const connections = connectionsOf(description);
			if (authored && ('reason' in connections || connections.kind !== 'provider'))
				return undefined;
			const packageName = nodeType.slice(0, nodeType.lastIndexOf('.'));
			const derivedVersion = deriveModuleVersion(description, {
				packageName,
				typeVersion: version,
				outputSchema: outputSchemaOf(source.outputSchemaLookup),
			});
			return derivedVersion && { nodeType, name: description.name, description, ...derivedVersion };
		} catch {
			return undefined;
		}
	})();
	cache.set(key, derived);
	return derived;
}

/** The node type is on the instance. Without the node types of the instance, every type is. */
export function isInstalledNodeType(nodeType: string, source: DeriveSource): boolean {
	const nodeTypes = source.nodeTypesProvider;
	if (!nodeTypes || isContractNodeType(nodeType)) return true;
	try {
		nodeTypes.getByNameAndVersion(nodeType);
		return true;
	} catch {
		return false;
	}
}

/** The packages that every n8n ships: the legacy nodes and the first-party contract packages. */
const SHIPPED_PACKAGES: ReadonlySet<string> = new Set([
	'n8n-nodes-base',
	'@n8n/n8n-nodes-langchain',
	...FIRST_PARTY_PACKAGES,
]);

const NEAREST_NODE_TYPES = 3;

/** The known node types of the instance whose names are nearest to the name of `nodeType`. */
function nearestNodeTypes(nodeType: string, source: DeriveSource): string[] {
	const nameOf = (type: string) => type.slice(type.lastIndexOf('.') + 1);
	const known = Object.keys(source.nodeTypesProvider?.getKnownTypes() ?? {}).map((type) => ({
		type,
		name: nameOf(type),
	}));
	return sublimeSearch(
		nameOf(nodeType),
		known,
		[{ key: 'name', weight: 1 }],
		NEAREST_NODE_TYPES,
	).map(({ item }) => item.type);
}

/** Why a node type that the instance does not have cannot build, in one line. */
export function missingNodeTypeIssue(nodeType: string, source: DeriveSource): string {
	const packageName = nodeType.slice(0, nodeType.lastIndexOf('.'));
	if (!SHIPPED_PACKAGES.has(packageName) && packageName) {
		return `Node type ${nodeType} is not installed. Install package ${packageName} first.`;
	}
	const nearest = nearestNodeTypes(nodeType, source);
	const hint = nearest.length > 0 ? ` Nearest types: ${nearest.join(', ')}.` : '';
	return `n8n has no node type ${nodeType}.${hint} Find the type with nodes(action="search").`;
}

/** The node type has a derived module: no typed module or SDK step replaces it, and it derives. */
export const hasDerivedModule = (nodeType: string, source: DeriveSource) =>
	derivedNodeOf(nodeType, source) !== undefined;

const derivedHeader = ({ nodeType, typeVersion }: DerivedNode) =>
	`// Derived from ${nodeType} version ${typeVersion}. The input is typed; the output only when n8n has its schema.\n`;

const derivedImport = ({ nodeType, name }: DerivedNode) =>
	`import { ${name} } from '@n8n/nodes/${derivedModulePath(nodeType)}';`;

/** The full derived module of a catalog node type, as the sandbox imports it. */
export function derivedNodeModuleText(nodeType: string, source: DeriveSource): string | undefined {
	const node = derivedNodeOf(nodeType, source);
	return (
		node &&
		`${derivedHeader(node)}${generateNodeModule(node.name, node.actions.map(toGeneratedAction))}`
	);
}

const actionLineOf = ({ contract }: DerivedAction): ActionLine => contract;

/**
 * The view of a derived module: the shown actions (or the first ones) with their types, at most
 * `MAX_TYPED_ACTIONS`, and one line for each other action. The sandbox module has all actions.
 */
export function derivedNodeView(
	nodeType: string,
	source: DeriveSource,
	shown: ReadonlySet<string> = new Set(),
): NextNodeModule | undefined {
	const node = derivedNodeOf(nodeType, source);
	if (!node) return undefined;
	const named = node.actions.filter(({ contract }) => shown.has(contract.id));
	const typed = (named.length ? named : node.actions).slice(0, MAX_TYPED_ACTIONS);
	const others = node.actions.filter((action) => !typed.includes(action));
	const module = [
		`${derivedHeader(node)}${generateNodeModule(node.name, typed.map(toGeneratedAction))}`,
		...(others.length
			? [
					`// Other actions. Get their types with type-definition { nodeType: "${nodeType}", resource, operation }.`,
					...others.map((action) => otherActionLine(actionLineOf(action))),
					'',
				]
			: []),
	].join('\n');
	return { node: nodeType, import: derivedImport(node), module };
}

/** The derived actions of a node type that run this resource and operation. */
export function derivedActionIds(
	nodeType: string,
	source: DeriveSource,
	slot: { readonly resource?: string; readonly operation?: string },
): string[] {
	return (derivedNodeOf(nodeType, source)?.actions ?? [])
		.filter(
			({ compile: { target } }) =>
				target.resource === slot.resource && target.operation === slot.operation,
		)
		.map(({ contract }) => contract.id);
}

/** The derived actions that the query names beyond the node name, e.g. `create` in "airtable create record". */
export function derivedActionsNamedBy(
	nodeType: string,
	source: DeriveSource,
	query: string,
): string[] {
	const node = derivedNodeOf(nodeType, source);
	if (!node) return [];
	const terms = termsOf(query).filter((term) => !hits(term, words(node.name)));
	const scored = node.actions.map(({ contract }) => ({
		id: contract.id,
		score: terms.filter((term) => hits(term, words(`${contract.id} ${contract.summary}`))).length,
	}));
	const best = Math.max(0, ...scored.map(({ score }) => score));
	return best ? scored.filter(({ score }) => score === best).map(({ id }) => id) : [];
}

/**
 * The fields of every branch of an input, e.g. of a variant whose selector picks the branch.
 * n8n connects `providers`; no parameter holds them.
 */
const inputFieldsOf = (input: DerivedAction['contract']['input']) =>
	[input, ...(input.oneOf ?? [])].flatMap((schema) =>
		Object.entries(schema.properties ?? {}).filter(([key]) => key !== 'providers'),
	);

/**
 * A saved node of a derived module type as its factory call, for decompile, or why it stays
 * `node()`. A node without a derived module gives `undefined`.
 */
export function derivedReadOf(
	node: { readonly type: string; readonly typeVersion: number; readonly parameters?: unknown },
	source: DeriveSource,
): ContractRead | { readonly reason: string } | undefined {
	const derived = derivedNodeOf(node.type, source);
	if (!derived) return undefined;
	if (node.typeVersion !== derived.typeVersion) {
		return {
			reason: `version ${node.typeVersion}; the derived module types version ${derived.typeVersion}`,
		};
	}
	const parameters = node.parameters ?? {};
	if (!isNodeParameters(parameters))
		return { reason: 'a saved parameter is not a node parameter value' };
	const read = readLegacyParameters(derived, derived.description, parameters);
	if ('reason' in read) return read;
	const { contract } = read.action;
	const generated = toGeneratedAction(read.action);
	const fields = inputFieldsOf(contract.input);
	return {
		factory: {
			module: derived.name,
			from: `@n8n/nodes/${derivedModulePath(derived.nodeType)}`,
			path: [generated.resource, generated.operation].filter(Boolean).join('.'),
			version: derived.typeVersion,
			groupsProviders: true,
			...(contract.outputs ? { outputs: contract.outputs } : {}),
			inputKeys: [...new Set(fields.map(([key]) => key))],
			// The generated field type decides: a `Value<…>` field takes an expression string.
			expressionKeys: [
				...new Set(
					fields.flatMap(([key, schema]) =>
						toTs(schema, { input: true, indent: '' }).startsWith('Value<') ? [key] : [],
					),
				),
			],
		},
		parameters: read.input,
	};
}
