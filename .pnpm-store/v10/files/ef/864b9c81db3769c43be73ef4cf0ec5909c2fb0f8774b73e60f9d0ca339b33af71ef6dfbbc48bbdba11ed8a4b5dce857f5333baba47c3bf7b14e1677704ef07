/// <reference types="node" resolution-mode="require"/>
import { GenerativeAWS as GenerativeAWSGRPC, GenerativeAWSMetadata, GenerativeAnthropic as GenerativeAnthropicGRPC, GenerativeAnthropicMetadata, GenerativeAnyscale as GenerativeAnyscaleGRPC, GenerativeAnyscaleMetadata, GenerativeCohere as GenerativeCohereGRPC, GenerativeCohereMetadata, GenerativeDatabricks as GenerativeDatabricksGRPC, GenerativeDatabricksMetadata, GenerativeDebug, GenerativeDummy as GenerativeDummyGRPC, GenerativeDummyMetadata, GenerativeFriendliAI as GenerativeFriendliAIGRPC, GenerativeFriendliAIMetadata, GenerativeGoogle as GenerativeGoogleGRPC, GenerativeGoogleMetadata, GenerativeMistral as GenerativeMistralGRPC, GenerativeMistralMetadata, GenerativeNvidia as GenerativeNvidiaGRPC, GenerativeNvidiaMetadata, GenerativeOllama as GenerativeOllamaGRPC, GenerativeOllamaMetadata, GenerativeOpenAI as GenerativeOpenAIGRPC, GenerativeOpenAIMetadata, GenerativeXAI as GenerativeXAIGRPC, GenerativeXAIMetadata } from '../../proto/v1/generative.js';
import { GenerativeXAIConfig, ModuleConfig } from '../index.js';
import { GroupByObject, GroupByResult, WeaviateGenericObject, WeaviateNonGenericObject } from './query.js';
export type GenerativeGenericObject<T, V, C extends GenerativeConfigRuntime | undefined> = WeaviateGenericObject<T, V> & {
    /** @deprecated (use `generative.text` instead) The LLM-generated output applicable to this single object. */
    generated?: string;
    /** Generative data returned from the LLM inference on this object. */
    generative?: GenerativeSingle<C>;
};
export type GenerativeNonGenericObject<C extends GenerativeConfigRuntime | undefined> = WeaviateNonGenericObject & {
    /** @deprecated (use `generative.text` instead) The LLM-generated output applicable to this single object. */
    generated?: string;
    /** Generative data returned from the LLM inference on this object. */
    generative?: GenerativeSingle<C>;
};
/** An object belonging to a collection as returned by the methods in the `collection.generate` namespace.
 *
 * Depending on the generic type `T`, the object will have subfields that map from `T`'s specific type definition.
 * If not, then the object will be non-generic and have a `properties` field that maps from a generic string to a `WeaviateField`.
 */
