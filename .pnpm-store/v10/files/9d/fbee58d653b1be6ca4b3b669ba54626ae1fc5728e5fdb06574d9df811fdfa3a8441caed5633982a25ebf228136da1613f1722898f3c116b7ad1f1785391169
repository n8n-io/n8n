import { ModuleConfig, Multi2VecBindConfig, Multi2VecClipConfig, Multi2VecField, Multi2VecNvidiaConfig, Multi2VecVoyageAIConfig } from '../config/types/index.js';
import { ConfigureNonTextMultiVectorizerOptions, ConfigureTextMultiVectorizerOptions, QuantizerConfigCreate, VectorConfigCreate, VectorIndexConfigCreateType } from '../index.js';
import { PrimitiveKeys } from '../types/internal.js';
import { ConfigureNonTextVectorizerOptions, ConfigureTextVectorizerOptions } from './types/index.js';
/** Legacy export, maintained for backwards compatibility.
 * See the comment for `legacyVectors`.
 * @deprecated Use `vectors` instead. */
export declare const vectorizer: {
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'none'`.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'none'>} [opts] The configuration options for the `none` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'none'>} The configuration object.
     *
     * @deprecated Use `selfProvided` instead.
     */
    none: <N extends string | undefined = undefined, I extends string = "hnsw">(opts?: {
        name?: N | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I, VectorIndexConfigCreateType<I>> | undefined;
    } | undefined) => VectorConfigCreate<never, N, I, "none">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'none'`.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'none'>} [opts] The configuration options for the `none` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'none'>} The configuration object.
     */
    selfProvided: <N_1 extends string | undefined = undefined, I_1 extends string = "hnsw">(opts?: {
        name?: N_1 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_1, VectorIndexConfigCreateType<I_1>> | undefined;
    } | undefined) => VectorConfigCreate<never, N_1, I_1, "none">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'img2vec-neural'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/modules/img2vec-neural) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'img2vec-neural'>} [opts] The configuration options for the `img2vec-neural` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'img2vec-neural'>} The configuration object.
     */
    img2VecNeural: <N_2 extends string | undefined = undefined, I_2 extends string = "hnsw">(opts: import("../index.js").Img2VecNeuralConfig & {
        name?: N_2 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_2, VectorIndexConfigCreateType<I_2>> | undefined;
    }) => VectorConfigCreate<never, N_2, I_2, "img2vec-neural">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-bind'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/imagebind/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-bind'>} [opts] The configuration options for the `multi2vec-bind` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-bind'>} The configuration object.
     */
    multi2VecBind: <N_3 extends string | undefined = undefined, I_3 extends string = "hnsw">(opts?: (Omit<Multi2VecBindConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        audioFields?: string[] | Multi2VecField[] | undefined;
        depthFields?: string[] | Multi2VecField[] | undefined;
        imageFields?: string[] | Multi2VecField[] | undefined;
        IMUFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
        thermalFields?: string[] | Multi2VecField[] | undefined;
        videoFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_3 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_3, VectorIndexConfigCreateType<I_3>> | undefined;
    }) | undefined) => VectorConfigCreate<never, N_3, I_3, "multi2vec-bind">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-cohere'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/cohere/embeddings) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-cohere'>} [opts] The configuration options for the `multi2vec-cohere` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-cohere'>} The configuration object.
     */
    multi2VecCohere: <N_4 extends string | undefined = undefined, I_4 extends string = "hnsw">(opts?: (Omit<import("../index.js").Multi2VecCohereConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        imageFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_4 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_4, VectorIndexConfigCreateType<I_4>> | undefined;
    }) | undefined) => VectorConfigCreate<never, N_4, I_4, "multi2vec-cohere">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-clip'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/transformers/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-clip'>} [opts] The configuration options for the `multi2vec-clip` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-clip'>} The configuration object.
     */
    multi2VecClip: <N_5 extends string | undefined = undefined, I_5 extends string = "hnsw">(opts?: (Omit<Multi2VecClipConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        imageFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_5 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_5, VectorIndexConfigCreateType<I_5>> | undefined;
    }) | undefined) => VectorConfigCreate<never, N_5, I_5, "multi2vec-clip">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-jinaai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-jinaai'>} [opts] The configuration options for the `multi2vec-jinaai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-jinaai'>} The configuration object.
     */
    multi2VecJinaAI: <N_6 extends string | undefined = undefined, I_6 extends string = "hnsw">(opts?: (Omit<import("../index.js").Multi2VecJinaAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        imageFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_6 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_6, VectorIndexConfigCreateType<I_6>> | undefined;
    }) | undefined) => VectorConfigCreate<never, N_6, I_6, "multi2vec-jinaai">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-palm'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-palm'>} opts The configuration options for the `multi2vec-palm` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-palm'>} The configuration object.
     * @deprecated Use `multi2VecGoogle` instead.
     */
    multi2VecPalm: <N_7 extends string | undefined = undefined, I_7 extends string = "hnsw">(opts: ConfigureNonTextVectorizerOptions<N_7, I_7, "multi2vec-palm">) => VectorConfigCreate<never, N_7, I_7, "multi2vec-palm">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-google'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-google'>} opts The configuration options for the `multi2vec-google` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-google'>} The configuration object.
     */
    multi2VecGoogle: <N_8 extends string | undefined = undefined, I_8 extends string = "hnsw">(opts: ConfigureNonTextVectorizerOptions<N_8, I_8, "multi2vec-google">) => VectorConfigCreate<never, N_8, I_8, "multi2vec-google">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-clip'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/transformers/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-voyageai'>} [opts] The configuration options for the `multi2vec-voyageai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-voyageai'>} The configuration object.
     */
    multi2VecVoyageAI: <N_9 extends string | undefined = undefined, I_9 extends string = "hnsw">(opts?: (Omit<Multi2VecVoyageAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        imageFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_9 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_9, VectorIndexConfigCreateType<I_9>> | undefined;
    }) | undefined) => VectorConfigCreate<never, N_9, I_9, "multi2vec-voyageai">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'ref2vec-centroid'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/modules/ref2vec-centroid) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'ref2vec-centroid'>} opts The configuration options for the `ref2vec-centroid` vectorizer.
     * @returns {VectorConfigCreate<never, N, I, 'ref2vec-centroid'>} The configuration object.
     */
    ref2VecCentroid: <N_10 extends string | undefined = undefined, I_10 extends string = "hnsw">(opts: ConfigureNonTextVectorizerOptions<N_10, I_10, "ref2vec-centroid">) => VectorConfigCreate<never, N_10, I_10, "ref2vec-centroid">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-aws'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/aws/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<N, T, I, 'text2vec-aws'>} opts The configuration options for the `text2vec-aws` vectorizer.
     * @returns { VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-aws'>} The configuration object.
     */
    text2VecAWS: <T, N_11 extends string | undefined = undefined, I_11 extends string = "hnsw">(opts: ConfigureTextVectorizerOptions<T, N_11, I_11, "text2vec-aws">) => VectorConfigCreate<PrimitiveKeys<T>, N_11, I_11, "text2vec-aws">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-azure-openai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-azure-openai'>} opts The configuration options for the `text2vec-azure-openai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-azure-openai'>} The configuration object.
     */
    text2VecAzureOpenAI: <T_1, N_12 extends string | undefined = undefined, I_12 extends string = "hnsw">(opts: ConfigureTextVectorizerOptions<T_1, N_12, I_12, "text2vec-azure-openai">) => VectorConfigCreate<PrimitiveKeys<T_1>, N_12, I_12, "text2vec-azure-openai">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-cohere'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/cohere/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-cohere'>} [opts] The configuration options for the `text2vec-cohere` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-cohere'>} The configuration object.
     */
    text2VecCohere: <T_2, N_13 extends string | undefined = undefined, I_13 extends string = "hnsw">(opts?: (import("../index.js").Text2VecCohereConfig & {
        name?: N_13 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_13, VectorIndexConfigCreateType<I_13>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_2>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_2>, N_13, I_13, "text2vec-cohere">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-contextionary'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/modules/text2vec-contextionary) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-contextionary'>} [opts] The configuration for the `text2vec-contextionary` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-contextionary'>} The configuration object.
     * @deprecated The contextionary model is old and not recommended for use. If you are looking for a local, lightweight model try the new text2vec-model2vec module instead.
     */
    text2VecContextionary: <T_3, N_14 extends string | undefined = undefined, I_14 extends string = "hnsw">(opts?: (import("../index.js").Text2VecContextionaryConfig & {
        name?: N_14 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_14, VectorIndexConfigCreateType<I_14>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_3>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_3>, N_14, I_14, "text2vec-contextionary">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-databricks'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/databricks/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-databricks'>} opts The configuration for the `text2vec-databricks` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-databricks'>} The configuration object.
     */
    text2VecDatabricks: <T_4, N_15 extends string | undefined = undefined, I_15 extends string = "hnsw">(opts: ConfigureTextVectorizerOptions<T_4, N_15, I_15, "text2vec-databricks">) => VectorConfigCreate<PrimitiveKeys<T_4>, N_15, I_15, "text2vec-databricks">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-gpt4all'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/gpt4all/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-gpt4all'>} [opts] The configuration for the `text2vec-gpt4all` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-gpt4all'>} The configuration object.
     */
    text2VecGPT4All: <T_5, N_16 extends string | undefined = undefined, I_16 extends string = "hnsw">(opts?: (import("../index.js").Text2VecGPT4AllConfig & {
        name?: N_16 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_16, VectorIndexConfigCreateType<I_16>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_5>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_5>, N_16, I_16, "text2vec-gpt4all">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-huggingface'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/huggingface/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-huggingface'>} [opts] The configuration for the `text2vec-huggingface` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-huggingface'>} The configuration object.
     */
    text2VecHuggingFace: <T_6, N_17 extends string | undefined = undefined, I_17 extends string = "hnsw">(opts?: (import("../index.js").Text2VecHuggingFaceConfig & {
        name?: N_17 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_17, VectorIndexConfigCreateType<I_17>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_6>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_6>, N_17, I_17, "text2vec-huggingface">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-jinaai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-jinaai'>} [opts] The configuration for the `text2vec-jinaai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-jinaai'>} The configuration object.
     */
    text2VecJinaAI: <T_7, N_18 extends string | undefined = undefined, I_18 extends string = "hnsw">(opts?: (import("../index.js").Text2VecJinaAIConfig & {
        name?: N_18 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_18, VectorIndexConfigCreateType<I_18>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_7>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_7>, N_18, I_18, "text2vec-jinaai">;
    text2VecNvidia: <T_8, N_19 extends string | undefined = undefined, I_19 extends string = "hnsw">(opts?: (import("../index.js").Text2VecNvidiaConfig & {
        name?: N_19 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_19, VectorIndexConfigCreateType<I_19>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_8>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_8>, N_19, I_19, "text2vec-nvidia">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-mistral'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/mistral/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-mistral'>} [opts] The configuration for the `text2vec-mistral` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-mistral'>} The configuration object.
     */
    text2VecMistral: <T_9, N_20 extends string | undefined = undefined, I_20 extends string = "hnsw">(opts?: (import("../index.js").Text2VecMistralConfig & {
        name?: N_20 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_20, VectorIndexConfigCreateType<I_20>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_9>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_9>, N_20, I_20, "text2vec-mistral">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-openai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-openai'>} [opts] The configuration for the `text2vec-openai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-openai'>} The configuration object.
     */
    text2VecOpenAI: <T_10, N_21 extends string | undefined = undefined, I_21 extends string = "hnsw">(opts?: (import("../index.js").Text2VecOpenAIConfig & {
        name?: N_21 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_21, VectorIndexConfigCreateType<I_21>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_10>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_10>, N_21, I_21, "text2vec-openai">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-ollama'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/ollama/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-ollama'>} [opts] The configuration for the `text2vec-ollama` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-ollama'>} The configuration object.
     */
    text2VecOllama: <T_11, N_22 extends string | undefined = undefined, I_22 extends string = "hnsw">(opts?: (import("../index.js").Text2VecOllamaConfig & {
        name?: N_22 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_22, VectorIndexConfigCreateType<I_22>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_11>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_11>, N_22, I_22, "text2vec-ollama">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-palm'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-palm'>} opts The configuration for the `text2vec-palm` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-palm'>} The configuration object.
     * @deprecated Use `text2VecGoogle` instead.
     */
    text2VecPalm: <T_12, N_23 extends string | undefined = undefined, I_23 extends string = "hnsw">(opts?: (import("../index.js").Text2VecGoogleConfig & {
        name?: N_23 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_23, VectorIndexConfigCreateType<I_23>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_12>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_12>, N_23, I_23, "text2vec-palm">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-google'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-google'>} opts The configuration for the `text2vec-palm` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-google'>} The configuration object.
     */
    text2VecGoogle: <T_13, N_24 extends string | undefined = undefined, I_24 extends string = "hnsw">(opts?: (import("../index.js").Text2VecGoogleConfig & {
        name?: N_24 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_24, VectorIndexConfigCreateType<I_24>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_13>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_13>, N_24, I_24, "text2vec-google">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-transformers'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/transformers/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-transformers'>} [opts] The configuration for the `text2vec-transformers` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-transformers'>} The configuration object.
     */
    text2VecTransformers: <T_14, N_25 extends string | undefined = undefined, I_25 extends string = "hnsw">(opts?: (import("../index.js").Text2VecTransformersConfig & {
        name?: N_25 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_25, VectorIndexConfigCreateType<I_25>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_14>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_14>, N_25, I_25, "text2vec-transformers">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-voyageai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/voyageai/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-voyageai'>} [opts] The configuration for the `text2vec-voyageai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-voyageai'>} The configuration object.
     */
    text2VecVoyageAI: <T_15, N_26 extends string | undefined = undefined, I_26 extends string = "hnsw">(opts?: (import("../index.js").Text2VecVoyageAIConfig & {
        name?: N_26 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_26, VectorIndexConfigCreateType<I_26>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_15>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_15>, N_26, I_26, "text2vec-voyageai">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-weaviate'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/weaviate/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-weaviate'>} [opts] The configuration for the `text2vec-weaviate` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-weaviate'>} The configuration object.
     */
    text2VecWeaviate: <T_16, N_27 extends string | undefined = undefined, I_27 extends string = "hnsw">(opts?: (import("../index.js").Text2VecWeaviateConfig & {
        name?: N_27 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_27, VectorIndexConfigCreateType<I_27>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_16>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_16>, N_27, I_27, "text2vec-weaviate">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-model2vec'`.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-model2vec'>} [opts] The configuration for the `text2vec-model2vec` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-model2vec'>} The configuration object.
     */
    text2VecModel2Vec: <T_17, N_28 extends string | undefined = undefined, I_28 extends string = "hnsw">(opts?: (import("../index.js").Text2VecModel2Vec & {
        name?: N_28 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_28, VectorIndexConfigCreateType<I_28>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_17>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_17>, N_28, I_28, "text2vec-model2vec">;
};
export declare const vectors: {
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-nvidia'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/nvidia/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-nvidia'>} [opts] The configuration options for the `multi2vec-nvidia` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-nvidia'>} The configuration object.
     */
    multi2VecNvidia: <N extends string | undefined = undefined, I extends string = "hnsw">(opts?: (Omit<Multi2VecNvidiaConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        imageFields?: string[] | Multi2VecField[] | undefined;
        outputEncoding?: string | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I, VectorIndexConfigCreateType<I>> | undefined;
    }) | undefined) => VectorConfigCreate<never, N, I, "multi2vec-nvidia">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-google'` with specific options for AI studio deployments.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-google-ai-studio'>} [opts] The configuration for the `text2vec-google` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-google'>} The configuration object.
     */
    text2VecGoogleAiStudio: <T, N_1 extends string | undefined = undefined, I_1 extends string = "hnsw">(opts?: (import("../index.js").Text2VecGoogleAiStudioConfig & {
        name?: N_1 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_1, VectorIndexConfigCreateType<I_1>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T>, N_1, I_1, "text2vec-google">;
    text2VecMorph: <T_1, N_2 extends string | undefined = undefined, I_2 extends string = "hnsw">(opts?: (import("../index.js").Text2VecMorphConfig & {
        name?: N_2 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_2, VectorIndexConfigCreateType<I_2>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_1>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_1>, N_2, I_2, "text2vec-morph">;
    text2VecWeaviate: <T_2, N_3 extends string | undefined = undefined, I_3 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecWeaviateConfig & {
        name?: N_3 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_3, VectorIndexConfigCreateType<I_3>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_2>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_2>, N_3, I_3, "text2vec-weaviate">;
    /** @deprecated The contextionary model is old and not recommended for use. If you are looking for a local, lightweight model try the new text2vec-model2vec module instead. */
    text2VecContextionary: <T_3, N_4 extends string | undefined = undefined, I_4 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecContextionaryConfig & {
        name?: N_4 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_4, VectorIndexConfigCreateType<I_4>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_3>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_3>, N_4, I_4, "text2vec-contextionary">;
    text2VecNvidia: <T_4, N_5 extends string | undefined = undefined, I_5 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecNvidiaConfig & {
        name?: N_5 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_5, VectorIndexConfigCreateType<I_5>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_4>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_4>, N_5, I_5, "text2vec-nvidia">;
    text2VecTransformers: <T_5, N_6 extends string | undefined = undefined, I_6 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecTransformersConfig & {
        name?: N_6 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_6, VectorIndexConfigCreateType<I_6>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_5>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_5>, N_6, I_6, "text2vec-transformers">;
    text2VecVoyageAI: <T_6, N_7 extends string | undefined = undefined, I_7 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecVoyageAIConfig & {
        name?: N_7 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_7, VectorIndexConfigCreateType<I_7>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_6>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_6>, N_7, I_7, "text2vec-voyageai">;
    text2VecGoogle: <T_7, N_8 extends string | undefined = undefined, I_8 extends string = "hnsw">(opts?: (Omit<import("../index.js").Text2VecGoogleConfig & {
        name?: N_8 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_8, VectorIndexConfigCreateType<I_8>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_7>[] | undefined;
    }, "vectorizeCollectionName"> & {
        model?: string | undefined;
        modelId?: undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_7>, N_8, I_8, "text2vec-google">;
    text2VecOpenAI: <T_8, N_9 extends string | undefined = undefined, I_9 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecOpenAIConfig & {
        name?: N_9 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_9, VectorIndexConfigCreateType<I_9>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_8>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_8>, N_9, I_9, "text2vec-openai">;
    text2VecOllama: <T_9, N_10 extends string | undefined = undefined, I_10 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecOllamaConfig & {
        name?: N_10 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_10, VectorIndexConfigCreateType<I_10>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_9>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_9>, N_10, I_10, "text2vec-ollama">;
    text2VecMistral: <T_10, N_11 extends string | undefined = undefined, I_11 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecMistralConfig & {
        name?: N_11 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_11, VectorIndexConfigCreateType<I_11>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_10>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_10>, N_11, I_11, "text2vec-mistral">;
    text2VecJinaAI: <T_11, N_12 extends string | undefined = undefined, I_12 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecJinaAIConfig & {
        name?: N_12 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_12, VectorIndexConfigCreateType<I_12>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_11>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_11>, N_12, I_12, "text2vec-jinaai">;
    text2VecHuggingFace: <T_12, N_13 extends string | undefined = undefined, I_13 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecHuggingFaceConfig & {
        name?: N_13 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_13, VectorIndexConfigCreateType<I_13>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_12>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_12>, N_13, I_13, "text2vec-huggingface">;
    /** @deprecated The `text2vec-gpt4all` vectorizer is deprecated and will be removed in a future release. See the docs (https://docs.weaviate.io/weaviate/model-providers) for alternatives. */
    text2VecGPT4All: <T_13, N_14 extends string | undefined = undefined, I_14 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecGPT4AllConfig & {
        name?: N_14 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_14, VectorIndexConfigCreateType<I_14>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_13>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_13>, N_14, I_14, "text2vec-gpt4all">;
    text2VecDatabricks: <T_14, N_15 extends string | undefined = undefined, I_15 extends string = "hnsw">(opts: Omit<ConfigureTextVectorizerOptions<T_14, N_15, I_15, "text2vec-databricks">, "vectorizeCollectionName">) => VectorConfigCreate<PrimitiveKeys<T_14>, N_15, I_15, "text2vec-databricks">;
    text2VecCohere: <T_15, N_16 extends string | undefined = undefined, I_16 extends string = "hnsw">(opts?: Omit<import("../index.js").Text2VecCohereConfig & {
        name?: N_16 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_16, VectorIndexConfigCreateType<I_16>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_15>[] | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<PrimitiveKeys<T_15>, N_16, I_16, "text2vec-cohere">;
    text2VecAzureOpenAI: <T_16, N_17 extends string | undefined = undefined, I_17 extends string = "hnsw">(opts: Omit<ConfigureTextVectorizerOptions<T_16, N_17, I_17, "text2vec-azure-openai">, "vectorizeCollectionName">) => VectorConfigCreate<PrimitiveKeys<T_16>, N_17, I_17, "text2vec-azure-openai">;
    text2VecAWS: <T_17, N_18 extends string | undefined = undefined, I_18 extends string = "hnsw">(opts: Omit<ConfigureTextVectorizerOptions<T_17, N_18, I_18, "text2vec-aws">, "vectorizeCollectionName">) => VectorConfigCreate<PrimitiveKeys<T_17>, N_18, I_18, "text2vec-aws">;
    multi2VecClip: <N_19 extends string | undefined = undefined, I_19 extends string = "hnsw">(opts?: Omit<Omit<Multi2VecClipConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        imageFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_19 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_19, VectorIndexConfigCreateType<I_19>> | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<never, N_19, I_19, "multi2vec-clip">;
    multi2VecCohere: <N_20 extends string | undefined = undefined, I_20 extends string = "hnsw">(opts?: Omit<Omit<import("../index.js").Multi2VecCohereConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        imageFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_20 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_20, VectorIndexConfigCreateType<I_20>> | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<never, N_20, I_20, "multi2vec-cohere">;
    multi2VecBind: <N_21 extends string | undefined = undefined, I_21 extends string = "hnsw">(opts?: Omit<Omit<Multi2VecBindConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        audioFields?: string[] | Multi2VecField[] | undefined;
        depthFields?: string[] | Multi2VecField[] | undefined;
        imageFields?: string[] | Multi2VecField[] | undefined;
        IMUFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
        thermalFields?: string[] | Multi2VecField[] | undefined;
        videoFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_21 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_21, VectorIndexConfigCreateType<I_21>> | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<never, N_21, I_21, "multi2vec-bind">;
    multi2VecJinaAI: <N_22 extends string | undefined = undefined, I_22 extends string = "hnsw">(opts?: Omit<Omit<import("../index.js").Multi2VecJinaAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        imageFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_22 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_22, VectorIndexConfigCreateType<I_22>> | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<never, N_22, I_22, "multi2vec-jinaai">;
    multi2VecGoogle: <N_23 extends string | undefined = undefined, I_23 extends string = "hnsw">(opts: Omit<ConfigureNonTextVectorizerOptions<N_23, I_23, "multi2vec-google">, "vectorizeCollectionName"> & {
        model?: string | undefined;
        modelId?: undefined;
    }) => VectorConfigCreate<never, N_23, I_23, "multi2vec-google">;
    multi2VecVoyageAI: <N_24 extends string | undefined = undefined, I_24 extends string = "hnsw">(opts?: Omit<Omit<Multi2VecVoyageAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
        imageFields?: string[] | Multi2VecField[] | undefined;
        textFields?: string[] | Multi2VecField[] | undefined;
    } & {
        name?: N_24 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_24, VectorIndexConfigCreateType<I_24>> | undefined;
    }, "vectorizeCollectionName"> | undefined) => VectorConfigCreate<never, N_24, I_24, "multi2vec-voyageai">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'none'`.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'none'>} [opts] The configuration options for the `none` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'none'>} The configuration object.
     *
     * @deprecated Use `selfProvided` instead.
     */
    none: <N extends string | undefined = undefined, I extends string = "hnsw">(opts?: {
        name?: N | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I, VectorIndexConfigCreateType<I>> | undefined;
    } | undefined) => VectorConfigCreate<never, N, I, "none">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'none'`.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'none'>} [opts] The configuration options for the `none` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'none'>} The configuration object.
     */
    selfProvided: <N_1 extends string | undefined = undefined, I_1 extends string = "hnsw">(opts?: {
        name?: N_1 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_1, VectorIndexConfigCreateType<I_1>> | undefined;
    } | undefined) => VectorConfigCreate<never, N_1, I_1, "none">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'img2vec-neural'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/modules/img2vec-neural) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'img2vec-neural'>} [opts] The configuration options for the `img2vec-neural` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'img2vec-neural'>} The configuration object.
     */
    img2VecNeural: <N_25 extends string | undefined = undefined, I_25 extends string = "hnsw">(opts: import("../index.js").Img2VecNeuralConfig & {
        name?: N_25 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_25, VectorIndexConfigCreateType<I_25>> | undefined;
    }) => VectorConfigCreate<never, N_25, I_25, "img2vec-neural">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'ref2vec-centroid'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/modules/ref2vec-centroid) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'ref2vec-centroid'>} opts The configuration options for the `ref2vec-centroid` vectorizer.
     * @returns {VectorConfigCreate<never, N, I, 'ref2vec-centroid'>} The configuration object.
     */
    ref2VecCentroid: <N_26 extends string | undefined = undefined, I_26 extends string = "hnsw">(opts: ConfigureNonTextVectorizerOptions<N_26, I_26, "ref2vec-centroid">) => VectorConfigCreate<never, N_26, I_26, "ref2vec-centroid">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-model2vec'`.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-model2vec'>} [opts] The configuration for the `text2vec-model2vec` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-model2vec'>} The configuration object.
     */
    text2VecModel2Vec: <T_18, N_27 extends string | undefined = undefined, I_27 extends string = "hnsw">(opts?: (import("../index.js").Text2VecModel2Vec & {
        name?: N_27 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_27, VectorIndexConfigCreateType<I_27>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_18>[] | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_18>, N_27, I_27, "text2vec-model2vec">;
};
export declare const multiVectors: {
    /**
     * Create a multi-vector `VectorConfigCreate` object with the vectorizer set to `'none'`.
     *
     * @param {ConfigureNonTextMultiVectorizerOptions<N, I, 'none'>} [opts] The configuration options for the `none` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'none'>} The configuration object.
     */
    selfProvided: <T, N extends string | undefined = undefined, I extends string = "hnsw">(opts?: ConfigureNonTextMultiVectorizerOptions<N, I, "none"> | undefined) => VectorConfigCreate<PrimitiveKeys<T>, N, I, "none">;
    /**
     * Create a multi-vector `VectorConfigCreate` object with the vectorizer set to `'text2multivec-jinaai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings-colbert) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2multivec-jinaai'>} [opts] The configuration options for the `text2multivec-jinaai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2multivec-jinaai'>} The configuration object.
     */
    text2VecJinaAI: <T_1, N_1 extends string | undefined = undefined, I_1 extends string = "hnsw">(opts?: (import("../index.js").Text2MultiVecJinaAIConfig & {
        name?: N_1 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_1, VectorIndexConfigCreateType<I_1>> | undefined;
    } & {
        sourceProperties?: PrimitiveKeys<T_1>[] | undefined;
    } & {
        encoding?: {
            ksim?: number | undefined;
            dprojections?: number | undefined;
            repetitions?: number | undefined;
            type?: "muvera" | undefined;
        } | undefined;
    }) | undefined) => VectorConfigCreate<PrimitiveKeys<T_1>, N_1, I_1, "text2multivec-jinaai">;
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2multivec-jinaai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2multivec-jinaai'>} [opts] The configuration options for the `multi2multivec-jinaai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2multivec-jinaai'>} The configuration object.
     */
    multi2VecJinaAI: <N_2 extends string | undefined = undefined, I_2 extends string = "hnsw">(opts?: (import("../index.js").Multi2MultivecJinaAIConfig & {
        name?: N_2 | undefined;
        quantizer?: QuantizerConfigCreate | undefined;
        vectorIndexConfig?: ModuleConfig<I_2, VectorIndexConfigCreateType<I_2>> | undefined;
    }) | undefined) => VectorConfigCreate<never, N_2, I_2, "multi2multivec-jinaai">;
};
