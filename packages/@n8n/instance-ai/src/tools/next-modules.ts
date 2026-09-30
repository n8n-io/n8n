/**
 * Discovery over the typed node modules of `@n8n/nodes-base-next`. The agent imports a
 * module as `@n8n/nodes/<nodeId>`, and `tsc` checks the workflow against the same text.
 */
import { generateNodeModule, toContract, type Action } from '@n8n/node-sdk';
import { actions, NODE_PACKAGE, nodeTypeOf } from '@n8n/nodes-base-next';

export const nextActions: readonly Action[] = actions;

export interface NextNodeModule {
	readonly node: string;
	readonly import: string;
	readonly module: string;
}

const actionsOfNode = (nodeId: string) => nextActions.filter((action) => action.node.id === nodeId);

/** The generated TypeScript module for every action of one node. */
export function nodeModuleText(nodeId: string): string | undefined {
	const own = actionsOfNode(nodeId);
	if (!own.length) return undefined;
	return generateNodeModule(
		nodeId,
		own.map((action) => ({ contract: toContract(action), nodeType: nodeTypeOf(action) })),
	);
}

/** The node id for a node id, an action id, or an executable node type of this package. */
function nextNodeIdOf(ref: string): string | undefined {
	return nextActions.find(
		(action) => action.node.id === ref || action.id === ref || nodeTypeOf(action) === ref,
	)?.node.id;
}

/** The module for a node id (`notion`), an action id, or a node type of this package. */
export function nextNodeModule(ref: string): NextNodeModule | undefined {
	const nodeId = nextNodeIdOf(ref);
	const module = nodeId === undefined ? undefined : nodeModuleText(nodeId);
	if (nodeId === undefined || module === undefined) return undefined;
	return { node: nodeId, import: `import { ${nodeId} } from '@n8n/nodes/${nodeId}';`, module };
}

/**
 * The module node that replaces a catalog node type. The legacy node of the same service
 * shares the node id, e.g. `n8n-nodes-base.notion` and `notion`.
 */
export function nextNodeIdOfNodeType(nodeType: string): string | undefined {
	if (nodeType.startsWith(`${NODE_PACKAGE}.`)) return nextNodeIdOf(nodeType);
	const [, nodeId] = /^n8n-nodes-base\.(\w+)$/.exec(nodeType) ?? [];
	return nodeId !== undefined && actionsOfNode(nodeId).length ? nodeId : undefined;
}

export const actionRow = (action: Action) => `${action.id}: ${action.summary}`;

export const actionRowsOfNode = (nodeId: string) => actionsOfNode(nodeId).map(actionRow);

const words = (text: string) =>
	text
		.replace(/([a-z\d])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.split(/[^a-z\d]+/)
		.filter(Boolean);

/** Short query words ("a", "to") match too much prose, so they only match whole words. */
const hits = (term: string, vocabulary: readonly string[]) =>
	vocabulary.some(
		(word) =>
			word === term ||
			(term.length >= 3 && word.length >= 3 && (word.startsWith(term) || term.startsWith(word))),
	);

const nodeWords = (action: Action) => words(`${action.node.id} ${action.node.displayName}`);

const actionWords = (action: Action) => words(`${action.id} ${action.action} ${action.summary}`);

const scoreOf = (action: Action, terms: readonly string[]) =>
	terms.reduce(
		(total, term) =>
			total + (hits(term, nodeWords(action)) ? 2 : hits(term, actionWords(action)) ? 1 : 0),
		0,
	);

const termsOf = (query: string) => words(query).filter((term) => term.length >= 2);

/** Actions that share words with the query. Node words weigh more than action words. */
export function findNextActions(query: string): Action[] {
	const terms = termsOf(query);
	return nextActions
		.map((action) => ({ action, score: scoreOf(action, terms) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ action }) => action);
}

const MAX_OTHER_ACTIONS = 5;

/**
 * One search query: the nodes whose module the query names, and one-line rows for other
 * matching actions. `coveredNodes` are module nodes that the catalog search found.
 */
export function searchNextActions(query: string, coveredNodes: readonly string[] = []) {
	const terms = termsOf(query);
	const matches = findNextActions(query);
	const nodes = [
		...new Set(
			matches
				.filter((action) => terms.some((term) => hits(term, nodeWords(action))))
				.map((action) => action.node.id),
		),
	];
	const others = [...new Set([...matches, ...coveredNodes.flatMap(actionsOfNode)])].filter(
		(action) => !nodes.includes(action.node.id),
	);
	return { nodes, otherActions: others.slice(0, MAX_OTHER_ACTIONS).map(actionRow) };
}

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