export type GenerativeObject<T, V, C extends GenerativeConfigRuntime | undefined> = T extends undefined ? V extends undefined ? GenerativeNonGenericObject<C> : GenerativeGenericObject<GenerativeNonGenericObject<C>['properties'], V, C> : V extends undefined ? GenerativeGenericObject<T, GenerativeNonGenericObject<C>['vectors'], C> : GenerativeGenericObject<T, V, C>;
export type GenerativeSingle<C extends GenerativeConfigRuntime | undefined> = {
    debug?: GenerativeDebug;
    metadata?: GenerativeMetadata<C>;
    text?: string;
};
export type GenerativeGrouped<C extends GenerativeConfigRuntime | undefined> = {
    metadata?: GenerativeMetadata<C>;
    text?: string;
};
/** The return of a query method in the `collection.generate` namespace. */
export type GenerativeReturn<T, V, C extends GenerativeConfigRuntime | undefined> = {
    /** The objects that were found by the query. */
    objects: GenerativeObject<T, V, C>[];
    /** @deprecated (use `generative.text` instead) The LLM-generated output applicable to this query as a whole. */
    generated?: string;
    generative?: GenerativeGrouped<C>;
};
export type GenerativeGroupByResult<T, V, C extends GenerativeConfigRuntime | undefined> = GroupByResult<T, V> & {
    /** @deprecated (use `generative.text` instead) The LLM-generated output applicable to this query as a whole. */
    generated?: string;
    generative?: GenerativeSingle<C>;
};
/** The return of a query method in the `collection.generate` namespace where the `groupBy` argument was specified. */
export type GenerativeGroupByReturn<T, V, C extends GenerativeConfigRuntime | undefined> = {
    /** The objects that were found by the query. */
    objects: GroupByObject<T, V>[];
    /** The groups that were created by the query. */
    groups: Record<string, GenerativeGroupByResult<T, V, C>>;
    /** @deprecated (use `generative.text` instead) The LLM-generated output applicable to this query as a whole. */
    generated?: string;
    generative?: GenerativeGrouped<C>;
};
/** Options available when defining queries using methods in the `collection.generate` namespace. */
export type GenerateOptions<T, C> = {
    /** The prompt to use when generating content relevant to each object of the collection individually. */
    singlePrompt?: string | SinglePrompt;
    /** The prompt to use when generating content relevant to objects returned by the query as a whole. */
    groupedTask?: string | GroupedTask<T>;
    /** The properties to use as context to be injected into the `groupedTask` prompt when performing the grouped generation. */
    groupedProperties?: T extends undefined ? string[] : (keyof T)[];
    config?: C;
};
export type SinglePrompt = {
    prompt: string;
    debug?: boolean;
    metadata?: boolean;
    images?: (string | Buffer)[];
    imageProperties?: string[];
};
export type GroupedTask<T> = {
    prompt: string;
    metadata?: boolean;
    nonBlobProperties?: T extends undefined ? string[] : (keyof T)[];
    images?: (string | Buffer)[];
    imageProperties?: string[];
};
type omitFields = 'images' | 'imageProperties';
export type GenerativeConfigRuntime = ModuleConfig<'generative-anthropic', GenerativeConfigRuntimeType<'generative-anthropic'> | undefined> | ModuleConfig<'generative-anyscale', GenerativeConfigRuntimeType<'generative-anyscale'> | undefined> | ModuleConfig<'generative-aws', GenerativeConfigRuntimeType<'generative-aws'> | undefined> | ModuleConfig<'generative-azure-openai', GenerativeConfigRuntimeType<'generative-azure-openai'>> | ModuleConfig<'generative-cohere', GenerativeConfigRuntimeType<'generative-cohere'> | undefined> | ModuleConfig<'generative-databricks', GenerativeConfigRuntimeType<'generative-databricks'> | undefined> | ModuleConfig<'generative-dummy', GenerativeConfigRuntimeType<'generative-dummy'> | undefined> | ModuleConfig<'generative-friendliai', GenerativeConfigRuntimeType<'generative-friendliai'> | undefined> | ModuleConfig<'generative-google', GenerativeConfigRuntimeType<'generative-google'> | undefined> | ModuleConfig<'generative-mistral', GenerativeConfigRuntimeType<'generative-mistral'> | undefined> | ModuleConfig<'generative-nvidia', GenerativeConfigRuntimeType<'generative-nvidia'> | undefined> | ModuleConfig<'generative-ollama', GenerativeConfigRuntimeType<'generative-ollama'> | undefined> | ModuleConfig<'generative-openai', GenerativeConfigRuntimeType<'generative-openai'>> | ModuleConfig<'generative-xai', GenerativeConfigRuntimeType<'generative-xai'> | undefined>;
export type GenerativeConfigRuntimeType<G> = G extends 'generative-anthropic' ? Omit<GenerativeAnthropicGRPC, omitFields> : G extends 'generative-anyscale' ? Omit<GenerativeAnyscaleGRPC, omitFields> : G extends 'generative-aws' ? Omit<GenerativeAWSGRPC, omitFields> : G extends 'generative-azure-openai' ? Omit<GenerativeOpenAIGRPC, omitFields> & {
    isAzure: true;
} : G extends 'generative-cohere' ? Omit<GenerativeCohereGRPC, omitFields> : G extends 'generative-databricks' ? Omit<GenerativeDatabricksGRPC, omitFields> : G extends 'generative-google' ? Omit<GenerativeGoogleGRPC, omitFields> : G extends 'generative-friendliai' ? Omit<GenerativeFriendliAIGRPC, omitFields> : G extends 'generative-mistral' ? Omit<GenerativeMistralGRPC, omitFields> : G extends 'generative-nvidia' ? Omit<GenerativeNvidiaGRPC, omitFields> : G extends 'generative-ollama' ? Omit<GenerativeOllamaGRPC, omitFields> : G extends 'generative-openai' ? Omit<GenerativeOpenAIGRPC, omitFields> & {
    isAzure?: false;
} : G extends 'generative-xai' ? Omit<GenerativeXAIGRPC, omitFields> : G extends 'none' ? undefined : Record<string, any> | undefined;
export type GenerativeMetadata<C extends GenerativeConfigRuntime | undefined> = C extends undefined ? never : C extends infer R extends GenerativeConfigRuntime ? R['name'] extends 'generative-anthropic' ? GenerativeAnthropicMetadata : R['name'] extends 'generative-anyscale' ? GenerativeAnyscaleMetadata : R['name'] extends 'generative-aws' ? GenerativeAWSMetadata : R['name'] extends 'generative-cohere' ? GenerativeCohereMetadata : R['name'] extends 'generative-databricks' ? GenerativeDatabricksMetadata : R['name'] extends 'generative-dummy' ? GenerativeDummyMetadata : R['name'] extends 'generative-friendliai' ? GenerativeFriendliAIMetadata : R['name'] extends 'generative-google' ? GenerativeGoogleMetadata : R['name'] extends 'generative-mistral' ? GenerativeMistralMetadata : R['name'] extends 'generative-nvidia' ? GenerativeNvidiaMetadata : R['name'] extends 'generative-ollama' ? GenerativeOllamaMetadata : R['name'] extends 'generative-openai' ? GenerativeOpenAIMetadata : R['name'] extends 'generative-xai' ? GenerativeXAIMetadata : never : never;
export type GenerateReturn<T, V, C extends GenerativeConfigRuntime | undefined> = Promise<GenerativeReturn<T, V, C>> | Promise<GenerativeGroupByReturn<T, V, C>>;
export type GenerativeAnthropicConfigRuntime = {
    baseURL?: string | undefined;
    maxTokens?: number | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    topK?: number | undefined;
    topP?: number | undefined;
    stopSequences?: string[] | undefined;
};
export type GenerativeAnyscaleConfigRuntime = {
    baseURL?: string | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
};
export type GenerativeAWSConfigRuntime = {
    model?: string | undefined;
    temperature?: number | undefined;
    service?: string | undefined;
    region?: string | undefined;
    endpoint?: string | undefined;
    targetModel?: string | undefined;
    targetVariant?: string | undefined;
};
export type GenerativeCohereConfigRuntime = {
    baseURL?: string | undefined;
    frequencyPenalty?: number | undefined;
    maxTokens?: number | undefined;
    model?: string | undefined;
    k?: number | undefined;
    p?: number | undefined;
    presencePenalty?: number | undefined;
    stopSequences?: string[] | undefined;
    temperature?: number | undefined;
};
export type GenerativeDatabricksConfigRuntime = {
    endpoint?: string | undefined;
    model?: string | undefined;
    frequencyPenalty?: number | undefined;
    logProbs?: boolean | undefined;
    topLogProbs?: number | undefined;
    maxTokens?: number | undefined;
    n?: number | undefined;
    presencePenalty?: number | undefined;
    stop?: string[] | undefined;
    temperature?: number | undefined;
    topP?: number | undefined;
};
export type GenerativeDummyConfigRuntime = GenerativeDummyGRPC;
export type GenerativeFriendliAIConfigRuntime = {
    baseURL?: string | undefined;
    model?: string | undefined;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    n?: number | undefined;
    topP?: number | undefined;
};
export type GenerativeGoogleConfigRuntime = {
    frequencyPenalty?: number | undefined;
    maxTokens?: number | undefined;
    model?: string | undefined;
    presencePenalty?: number | undefined;
    temperature?: number | undefined;
    topK?: number | undefined;
    topP?: number | undefined;
    stopSequences?: string[] | undefined;
    apiEndpoint?: string | undefined;
    projectId?: string | undefined;
    endpointId?: string | undefined;
    region?: string | undefined;
};
export type GenerativeMistralConfigRuntime = {
    baseURL?: string | undefined;
    maxTokens?: number | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    topP?: number | undefined;
};
export type GenerativeNvidiaConfigRuntime = {
    baseURL?: string | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    topP?: number | undefined;
    maxTokens?: number | undefined;
};
export type GenerativeOllamaConfigRuntime = {
    apiEndpoint?: string | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
};
export type GenerativeOpenAIConfigRuntime = {
    frequencyPenalty?: number | undefined;
    maxTokens?: number | undefined;
    model?: string;
    n?: number | undefined;
    presencePenalty?: number | undefined;
    stop?: string[] | undefined;
    temperature?: number | undefined;
    topP?: number | undefined;
    baseURL?: string | undefined;
    apiVersion?: string | undefined;
    resourceName?: string | undefined;
    deploymentId?: string | undefined;
};
export type GenerativeXAIConfigRuntime = GenerativeXAIConfig;
export {};
