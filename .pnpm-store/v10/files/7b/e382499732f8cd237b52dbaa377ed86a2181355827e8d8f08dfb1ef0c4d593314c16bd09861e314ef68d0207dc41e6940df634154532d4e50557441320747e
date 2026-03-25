import { ModuleConfig } from './index.js';
import { VectorIndexConfig, VectorIndexType } from './vectorIndex.js';
export type VectorConfig = Record<string, {
    properties?: string[];
    vectorizer: ModuleConfig<Vectorizer, VectorizerConfig> | ModuleConfig<string, any>;
    indexConfig: VectorIndexConfig;
    indexType: VectorIndexType;
}>;
/** @deprecated Use `multi2vec-google` instead. */
type Multi2VecPalmVectorizer = 'multi2vec-palm';
/** @deprecated Use `text2vec-google` instead. */
type Text2VecPalmVectorizer = 'text2vec-palm';
export type Vectorizer = 'img2vec-neural' | 'multi2vec-nvidia' | 'multi2vec-clip' | 'multi2vec-cohere' | 'multi2vec-bind' | Multi2VecPalmVectorizer | 'multi2vec-google' | 'multi2vec-jinaai' | 'multi2multivec-jinaai' | 'multi2vec-voyageai' | 'ref2vec-centroid' | 'text2vec-aws' | 'text2vec-azure-openai' | 'text2vec-cohere' | 'text2vec-contextionary' | 'text2vec-databricks' | 'text2vec-gpt4all' | 'text2vec-huggingface' | 'text2vec-jinaai' | 'text2vec-nvidia' | 'text2vec-mistral' | 'text2vec-model2vec' | 'text2vec-morph' | 'text2vec-ollama' | 'text2vec-openai' | Text2VecPalmVectorizer | 'text2vec-google' | 'text2vec-google-ai-studio' | 'text2vec-transformers' | 'text2vec-voyageai' | 'text2vec-weaviate' | 'text2multivec-jinaai' | 'none';
/** The configuration for image vectorization using a neural network module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/modules/img2vec-neural) for detailed usage.
 */
export type Img2VecNeuralConfig = {
    /** The image fields used when vectorizing. This is a required field and must match the property fields of the collection that are defined as `DataType.BLOB`. */
    imageFields: string[];
};
/** The field configuration for multi-media vectorization. */
export type Multi2VecField = {
    /** The name of the field to be used when performing multi-media vectorization. */
    name: string;
    /** The weight of the field when performing multi-media vectorization. */
    weight?: number;
};
/** The configuration for multi-media vectorization using the NVIDIA module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/nvidia/embeddings-multimodal) for detailed usage.
 */
export type Multi2VecNvidiaConfig = {
    /** The model to use. Defaults to `None`, which uses the server-defined default. */
    model?: string;
    /** The base URL where API requests should go. */
    baseURL?: string;
    /** Whether to apply truncation. */
    truncation?: boolean;
    /** Format in which the embeddings are encoded. Defaults to `None`, so the embeddings are represented as a list of floating-point numbers. */
    output_encoding?: string;
    /** The image fields used when vectorizing. */
    imageFields?: string[];
    /** The text fields used when vectorizing. */
    textFields?: string[];
    /** The weights of the fields used for vectorization. */
    weights?: {
        /** The weights of the image fields. */
        imageFields?: number[];
        /** The weights of the text fields. */
        textFields?: number[];
    };
};
/** The configuration for multi-media vectorization using the AWS module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/aws/embeddings-multimodal) for detailed usage.
 */
export type Multi2VecAWSConfig = {
    /** The dimensionality of the vector once embedded. */
    dimensions?: number;
    /** The model to use. */
    model?: string;
    /** The AWS region where the model runs. */
    region?: string;
    /** The image fields used when vectorizing. */
    imageFields?: string[];
    /** The text fields used when vectorizing. */
    textFields?: string[];
    /** The weights of the fields used for vectorization. */
    weights?: {
        /** The weights of the image fields. */
        imageFields?: number[];
        /** The weights of the text fields. */
        textFields?: number[];
    };
};
/** The configuration for multi-media vectorization using the CLIP module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/transformers/embeddings-multimodal) for detailed usage.
 */
