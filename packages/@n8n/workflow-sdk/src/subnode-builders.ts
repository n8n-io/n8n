/**
 * Subnode factory functions for creating type-safe AI/LangChain subnodes.
 *
 * These functions create subnode instances with proper category markers,
 * ensuring type safety when used in SubnodeConfig.
 *
 * @example
 * ```typescript
 * import { languageModel, tool, node } from '@n8n/workflow-sdk';
 *
 * const model = languageModel({
 *   type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
 *   version: 1.2,
 *   config: { parameters: { model: 'gpt-4' } }
 * });
 *
 * const codeRunner = tool({
 *   type: '@n8n/n8n-nodes-langchain.toolCode',
 *   version: 1.1,
 *   config: { parameters: { code: 'return "hello"' } }
 * });
 *
 * const agent = node({
 *   type: '@n8n/n8n-nodes-langchain.agent',
 *   version: 1.7,
 *   config: {
 *     subnodes: { model, tools: [codeRunner] }
 *   }
 * });
 * ```
 */

import { v4 as uuid } from 'uuid';
import type {
	NodeConfig,
	NodeInput,
	NodeInstance,
	LanguageModelInstance,
	MemoryInstance,
	ToolInstance,
	OutputParserInstance,
	EmbeddingInstance,
	VectorStoreInstance,
	RetrieverInstance,
	DocumentLoaderInstance,
	TextSplitterInstance,
	RerankerInstance,
	DeclaredConnection,
	NodeChain,
	ToolConfigContext,
	ToolConfigInput,
	FromAIArgumentType,
} from './types/base';
import { createFromAIExpression } from './expression';

// =============================================================================
// Internal Subnode Instance Implementation
// =============================================================================

/**
 * Generate a human-readable name from a node type
 */
function generateNodeName(type: string): string {
	const parts = type.split('.');
	const nodeName = parts[parts.length - 1];

	return nodeName
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/^./, (str) => str.toUpperCase())
		.replace(/^Lm/, 'LM')
		.replace(/^Llm/, 'LLM')
		.replace(/OpenAi/g, 'OpenAI')
		.replace(/Api/g, 'API');
}

/**
 * Internal subnode instance implementation with marker
 */
class SubnodeInstanceImpl<
	TType extends string,
	TVersion extends string,
	TOutput,
	TSubnodeType extends string,
> implements NodeInstance<TType, TVersion, TOutput>
{
	readonly type: TType;
	readonly version: TVersion;
	readonly config: NodeConfig;
	readonly id: string;
	readonly name: string;
	readonly _outputType?: TOutput;
	readonly _subnodeType: TSubnodeType;

	constructor(
		type: TType,
		version: TVersion,
		config: NodeConfig,
		subnodeType: TSubnodeType,
		id?: string,
		name?: string,
	) {
		this.type = type;
		this.version = version;
		this.config = { ...config };
		this.id = id ?? uuid();
		this.name = name ?? config.name ?? generateNodeName(type);
		this._subnodeType = subnodeType;
	}

	update(config: Partial<NodeConfig>): SubnodeInstanceImpl<TType, TVersion, TOutput, TSubnodeType> {
		const mergedConfig = {
			...this.config,
			...config,
			parameters: config.parameters ?? this.config.parameters,
			credentials: config.credentials ?? this.config.credentials,
		};
		return new SubnodeInstanceImpl(
			this.type,
			this.version,
			mergedConfig,
			this._subnodeType,
			this.id,
			this.name,
		);
	}

	then<T extends NodeInstance<string, string, unknown>>(
		_target: T | T[],
		_outputIndex?: number,
	): NodeChain<NodeInstance<TType, TVersion, TOutput>, T> {
		throw new Error('Subnode connections are managed by parent node SubnodeConfig');
	}

	onError<T extends NodeInstance<string, string, unknown>>(_handler: T): this {
		throw new Error('Subnode error handling is managed by parent node SubnodeConfig');
	}

	getConnections(): DeclaredConnection[] {
		return [];
	}
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a language model subnode instance.
 *
 * Use this for nodes that output `ai_languageModel` connection type,
 * such as OpenAI Chat Model, Anthropic, Google Gemini, etc.
 *
 * @example
 * ```typescript
 * const model = languageModel({
 *   type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
 *   version: 1.2,
 *   config: {
 *     parameters: { model: 'gpt-4', temperature: 0.7 },
 *     credentials: { openAiApi: { name: 'OpenAI', id: 'cred-123' } }
 *   }
 * });
 * ```
 */
export function languageModel<TNode extends NodeInput>(
	input: TNode,
): LanguageModelInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_languageModel'>(
		input.type,
		versionStr,
		input.config as NodeConfig,
		'ai_languageModel',
	);
}

