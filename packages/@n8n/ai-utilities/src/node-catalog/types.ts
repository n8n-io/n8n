/**
 * Types shared across the node-catalog helpers.
 *
 * These were originally defined in @n8n/ai-workflow-builder under
 * `code-builder/types.ts` (the parts not tied to the agent runtime).
 */

import type { IDisplayOptions, NodeConnectionType } from 'n8n-workflow';

/**
 * The `ai_*` members of `NodeConnectionTypes`, as a literal tuple so callers can
 * build a zod enum from it.
 *
 * Spelled out rather than derived because `z.enum` needs literal members. The
 * `satisfies` clause is what keeps it honest: adding a value here that is not a
 * real connection type fails to compile.
 */
export const AI_CONNECTION_TYPES = [
	'ai_agent',
	'ai_chain',
	'ai_document',
	'ai_embedding',
	'ai_languageModel',
	'ai_memory',
	'ai_outputParser',
	'ai_reranker',
	'ai_retriever',
	'ai_textSplitter',
	'ai_tool',
	'ai_vectorStore',
] as const satisfies ReadonlyArray<Extract<NodeConnectionType, `ai_${string}`>>;

export type AiConnectionType = (typeof AI_CONNECTION_TYPES)[number];

/**
 * Metadata about how a node is reachable via the AI Gateway (n8n Connect).
 * Attached to node results only when the instance is licensed for the gateway
 * AND the node is listed in the gateway config. Absence means either
 * "not licensed" or "not supported"; consumers treat both the same.
 *
 * Search results carry it so a model can prefer a covered node when the user
 * has not named a specific integration.
 *
 * `operations` mirrors the gateway config's `supportedActions[nodeName]`: a map
 * from resource name to allowed operations. Nodes without a resource dimension
 * use the marker key `'__operation_only__'`.
 */
export interface AiGatewayNodeMeta {
	supported: true;
	operations?: Record<string, string[]>;
	minVersion?: number;
	hiddenProperties?: string[];
}

/**
 * Node connection lists as the search engine sees them: either a list of
 * connection types / configuration objects, or an expression string.
 *
 * Deliberately loose. The engine only tests membership and serializes these, so
 * this accepts both `INodeTypeDescription['inputs']` and the plain `string[]`
 * shape hosts hand over without either side casting.
 */
export type SearchableConnections = ReadonlyArray<string | object> | string;

/** Availability and requirement config for one AI input in `builderHint.inputs`. */
export interface SearchableBuilderHintInputConfig {
	required: boolean;
	displayOptions?: IDisplayOptions | Record<string, unknown>;
}

/**
 * `builderHint.inputs`, keyed by connection type.
 *
 * String-keyed rather than keyed by `AINodeConnectionType` so that hosts
 * supplying a plain record satisfy it alongside n8n-workflow's literal-keyed
 * `BuilderHintInputs`. The engine only reads `Object.entries`, so the narrower
 * key type buys it nothing.
 */
export type SearchableBuilderHintInputs = Record<
	string,
	SearchableBuilderHintInputConfig | undefined
>;

/**
 * The node type shape the search engine reads.
 *
 * Only the fields the engine touches are required. The rest are optional so
 * that both a full `INodeTypeDescription`, the pre-digested
 * `LeanNodeTypeDescription`, and the leaner shape an embedding host supplies all
 * satisfy it without conversion.
 */
export interface SearchableNodeType {
	name: string;
	displayName: string;
	description: string;
	version: number | number[];
	inputs: SearchableConnections;
	outputs: SearchableConnections;
	/** Only the `alias` array is consumed, by sublimeSearch. */
	codex?: { alias?: string[] };
	aiGateway?: AiGatewayNodeMeta;
	builderHint?: {
		/** Preferred over `searchHint` when both are set. */
		message?: string;
		searchHint?: string;
		inputs?: SearchableBuilderHintInputs;
		/**
		 * Multi-line content emitted into generated `.d.ts` only. Declared so hosts
		 * can pass their node shape straight through, but deliberately never read:
		 * it would bloat every search result.
		 */
		extraTypeDefContent?: unknown;
	};
}

/**
 * Represents a subnode requirement for AI nodes.
 * Extracted from builderHint.inputs on node type descriptions.
 */
export interface SubnodeRequirement {
	/** The connection type (e.g., 'ai_languageModel', 'ai_memory') */
	connectionType: string;
	/** Whether this subnode is required */
	required: boolean;
	/** Conditions under which this subnode is required (e.g., when hasOutputParser is true) */
	displayOptions?: IDisplayOptions | Record<string, unknown>;
	/**
	 * Preferred node to satisfy this requirement, matching a provider the user
	 * already has a credential for. Set for ai_languageModel when an LLM
	 * credential exists; use it instead of the generic default.
	 */
	suggestedNode?: string;
}

/**
 * Node search result with scoring and subnode requirements.
 *
 * Extends the plain node fields with a relevance score, builder hints, and
 * subnode requirements.
 */
export interface NodeSearchResult {
	name: string;
	displayName: string;
	description: string;
	version: number;
	score: number;
	inputs: SearchableConnections;
	outputs: SearchableConnections;
	/** General hint message for workflow builders (from `builderHint.message`, else `searchHint`) */
	builderHintMessage?: string;
	/** Subnode requirements extracted from builderHint.inputs */
	subnodeRequirements?: SubnodeRequirement[];
	/** Present when the node is reachable via n8n Connect on this instance. */
	aiGateway?: AiGatewayNodeMeta;
}