export type Multi2VecClipConfig = {
    /** The image fields used when vectorizing. */
    imageFields?: string[];
    /** The URL where inference requests are sent. */
    inferenceUrl?: string;
    /** The text fields used when vectorizing. */
    textFields?: string[];
    /** Whether the collection name is vectorized. */
    vectorizeCollectionName?: boolean;
    /** The weights of the fields used for vectorization. */
    weights?: {
        /** The weights of the image fields. */
        imageFields?: number[];
        /** The weights of the text fields. */
        textFields?: number[];
    };
};
/**
 * The configuration for multi-media vectorization using the Cohere module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/cohere/embeddings-multimodal) for detailed usage.
 */
export type Multi2VecCohereConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The image fields used when vectorizing. */
    imageFields?: string[];
    /** The specific model to use. */
    model?: string;
    /** The text fields used when vectorizing. */
    textFields?: string[];
    /** The truncation strategy to use. */
    truncate?: string;
    /** Whether the collection name is vectorized. */
    vectorizeCollectionName?: boolean;
    /** The weights of the fields used for vectorization. */
    weights?: {
        /** The weights of the image fields. */
        imageFields?: number[];
        /** The weights of the text fields. */
        textFields?: number[];
    };
};
/** The configuration for multi-media vectorization using the Bind module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/imagebind/embeddings-multimodal) for detailed usage.
 */
export type Multi2VecBindConfig = {
    /** The audio fields used when vectorizing. */
    audioFields?: string[];
    /** The depth fields used when vectorizing. */
    depthFields?: string[];
    /** The image fields used when vectorizing. */
    imageFields?: string[];
    /** The IMU fields used when vectorizing. */
    IMUFields?: string[];
    /** The text fields used when vectorizing. */
    textFields?: string[];
    /** The thermal fields used when vectorizing. */
    thermalFields?: string[];
    /** The video fields used when vectorizing. */
    videoFields?: string[];
    /** Whether the collection name is vectorized. */
    vectorizeCollectionName?: boolean;
    /** The weights of the fields used for vectorization. */
    weights?: {
        /** The weights of the audio fields. */
        audioFields?: number[];
        /** The weights of the depth fields. */
        depthFields?: number[];
        /** The weights of the image fields. */
        imageFields?: number[];
        /** The weights of the IMU fields. */
        IMUFields?: number[];
        /** The weights of the text fields. */
        textFields?: number[];
        /** The weights of the thermal fields. */
        thermalFields?: number[];
        /** The weights of the video fields. */
        videoFields?: number[];
    };
};
/** @deprecated Use `Multi2VecGoogleConfig` instead. */
export type Multi2VecPalmConfig = Multi2VecGoogleConfig;
/** The configuration for multi-media vectorization using the Google module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings) for detailed usage.
 */
export type Multi2VecGoogleConfig = {
    /** The project ID of the model in GCP. */
    projectId: string;
    /** The location where the model runs. */
    location: string;
    /** The image fields used when vectorizing. */
    imageFields?: string[];
    /** The text fields used when vectorizing. */
    textFields?: string[];
    /** The video fields used when vectorizing. */
    videoFields?: string[];
    /** Length of a video interval in seconds. */
    videoIntervalSeconds?: number;
    /** The model ID in use. */
    model?: string;
    /** The model ID in use.
     * @deprecated Use `model` instead.*/
    modelId?: string;
    /** The dimensionality of the vector once embedded. */
    dimensions?: number;
    /** Whether the collection name is vectorized. */
    vectorizeCollectionName?: boolean;
    /** The weights of the fields used for vectorization. */
    weights?: {
        /** The weights of the image fields. */
        imageFields?: number[];
        /** The weights of the text fields. */
        textFields?: number[];
        /** The weights of the video fields. */
        videoFields?: number[];
    };
};
/** The configuration for multi-media-to-multi-vector vectorization using
 * the jina-embeddings-v4 model
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings-multimodal) for detailed usage.
 */
export type Multi2MultivecJinaAIConfig = {
    /** The image fields used when vectorizing. */
    imageFields?: string[];
    /** The text fields used when vectorizing. */
    textFields?: string[];
};
/** The configuration for multi-media vectorization using the Jina module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings-multimodal) for detailed usage.
 */