/**
 * Create a memory subnode instance.
 *
 * Use this for nodes that output `ai_memory` connection type,
 * such as Buffer Window Memory, Postgres Chat Memory, etc.
 *
 * @example
 * ```typescript
 * const mem = memory({
 *   type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
 *   version: 1.2,
 *   config: { parameters: { contextWindowLength: 5 } }
 * });
 * ```
 */
export function memory<TNode extends NodeInput>(
	input: TNode,
): MemoryInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_memory'>(
		input.type,
		versionStr,
		input.config as NodeConfig,
		'ai_memory',
	);
}

// =============================================================================
// Tool Factory with $fromAI Support
// =============================================================================

/**
 * Create the ToolConfigContext with fromAI helper
 */
function createToolConfigContext(): ToolConfigContext {
	return {
		fromAI(
			key: string,
			description?: string,
			type?: FromAIArgumentType,
			defaultValue?: string | number | boolean | object,
		): string {
			return createFromAIExpression(key, description, type, defaultValue);
		},
	};
}

/**
 * Input type for tool() factory - accepts either NodeInput with static config
 * or NodeInput with config callback for $fromAI support.
 */
interface ToolFactoryInput<
	TType extends string = string,
	TVersion extends number = number,
	TParams = unknown,
> {
	type: TType;
	version: TVersion;
	config: ToolConfigInput<TParams>;
}

/**
 * Create a tool subnode instance.
 *
 * Use this for nodes that output `ai_tool` connection type,
 * such as Tool Code, Tool HTTP Request, Calculator, etc.
 *
 * Tools can use $.fromAI() in a config callback to let the AI agent
 * determine parameter values at runtime.
 *
 * @example Static config (no $fromAI)
 * ```typescript
 * const calc = tool({
 *   type: '@n8n/n8n-nodes-langchain.toolCalculator',
 *   version: 1,
 *   config: { parameters: {} }
 * });
 * ```
 *
 * @example Config callback with $fromAI
 * ```typescript
 * const gmail = tool({
 *   type: 'n8n-nodes-base.gmailTool',
 *   version: 1,
 *   config: ($) => ({
 *     parameters: {
 *       sendTo: $.fromAI('to', 'Email address to send to'),
 *       subject: $.fromAI('subject', 'Email subject line'),
 *       message: $.fromAI('body', 'Email body content', 'string')
 *     }
 *   })
 * });
 * ```
 */
export function tool<TNode extends ToolFactoryInput>(
	input: TNode,
): ToolInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const config =
		typeof input.config === 'function' ? input.config(createToolConfigContext()) : input.config;

	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_tool'>(
		input.type,
		versionStr,
		config as NodeConfig,
		'ai_tool',
	);
}

/**
 * Create an output parser subnode instance.
 *
 * Use this for nodes that output `ai_outputParser` connection type,
 * such as Structured Output Parser, Auto-fixing Output Parser, etc.
 *
 * @example
 * ```typescript
 * const parser = outputParser({
 *   type: '@n8n/n8n-nodes-langchain.outputParserStructured',
 *   version: 1,
 *   config: { parameters: { schemaType: 'manual' } }
 * });
 * ```
 */
export function outputParser<TNode extends NodeInput>(
	input: TNode,
): OutputParserInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_outputParser'>(
		input.type,
		versionStr,
		input.config as NodeConfig,
		'ai_outputParser',
	);
}

/**
 * Create an embedding subnode instance.
 *
 * Use this for nodes that output `ai_embedding` connection type,
 * such as OpenAI Embeddings, Cohere Embeddings, etc.
 *
 * @example
 * ```typescript
 * const emb = embedding({
 *   type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
 *   version: 1,
 *   config: { parameters: { model: 'text-embedding-ada-002' } }
 * });
 * ```
 */
