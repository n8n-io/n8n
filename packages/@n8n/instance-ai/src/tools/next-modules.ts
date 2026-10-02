/**
 * Discovery over the typed node modules of `@n8n/nodes-base-next`. The agent imports a
 * module as `@n8n/nodes/<nodeId>`, and `tsc` checks the workflow against the same text.
 */
import { isRecord } from '@n8n/utils/is-record';
import {
	generateNodeModule,
	SUPPLY_CONNECTIONS,
	suppliedKindOf,
	generatedTriggersOf,
	toContract,
	type Action,
	type GeneratedAction,
} from '@n8n/node-sdk';
import {
	actions,
	composedTargetOf,
	nativeTriggers,
	NODE_PACKAGE,
	nodeTypeOf,
	triggers,
} from '@n8n/nodes-base-next';

export const nextActions: readonly Action[] = actions;

export interface NextNodeModule {
	readonly node: string;
	readonly import: string;
	readonly module: string;
}

const allTriggers = [...triggers, ...nativeTriggers];

/** The ids of the typed node modules, as the agent imports them: `@n8n/nodes/<id>`. */
export const nextNodeIds: readonly string[] = [
	...new Set([...nextActions, ...allTriggers].map(({ node }) => node.id)),
];

const actionsOfNode = (nodeId: string) => nextActions.filter((action) => action.node.id === nodeId);

const triggersOfNode = (nodeId: string) =>
	allTriggers.filter((trigger) => trigger.node.id === nodeId);

/** An action that owns a slot of a composed node emits that node, e.g. Notion v4. */
function generatedActionOf(action: Action): GeneratedAction {
	const { resource, operation } = action;
	const contract = toContract(action);
	const target = composedTargetOf(action);
	if (!target) return { contract, nodeType: nodeTypeOf(action), resource, operation };
	const { nodeType, ...slot } = target;
	return { contract, nodeType, resource, operation, slot };
}

/** The trigger factories of all modules, with the reply steps of native triggers. */
export const nextTriggerFactories: readonly GeneratedAction[] = allTriggers.flatMap((trigger) =>
	generatedTriggersOf(trigger, nodeTypeOf(trigger)),
);

/** A module has the given actions and every trigger of the node: a workflow starts at one. */
const moduleOf = (nodeId: string, own: readonly Action[]) =>
	generateNodeModule(nodeId, [
		...own.map(generatedActionOf),
		...triggersOfNode(nodeId).flatMap((trigger) =>
			generatedTriggersOf(trigger, nodeTypeOf(trigger)),
		),
	]);

/** The generated TypeScript module for every action and trigger of one node. */
export function nodeModuleText(nodeId: string): string | undefined {
	const own = actionsOfNode(nodeId);
	return own.length || triggersOfNode(nodeId).length ? moduleOf(nodeId, own) : undefined;
}

/** The built-in node types that a native trigger and its reply step emit. */
const nativeTypesOf = (trigger: (typeof allTriggers)[number]) =>
	trigger.kind === 'native'
		? [trigger.native.type, ...(trigger.reply ? [trigger.reply.native.type] : [])]
		: [];

/**
 * The node id for a node id, an action id, an executable node type of this package, or a
 * built-in node type that a native trigger types.
 */
function nextNodeIdOf(ref: string): string | undefined {
	return [...nextActions, ...allTriggers].find(
		(contract) =>
			contract.node.id === ref ||
			contract.id === ref ||
			nodeTypeOf(contract) === ref ||
			('kind' in contract && nativeTypesOf(contract).includes(ref)),
	)?.node.id;
}

/** The module for a node id (`notion`), an action id, or a node type of this package. */
export function nextNodeModule(ref: string): NextNodeModule | undefined {
	const nodeId = nextNodeIdOf(ref);
	const module = nodeId === undefined ? undefined : nodeModuleText(nodeId);
	if (nodeId === undefined || module === undefined) return undefined;
	return { node: nodeId, import: `import { ${nodeId} } from '@n8n/nodes/${nodeId}';`, module };
}

const inputTypeOf = (action: Action) => `${action.id.split('.').map(capitalize).join('')}Input`;

const otherActionLine = (action: Action) =>
	`// ${action.id}(config: ${inputTypeOf(action)}) — ${action.action} (${action.flow.effect}, ${action.flow.cardinality})`;

/**
 * The search view of a module: the `shown` actions with their types, and one line for each
 * other action. The view is a valid module with fewer factories, so the agent can copy it.
 * The sandbox module keeps all actions.
 */
