import { CreateIndexRequestMetricEnum, IndexModel, ManageIndexesApi, DeletionProtection, ServerlessSpecCloudEnum } from '../pinecone-generated-ts-fetch/db_control';
/**
 * Options for creating an index for a specific model.
 * @see [Create or configure an index](https://docs.pinecone.io/guides/inference/integrated-inference#2-create-or-configure-an-index)
 */
export type CreateIndexForModelOptions = {
    /**
     * The name of the index. Resource name must be 1-45 characters long, start and end with an alphanumeric character, and consist only of lower case alphanumeric characters or '-'.
     */
    name: string;
    /**
     * The public cloud where you would like your index hosted.
     */
    cloud: ServerlessSpecCloudEnum;
    /**
     * The region where you would like your index to be created.
     */
    region: string;
    /**
     * The {@link CreateIndexForModelEmbed} object used to configure the integrated inference embedding model.
     */
    embed: CreateIndexForModelEmbed;
    /**
     * Allows configuring an index to be protected from deletion. Defaults to `disabled`.
     */
    deletionProtection?: DeletionProtection;
    /**
     * Custom user tags added to an index. Keys must be 80 characters or less. Values must be 120 characters or less. Keys must be alphanumeric, '_', or '-'.  Values must be alphanumeric, ';', '@', '_', '-', '.', '+', or ' '. To unset a key, set the value to be an empty string.
     */
    tags?: {
        [key: string]: string;
    };
    /**
     * This option tells the client not to resolve the returned promise until the index is ready to receive data.
     */
    waitUntilReady?: boolean;
    /**
     * This option tells the client not to throw if you attempt to create an index that already exists.
     */
    suppressConflicts?: boolean;
};
/**
 * Specifies the integrated inference embedding configuration for the index.
 * Once set the model cannot be changed, but you can later update the embedding configuration for an integrated inference index including field map, read parameters, or write parameters.
 * Refer to the [model guide](https://docs.pinecone.io/guides/inference/understanding-inference#embedding-models)
 * for available models and model details.
 */
export type CreateIndexForModelEmbed = {
    /**
     * The name of the embedding model to use for the index.
     */
    model: string;
    /**
     * The distance metric to be used for similarity search. You can use 'euclidean', 'cosine', or 'dotproduct'. If not specified, the metric
     * will be defaulted according to the model. Cannot be updated once set.
     */
    metric?: CreateIndexRequestMetricEnum;
    /**
     * Identifies the name of the text field from your document model that will be embedded.
     */
    fieldMap?: object;
    /**
     * The read parameters for the embedding model.
     */
    readParameters?: object;
    /**
     * The write parameters for the embedding model.
     */
    writeParameters?: object;
};
export declare const createIndexForModel: (api: ManageIndexesApi) => (options: CreateIndexForModelOptions) => Promise<IndexModel | void>;