export type Multi2VecJinaAIConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The dimensionality of the vector once embedded. */
    dimensions?: number;
    /** The image fields used when vectorizing. */
    imageFields?: string[];
    /** The model to use. */
    model?: string;
    /** The text fields used when vectorizing. */
    textFields?: string[];
    /**
     * Whether the collection name is vectorized.
     *
     * @deprecated This parameter is not applicable and has no effect on the underlying module.
     * */
    vectorizeCollectionName?: boolean;
    /** The weights of the fields used for vectorization. */
    weights?: {
        /** The weights of the image fields. */
        imageFields?: number[];
        /** The weights of the text fields. */
        textFields?: number[];
    };
};
/** The configuration for multi-media vectorization using the VoyageAI module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/transformers/embeddings-multimodal) for detailed usage.
 */
export type Multi2VecVoyageAIConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The image fields used when vectorizing. */
    imageFields?: string[];
    /** The model to use. */
    model?: string;
    /** How the output from the model should be encoded on return. */
    outputEncoding?: string;
    /** The text fields used when vectorizing. */
    textFields?: string[];
    /** Whether the input should be truncated to fit in the context window. */
    truncate?: boolean;
    /** Whether the collection name is vectorized. */
    vectorizeCollectionName?: boolean;
    /** The weights of the fields used for vectorization. */
    weights?: {
        /** The weights of the image fields. */
        imageFields?: number[];
        /** The weights of the text fields. */
        textFields?: number[];
    };
};
/** The configuration for reference-based vectorization using the centroid method.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/modules/ref2vec-centroid) for detailed usage.
 */
export type Ref2VecCentroidConfig = {
    /** The properties used as reference points for vectorization. */
    referenceProperties: string[];
    /** The method used to calculate the centroid. */
    method: 'mean' | string;
};
/** The configuration for text vectorization using the AWS module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/modules/retriever-vectorizer-modules/text2vec-aws) for detailed usage.
 */
export type Text2VecAWSConfig = {
    /** The model to use. REQUIRED for service `sagemaker`. */
    endpoint?: string;
    /** The model to use. REQUIRED for service `bedrock`. */
    model?: 'amazon.titan-embed-text-v1' | 'cohere.embed-english-v3' | 'cohere.embed-multilingual-v3' | string;
    /** The AWS region where the model runs. */
    region: string;
    /** The AWS service to use. */
    service: 'sagemaker' | 'bedrock' | string;
    /** Whether the collection name is vectorized. */
    vectorizeCollectionName?: boolean;
};
/** The configuration for text vectorization using the OpenAI module with Azure.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/embeddings) for detailed usage.
 */
export type Text2VecAzureOpenAIConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The deployment ID to use */
    deploymentId: string;
    /** The resource name to use. */
    resourceName: string;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/** The configuration for text vectorization using the Cohere module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/cohere/embeddings) for detailed usage.
 */
export type Text2VecCohereConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The model to use. */
    model?: string;
    /** Whether to truncate the input texts to fit within the context length. */
    truncate?: boolean;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/** The configuration for text vectorization using the Contextionary module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/modules/text2vec-contextionary) for detailed usage.
 */
