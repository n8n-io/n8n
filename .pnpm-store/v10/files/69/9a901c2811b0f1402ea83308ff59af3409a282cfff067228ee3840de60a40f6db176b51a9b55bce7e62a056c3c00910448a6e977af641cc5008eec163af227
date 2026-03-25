import { InvertedIndexConfigCreate, InvertedIndexConfigUpdate, MultiTenancyConfigCreate, MultiTenancyConfigUpdate, ReplicationConfigCreate, ReplicationConfigUpdate, ReplicationDeletionStrategy, ShardingConfigCreate, VectorConfigUpdate, VectorizerUpdateOptions } from '../types/index.js';
import generative from './generative.js';
import reranker from './reranker.js';
import { configure as configureVectorIndex } from './vectorIndex.js';
import { multiVectors, vectorizer, vectors } from './vectorizer.js';
declare const dataType: {
    INT: "int";
    INT_ARRAY: "int[]";
    NUMBER: "number";
    NUMBER_ARRAY: "number[]";
    TEXT: "text";
    TEXT_ARRAY: "text[]";
    UUID: "uuid";
    UUID_ARRAY: "uuid[]";
    BOOLEAN: "boolean";
    BOOLEAN_ARRAY: "boolean[]";
    DATE: "date";
    DATE_ARRAY: "date[]";
    OBJECT: "object";
    OBJECT_ARRAY: "object[]";
    BLOB: "blob";
    GEO_COORDINATES: "geoCoordinates";
    PHONE_NUMBER: "phoneNumber";
};
declare const tokenization: {
    WORD: "word";
    LOWERCASE: "lowercase";
    WHITESPACE: "whitespace";
    FIELD: "field";
    TRIGRAM: "trigram";
    GSE: "gse";
    KAGOME_KR: "kagome_kr";
};
declare const vectorDistances: {
    COSINE: "cosine";
    DOT: "dot";
    HAMMING: "hamming";
    L2_SQUARED: "l2-squared";
};
declare const configure: {
    generative: {
        anthropic(config?: import("../types/index.js").GenerativeAnthropicConfig | undefined): import("../types/index.js").ModuleConfig<"generative-anthropic", import("../types/index.js").GenerativeAnthropicConfig | undefined>;
        anyscale(config?: import("../types/index.js").GenerativeAnyscaleConfig | undefined): import("../types/index.js").ModuleConfig<"generative-anyscale", import("../types/index.js").GenerativeAnyscaleConfig | undefined>;
        aws(config: import("../types/index.js").GenerativeAWSConfig): import("../types/index.js").ModuleConfig<"generative-aws", import("../types/index.js").GenerativeAWSConfig>;
        azureOpenAI: (config: import("./types/generative.js").GenerativeAzureOpenAIConfigCreate) => import("../types/index.js").ModuleConfig<"generative-openai", import("../types/index.js").GenerativeAzureOpenAIConfig>;
        cohere: (config?: import("./types/generative.js").GenerativeCohereConfigCreate | undefined) => import("../types/index.js").ModuleConfig<"generative-cohere", import("../types/index.js").GenerativeCohereConfig | undefined>;
        databricks: (config: import("../types/index.js").GenerativeDatabricksConfig) => import("../types/index.js").ModuleConfig<"generative-databricks", import("../types/index.js").GenerativeDatabricksConfig>;
        friendliai(config?: import("../types/index.js").GenerativeFriendliAIConfig | undefined): import("../types/index.js").ModuleConfig<"generative-friendliai", import("../types/index.js").GenerativeFriendliAIConfig | undefined>;
        mistral(config?: import("../types/index.js").GenerativeMistralConfig | undefined): import("../types/index.js").ModuleConfig<"generative-mistral", import("../types/index.js").GenerativeMistralConfig | undefined>;
        nvidia(config?: import("../types/index.js").GenerativeNvidiaConfig | undefined): import("../types/index.js").ModuleConfig<"generative-nvidia", import("../types/index.js").GenerativeNvidiaConfig | undefined>;
        ollama(config?: import("../types/index.js").GenerativeOllamaConfig | undefined): import("../types/index.js").ModuleConfig<"generative-ollama", import("../types/index.js").GenerativeOllamaConfig | undefined>;
        openAI: (config?: import("./types/generative.js").GenerativeOpenAIConfigCreate | undefined) => import("../types/index.js").ModuleConfig<"generative-openai", import("../types/index.js").GenerativeOpenAIConfig | undefined>;
        palm: (config?: import("../types/index.js").GenerativeGoogleConfig | undefined) => import("../types/index.js").ModuleConfig<"generative-palm", import("../types/index.js").GenerativeGoogleConfig | undefined>;
        google: (config?: import("../types/index.js").GenerativeGoogleConfig | undefined) => import("../types/index.js").ModuleConfig<"generative-google", import("../types/index.js").GenerativeGoogleConfig | undefined>;
        xai: (config?: import("../types/index.js").GenerativeXAIConfig | undefined) => import("../types/index.js").ModuleConfig<"generative-xai", import("../types/index.js").GenerativeXAIConfig | undefined>;
    };
    multiVectors: {
        selfProvided: <T, N extends string | undefined = undefined, I extends string = "hnsw">(opts?: import("./types/vectorizer.js").ConfigureNonTextMultiVectorizerOptions<N, I, "none"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T>, N, I, "none">;
        text2VecJinaAI: <T_1, N_1 extends string | undefined = undefined, I_1 extends string = "hnsw">(opts?: (import("../types/index.js").Text2MultiVecJinaAIConfig & {
            name?: N_1 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_1, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_1>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_1>[] | undefined;
        } & {
            encoding?: {
                ksim?: number | undefined;
                dprojections?: number | undefined;
                repetitions?: number | undefined;
                type?: "muvera" | undefined;
            } | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_1>, N_1, I_1, "text2multivec-jinaai">;
        multi2VecJinaAI: <N_2 extends string | undefined = undefined, I_2 extends string = "hnsw">(opts?: (import("../types/index.js").Multi2MultivecJinaAIConfig & {
            name?: N_2 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_2, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_2>> | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_2, I_2, "multi2multivec-jinaai">;
    };
    reranker: {
        cohere: (config?: import("../types/index.js").RerankerCohereConfig | undefined) => import("../types/index.js").ModuleConfig<"reranker-cohere", import("../types/index.js").RerankerCohereConfig | undefined>;
        jinaai: (config?: import("../types/index.js").RerankerJinaAIConfig | undefined) => import("../types/index.js").ModuleConfig<"reranker-jinaai", import("../types/index.js").RerankerJinaAIConfig | undefined>;
        nvidia: (config?: import("../types/index.js").RerankerNvidiaConfig | undefined) => import("../types/index.js").ModuleConfig<"reranker-nvidia", import("../types/index.js").RerankerNvidiaConfig | undefined>;
        transformers: () => import("../types/index.js").ModuleConfig<"reranker-transformers", Record<string, never>>;
        voyageAI: (config?: import("../types/index.js").RerankerVoyageAIConfig | undefined) => import("../types/index.js").ModuleConfig<"reranker-voyageai", import("../types/index.js").RerankerVoyageAIConfig | undefined>;
    };
    /**
     * @deprecated Use `configure.vectors` instead.
     */
    vectorizer: {
        none: <N_3 extends string | undefined = undefined, I_3 extends string = "hnsw">(opts?: {
            name?: N_3 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_3, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_3>> | undefined;
        } | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_3, I_3, "none">;
        selfProvided: <N_4 extends string | undefined = undefined, I_4 extends string = "hnsw">(opts?: {
            name?: N_4 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_4, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_4>> | undefined;
        } | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_4, I_4, "none">;
        img2VecNeural: <N_5 extends string | undefined = undefined, I_5 extends string = "hnsw">(opts: import("../types/index.js").Img2VecNeuralConfig & {
            name?: N_5 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_5, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_5>> | undefined;
        }) => import("./types/vectorizer.js").VectorConfigCreate<never, N_5, I_5, "img2vec-neural">;
        multi2VecBind: <N_6 extends string | undefined = undefined, I_6 extends string = "hnsw">(opts?: (Omit<import("../types/index.js").Multi2VecBindConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            audioFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            depthFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            IMUFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            thermalFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            videoFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_6 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_6, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_6>> | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_6, I_6, "multi2vec-bind">;
        multi2VecCohere: <N_7 extends string | undefined = undefined, I_7 extends string = "hnsw">(opts?: (Omit<import("../types/index.js").Multi2VecCohereConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_7 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_7, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_7>> | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_7, I_7, "multi2vec-cohere">;
        multi2VecClip: <N_8 extends string | undefined = undefined, I_8 extends string = "hnsw">(opts?: (Omit<import("../types/index.js").Multi2VecClipConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_8 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_8, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_8>> | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_8, I_8, "multi2vec-clip">;
        multi2VecJinaAI: <N_9 extends string | undefined = undefined, I_9 extends string = "hnsw">(opts?: (Omit<import("../types/index.js").Multi2VecJinaAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_9 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_9, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_9>> | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_9, I_9, "multi2vec-jinaai">;
        multi2VecPalm: <N_10 extends string | undefined = undefined, I_10 extends string = "hnsw">(opts: import("./types/vectorizer.js").ConfigureNonTextVectorizerOptions<N_10, I_10, "multi2vec-palm">) => import("./types/vectorizer.js").VectorConfigCreate<never, N_10, I_10, "multi2vec-palm">;
        multi2VecGoogle: <N_11 extends string | undefined = undefined, I_11 extends string = "hnsw">(opts: import("./types/vectorizer.js").ConfigureNonTextVectorizerOptions<N_11, I_11, "multi2vec-google">) => import("./types/vectorizer.js").VectorConfigCreate<never, N_11, I_11, "multi2vec-google">;
        multi2VecVoyageAI: <N_12 extends string | undefined = undefined, I_12 extends string = "hnsw">(opts?: (Omit<import("../types/index.js").Multi2VecVoyageAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_12 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_12, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_12>> | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_12, I_12, "multi2vec-voyageai">;
        ref2VecCentroid: <N_13 extends string | undefined = undefined, I_13 extends string = "hnsw">(opts: import("./types/vectorizer.js").ConfigureNonTextVectorizerOptions<N_13, I_13, "ref2vec-centroid">) => import("./types/vectorizer.js").VectorConfigCreate<never, N_13, I_13, "ref2vec-centroid">;
        text2VecAWS: <T_2, N_14 extends string | undefined = undefined, I_14 extends string = "hnsw">(opts: import("./types/vectorizer.js").ConfigureTextVectorizerOptions<T_2, N_14, I_14, "text2vec-aws">) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_2>, N_14, I_14, "text2vec-aws">;
        text2VecAzureOpenAI: <T_3, N_15 extends string | undefined = undefined, I_15 extends string = "hnsw">(opts: import("./types/vectorizer.js").ConfigureTextVectorizerOptions<T_3, N_15, I_15, "text2vec-azure-openai">) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_3>, N_15, I_15, "text2vec-azure-openai">;
        text2VecCohere: <T_4, N_16 extends string | undefined = undefined, I_16 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecCohereConfig & {
            name?: N_16 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_16, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_16>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_4>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_4>, N_16, I_16, "text2vec-cohere">;
        text2VecContextionary: <T_5, N_17 extends string | undefined = undefined, I_17 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecContextionaryConfig & {
            name?: N_17 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_17, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_17>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_5>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_5>, N_17, I_17, "text2vec-contextionary">;
        text2VecDatabricks: <T_6, N_18 extends string | undefined = undefined, I_18 extends string = "hnsw">(opts: import("./types/vectorizer.js").ConfigureTextVectorizerOptions<T_6, N_18, I_18, "text2vec-databricks">) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_6>, N_18, I_18, "text2vec-databricks">;
        text2VecGPT4All: <T_7, N_19 extends string | undefined = undefined, I_19 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecGPT4AllConfig & {
            name?: N_19 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_19, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_19>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_7>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_7>, N_19, I_19, "text2vec-gpt4all">;
        text2VecHuggingFace: <T_8, N_20 extends string | undefined = undefined, I_20 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecHuggingFaceConfig & {
            name?: N_20 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_20, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_20>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_8>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_8>, N_20, I_20, "text2vec-huggingface">;
        text2VecJinaAI: <T_9, N_21 extends string | undefined = undefined, I_21 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecJinaAIConfig & {
            name?: N_21 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_21, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_21>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_9>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_9>, N_21, I_21, "text2vec-jinaai">;
        text2VecNvidia: <T_10, N_22 extends string | undefined = undefined, I_22 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecNvidiaConfig & {
            name?: N_22 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_22, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_22>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_10>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_10>, N_22, I_22, "text2vec-nvidia">;
        text2VecMistral: <T_11, N_23 extends string | undefined = undefined, I_23 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecMistralConfig & {
            name?: N_23 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_23, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_23>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_11>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_11>, N_23, I_23, "text2vec-mistral">;
        text2VecOpenAI: <T_12, N_24 extends string | undefined = undefined, I_24 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecOpenAIConfig & {
            name?: N_24 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_24, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_24>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_12>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_12>, N_24, I_24, "text2vec-openai">;
        text2VecOllama: <T_13, N_25 extends string | undefined = undefined, I_25 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecOllamaConfig & {
            name?: N_25 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_25, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_25>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_13>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_13>, N_25, I_25, "text2vec-ollama">;
        text2VecPalm: <T_14, N_26 extends string | undefined = undefined, I_26 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecGoogleConfig & {
            name?: N_26 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_26, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_26>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_14>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_14>, N_26, I_26, "text2vec-palm">;
        text2VecGoogle: <T_15, N_27 extends string | undefined = undefined, I_27 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecGoogleConfig & {
            name?: N_27 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_27, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_27>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_15>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_15>, N_27, I_27, "text2vec-google">;
        text2VecTransformers: <T_16, N_28 extends string | undefined = undefined, I_28 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecTransformersConfig & {
            name?: N_28 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_28, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_28>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_16>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_16>, N_28, I_28, "text2vec-transformers">;
        text2VecVoyageAI: <T_17, N_29 extends string | undefined = undefined, I_29 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecVoyageAIConfig & {
            name?: N_29 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_29, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_29>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_17>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_17>, N_29, I_29, "text2vec-voyageai">;
        text2VecWeaviate: <T_18, N_30 extends string | undefined = undefined, I_30 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecWeaviateConfig & {
            name?: N_30 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_30, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_30>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_18>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_18>, N_30, I_30, "text2vec-weaviate">;
        text2VecModel2Vec: <T_19, N_31 extends string | undefined = undefined, I_31 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecModel2Vec & {
            name?: N_31 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_31, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_31>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_19>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_19>, N_31, I_31, "text2vec-model2vec">;
    };
    vectors: {
        multi2VecNvidia: <N_32 extends string | undefined = undefined, I_32 extends string = "hnsw">(opts?: (Omit<import("../types/index.js").Multi2VecNvidiaConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            outputEncoding?: string | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_32 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_32, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_32>> | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_32, I_32, "multi2vec-nvidia">;
        text2VecGoogleAiStudio: <T_20, N_33 extends string | undefined = undefined, I_33 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecGoogleAiStudioConfig & {
            name?: N_33 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_33, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_33>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_20>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_20>, N_33, I_33, "text2vec-google">;
        text2VecMorph: <T_21, N_34 extends string | undefined = undefined, I_34 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecMorphConfig & {
            name?: N_34 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_34, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_34>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_21>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_21>, N_34, I_34, "text2vec-morph">;
        text2VecWeaviate: <T_22, N_35 extends string | undefined = undefined, I_35 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecWeaviateConfig & {
            name?: N_35 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_35, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_35>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_22>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_22>, N_35, I_35, "text2vec-weaviate">;
        text2VecContextionary: <T_23, N_36 extends string | undefined = undefined, I_36 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecContextionaryConfig & {
            name?: N_36 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_36, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_36>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_23>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_23>, N_36, I_36, "text2vec-contextionary">;
        text2VecNvidia: <T_24, N_37 extends string | undefined = undefined, I_37 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecNvidiaConfig & {
            name?: N_37 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_37, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_37>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_24>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_24>, N_37, I_37, "text2vec-nvidia">;
        text2VecTransformers: <T_25, N_38 extends string | undefined = undefined, I_38 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecTransformersConfig & {
            name?: N_38 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_38, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_38>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_25>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_25>, N_38, I_38, "text2vec-transformers">;
        text2VecVoyageAI: <T_26, N_39 extends string | undefined = undefined, I_39 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecVoyageAIConfig & {
            name?: N_39 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_39, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_39>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_26>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_26>, N_39, I_39, "text2vec-voyageai">;
        text2VecGoogle: <T_27, N_40 extends string | undefined = undefined, I_40 extends string = "hnsw">(opts?: (Omit<import("../types/index.js").Text2VecGoogleConfig & {
            name?: N_40 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_40, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_40>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_27>[] | undefined;
        }, "vectorizeCollectionName"> & {
            model?: string | undefined;
            modelId?: undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_27>, N_40, I_40, "text2vec-google">;
        text2VecOpenAI: <T_28, N_41 extends string | undefined = undefined, I_41 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecOpenAIConfig & {
            name?: N_41 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_41, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_41>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_28>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_28>, N_41, I_41, "text2vec-openai">;
        text2VecOllama: <T_29, N_42 extends string | undefined = undefined, I_42 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecOllamaConfig & {
            name?: N_42 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_42, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_42>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_29>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_29>, N_42, I_42, "text2vec-ollama">;
        text2VecMistral: <T_30, N_43 extends string | undefined = undefined, I_43 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecMistralConfig & {
            name?: N_43 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_43, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_43>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_30>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_30>, N_43, I_43, "text2vec-mistral">;
        text2VecJinaAI: <T_31, N_44 extends string | undefined = undefined, I_44 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecJinaAIConfig & {
            name?: N_44 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_44, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_44>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_31>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_31>, N_44, I_44, "text2vec-jinaai">;
        text2VecHuggingFace: <T_32, N_45 extends string | undefined = undefined, I_45 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecHuggingFaceConfig & {
            name?: N_45 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_45, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_45>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_32>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_32>, N_45, I_45, "text2vec-huggingface">;
        text2VecGPT4All: <T_33, N_46 extends string | undefined = undefined, I_46 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecGPT4AllConfig & {
            name?: N_46 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_46, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_46>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_33>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_33>, N_46, I_46, "text2vec-gpt4all">;
        text2VecDatabricks: <T_34, N_47 extends string | undefined = undefined, I_47 extends string = "hnsw">(opts: Omit<import("./types/vectorizer.js").ConfigureTextVectorizerOptions<T_34, N_47, I_47, "text2vec-databricks">, "vectorizeCollectionName">) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_34>, N_47, I_47, "text2vec-databricks">;
        text2VecCohere: <T_35, N_48 extends string | undefined = undefined, I_48 extends string = "hnsw">(opts?: Omit<import("../types/index.js").Text2VecCohereConfig & {
            name?: N_48 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_48, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_48>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_35>[] | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_35>, N_48, I_48, "text2vec-cohere">;
        text2VecAzureOpenAI: <T_36, N_49 extends string | undefined = undefined, I_49 extends string = "hnsw">(opts: Omit<import("./types/vectorizer.js").ConfigureTextVectorizerOptions<T_36, N_49, I_49, "text2vec-azure-openai">, "vectorizeCollectionName">) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_36>, N_49, I_49, "text2vec-azure-openai">;
        text2VecAWS: <T_37, N_50 extends string | undefined = undefined, I_50 extends string = "hnsw">(opts: Omit<import("./types/vectorizer.js").ConfigureTextVectorizerOptions<T_37, N_50, I_50, "text2vec-aws">, "vectorizeCollectionName">) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_37>, N_50, I_50, "text2vec-aws">;
        multi2VecClip: <N_51 extends string | undefined = undefined, I_51 extends string = "hnsw">(opts?: Omit<Omit<import("../types/index.js").Multi2VecClipConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_51 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_51, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_51>> | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_51, I_51, "multi2vec-clip">;
        multi2VecCohere: <N_52 extends string | undefined = undefined, I_52 extends string = "hnsw">(opts?: Omit<Omit<import("../types/index.js").Multi2VecCohereConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_52 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_52, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_52>> | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_52, I_52, "multi2vec-cohere">;
        multi2VecBind: <N_53 extends string | undefined = undefined, I_53 extends string = "hnsw">(opts?: Omit<Omit<import("../types/index.js").Multi2VecBindConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            audioFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            depthFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            IMUFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            thermalFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            videoFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_53 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_53, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_53>> | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_53, I_53, "multi2vec-bind">;
        multi2VecJinaAI: <N_54 extends string | undefined = undefined, I_54 extends string = "hnsw">(opts?: Omit<Omit<import("../types/index.js").Multi2VecJinaAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_54 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_54, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_54>> | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_54, I_54, "multi2vec-jinaai">;
        multi2VecGoogle: <N_55 extends string | undefined = undefined, I_55 extends string = "hnsw">(opts: Omit<import("./types/vectorizer.js").ConfigureNonTextVectorizerOptions<N_55, I_55, "multi2vec-google">, "vectorizeCollectionName"> & {
            model?: string | undefined;
            modelId?: undefined;
        }) => import("./types/vectorizer.js").VectorConfigCreate<never, N_55, I_55, "multi2vec-google">;
        multi2VecVoyageAI: <N_56 extends string | undefined = undefined, I_56 extends string = "hnsw">(opts?: Omit<Omit<import("../types/index.js").Multi2VecVoyageAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
            imageFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
            textFields?: string[] | import("../types/index.js").Multi2VecField[] | undefined;
        } & {
            name?: N_56 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_56, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_56>> | undefined;
        }, "vectorizeCollectionName"> | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_56, I_56, "multi2vec-voyageai">;
        none: <N_3 extends string | undefined = undefined, I_3 extends string = "hnsw">(opts?: {
            name?: N_3 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_3, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_3>> | undefined;
        } | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_3, I_3, "none">;
        selfProvided: <N_4 extends string | undefined = undefined, I_4 extends string = "hnsw">(opts?: {
            name?: N_4 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_4, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_4>> | undefined;
        } | undefined) => import("./types/vectorizer.js").VectorConfigCreate<never, N_4, I_4, "none">;
        img2VecNeural: <N_5 extends string | undefined = undefined, I_5 extends string = "hnsw">(opts: import("../types/index.js").Img2VecNeuralConfig & {
            name?: N_5 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_5, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_5>> | undefined;
        }) => import("./types/vectorizer.js").VectorConfigCreate<never, N_5, I_5, "img2vec-neural">;
        ref2VecCentroid: <N_13 extends string | undefined = undefined, I_13 extends string = "hnsw">(opts: import("./types/vectorizer.js").ConfigureNonTextVectorizerOptions<N_13, I_13, "ref2vec-centroid">) => import("./types/vectorizer.js").VectorConfigCreate<never, N_13, I_13, "ref2vec-centroid">;
        text2VecModel2Vec: <T_19, N_31 extends string | undefined = undefined, I_31 extends string = "hnsw">(opts?: (import("../types/index.js").Text2VecModel2Vec & {
            name?: N_31 | undefined;
            quantizer?: import("./types/vectorIndex.js").QuantizerConfigCreate | undefined;
            vectorIndexConfig?: import("../types/index.js").ModuleConfig<I_31, import("./types/vectorIndex.js").VectorIndexConfigCreateType<I_31>> | undefined;
        } & {
            sourceProperties?: import("../types/internal.js").PrimitiveKeys<T_19>[] | undefined;
        }) | undefined) => import("./types/vectorizer.js").VectorConfigCreate<import("../types/internal.js").PrimitiveKeys<T_19>, N_31, I_31, "text2vec-model2vec">;
    };
    vectorIndex: {
        flat: (opts?: import("./types/vectorIndex.js").VectorIndexConfigFlatCreateOptions | undefined) => import("../types/index.js").ModuleConfig<"flat", import("./types/vectorIndex.js").VectorIndexConfigFlatCreate | undefined>;
        hnsw: (opts?: import("./types/vectorIndex.js").VectorIndexConfigHNSWCreateOptions | undefined) => import("../types/index.js").ModuleConfig<"hnsw", import("./types/vectorIndex.js").VectorIndexConfigHNSWCreate | undefined>;
        dynamic: (opts?: import("./types/vectorIndex.js").VectorIndexConfigDynamicCreateOptions | undefined) => import("../types/index.js").ModuleConfig<"dynamic", import("./types/vectorIndex.js").VectorIndexConfigDynamicCreate | undefined>;
        multiVector: {
            encoding: {
                muvera: (options?: {
                    ksim?: number | undefined;
                    dprojections?: number | undefined;
                    repetitions?: number | undefined;
                } | undefined) => {
                    ksim?: number | undefined;
                    dprojections?: number | undefined;
                    repetitions?: number | undefined;
                    type?: "muvera" | undefined;
                };
            };
            multiVector: (options?: {
                aggregation?: string | undefined;
                encoding?: {
                    ksim?: number | undefined;
                    dprojections?: number | undefined;
                    repetitions?: number | undefined;
                    type?: "muvera" | undefined;
                } | undefined;
            } | undefined) => import("./types/vectorIndex.js").MultiVectorConfigCreate;
        };
        quantizer: {
            none: () => import("../types/index.js").UncompressedConfig;
            bq: (options?: {
                cache?: boolean | undefined;
                rescoreLimit?: number | undefined;
            } | undefined) => import("./types/vectorIndex.js").QuantizerRecursivePartial<import("../types/index.js").BQConfig>;
            rq: (options?: {
                bits?: number | undefined;
                rescoreLimit?: number | undefined;
            } | undefined) => import("./types/vectorIndex.js").QuantizerRecursivePartial<import("../types/index.js").RQConfig>;
            pq: (options?: {
                bitCompression?: boolean | undefined;
                centroids?: number | undefined;
                encoder?: {
                    distribution?: import("../types/index.js").PQEncoderDistribution | undefined;
                    type?: import("../types/index.js").PQEncoderType | undefined;
                } | undefined;
                segments?: number | undefined;
                trainingLimit?: number | undefined;
            } | undefined) => import("./types/vectorIndex.js").QuantizerRecursivePartial<import("../types/index.js").PQConfig>;
            sq: (options?: {
                rescoreLimit?: number | undefined;
                trainingLimit?: number | undefined;
            } | undefined) => import("./types/vectorIndex.js").QuantizerRecursivePartial<import("../types/index.js").SQConfig>;
        };
    };
    dataType: {
        INT: "int";
        INT_ARRAY: "int[]";
        NUMBER: "number";
        NUMBER_ARRAY: "number[]";
        TEXT: "text";
        TEXT_ARRAY: "text[]";
        UUID: "uuid";
        UUID_ARRAY: "uuid[]";
        BOOLEAN: "boolean";
        BOOLEAN_ARRAY: "boolean[]";
        DATE: "date";
        DATE_ARRAY: "date[]";
        OBJECT: "object";
        OBJECT_ARRAY: "object[]";
        BLOB: "blob";
        GEO_COORDINATES: "geoCoordinates";
        PHONE_NUMBER: "phoneNumber";
    };
    tokenization: {
        WORD: "word";
        LOWERCASE: "lowercase";
        WHITESPACE: "whitespace";
        FIELD: "field";
        TRIGRAM: "trigram";
        GSE: "gse";
        KAGOME_KR: "kagome_kr";
    };
    vectorDistances: {
        COSINE: "cosine";
        DOT: "dot";
        HAMMING: "hamming";
        L2_SQUARED: "l2-squared";
    };
    /**
     * Create an `InvertedIndexConfigCreate` object to be used when defining the configuration of the keyword searching algorithm of your collection.
     *
     * See [the docs](https://weaviate.io/developers/weaviate/configuration/indexes#configure-the-inverted-index) for details!
     *
     * @param {number} [options.bm25b] The BM25 b parameter.
     * @param {number} [options.bm25k1] The BM25 k1 parameter.
     * @param {number} [options.cleanupIntervalSeconds] The interval in seconds at which the inverted index is cleaned up.
     * @param {boolean} [options.indexTimestamps] Whether to index timestamps.
     * @param {boolean} [options.indexPropertyLength] Whether to index the length of properties.
     * @param {boolean} [options.indexNullState] Whether to index the null state of properties.
     * @param {'en' | 'none'} [options.stopwordsPreset] The stopwords preset to use.
     * @param {string[]} [options.stopwordsAdditions] Additional stopwords to add.
     * @param {string[]} [options.stopwordsRemovals] Stopwords to remove.
     */
    invertedIndex: (options: {
        bm25b?: number;
        bm25k1?: number;
        cleanupIntervalSeconds?: number;
        indexTimestamps?: boolean;
        indexPropertyLength?: boolean;
        indexNullState?: boolean;
        stopwordsPreset?: 'en' | 'none';
        stopwordsAdditions?: string[];
        stopwordsRemovals?: string[];
    }) => InvertedIndexConfigCreate;
    /**
     * Create a `MultiTenancyConfigCreate` object to be used when defining the multi-tenancy configuration of your collection.
     *
     * @param {boolean} [options.autoTenantActivation] Whether auto-tenant activation is enabled. Default is false.
     * @param {boolean} [options.autoTenantCreation] Whether auto-tenant creation is enabled. Default is false.
     * @param {boolean} [options.enabled] Whether multi-tenancy is enabled. Default is true.
     */
    multiTenancy: (options?: {
        autoTenantActivation?: boolean;
        autoTenantCreation?: boolean;
        enabled?: boolean;
    }) => MultiTenancyConfigCreate;
    /**
     * Create a `ReplicationConfigCreate` object to be used when defining the replication configuration of your collection.
     *
     * NOTE: You can only use one of Sharding or Replication, not both.
     *
     * See [the docs](https://weaviate.io/developers/weaviate/concepts/replication-architecture#replication-vs-sharding) for more details.
     *
     * @param {boolean} [options.asyncEnabled] Whether asynchronous replication is enabled. Default is false.
     * @param {ReplicationDeletionStrategy} [options.deletionStrategy] The deletion strategy when replication conflicts are detected between deletes and reads.
     * @param {number} [options.factor] The replication factor. Default is 1.
     */
    replication: (options: {
        asyncEnabled?: boolean;
        deletionStrategy?: ReplicationDeletionStrategy;
        factor?: number;
    }) => ReplicationConfigCreate;
    /**
     * Create a `ShardingConfigCreate` object to be used when defining the sharding configuration of your collection.
     *
     * NOTE: You can only use one of Sharding or Replication, not both.
     *
     * See [the docs](https://weaviate.io/developers/weaviate/concepts/replication-architecture#replication-vs-sharding) for more details.
     *
     * @param {number} [options.virtualPerPhysical] The number of virtual shards per physical shard.
     * @param {number} [options.desiredCount] The desired number of physical shards.
     * @param {number} [options.desiredVirtualCount] The desired number of virtual shards.
     */
    sharding: (options: {
        virtualPerPhysical?: number;
        desiredCount?: number;
        desiredVirtualCount?: number;
    }) => ShardingConfigCreate;
};
declare const reconfigure: {
    vectorIndex: {
        flat: (options: {
            vectorCacheMaxObjects?: number | undefined;
            quantizer?: import("./types/vectorIndex.js").BQConfigUpdate | undefined;
        }) => import("../types/index.js").ModuleConfig<"flat", import("./types/vectorIndex.js").VectorIndexConfigFlatUpdate>;
        hnsw: (options: {
            dynamicEfFactor?: number | undefined;
            dynamicEfMax?: number | undefined;
            dynamicEfMin?: number | undefined;
            ef?: number | undefined;
            filterStrategy?: import("../types/index.js").VectorIndexFilterStrategy | undefined;
            flatSearchCutoff?: number | undefined;
            quantizer?: import("./types/vectorIndex.js").PQConfigUpdate | import("./types/vectorIndex.js").BQConfigUpdate | import("./types/vectorIndex.js").SQConfigUpdate | import("./types/vectorIndex.js").RQConfigUpdate | undefined;
            vectorCacheMaxObjects?: number | undefined;
        }) => import("../types/index.js").ModuleConfig<"hnsw", import("./types/vectorIndex.js").VectorIndexConfigHNSWUpdate>;
        quantizer: {
            bq: (options?: {
                cache?: boolean | undefined;
                rescoreLimit?: number | undefined;
            } | undefined) => import("./types/vectorIndex.js").BQConfigUpdate;
            rq: (options?: {
                rescoreLimit?: number | undefined;
            } | undefined) => import("./types/vectorIndex.js").RQConfigUpdate;
            pq: (options?: {
                centroids?: number | undefined;
                pqEncoderDistribution?: import("../types/index.js").PQEncoderDistribution | undefined;
                pqEncoderType?: import("../types/index.js").PQEncoderType | undefined;
                segments?: number | undefined;
                trainingLimit?: number | undefined;
            } | undefined) => import("./types/vectorIndex.js").PQConfigUpdate;
            sq: (options?: {
                rescoreLimit?: number | undefined;
                trainingLimit?: number | undefined;
            } | undefined) => import("./types/vectorIndex.js").SQConfigUpdate;
        };
    };
    /**
     * Create an `InvertedIndexConfigUpdate` object to be used when updating the configuration of the keyword searching algorithm of your collection.
     *
     * See [the docs](https://weaviate.io/developers/weaviate/configuration/indexes#configure-the-inverted-index) for details!
     *
     * @param {number} [options.bm25b] The BM25 b parameter.
     * @param {number} [options.bm25k1] The BM25 k1 parameter.
     * @param {number} [options.cleanupIntervalSeconds] The interval in seconds at which the inverted index is cleaned up.
     * @param {'en' | 'none'} [options.stopwordsPreset] The stopwords preset to use.
     * @param {string[]} [options.stopwordsAdditions] Additional stopwords to add.
     * @param {string[]} [options.stopwordsRemovals] Stopwords to remove.
     */
    invertedIndex: (options: {
        bm25b?: number;
        bm25k1?: number;
        cleanupIntervalSeconds?: number;
        stopwordsPreset?: 'en' | 'none';
        stopwordsAdditions?: string[];
        stopwordsRemovals?: string[];
    }) => InvertedIndexConfigUpdate;
    /**
     * @deprecated Use `vectors` instead.
     */
    vectorizer: {
        /**
         * Create a `VectorConfigUpdate` object to be used when updating the named vector configuration of Weaviate.
         *
         * @param {string} name The name of the vector.
         * @param {VectorizerOptions} options The options for the named vector.
         */
        update: <N extends string | undefined, I extends string>(options: VectorizerUpdateOptions<N, I>) => VectorConfigUpdate<N, I>;
    };
    vectors: {
        /**
         * Create a `VectorConfigUpdate` object to be used when updating the named vector configuration of Weaviate.
         *
         * @param {string} name The name of the vector.
         * @param {VectorizerOptions} options The options for the named vector.
         */
        update: <N_1 extends string | undefined, I_1 extends string>(options: VectorizerUpdateOptions<N_1, I_1>) => VectorConfigUpdate<N_1, I_1>;
    };
    /**
     * Create a `ReplicationConfigUpdate` object to be used when updating the replication configuration of Weaviate.
     *
     * See [the docs](https://weaviate.io/developers/weaviate/concepts/replication-architecture#replication-vs-sharding) for more details.
     *
     * @param {boolean} [options.asyncEnabled] Whether to enable asynchronous replication.
     * @param {ReplicationDeletionStrategy} [options.deletionStrategy] The deletion strategy to update when replication conflicts are detected between deletes and reads.
     * @param {number} [options.factor] The replication factor to update.
     */
    replication: (options: {
        asyncEnabled?: boolean;
        deletionStrategy?: ReplicationDeletionStrategy;
        factor?: number;
    }) => ReplicationConfigUpdate;
    /**
     * Create a `MultiTenancyConfigUpdate` object to be used when updating the multi-tenancy configuration of Weaviate.
     *
     * Note: You cannot update a single-tenant collection to become a multi-tenant collection. You must instead create a new multi-tenant collection and migrate the data over manually.
     *
     * @param {boolean} [options.autoTenantActivation] Whether to enable auto-tenant activation.
     * @param {boolean} [options.autoTenantCreation] Whether to enable auto-tenant creation.
     *
     */
    multiTenancy: (options: {
        autoTenantActivation?: boolean;
        autoTenantCreation?: boolean;
    }) => MultiTenancyConfigUpdate;
    generative: {
        anthropic(config?: import("../types/index.js").GenerativeAnthropicConfig | undefined): import("../types/index.js").ModuleConfig<"generative-anthropic", import("../types/index.js").GenerativeAnthropicConfig | undefined>;
        anyscale(config?: import("../types/index.js").GenerativeAnyscaleConfig | undefined): import("../types/index.js").ModuleConfig<"generative-anyscale", import("../types/index.js").GenerativeAnyscaleConfig | undefined>;
        aws(config: import("../types/index.js").GenerativeAWSConfig): import("../types/index.js").ModuleConfig<"generative-aws", import("../types/index.js").GenerativeAWSConfig>;
        azureOpenAI: (config: import("./types/generative.js").GenerativeAzureOpenAIConfigCreate) => import("../types/index.js").ModuleConfig<"generative-openai", import("../types/index.js").GenerativeAzureOpenAIConfig>;
        cohere: (config?: import("./types/generative.js").GenerativeCohereConfigCreate | undefined) => import("../types/index.js").ModuleConfig<"generative-cohere", import("../types/index.js").GenerativeCohereConfig | undefined>;
        databricks: (config: import("../types/index.js").GenerativeDatabricksConfig) => import("../types/index.js").ModuleConfig<"generative-databricks", import("../types/index.js").GenerativeDatabricksConfig>;
        friendliai(config?: import("../types/index.js").GenerativeFriendliAIConfig | undefined): import("../types/index.js").ModuleConfig<"generative-friendliai", import("../types/index.js").GenerativeFriendliAIConfig | undefined>;
        mistral(config?: import("../types/index.js").GenerativeMistralConfig | undefined): import("../types/index.js").ModuleConfig<"generative-mistral", import("../types/index.js").GenerativeMistralConfig | undefined>;
        nvidia(config?: import("../types/index.js").GenerativeNvidiaConfig | undefined): import("../types/index.js").ModuleConfig<"generative-nvidia", import("../types/index.js").GenerativeNvidiaConfig | undefined>;
        ollama(config?: import("../types/index.js").GenerativeOllamaConfig | undefined): import("../types/index.js").ModuleConfig<"generative-ollama", import("../types/index.js").GenerativeOllamaConfig | undefined>;
        openAI: (config?: import("./types/generative.js").GenerativeOpenAIConfigCreate | undefined) => import("../types/index.js").ModuleConfig<"generative-openai", import("../types/index.js").GenerativeOpenAIConfig | undefined>;
        palm: (config?: import("../types/index.js").GenerativeGoogleConfig | undefined) => import("../types/index.js").ModuleConfig<"generative-palm", import("../types/index.js").GenerativeGoogleConfig | undefined>;
        google: (config?: import("../types/index.js").GenerativeGoogleConfig | undefined) => import("../types/index.js").ModuleConfig<"generative-google", import("../types/index.js").GenerativeGoogleConfig | undefined>;
        xai: (config?: import("../types/index.js").GenerativeXAIConfig | undefined) => import("../types/index.js").ModuleConfig<"generative-xai", import("../types/index.js").GenerativeXAIConfig | undefined>;
    };
    reranker: {
        cohere: (config?: import("../types/index.js").RerankerCohereConfig | undefined) => import("../types/index.js").ModuleConfig<"reranker-cohere", import("../types/index.js").RerankerCohereConfig | undefined>;
        jinaai: (config?: import("../types/index.js").RerankerJinaAIConfig | undefined) => import("../types/index.js").ModuleConfig<"reranker-jinaai", import("../types/index.js").RerankerJinaAIConfig | undefined>;
        nvidia: (config?: import("../types/index.js").RerankerNvidiaConfig | undefined) => import("../types/index.js").ModuleConfig<"reranker-nvidia", import("../types/index.js").RerankerNvidiaConfig | undefined>;
        transformers: () => import("../types/index.js").ModuleConfig<"reranker-transformers", Record<string, never>>;
        voyageAI: (config?: import("../types/index.js").RerankerVoyageAIConfig | undefined) => import("../types/index.js").ModuleConfig<"reranker-voyageai", import("../types/index.js").RerankerVoyageAIConfig | undefined>;
    };
};
export { configure, dataType, generative, multiVectors, reconfigure, reranker, tokenization, vectorDistances, configureVectorIndex as vectorIndex, vectorizer, vectors, };
