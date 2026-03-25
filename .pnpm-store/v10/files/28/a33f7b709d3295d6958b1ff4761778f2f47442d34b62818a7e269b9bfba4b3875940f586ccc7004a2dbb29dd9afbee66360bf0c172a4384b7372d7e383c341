import { Backend, BackupCompressionLevel, BackupStatus } from './backup/index.js';
import { Backup } from './collections/backup/client.js';
import { Cluster } from './collections/cluster/index.js';
import { Collections } from './collections/index.js';
import { AccessTokenCredentialsInput, ApiKey, AuthAccessTokenCredentials, AuthClientCredentials, AuthCredentials, AuthUserPasswordCredentials, ClientCredentialsInput, OidcAuthenticator, UserPasswordCredentialsInput } from './connection/auth.js';
import { ConnectToCustomOptions, ConnectToLocalOptions, ConnectToWCDOptions, ConnectToWCSOptions, ConnectToWeaviateCloudOptions } from './connection/helpers.js';
import { ConnectionDetails, ProxiesParams, TimeoutParams } from './connection/http.js';
import { Meta } from './openapi/types.js';
import { Roles } from './roles/index.js';
import { DbVersion } from './utils/dbVersion.js';
import weaviateV2 from './v2/index.js';
import { Aliases } from './alias/index.js';
import { ConsistencyLevel } from './data/replication.js';
import { Groups } from './groups/index.js';
import { Users } from './users/index.js';
export type ProtocolParams = {
    /**
     * The host to connect to. E.g., `localhost` or `example.com`.
     */
    host: string;
    /**
     * The port to connect to. E.g., `8080` or `80`.
     */
    port: number;
    /**
     * Whether to use a secure connection (https).
     */
    secure: boolean;
    /**
     * An optional path in the case that you are using a forwarding proxy.
     *
     * E.g., http://localhost:8080/weaviate
     */
    path?: string;
};
export type ConnectionParams = {
    /**
     * The connection parameters for the REST and GraphQL APIs (http/1.1).
     */
    http: ProtocolParams;
    /**
     * The connection paramaters for the gRPC API (http/2).
     */
    grpc: ProtocolParams;
};
export type ClientParams = {
    /**
     * The connection parameters for Weaviate's public APIs.
     */
    connectionParams: ConnectionParams;
    /**
     * The credentials used to authenticate with Weaviate.
     *
     * Can be any of `AuthUserPasswordCredentials`, `AuthAccessTokenCredentials`, `AuthClientCredentials`, and `ApiKey`.
     */
    auth?: AuthCredentials;
    /**
     * Additional headers that should be passed to Weaviate in the underlying requests. E.g., X-OpenAI-Api-Key
     */
    headers?: HeadersInit;
    /**
     * The connection parameters for any tunnelling proxies that should be used.
     *
     * Note, if your proxy is a forwarding proxy then supply its configuration as if it were the Weaviate server itself using `rest` and `grpc`.
     */
    proxies?: ProxiesParams;
    /** The timeouts to use when making requests to Weaviate */
    timeout?: TimeoutParams;
    /** Whether to skip the initialization checks */
    skipInitChecks?: boolean;
};
export interface WeaviateClient {
    alias: Aliases;
    backup: Backup;
    cluster: Cluster;
    collections: Collections;
    oidcAuth?: OidcAuthenticator;
    groups: Groups;
    roles: Roles;
    users: Users;
    close: () => Promise<void>;
    getMeta: () => Promise<Meta>;
    getConnectionDetails: () => Promise<ConnectionDetails>;
    getOpenIDConfig?: () => Promise<any>;
    getWeaviateVersion: () => Promise<DbVersion>;
    isLive: () => Promise<boolean>;
    isReady: () => Promise<boolean>;
}
/**
 * Connect to a custom Weaviate deployment, e.g. your own self-hosted Kubernetes cluster.
 *
 * @param {ConnectToCustomOptions} options Options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your custom Weaviate deployment.
 */
export declare function connectToCustom(options: ConnectToCustomOptions): Promise<WeaviateClient>;
/**
 * Connect to a locally-deployed Weaviate instance, e.g. as a Docker compose stack.
 *
 * @param {ConnectToLocalOptions} [options] Options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your local Weaviate instance.
 */
export declare function connectToLocal(options?: ConnectToLocalOptions): Promise<WeaviateClient>;
/**
 * Connect to your own Weaviate Cloud (WCD) instance.
 *
 * @deprecated Use `connectToWeaviateCloud` instead.
 *
 * @param {string} clusterURL The URL of your WCD instance. E.g., `https://example.weaviate.network`.
 * @param {ConnectToWCDOptions} [options] Additional options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your WCD instance.
 */
export declare function connectToWCD(clusterURL: string, options?: ConnectToWCDOptions): Promise<WeaviateClient>;
/**
 * Connect to your own Weaviate Cloud Service (WCS) instance.
 *
 * @deprecated Use `connectToWeaviateCloud` instead.
 *
 * @param {string} clusterURL The URL of your WCD instance. E.g., `https://example.weaviate.network`.
 * @param {ConnectToWCSOptions} [options] Additional options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your WCS instance.
 */
export declare function connectToWCS(clusterURL: string, options?: ConnectToWCSOptions): Promise<WeaviateClient>;
/**
 * Connect to your own Weaviate Cloud (WCD) instance.
 *
 * @param {string} clusterURL The URL of your WCD instance. E.g., `https://example.weaviate.network`.
 * @param {ConnectToWeaviateCloudOptions} [options] Additional options for the connection.
 * @returns {Promise<WeaviateClient>} A Promise that resolves to a client connected to your WCD instance.
 */