export type Text2VecContextionaryConfig = {
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/** The configuration for text vectorization using the Databricks module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/databricks/embeddings) for detailed usage.
 */
export type Text2VecDatabricksConfig = {
    endpoint: string;
    instruction?: string;
    vectorizeCollectionName?: boolean;
};
/** The configuration for text vectorization using the GPT-4-All module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/gpt4all/embeddings) for detailed usage.
 */
export type Text2VecGPT4AllConfig = {
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/**
 * The configuration for text vectorization using the HuggingFace module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/huggingface/embeddings) for detailed usage.
 */
export type Text2VecHuggingFaceConfig = {
    /** The endpoint URL to use. */
    endpointURL?: string;
    /** The model to use. */
    model?: string;
    /** The model to use for passage vectorization. */
    passageModel?: string;
    /** The model to use for query vectorization. */
    queryModel?: string;
    /** Whether to use the cache. */
    useCache?: boolean;
    /** Whether to use the GPU. */
    useGPU?: boolean;
    /** Whether to wait for the model. */
    waitForModel?: boolean;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/**
 * The configuration for text vectorization using the Jina module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings) for detailed usage.
 */
export type Text2VecJinaAIConfig = {
    /** The model to use. */
    model?: 'jina-embeddings-v2-base-en' | 'jina-embeddings-v2-small-en' | string;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/** The configuration for text vectorization using the Jina AI multi-vector module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings-colbert) for detailed usage.
 */
export type Text2MultiVecJinaAIConfig = {
    /** The dimensionality of the multi-vector. */
    dimensions?: number;
    /** The model to use. */
    model?: string;
};
/** @deprecated Use `Text2VecJinaAIConfig` instead. */
export type Text2VecJinaConfig = Text2VecJinaAIConfig;
/**
 * The configuration for text vectorization using the Nvidia module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/nvidia/embeddings) for detailed usage.
 */
export type Text2VecNvidiaConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The model to use. */
    model?: string;
    /** Whether to truncate when vectorising. */
    truncate?: boolean;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/**
 * The configuration for text vectorization using the Mistral module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/mistral/embeddings) for detailed usage.
 */
export type Text2VecMistralConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The model to use. */
    model?: 'mistral-embed' | string;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/**
 * The configuration for text vectorization using the Ollama module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/ollama/embeddings) for detailed usage.
 */
export type Text2VecOllamaConfig = {
    /** The base URL to use where API requests should go. */
    apiEndpoint?: string;
    /** The model to use. */
    model?: string;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/**
 * The configuration for text vectorization using the OpenAI module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/embeddings) for detailed usage.
 */
export type Text2VecOpenAIConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The dimensionality of the vector once embedded. */
    dimensions?: number;
    /** The model to use. */
    model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002' | string;
    /** The model version to use. */
    modelVersion?: string;
    /** The type of model to use. */
    type?: 'text' | 'code' | string;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/** @deprecated Use `Text2VecGoogleConfig` instead. */
export type Text2VecPalmConfig = Text2VecGoogleConfig;
/**
 * The configuration for text vectorization using the Google module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings) for detailed usage.
 */
export type Text2VecGoogleConfig = {
    /** The API endpoint to use without a leading scheme such as `http://`. */
    apiEndpoint?: string;
    /** The dimensionality of the vector once embedded. */
    dimensions?: number;
    /** The model ID to use. */
    model?: string;
    /** The model ID to use.
     * @deprecated Use `model `instead.*/
    modelId?: string;
    /** The project ID to use. */
    projectId?: string;
    /** The Weaviate property name for the `gecko-002` or `gecko-003` model to use as the title. */
    titleProperty?: string;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
export type Text2VecGoogleAiStudioConfig = {
    /** The model ID to use. */
    model?: string;
    /** The Weaviate property name for the `gecko-002` or `gecko-003` model to use as the title. */
    titleProperty?: string;
};
/**
 * The configuration for text vectorization using the Transformers module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/transformers/embeddings) for detailed usage.
 */
export type Text2VecTransformersConfig = {
    /** The number of dimensions for the generated embeddings. */
    dimensions?: number;
    /** The inference url to use where API requests should go. You can use either this OR (`passage_inference_url` & `query_inference_url`). */
    inferenceUrl?: string;
    /** The inference url to use where passage API requests should go. You can use either (this AND query_inference_url) OR `inference_url`. */
    passageInferenceUrl?: string;
    /** The inference url to use where query API requests should go. You can use either (this AND `passage_inference_url`) OR `inference_url`. */
    queryInferenceUrl?: string;
    /** The pooling strategy to use. */
    poolingStrategy?: 'masked_mean' | 'cls' | string;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/**
 * The configuration for text vectorization using the VoyageAI module.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/voyageai/embeddings) for detailed usage.
 */
export type Text2VecVoyageAIConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The model to use. */
    model?: string;
    /** Whether to truncate the input texts to fit within the context length. */
    truncate?: boolean;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/**
 * The configuration for text vectorization using Weaviate's self-hosted text-based embedding models.
 *
 * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/weaviate/embeddings) for detailed usage.
 */
export type Text2VecWeaviateConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The dimensionality of the vector once embedded. */
    dimensions?: number;
    /** The model to use. */
    model?: 'Snowflake/snowflake-arctic-embed-l-v2.0' | 'Snowflake/snowflake-arctic-embed-m-v1.5' | string;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
/**
 * The configuration for text vectorization using the Model2Vec module.
 */
export type Text2VecModel2Vec = {
    /** The URL to use where API requests should go. */
    inferenceURL?: string;
    /** Whether to vectorize the collection name. */
    vectorizeCollectionName?: boolean;
};
export type Text2VecMorphConfig = {
    /** The base URL to use where API requests should go. */
    baseURL?: string;
    /** The model to use. */
    model?: string;
};
export type NoVectorizerConfig = {};
export type VectorizerConfig = Img2VecNeuralConfig | Multi2VecAWSConfig | Multi2VecClipConfig | Multi2VecBindConfig | Multi2VecGoogleConfig | Multi2VecJinaAIConfig | Multi2MultivecJinaAIConfig | Multi2VecPalmConfig | Multi2VecVoyageAIConfig | Ref2VecCentroidConfig | Text2VecAWSConfig | Text2VecAzureOpenAIConfig | Text2VecContextionaryConfig | Text2VecCohereConfig | Text2VecDatabricksConfig | Text2VecGoogleConfig | Text2VecGPT4AllConfig | Text2VecHuggingFaceConfig | Text2VecModel2Vec | Text2VecJinaAIConfig | Text2VecOpenAIConfig | Text2VecPalmConfig | Text2VecTransformersConfig | Text2VecVoyageAIConfig | Text2VecWeaviateConfig | NoVectorizerConfig;
export type VectorizerConfigType<V> = V extends 'img2vec-neural' ? Img2VecNeuralConfig | undefined : V extends 'multi2vec-nvidia' ? Multi2VecNvidiaConfig | undefined : V extends 'multi2vec-clip' ? Multi2VecClipConfig | undefined : V extends 'multi2vec-cohere' ? Multi2VecCohereConfig | undefined : V extends 'multi2vec-bind' ? Multi2VecBindConfig | undefined : V extends 'multi2vec-google' ? Multi2VecGoogleConfig : V extends 'multi2vec-jinaai' ? Multi2VecJinaAIConfig | undefined : V extends 'multi2multivec-jinaai' ? Multi2MultivecJinaAIConfig | undefined : V extends Multi2VecPalmVectorizer ? Multi2VecPalmConfig : V extends 'multi2vec-voyageai' ? Multi2VecVoyageAIConfig | undefined : V extends 'ref2vec-centroid' ? Ref2VecCentroidConfig : V extends 'text2vec-aws' ? Text2VecAWSConfig : V extends 'text2vec-contextionary' ? Text2VecContextionaryConfig | undefined : V extends 'text2vec-cohere' ? Text2VecCohereConfig | undefined : V extends 'text2vec-databricks' ? Text2VecDatabricksConfig : V extends 'text2vec-google' ? Text2VecGoogleConfig | undefined : V extends 'text2vec-gpt4all' ? Text2VecGPT4AllConfig | undefined : V extends 'text2vec-huggingface' ? Text2VecHuggingFaceConfig | undefined : V extends 'text2vec-jinaai' ? Text2VecJinaAIConfig | undefined : V extends 'text2vec-nvidia' ? Text2VecNvidiaConfig | undefined : V extends 'text2vec-mistral' ? Text2VecMistralConfig | undefined : V extends 'text2vec-model2vec' ? Text2VecModel2Vec | undefined : V extends 'text2vec-morph' ? Text2VecMorphConfig | undefined : V extends 'text2vec-ollama' ? Text2VecOllamaConfig | undefined : V extends 'text2vec-openai' ? Text2VecOpenAIConfig | undefined : V extends 'text2vec-azure-openai' ? Text2VecAzureOpenAIConfig : V extends Text2VecPalmVectorizer ? Text2VecPalmConfig | undefined : V extends 'text2vec-transformers' ? Text2VecTransformersConfig | undefined : V extends 'text2vec-voyageai' ? Text2VecVoyageAIConfig | undefined : V extends 'text2vec-weaviate' ? Text2VecWeaviateConfig | undefined : V extends 'text2multivec-jinaai' ? Text2MultiVecJinaAIConfig | undefined : V extends 'none' ? {} : V extends undefined ? undefined : never;
export {};