export function nextNodeView(
	nodeId: string,
	shown: ReadonlySet<string>,
): NextNodeModule | undefined {
	const full = nextNodeModule(nodeId);
	const own = actionsOfNode(nodeId);
	const others = own.filter((action) => !shown.has(action.id));
	if (!full || !others.length || others.length === own.length) return full;
	const module = [
		moduleOf(
			nodeId,
			own.filter((action) => shown.has(action.id)),
		),
		`// Other actions. Get their types with type-definition "${nodeId}".`,
		...others.map(otherActionLine),
		'',
	].join('\n');
	return { ...full, module };
}

/**
 * The module node that replaces a catalog node type. The legacy node of the same service
 * shares the node id, e.g. `n8n-nodes-base.notion` and `notion`.
 */
export function nextNodeIdOfNodeType(nodeType: string): string | undefined {
	if (nodeType.startsWith(`${NODE_PACKAGE}.`)) return nextNodeIdOf(nodeType);
	const replacing = nextActions.find(({ node }) => node.replaces?.includes(nodeType));
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

/**
 * The contract actions that replace a legacy node. The legacy node of a service shares the node
 * id (`n8n-nodes-base.gmail` and `gmail`), a core node shares the action name (`n8n-nodes-base.set`
 * and `core.set`), and the resource and operation must match where the actions have them.
 */
export function contractReplacementOf(node: {
	readonly type: string;
	readonly parameters?: unknown;
}): ContractReplacement | undefined {
	const [, name] = LEGACY_TYPE.exec(node.type) ?? [];
	if (name === undefined) return undefined;
	const core = nextActions.find((action) => action.node.id === 'core' && action.operation === name);
	if (core) return { nodeId: 'core', actions: [core], exact: true };
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

const nodeWords = (action: Action) => words(`${action.node.id} ${action.node.displayName}`);

const actionWords = (action: Action) => words(`${action.id} ${action.action} ${action.summary}`);

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
	return nextActions
		.map((action) => ({ action, score: scoreOf(action, terms) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ action }) => action);
}

const MAX_OTHER_ACTIONS = 3;

/**
 * One search query: the nodes whose module the query names, the ids of their actions that
 * the query names, and one-line rows for other matching actions. `coveredNodes` are module
 * nodes that the catalog search found. `coversQuery` is true when the named modules match
 * every query word.
 * When the query names a module, other actions match only generic words such as "get",
 * so they are not listed.
 */
export function searchNextActions(query: string, coveredNodes: readonly string[] = []) {
	const terms = termsOf(query);
	const matches = findNextActions(query);
	const named = [...new Set(matches.map((action) => action.node.id))].map((nodeId) => ({
		nodeId,
		terms: terms.filter((term) => actionsOfNode(nodeId).some((a) => hits(term, nodeWords(a)))),
	}));
	// "google sheets" names googleSheets, not also googleGemini through "google" alone.
	const nodes = named
		.filter(
			({ terms: own }) =>
				own.length &&
				!named.some(
					(other) =>
						other.terms.length > own.length && own.every((term) => other.terms.includes(term)),
				),
		)
		.map(({ nodeId }) => nodeId);
	const others = nodes.length
		? []
		: [...new Set([...matches, ...coveredNodes.flatMap(actionsOfNode)])];
	const moduleActions = nodes.flatMap(actionsOfNode);
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

/** The sub-node actions of `nodeIds` that a root node takes on `connectionType`, e.g. `ai_languageModel`. */
export function supplierActionsOf(nodeIds: readonly string[], connectionType: string): Action[] {
	return [...new Set(nodeIds)].flatMap((nodeId) =>
		actionsOfNode(nodeId).filter((action) => {
			const kind = suppliedKindOf(action.output.json);
			return kind !== undefined && SUPPLY_CONNECTIONS[kind] === connectionType;
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

/** The AI-tool variants of a module node, e.g. `notionTool`, `toolHttpRequest` or an MCP `notion`. */
const isToolVariantOf = (nodeType: string, nodeId: string) =>
	[nodeId, `${nodeId}Tool`, `tool${capitalize(nodeId)}`].includes(localNameOf(nodeType));

const isTriggerOf = (nodeType: string, nodeId: string) =>
	localNameOf(nodeType) === `${nodeId}Trigger`;

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
	return nextActions
		.filter((action) => score(action) > 0)
		.sort((a, b) => score(b) - score(a))
		.slice(0, limit);
}
