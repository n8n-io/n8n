import type {
	NodeConnectionTypes as WorkflowNodeConnectionTypes,
	WebhookSetupMethodNames,
} from 'n8n-workflow';

/**
 * Mirrors `NodeConnectionTypes` from `n8n-workflow`, so the plugin does not load
 * `n8n-workflow` at runtime. `satisfies` breaks type-checking when an entry
 * upstream is added, removed, or changed.
 */
export const NodeConnectionTypes = {
	AiAgent: 'ai_agent',
	AiChain: 'ai_chain',
	AiDocument: 'ai_document',
	AiEmbedding: 'ai_embedding',
	AiLanguageModel: 'ai_languageModel',
	AiMemory: 'ai_memory',
	AiOutputParser: 'ai_outputParser',
	AiRetriever: 'ai_retriever',
	AiReranker: 'ai_reranker',
	AiTextSplitter: 'ai_textSplitter',
	AiTool: 'ai_tool',
	AiVectorStore: 'ai_vectorStore',
	Main: 'main',
} as const satisfies typeof WorkflowNodeConnectionTypes;

export type WebhookLifecycleMethod = WebhookSetupMethodNames;

/**
 * n8n's canonical webhook lifecycle method names (`WebhookSetupMethodNames`) are
 * a type, so they can't be iterated at lint time. This object mirrors them as a
 * runtime value; the `satisfies Record<WebhookSetupMethodNames, true>` ties it to
 * the source of truth — adding, removing, or renaming a method upstream breaks
 * type-checking here until this list is updated.
 */
const LIFECYCLE_METHOD_SET = {
	checkExists: true,
	create: true,
	delete: true,
} as const satisfies Record<WebhookSetupMethodNames, true>;

/** The webhook trigger lifecycle methods, in the order n8n invokes them. */
export const WEBHOOK_LIFECYCLE_METHODS = Object.keys(
	LIFECYCLE_METHOD_SET,
) as readonly WebhookLifecycleMethod[];