export function embedding<TNode extends NodeInput>(
	input: TNode,
): EmbeddingInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_embedding'>(
		input.type,
		versionStr,
		input.config as NodeConfig,
		'ai_embedding',
	);
}

/**
 * Create a vector store subnode instance.
 *
 * Use this for nodes that output `ai_vectorStore` connection type,
 * such as Pinecone Vector Store, Qdrant Vector Store, etc.
 *
 * @example
 * ```typescript
 * const vs = vectorStore({
 *   type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
 *   version: 1,
 *   config: { parameters: { indexName: 'my-index' } }
 * });
 * ```
 */
export function vectorStore<TNode extends NodeInput>(
	input: TNode,
): VectorStoreInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_vectorStore'>(
		input.type,
		versionStr,
		input.config as NodeConfig,
		'ai_vectorStore',
	);
}

/**
 * Create a retriever subnode instance.
 *
 * Use this for nodes that output `ai_retriever` connection type,
 * such as Vector Store Retriever, etc.
 *
 * @example
 * ```typescript
 * const ret = retriever({
 *   type: '@n8n/n8n-nodes-langchain.retrieverVectorStore',
 *   version: 1,
 *   config: {}
 * });
 * ```
 */
export function retriever<TNode extends NodeInput>(
	input: TNode,
): RetrieverInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_retriever'>(
		input.type,
		versionStr,
		input.config as NodeConfig,
		'ai_retriever',
	);
}

/**
 * Create a document loader subnode instance.
 *
 * Use this for nodes that output `ai_document` connection type,
 * such as Default Data Loader, Binary Input Loader, etc.
 *
 * @example
 * ```typescript
 * const loader = documentLoader({
 *   type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
 *   version: 1,
 *   config: {}
 * });
 * ```
 */
export function documentLoader<TNode extends NodeInput>(
	input: TNode,
): DocumentLoaderInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_document'>(
		input.type,
		versionStr,
		input.config as NodeConfig,
		'ai_document',
	);
}

/**
 * Create a text splitter subnode instance.
 *
 * Use this for nodes that output `ai_textSplitter` connection type,
 * such as Character Text Splitter, Recursive Character Text Splitter, etc.
 *
 * @example
 * ```typescript
 * const splitter = textSplitter({
 *   type: '@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter',
 *   version: 1,
 *   config: { parameters: { chunkSize: 1000 } }
 * });
 * ```
 */
export function textSplitter<TNode extends NodeInput>(
	input: TNode,
): TextSplitterInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_textSplitter'>(
		input.type,
		versionStr,
		input.config as NodeConfig,
		'ai_textSplitter',
	);
}

/**
 * Create a reranker subnode instance.
 *
 * Use this for nodes that output `ai_reranker` connection type,
 * such as Cohere Rerank, etc.
 *
 * @example
 * ```typescript
 * const rerank = reranker({
 *   type: '@n8n/n8n-nodes-langchain.rerankerCohere',
 *   version: 1,
 *   config: { parameters: { topN: 5 } }
 * });
 * ```
 */
export function reranker<TNode extends NodeInput>(
	input: TNode,
): RerankerInstance<TNode['type'], `${TNode['version']}`, unknown> {
	const versionStr = String(input.version) as `${TNode['version']}`;
	return new SubnodeInstanceImpl<TNode['type'], `${TNode['version']}`, unknown, 'ai_reranker'>(
		input.type,
		versionStr,
		input.config as NodeConfig,
		'ai_reranker',
	);
}

// =============================================================================
// Type Exports for Factory Function Signatures
// =============================================================================

export type LanguageModelFn = typeof languageModel;
export type MemoryFn = typeof memory;
export type ToolFn = typeof tool;
export type OutputParserFn = typeof outputParser;
export type EmbeddingFn = typeof embedding;
export type VectorStoreFn = typeof vectorStore;
export type RetrieverFn = typeof retriever;
export type DocumentLoaderFn = typeof documentLoader;
export type TextSplitterFn = typeof textSplitter;
export type RerankerFn = typeof reranker;
