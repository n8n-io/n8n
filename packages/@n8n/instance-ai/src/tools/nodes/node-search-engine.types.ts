/**
 * Local types for the NodeSearchEngine.
 *
 * These are lightweight copies of the n8n-workflow types used by the search
 * engine.  The instance-ai package intentionally does NOT depend on
 * n8n-workflow, so we keep a minimal, self-contained subset here.
 */

// ---------------------------------------------------------------------------
// AI connection types
// ---------------------------------------------------------------------------

/** All AI connection type values (mirrors NodeConnectionTypes from n8n-workflow). */
export const AI_CONNECTION_TYPES = [
	'ai_agent',
	'ai_chain',
	'ai_document',
	'ai_embedding',
	'ai_languageModel',
	'ai_memory',
	'ai_outputParser',
	'ai_retriever',
	'ai_textSplitter',
	'ai_tool',
	'ai_vectorRetriever',
	'ai_vectorStore',
] as const;

export type AiConnectionType = (typeof AI_CONNECTION_TYPES)[number];

// ---------------------------------------------------------------------------
// Builder hint types
// ---------------------------------------------------------------------------

/** Configuration for a single AI subnode input in builderHint.inputs. */
export interface BuilderHintInputConfig {
	/** Whether this AI input is required. */
	required: boolean;
	/** Conditions under which this input should be available / required. */
	displayOptions?: Record<string, unknown>;
}

/** Maps AI input types to their configuration. */
export type BuilderHintInputs = Partial<Record<string, BuilderHintInputConfig>>;

// ---------------------------------------------------------------------------
// Searchable node type
// ---------------------------------------------------------------------------

/**
 * Subset of INodeTypeDescription used by the search engine.
 *
 * Only the fields that the engine actually reads are included so that
 * callers can satisfy this interface without pulling in the full
 * INodeTypeDescription from n8n-workflow.
 */
export interface SearchableNodeType {
	name: string;
	displayName: string;
	description: string;
	version: number | number[];
	inputs: string[] | string;
	outputs: string[] | string;
	codex?: {
		alias?: string[];
	};
	builderHint?: {
		message?: string;
		inputs?: BuilderHintInputs;
	};
}

// ---------------------------------------------------------------------------
// Search result types
// ---------------------------------------------------------------------------

/** Subnode requirement extracted from builderHint.inputs. */
export interface SubnodeRequirement {
	/** The connection type (e.g., 'ai_languageModel', 'ai_memory'). */
	connectionType: string;
	/** Whether this subnode is required. */
	required: boolean;
	/** Conditions under which this subnode is required. */
	displayOptions?: Record<string, unknown>;
}

/** Node search result with scoring and subnode requirements. */
export interface NodeSearchResult {
	name: string;
	displayName: string;
	description: string;
	version: number;
	score: number;
	inputs: string[] | string;
	outputs: string[] | string;
	/** General hint message for workflow builders (from builderHint.message). */
	builderHintMessage?: string;
	/** Subnode requirements extracted from builderHint.inputs. */
	subnodeRequirements?: SubnodeRequirement[];
}