export declare function connectToWeaviateCloud(clusterURL: string, options?: ConnectToWeaviateCloudOptions): Promise<WeaviateClient>;
declare function client(params: ClientParams): Promise<WeaviateClient>;
declare const app: {
    connectToCustom: typeof connectToCustom;
    connectToLocal: typeof connectToLocal;
    connectToWCD: typeof connectToWCD;
    connectToWCS: typeof connectToWCS;
    connectToWeaviateCloud: typeof connectToWeaviateCloud;
    client: typeof client;
    ApiKey: typeof ApiKey;
    AuthUserPasswordCredentials: typeof AuthUserPasswordCredentials;
    AuthAccessTokenCredentials: typeof AuthAccessTokenCredentials;
    AuthClientCredentials: typeof AuthClientCredentials;
    configure: {
        generative: {
            anthropic(config?: import("./collections/index.js").GenerativeAnthropicConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-anthropic", import("./collections/index.js").GenerativeAnthropicConfig | undefined>;
            anyscale(config?: import("./collections/index.js").GenerativeAnyscaleConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-anyscale", import("./collections/index.js").GenerativeAnyscaleConfig | undefined>;
            aws(config: import("./collections/index.js").GenerativeAWSConfig): import("./collections/index.js").ModuleConfig<"generative-aws", import("./collections/index.js").GenerativeAWSConfig>;
            azureOpenAI: (config: import("./collections/index.js").GenerativeAzureOpenAIConfigCreate) => import("./collections/index.js").ModuleConfig<"generative-openai", import("./collections/index.js").GenerativeAzureOpenAIConfig>;
            cohere: (config?: import("./collections/index.js").GenerativeCohereConfigCreate | undefined) => import("./collections/index.js").ModuleConfig<"generative-cohere", import("./collections/index.js").GenerativeCohereConfig | undefined>;
            databricks: (config: import("./collections/index.js").GenerativeDatabricksConfig) => import("./collections/index.js").ModuleConfig<"generative-databricks", import("./collections/index.js").GenerativeDatabricksConfig>;
            friendliai(config?: import("./collections/index.js").GenerativeFriendliAIConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-friendliai", import("./collections/index.js").GenerativeFriendliAIConfig | undefined>;
            mistral(config?: import("./collections/index.js").GenerativeMistralConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-mistral", import("./collections/index.js").GenerativeMistralConfig | undefined>;
            nvidia(config?: import("./collections/index.js").GenerativeNvidiaConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-nvidia", import("./collections/index.js").GenerativeNvidiaConfig | undefined>;
            ollama(config?: import("./collections/index.js").GenerativeOllamaConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-ollama", import("./collections/index.js").GenerativeOllamaConfig | undefined>;
            openAI: (config?: import("./collections/index.js").GenerativeOpenAIConfigCreate | undefined) => import("./collections/index.js").ModuleConfig<"generative-openai", import("./collections/index.js").GenerativeOpenAIConfig | undefined>;
            palm: (config?: import("./collections/index.js").GenerativeGoogleConfig | undefined) => import("./collections/index.js").ModuleConfig<"generative-palm", import("./collections/index.js").GenerativeGoogleConfig | undefined>;
            google: (config?: import("./collections/index.js").GenerativeGoogleConfig | undefined) => import("./collections/index.js").ModuleConfig<"generative-google", import("./collections/index.js").GenerativeGoogleConfig | undefined>;
            xai: (config?: import("./collections/index.js").GenerativeXAIConfig | undefined) => import("./collections/index.js").ModuleConfig<"generative-xai", import("./collections/index.js").GenerativeXAIConfig | undefined>;
        };
        multiVectors: {
            selfProvided: <T, N extends string | undefined = undefined, I extends string = "hnsw">(opts?: import("./collections/index.js").ConfigureNonTextMultiVectorizerOptions<N, I, "none"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T>, N, I, "none">;
            text2VecJinaAI: <T_1, N_1 extends string | undefined = undefined, I_1 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2MultiVecJinaAIConfig & {
                name?: N_1 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_1, import("./collections/index.js").VectorIndexConfigCreateType<I_1>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_1>[] | undefined;
            } & {
                encoding?: {
                    ksim?: number | undefined;
                    dprojections?: number | undefined;
                    repetitions?: number | undefined;
                    type?: "muvera" | undefined;
                } | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_1>, N_1, I_1, "text2multivec-jinaai">;
            multi2VecJinaAI: <N_2 extends string | undefined = undefined, I_2 extends string = "hnsw">(opts?: (import("./collections/index.js").Multi2MultivecJinaAIConfig & {
                name?: N_2 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_2, import("./collections/index.js").VectorIndexConfigCreateType<I_2>> | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_2, I_2, "multi2multivec-jinaai">;
        };
        reranker: {
            cohere: (config?: import("./collections/index.js").RerankerCohereConfig | undefined) => import("./collections/index.js").ModuleConfig<"reranker-cohere", import("./collections/index.js").RerankerCohereConfig | undefined>;
            jinaai: (config?: import("./collections/index.js").RerankerJinaAIConfig | undefined) => import("./collections/index.js").ModuleConfig<"reranker-jinaai", import("./collections/index.js").RerankerJinaAIConfig | undefined>;
            nvidia: (config?: import("./collections/index.js").RerankerNvidiaConfig | undefined) => import("./collections/index.js").ModuleConfig<"reranker-nvidia", import("./collections/index.js").RerankerNvidiaConfig | undefined>;
            transformers: () => import("./collections/index.js").ModuleConfig<"reranker-transformers", Record<string, never>>;
            voyageAI: (config?: import("./collections/index.js").RerankerVoyageAIConfig | undefined) => import("./collections/index.js").ModuleConfig<"reranker-voyageai", import("./collections/index.js").RerankerVoyageAIConfig | undefined>;
        };
        vectorizer: {
            none: <N_3 extends string | undefined = undefined, I_3 extends string = "hnsw">(opts?: {
                name?: N_3 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_3, import("./collections/index.js").VectorIndexConfigCreateType<I_3>> | undefined;
            } | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_3, I_3, "none">;
            selfProvided: <N_4 extends string | undefined = undefined, I_4 extends string = "hnsw">(opts?: {
                name?: N_4 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_4, import("./collections/index.js").VectorIndexConfigCreateType<I_4>> | undefined;
            } | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_4, I_4, "none">;
            img2VecNeural: <N_5 extends string | undefined = undefined, I_5 extends string = "hnsw">(opts: import("./collections/index.js").Img2VecNeuralConfig & {
                name?: N_5 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_5, import("./collections/index.js").VectorIndexConfigCreateType<I_5>> | undefined;
            }) => import("./collections/index.js").VectorConfigCreate<never, N_5, I_5, "img2vec-neural">;
            multi2VecBind: <N_6 extends string | undefined = undefined, I_6 extends string = "hnsw">(opts?: (Omit<import("./collections/index.js").Multi2VecBindConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                audioFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                depthFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                IMUFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                thermalFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                videoFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_6 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_6, import("./collections/index.js").VectorIndexConfigCreateType<I_6>> | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_6, I_6, "multi2vec-bind">;
            multi2VecCohere: <N_7 extends string | undefined = undefined, I_7 extends string = "hnsw">(opts?: (Omit<import("./collections/index.js").Multi2VecCohereConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_7 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_7, import("./collections/index.js").VectorIndexConfigCreateType<I_7>> | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_7, I_7, "multi2vec-cohere">;
            multi2VecClip: <N_8 extends string | undefined = undefined, I_8 extends string = "hnsw">(opts?: (Omit<import("./collections/index.js").Multi2VecClipConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_8 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_8, import("./collections/index.js").VectorIndexConfigCreateType<I_8>> | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_8, I_8, "multi2vec-clip">;
            multi2VecJinaAI: <N_9 extends string | undefined = undefined, I_9 extends string = "hnsw">(opts?: (Omit<import("./collections/index.js").Multi2VecJinaAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_9 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_9, import("./collections/index.js").VectorIndexConfigCreateType<I_9>> | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_9, I_9, "multi2vec-jinaai">;
            multi2VecPalm: <N_10 extends string | undefined = undefined, I_10 extends string = "hnsw">(opts: import("./collections/index.js").ConfigureNonTextVectorizerOptions<N_10, I_10, "multi2vec-palm">) => import("./collections/index.js").VectorConfigCreate<never, N_10, I_10, "multi2vec-palm">;
            multi2VecGoogle: <N_11 extends string | undefined = undefined, I_11 extends string = "hnsw">(opts: import("./collections/index.js").ConfigureNonTextVectorizerOptions<N_11, I_11, "multi2vec-google">) => import("./collections/index.js").VectorConfigCreate<never, N_11, I_11, "multi2vec-google">;
            multi2VecVoyageAI: <N_12 extends string | undefined = undefined, I_12 extends string = "hnsw">(opts?: (Omit<import("./collections/index.js").Multi2VecVoyageAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_12 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_12, import("./collections/index.js").VectorIndexConfigCreateType<I_12>> | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_12, I_12, "multi2vec-voyageai">;
            ref2VecCentroid: <N_13 extends string | undefined = undefined, I_13 extends string = "hnsw">(opts: import("./collections/index.js").ConfigureNonTextVectorizerOptions<N_13, I_13, "ref2vec-centroid">) => import("./collections/index.js").VectorConfigCreate<never, N_13, I_13, "ref2vec-centroid">;
            text2VecAWS: <T_2, N_14 extends string | undefined = undefined, I_14 extends string = "hnsw">(opts: import("./collections/index.js").ConfigureTextVectorizerOptions<T_2, N_14, I_14, "text2vec-aws">) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_2>, N_14, I_14, "text2vec-aws">;
            text2VecAzureOpenAI: <T_3, N_15 extends string | undefined = undefined, I_15 extends string = "hnsw">(opts: import("./collections/index.js").ConfigureTextVectorizerOptions<T_3, N_15, I_15, "text2vec-azure-openai">) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_3>, N_15, I_15, "text2vec-azure-openai">;
            text2VecCohere: <T_4, N_16 extends string | undefined = undefined, I_16 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecCohereConfig & {
                name?: N_16 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_16, import("./collections/index.js").VectorIndexConfigCreateType<I_16>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_4>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_4>, N_16, I_16, "text2vec-cohere">;
            text2VecContextionary: <T_5, N_17 extends string | undefined = undefined, I_17 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecContextionaryConfig & {
                name?: N_17 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_17, import("./collections/index.js").VectorIndexConfigCreateType<I_17>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_5>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_5>, N_17, I_17, "text2vec-contextionary">;
            text2VecDatabricks: <T_6, N_18 extends string | undefined = undefined, I_18 extends string = "hnsw">(opts: import("./collections/index.js").ConfigureTextVectorizerOptions<T_6, N_18, I_18, "text2vec-databricks">) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_6>, N_18, I_18, "text2vec-databricks">;
            text2VecGPT4All: <T_7, N_19 extends string | undefined = undefined, I_19 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecGPT4AllConfig & {
                name?: N_19 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_19, import("./collections/index.js").VectorIndexConfigCreateType<I_19>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_7>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_7>, N_19, I_19, "text2vec-gpt4all">;
            text2VecHuggingFace: <T_8, N_20 extends string | undefined = undefined, I_20 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecHuggingFaceConfig & {
                name?: N_20 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_20, import("./collections/index.js").VectorIndexConfigCreateType<I_20>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_8>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_8>, N_20, I_20, "text2vec-huggingface">;
            text2VecJinaAI: <T_9, N_21 extends string | undefined = undefined, I_21 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecJinaAIConfig & {
                name?: N_21 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_21, import("./collections/index.js").VectorIndexConfigCreateType<I_21>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_9>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_9>, N_21, I_21, "text2vec-jinaai">;
            text2VecNvidia: <T_10, N_22 extends string | undefined = undefined, I_22 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecNvidiaConfig & {
                name?: N_22 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_22, import("./collections/index.js").VectorIndexConfigCreateType<I_22>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_10>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_10>, N_22, I_22, "text2vec-nvidia">;
            text2VecMistral: <T_11, N_23 extends string | undefined = undefined, I_23 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecMistralConfig & {
                name?: N_23 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_23, import("./collections/index.js").VectorIndexConfigCreateType<I_23>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_11>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_11>, N_23, I_23, "text2vec-mistral">;
            text2VecOpenAI: <T_12, N_24 extends string | undefined = undefined, I_24 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecOpenAIConfig & {
                name?: N_24 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_24, import("./collections/index.js").VectorIndexConfigCreateType<I_24>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_12>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_12>, N_24, I_24, "text2vec-openai">;
            text2VecOllama: <T_13, N_25 extends string | undefined = undefined, I_25 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecOllamaConfig & {
                name?: N_25 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_25, import("./collections/index.js").VectorIndexConfigCreateType<I_25>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_13>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_13>, N_25, I_25, "text2vec-ollama">;
            text2VecPalm: <T_14, N_26 extends string | undefined = undefined, I_26 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecGoogleConfig & {
                name?: N_26 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_26, import("./collections/index.js").VectorIndexConfigCreateType<I_26>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_14>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_14>, N_26, I_26, "text2vec-palm">;
            text2VecGoogle: <T_15, N_27 extends string | undefined = undefined, I_27 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecGoogleConfig & {
                name?: N_27 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_27, import("./collections/index.js").VectorIndexConfigCreateType<I_27>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_15>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_15>, N_27, I_27, "text2vec-google">;
            text2VecTransformers: <T_16, N_28 extends string | undefined = undefined, I_28 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecTransformersConfig & {
                name?: N_28 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_28, import("./collections/index.js").VectorIndexConfigCreateType<I_28>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_16>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_16>, N_28, I_28, "text2vec-transformers">;
            text2VecVoyageAI: <T_17, N_29 extends string | undefined = undefined, I_29 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecVoyageAIConfig & {
                name?: N_29 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_29, import("./collections/index.js").VectorIndexConfigCreateType<I_29>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_17>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_17>, N_29, I_29, "text2vec-voyageai">;
            text2VecWeaviate: <T_18, N_30 extends string | undefined = undefined, I_30 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecWeaviateConfig & {
                name?: N_30 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_30, import("./collections/index.js").VectorIndexConfigCreateType<I_30>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_18>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_18>, N_30, I_30, "text2vec-weaviate">;
            text2VecModel2Vec: <T_19, N_31 extends string | undefined = undefined, I_31 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecModel2Vec & {
                name?: N_31 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_31, import("./collections/index.js").VectorIndexConfigCreateType<I_31>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_19>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_19>, N_31, I_31, "text2vec-model2vec">;
        };
        vectors: {
            multi2VecNvidia: <N_32 extends string | undefined = undefined, I_32 extends string = "hnsw">(opts?: (Omit<import("./collections/index.js").Multi2VecNvidiaConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                outputEncoding?: string | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_32 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_32, import("./collections/index.js").VectorIndexConfigCreateType<I_32>> | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_32, I_32, "multi2vec-nvidia">;
            text2VecGoogleAiStudio: <T_20, N_33 extends string | undefined = undefined, I_33 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecGoogleAiStudioConfig & {
                name?: N_33 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_33, import("./collections/index.js").VectorIndexConfigCreateType<I_33>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_20>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_20>, N_33, I_33, "text2vec-google">;
            text2VecMorph: <T_21, N_34 extends string | undefined = undefined, I_34 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecMorphConfig & {
                name?: N_34 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_34, import("./collections/index.js").VectorIndexConfigCreateType<I_34>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_21>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_21>, N_34, I_34, "text2vec-morph">;
            text2VecWeaviate: <T_22, N_35 extends string | undefined = undefined, I_35 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecWeaviateConfig & {
                name?: N_35 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_35, import("./collections/index.js").VectorIndexConfigCreateType<I_35>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_22>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_22>, N_35, I_35, "text2vec-weaviate">;
            text2VecContextionary: <T_23, N_36 extends string | undefined = undefined, I_36 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecContextionaryConfig & {
                name?: N_36 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_36, import("./collections/index.js").VectorIndexConfigCreateType<I_36>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_23>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_23>, N_36, I_36, "text2vec-contextionary">;
            text2VecNvidia: <T_24, N_37 extends string | undefined = undefined, I_37 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecNvidiaConfig & {
                name?: N_37 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_37, import("./collections/index.js").VectorIndexConfigCreateType<I_37>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_24>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_24>, N_37, I_37, "text2vec-nvidia">;
            text2VecTransformers: <T_25, N_38 extends string | undefined = undefined, I_38 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecTransformersConfig & {
                name?: N_38 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_38, import("./collections/index.js").VectorIndexConfigCreateType<I_38>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_25>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_25>, N_38, I_38, "text2vec-transformers">;
            text2VecVoyageAI: <T_26, N_39 extends string | undefined = undefined, I_39 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecVoyageAIConfig & {
                name?: N_39 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_39, import("./collections/index.js").VectorIndexConfigCreateType<I_39>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_26>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_26>, N_39, I_39, "text2vec-voyageai">;
            text2VecGoogle: <T_27, N_40 extends string | undefined = undefined, I_40 extends string = "hnsw">(opts?: (Omit<import("./collections/index.js").Text2VecGoogleConfig & {
                name?: N_40 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_40, import("./collections/index.js").VectorIndexConfigCreateType<I_40>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_27>[] | undefined;
            }, "vectorizeCollectionName"> & {
                model?: string | undefined;
                modelId?: undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_27>, N_40, I_40, "text2vec-google">;
            text2VecOpenAI: <T_28, N_41 extends string | undefined = undefined, I_41 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecOpenAIConfig & {
                name?: N_41 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_41, import("./collections/index.js").VectorIndexConfigCreateType<I_41>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_28>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_28>, N_41, I_41, "text2vec-openai">;
            text2VecOllama: <T_29, N_42 extends string | undefined = undefined, I_42 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecOllamaConfig & {
                name?: N_42 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_42, import("./collections/index.js").VectorIndexConfigCreateType<I_42>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_29>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_29>, N_42, I_42, "text2vec-ollama">;
            text2VecMistral: <T_30, N_43 extends string | undefined = undefined, I_43 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecMistralConfig & {
                name?: N_43 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_43, import("./collections/index.js").VectorIndexConfigCreateType<I_43>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_30>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_30>, N_43, I_43, "text2vec-mistral">;
            text2VecJinaAI: <T_31, N_44 extends string | undefined = undefined, I_44 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecJinaAIConfig & {
                name?: N_44 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_44, import("./collections/index.js").VectorIndexConfigCreateType<I_44>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_31>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_31>, N_44, I_44, "text2vec-jinaai">;
            text2VecHuggingFace: <T_32, N_45 extends string | undefined = undefined, I_45 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecHuggingFaceConfig & {
                name?: N_45 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_45, import("./collections/index.js").VectorIndexConfigCreateType<I_45>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_32>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_32>, N_45, I_45, "text2vec-huggingface">;
            text2VecGPT4All: <T_33, N_46 extends string | undefined = undefined, I_46 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecGPT4AllConfig & {
                name?: N_46 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_46, import("./collections/index.js").VectorIndexConfigCreateType<I_46>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_33>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_33>, N_46, I_46, "text2vec-gpt4all">;
            text2VecDatabricks: <T_34, N_47 extends string | undefined = undefined, I_47 extends string = "hnsw">(opts: Omit<import("./collections/index.js").ConfigureTextVectorizerOptions<T_34, N_47, I_47, "text2vec-databricks">, "vectorizeCollectionName">) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_34>, N_47, I_47, "text2vec-databricks">;
            text2VecCohere: <T_35, N_48 extends string | undefined = undefined, I_48 extends string = "hnsw">(opts?: Omit<import("./collections/index.js").Text2VecCohereConfig & {
                name?: N_48 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_48, import("./collections/index.js").VectorIndexConfigCreateType<I_48>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_35>[] | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_35>, N_48, I_48, "text2vec-cohere">;
            text2VecAzureOpenAI: <T_36, N_49 extends string | undefined = undefined, I_49 extends string = "hnsw">(opts: Omit<import("./collections/index.js").ConfigureTextVectorizerOptions<T_36, N_49, I_49, "text2vec-azure-openai">, "vectorizeCollectionName">) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_36>, N_49, I_49, "text2vec-azure-openai">;
            text2VecAWS: <T_37, N_50 extends string | undefined = undefined, I_50 extends string = "hnsw">(opts: Omit<import("./collections/index.js").ConfigureTextVectorizerOptions<T_37, N_50, I_50, "text2vec-aws">, "vectorizeCollectionName">) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_37>, N_50, I_50, "text2vec-aws">;
            multi2VecClip: <N_51 extends string | undefined = undefined, I_51 extends string = "hnsw">(opts?: Omit<Omit<import("./collections/index.js").Multi2VecClipConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_51 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_51, import("./collections/index.js").VectorIndexConfigCreateType<I_51>> | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_51, I_51, "multi2vec-clip">;
            multi2VecCohere: <N_52 extends string | undefined = undefined, I_52 extends string = "hnsw">(opts?: Omit<Omit<import("./collections/index.js").Multi2VecCohereConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_52 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_52, import("./collections/index.js").VectorIndexConfigCreateType<I_52>> | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_52, I_52, "multi2vec-cohere">;
            multi2VecBind: <N_53 extends string | undefined = undefined, I_53 extends string = "hnsw">(opts?: Omit<Omit<import("./collections/index.js").Multi2VecBindConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                audioFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                depthFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                IMUFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                thermalFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                videoFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_53 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_53, import("./collections/index.js").VectorIndexConfigCreateType<I_53>> | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_53, I_53, "multi2vec-bind">;
            multi2VecJinaAI: <N_54 extends string | undefined = undefined, I_54 extends string = "hnsw">(opts?: Omit<Omit<import("./collections/index.js").Multi2VecJinaAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_54 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_54, import("./collections/index.js").VectorIndexConfigCreateType<I_54>> | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_54, I_54, "multi2vec-jinaai">;
            multi2VecGoogle: <N_55 extends string | undefined = undefined, I_55 extends string = "hnsw">(opts: Omit<import("./collections/index.js").ConfigureNonTextVectorizerOptions<N_55, I_55, "multi2vec-google">, "vectorizeCollectionName"> & {
                model?: string | undefined;
                modelId?: undefined;
            }) => import("./collections/index.js").VectorConfigCreate<never, N_55, I_55, "multi2vec-google">;
            multi2VecVoyageAI: <N_56 extends string | undefined = undefined, I_56 extends string = "hnsw">(opts?: Omit<Omit<import("./collections/index.js").Multi2VecVoyageAIConfig, "weights" | "imageFields" | "audioFields" | "depthFields" | "IMUFields" | "thermalFields" | "textFields" | "videoFields"> & {
                imageFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
                textFields?: string[] | import("./collections/index.js").Multi2VecField[] | undefined;
            } & {
                name?: N_56 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_56, import("./collections/index.js").VectorIndexConfigCreateType<I_56>> | undefined;
            }, "vectorizeCollectionName"> | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_56, I_56, "multi2vec-voyageai">;
            none: <N_3 extends string | undefined = undefined, I_3 extends string = "hnsw">(opts?: {
                name?: N_3 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_3, import("./collections/index.js").VectorIndexConfigCreateType<I_3>> | undefined;
            } | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_3, I_3, "none">;
            selfProvided: <N_4 extends string | undefined = undefined, I_4 extends string = "hnsw">(opts?: {
                name?: N_4 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_4, import("./collections/index.js").VectorIndexConfigCreateType<I_4>> | undefined;
            } | undefined) => import("./collections/index.js").VectorConfigCreate<never, N_4, I_4, "none">;
            img2VecNeural: <N_5 extends string | undefined = undefined, I_5 extends string = "hnsw">(opts: import("./collections/index.js").Img2VecNeuralConfig & {
                name?: N_5 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_5, import("./collections/index.js").VectorIndexConfigCreateType<I_5>> | undefined;
            }) => import("./collections/index.js").VectorConfigCreate<never, N_5, I_5, "img2vec-neural">;
            ref2VecCentroid: <N_13 extends string | undefined = undefined, I_13 extends string = "hnsw">(opts: import("./collections/index.js").ConfigureNonTextVectorizerOptions<N_13, I_13, "ref2vec-centroid">) => import("./collections/index.js").VectorConfigCreate<never, N_13, I_13, "ref2vec-centroid">;
            text2VecModel2Vec: <T_19, N_31 extends string | undefined = undefined, I_31 extends string = "hnsw">(opts?: (import("./collections/index.js").Text2VecModel2Vec & {
                name?: N_31 | undefined;
                quantizer?: import("./collections/index.js").QuantizerConfigCreate | undefined;
                vectorIndexConfig?: import("./collections/index.js").ModuleConfig<I_31, import("./collections/index.js").VectorIndexConfigCreateType<I_31>> | undefined;
            } & {
                sourceProperties?: import("./collections/index.js").PrimitiveKeys<T_19>[] | undefined;
            }) | undefined) => import("./collections/index.js").VectorConfigCreate<import("./collections/index.js").PrimitiveKeys<T_19>, N_31, I_31, "text2vec-model2vec">;
        };
        vectorIndex: {
            flat: (opts?: import("./collections/index.js").VectorIndexConfigFlatCreateOptions | undefined) => import("./collections/index.js").ModuleConfig<"flat", import("./collections/index.js").VectorIndexConfigFlatCreate | undefined>;
            hnsw: (opts?: import("./collections/index.js").VectorIndexConfigHNSWCreateOptions | undefined) => import("./collections/index.js").ModuleConfig<"hnsw", import("./collections/index.js").VectorIndexConfigHNSWCreate | undefined>;
            dynamic: (opts?: import("./collections/index.js").VectorIndexConfigDynamicCreateOptions | undefined) => import("./collections/index.js").ModuleConfig<"dynamic", import("./collections/index.js").VectorIndexConfigDynamicCreate | undefined>;
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
                } | undefined) => import("./collections/index.js").MultiVectorConfigCreate;
            };
            quantizer: {
                none: () => import("./collections/index.js").UncompressedConfig;
                bq: (options?: {
                    cache?: boolean | undefined;
                    rescoreLimit?: number | undefined;
                } | undefined) => import("./collections/index.js").QuantizerRecursivePartial<import("./collections/index.js").BQConfig>;
                rq: (options?: {
                    bits?: number | undefined;
                    rescoreLimit?: number | undefined;
                } | undefined) => import("./collections/index.js").QuantizerRecursivePartial<import("./collections/index.js").RQConfig>;
                pq: (options?: {
                    bitCompression?: boolean | undefined;
                    centroids?: number | undefined;
                    encoder?: {
                        distribution?: import("./collections/index.js").PQEncoderDistribution | undefined;
                        type?: import("./collections/index.js").PQEncoderType | undefined;
                    } | undefined;
                    segments?: number | undefined;
                    trainingLimit?: number | undefined;
                } | undefined) => import("./collections/index.js").QuantizerRecursivePartial<import("./collections/index.js").PQConfig>;
                sq: (options?: {
                    rescoreLimit?: number | undefined;
                    trainingLimit?: number | undefined;
                } | undefined) => import("./collections/index.js").QuantizerRecursivePartial<import("./collections/index.js").SQConfig>;
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
        invertedIndex: (options: {
            bm25b?: number | undefined;
            bm25k1?: number | undefined;
            cleanupIntervalSeconds?: number | undefined;
            indexTimestamps?: boolean | undefined;
            indexPropertyLength?: boolean | undefined;
            indexNullState?: boolean | undefined;
            stopwordsPreset?: "none" | "en" | undefined;
            stopwordsAdditions?: string[] | undefined;
            stopwordsRemovals?: string[] | undefined;
        }) => {
            bm25?: {
                k1?: number | undefined;
                b?: number | undefined;
            } | undefined;
            cleanupIntervalSeconds?: number | undefined;
            indexTimestamps?: boolean | undefined;
            indexPropertyLength?: boolean | undefined;
            indexNullState?: boolean | undefined;
            stopwords?: {
                preset?: string | undefined;
                additions?: (string | undefined)[] | undefined;
                removals?: (string | undefined)[] | undefined;
            } | undefined;
        };
        multiTenancy: (options?: {
            autoTenantActivation?: boolean | undefined;
            autoTenantCreation?: boolean | undefined;
            enabled?: boolean | undefined;
        } | undefined) => {
            autoTenantActivation?: boolean | undefined;
            autoTenantCreation?: boolean | undefined;
            enabled?: boolean | undefined;
        };
        replication: (options: {
            asyncEnabled?: boolean | undefined;
            deletionStrategy?: import("./collections/index.js").ReplicationDeletionStrategy | undefined;
            factor?: number | undefined;
        }) => {
            asyncEnabled?: boolean | undefined;
            deletionStrategy?: import("./collections/index.js").ReplicationDeletionStrategy | undefined;
            factor?: number | undefined;
        };
        sharding: (options: {
            virtualPerPhysical?: number | undefined;
            desiredCount?: number | undefined;
            desiredVirtualCount?: number | undefined;
        }) => import("./collections/index.js").ShardingConfigCreate;
    };
    configGuards: {
        quantizer: typeof import("./collections/index.js").Quantizer;
        vectorIndex: typeof import("./collections/index.js").VectorIndex;
    };
    filter: import("./collections/index.js").Filter<any>;
    reconfigure: {
        vectorIndex: {
            flat: (options: {
                vectorCacheMaxObjects?: number | undefined;
                quantizer?: import("./collections/index.js").BQConfigUpdate | undefined;
            }) => import("./collections/index.js").ModuleConfig<"flat", import("./collections/index.js").VectorIndexConfigFlatUpdate>;
            hnsw: (options: {
                dynamicEfFactor?: number | undefined;
                dynamicEfMax?: number | undefined;
                dynamicEfMin?: number | undefined;
                ef?: number | undefined;
                filterStrategy?: import("./collections/index.js").VectorIndexFilterStrategy | undefined;
                flatSearchCutoff?: number | undefined;
                quantizer?: import("./collections/index.js").PQConfigUpdate | import("./collections/index.js").BQConfigUpdate | import("./collections/index.js").SQConfigUpdate | import("./collections/index.js").RQConfigUpdate | undefined;
                vectorCacheMaxObjects?: number | undefined;
            }) => import("./collections/index.js").ModuleConfig<"hnsw", import("./collections/index.js").VectorIndexConfigHNSWUpdate>;
            quantizer: {
                bq: (options?: {
                    cache?: boolean | undefined;
                    rescoreLimit?: number | undefined;
                } | undefined) => import("./collections/index.js").BQConfigUpdate;
                rq: (options?: {
                    rescoreLimit?: number | undefined;
                } | undefined) => import("./collections/index.js").RQConfigUpdate;
                pq: (options?: {
                    centroids?: number | undefined;
                    pqEncoderDistribution?: import("./collections/index.js").PQEncoderDistribution | undefined;
                    pqEncoderType?: import("./collections/index.js").PQEncoderType | undefined;
                    segments?: number | undefined;
                    trainingLimit?: number | undefined;
                } | undefined) => import("./collections/index.js").PQConfigUpdate;
                sq: (options?: {
                    rescoreLimit?: number | undefined;
                    trainingLimit?: number | undefined;
                } | undefined) => import("./collections/index.js").SQConfigUpdate;
            };
        };
        invertedIndex: (options: {
            bm25b?: number | undefined;
            bm25k1?: number | undefined;
            cleanupIntervalSeconds?: number | undefined;
            stopwordsPreset?: "none" | "en" | undefined;
            stopwordsAdditions?: string[] | undefined;
            stopwordsRemovals?: string[] | undefined;
        }) => import("./collections/index.js").InvertedIndexConfigUpdate;
        vectorizer: {
            update: <N_57 extends string | undefined, I_57 extends string>(options: import("./collections/index.js").VectorizerUpdateOptions<N_57, I_57>) => import("./collections/index.js").VectorConfigUpdate<N_57, I_57>;
        };
        vectors: {
            update: <N_58 extends string | undefined, I_58 extends string>(options: import("./collections/index.js").VectorizerUpdateOptions<N_58, I_58>) => import("./collections/index.js").VectorConfigUpdate<N_58, I_58>;
        };
        replication: (options: {
            asyncEnabled?: boolean | undefined;
            deletionStrategy?: import("./collections/index.js").ReplicationDeletionStrategy | undefined;
            factor?: number | undefined;
        }) => import("./collections/index.js").ReplicationConfigUpdate;
        multiTenancy: (options: {
            autoTenantActivation?: boolean | undefined;
            autoTenantCreation?: boolean | undefined;
        }) => import("./collections/index.js").MultiTenancyConfigUpdate;
        generative: {
            anthropic(config?: import("./collections/index.js").GenerativeAnthropicConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-anthropic", import("./collections/index.js").GenerativeAnthropicConfig | undefined>;
            anyscale(config?: import("./collections/index.js").GenerativeAnyscaleConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-anyscale", import("./collections/index.js").GenerativeAnyscaleConfig | undefined>;
            aws(config: import("./collections/index.js").GenerativeAWSConfig): import("./collections/index.js").ModuleConfig<"generative-aws", import("./collections/index.js").GenerativeAWSConfig>;
            azureOpenAI: (config: import("./collections/index.js").GenerativeAzureOpenAIConfigCreate) => import("./collections/index.js").ModuleConfig<"generative-openai", import("./collections/index.js").GenerativeAzureOpenAIConfig>;
            cohere: (config?: import("./collections/index.js").GenerativeCohereConfigCreate | undefined) => import("./collections/index.js").ModuleConfig<"generative-cohere", import("./collections/index.js").GenerativeCohereConfig | undefined>;
            databricks: (config: import("./collections/index.js").GenerativeDatabricksConfig) => import("./collections/index.js").ModuleConfig<"generative-databricks", import("./collections/index.js").GenerativeDatabricksConfig>;
            friendliai(config?: import("./collections/index.js").GenerativeFriendliAIConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-friendliai", import("./collections/index.js").GenerativeFriendliAIConfig | undefined>;
            mistral(config?: import("./collections/index.js").GenerativeMistralConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-mistral", import("./collections/index.js").GenerativeMistralConfig | undefined>;
            nvidia(config?: import("./collections/index.js").GenerativeNvidiaConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-nvidia", import("./collections/index.js").GenerativeNvidiaConfig | undefined>;
            ollama(config?: import("./collections/index.js").GenerativeOllamaConfig | undefined): import("./collections/index.js").ModuleConfig<"generative-ollama", import("./collections/index.js").GenerativeOllamaConfig | undefined>;
            openAI: (config?: import("./collections/index.js").GenerativeOpenAIConfigCreate | undefined) => import("./collections/index.js").ModuleConfig<"generative-openai", import("./collections/index.js").GenerativeOpenAIConfig | undefined>;
            palm: (config?: import("./collections/index.js").GenerativeGoogleConfig | undefined) => import("./collections/index.js").ModuleConfig<"generative-palm", import("./collections/index.js").GenerativeGoogleConfig | undefined>;
            google: (config?: import("./collections/index.js").GenerativeGoogleConfig | undefined) => import("./collections/index.js").ModuleConfig<"generative-google", import("./collections/index.js").GenerativeGoogleConfig | undefined>;
            xai: (config?: import("./collections/index.js").GenerativeXAIConfig | undefined) => import("./collections/index.js").ModuleConfig<"generative-xai", import("./collections/index.js").GenerativeXAIConfig | undefined>;
        };
        reranker: {
            cohere: (config?: import("./collections/index.js").RerankerCohereConfig | undefined) => import("./collections/index.js").ModuleConfig<"reranker-cohere", import("./collections/index.js").RerankerCohereConfig | undefined>;
            jinaai: (config?: import("./collections/index.js").RerankerJinaAIConfig | undefined) => import("./collections/index.js").ModuleConfig<"reranker-jinaai", import("./collections/index.js").RerankerJinaAIConfig | undefined>;
            nvidia: (config?: import("./collections/index.js").RerankerNvidiaConfig | undefined) => import("./collections/index.js").ModuleConfig<"reranker-nvidia", import("./collections/index.js").RerankerNvidiaConfig | undefined>;
            transformers: () => import("./collections/index.js").ModuleConfig<"reranker-transformers", Record<string, never>>;
            voyageAI: (config?: import("./collections/index.js").RerankerVoyageAIConfig | undefined) => import("./collections/index.js").ModuleConfig<"reranker-voyageai", import("./collections/index.js").RerankerVoyageAIConfig | undefined>;
        };
    };
    permissions: {
        aliases: (args: {
            alias: string | string[];
            collection: string | string[];
            create?: boolean | undefined;
            read?: boolean | undefined;
            update?: boolean | undefined;
            delete?: boolean | undefined;
        }) => import("./roles/types.js").AliasPermission[];
        backup: (args: {
            collection: string | string[];
            manage?: boolean | undefined;
        }) => import("./roles/types.js").BackupsPermission[];
        cluster: (args: {
            read?: boolean | undefined;
        }) => import("./roles/types.js").ClusterPermission[];
        collections: (args: {
            collection: string | string[];
            create_collection?: boolean | undefined;
            read_config?: boolean | undefined;
            update_config?: boolean | undefined;
            delete_collection?: boolean | undefined;
        }) => import("./roles/types.js").CollectionsPermission[];
        data: (args: {
            collection: string | string[];
            tenant?: string | string[] | undefined;
            create?: boolean | undefined;
            read?: boolean | undefined;
            update?: boolean | undefined;
            delete?: boolean | undefined;
        }) => import("./roles/types.js").DataPermission[];
        groups: {
            oidc: (args: {
                groupID: string | string[];
                read?: boolean | undefined;
                assignAndRevoke?: boolean | undefined;
            }) => import("./roles/types.js").GroupsPermission[];
        };
        nodes: {
            minimal: (args: {
                read?: boolean | undefined;
            }) => import("./roles/types.js").NodesPermission[];
            verbose: (args: {
                collection: string | string[];
                read?: boolean | undefined;
            }) => import("./roles/types.js").NodesPermission[];
        };
        replicate: (args: {
            collection: string | string[];
            shard: string | string[];
            create?: boolean | undefined;
            read?: boolean | undefined;
            update?: boolean | undefined;
            delete?: boolean | undefined;
        }) => import("./roles/types.js").ReplicatePermission[];
        roles: (args: {
            role: string | string[];
            create?: boolean | undefined;
            read?: boolean | undefined;
            update?: boolean | undefined;
            delete?: boolean | undefined;
        }) => import("./roles/types.js").RolesPermission[];
        tenants: (args: {
            collection: string | string[];
            tenant?: string | string[] | undefined;
            create?: boolean | undefined;
            read?: boolean | undefined;
            update?: boolean | undefined;
            delete?: boolean | undefined;
        }) => import("./roles/types.js").TenantsPermission[];
        users: (args: {
            user: string | string[];
            assignAndRevoke?: boolean | undefined;
            read?: boolean | undefined;
        }) => import("./roles/types.js").UsersPermission[];
    };
    query: {
        hybridVector: {
            nearText: () => void;
            nearVector: () => void;
        };
        nearVector: {
            listOfVectors: <V extends import("./collections/query/types.js").PrimitiveVectorType>(...vectors: V[]) => import("./collections/query/types.js").ListOfVectors<V>;
        };
    };
};
export default app;
export * from './collections/index.js';
export * from './connection/index.js';
export * from './roles/types.js';
export * from './utils/base64.js';
export * from './utils/uuid.js';
export { AccessTokenCredentialsInput, ApiKey, AuthAccessTokenCredentials, AuthClientCredentials, AuthCredentials, AuthUserPasswordCredentials, Backend, BackupCompressionLevel, BackupStatus, ClientCredentialsInput, ConsistencyLevel, ProxiesParams, TimeoutParams, UserPasswordCredentialsInput, weaviateV2, };
