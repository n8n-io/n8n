import { CreateIndexOptions, IndexName, CollectionName, CreateIndexForModelOptions } from './control';
import { CreateAssistantOptions, UpdateAssistantOptions } from './assistant/control';
import type { ConfigureIndexRequest, CreateCollectionRequest, HTTPHeaders } from './pinecone-generated-ts-fetch/db_control';
import { Index } from './data';
import type { PineconeConfiguration, RecordMetadata } from './data';
import { Inference } from './inference';
import { Assistant } from './assistant';
/**
 * The `Pinecone` class is the main entrypoint to this sdk. You will use
 * instances of it to create and manage indexes as well as perform data
 * operations on those indexes after they are created.
 *
 * ### Initializing the client
 *
 * There is one piece of configuration required to use the Pinecone client: an API key. This value can be passed using environment variables or in code through a configuration object. Find your API key in the console dashboard at [https://app.pinecone.io](https://app.pinecone.io)
 *
 * ### Using environment variables
 *
 * The environment variables used to configure the client are the following:
 *
 * ```bash
 * export PINECONE_API_KEY="your_api_key"
 * export PINECONE_CONTROLLER_HOST="your_controller_host"
 * ```
 *
 * When these environment variables are set, the client constructor does not require any additional arguments.
 *
 * ```typescript
 * import { Pinecone } from '@pinecone-database/pinecone';
 *
 * const pc = new Pinecone();
 * ```
 *
 * ### Using a configuration object
 *
 * If you prefer to pass configuration in code, the constructor accepts a config object containing the `apiKey` and `environment` values. This
 * could be useful if your application needs to interact with multiple projects, each with a different configuration.
 *
 * ```typescript
 * import { Pinecone } from '@pinecone-database/pinecone';
 *
 * const pc = new Pinecone({
 *   apiKey: 'your_api_key',
 * });
 *
 * ```
 *
 * See {@link PineconeConfiguration} for a full description of available configuration options.
 */
export declare class Pinecone {
    /** @hidden */
    private _configureIndex;
    /** @hidden */
    private _createCollection;
    /** @hidden */
    private _createIndex;
    /** @hidden */
    private _createIndexForModel;
    /** @hidden */
    private _describeCollection;
    /** @hidden */
    private _describeIndex;
    /** @hidden */
    private _deleteCollection;
    /** @hidden */
    private _deleteIndex;
    /** @hidden */
    private _listCollections;
    /** @hidden */
    private _listIndexes;
    /** @hidden */
    private _createAssistant;
    /** @hidden */
    private _deleteAssistant;
    /** @hidden */
    private _updateAssistant;
    /** @hidden */
    private _describeAssistant;
    /** @hidden */
    private _listAssistants;
    inference: Inference;
    /**
     * @example
     * ```
     * import { Pinecone } from '@pinecone-database/pinecone';
     *
     * const pc = new Pinecone({
     *  apiKey: 'my-api-key',
     * });
     * ```
     *
     * @constructor
     * @param options - The configuration options for the Pinecone client: {@link PineconeConfiguration}.
     */
    constructor(options?: PineconeConfiguration);
    /**
     * @internal
     * This method is used by {@link Pinecone.constructor} to read configuration from environment variables.
     *
     * It looks for the following environment variables:
     * - `PINECONE_API_KEY`
     * - `PINECONE_CONTROLLER_HOST`
     *
     * @returns A {@link PineconeConfiguration} object populated with values found in environment variables.
     */
    _readEnvironmentConfig(): PineconeConfiguration;
    /** @hidden */
    private config;
    /**
     * Describe a Pinecone index
     *
     * @example
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * const indexModel = await pc.describeIndex('my-index')
     * console.log(indexModel)
     * // {
     * //     name: 'sample-index-1',
     * //     dimension: 3,
     * //     metric: 'cosine',
     * //     host: 'sample-index-1-1390950.svc.apw5-4e34-81fa.pinecone.io',
     * //     spec: {
     * //           pod: undefined,
     * //           serverless: {
     * //               cloud: 'aws',
     * //               region: 'us-west-2'
     * //           }
     * //     },
     * //     status: {
     * //           ready: true,
     * //           state: 'Ready'
     * //     }
     * // }
     * ```
     *
     * @param indexName - The name of the index to describe.
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @returns A promise that resolves to {@link IndexModel}.
     */
    describeIndex(indexName: IndexName): Promise<import("./pinecone-generated-ts-fetch/db_control").IndexModel>;
    /**
     * List all Pinecone indexes
     *
     * @example
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * const indexList = await pc.listIndexes()
     * console.log(indexList)
     * // {
     * //     indexes: [
     * //       {
     * //         name: "sample-index-1",
     * //         dimension: 3,
     * //         metric: "cosine",
     * //         host: "sample-index-1-1234567.svc.apw5-2e18-32fa.pinecone.io",
     * //         spec: {
     * //           serverless: {
     * //             cloud: "aws",
     * //             region: "us-west-2"
     * //           }
     * //         },
     * //         status: {
     * //           ready: true,
     * //           state: "Ready"
     * //         }
     * //       },
     * //       {
     * //         name: "sample-index-2",
     * //         dimension: 3,
     * //         metric: "cosine",
     * //         host: "sample-index-2-1234567.svc.apw2-5e76-83fa.pinecone.io",
     * //         spec: {
     * //           serverless: {
     * //             cloud: "aws",
     * //             region: "us-west-2"
     * //           }
     * //         },
     * //         status: {
     * //           ready: true,
     * //           state: "Ready"
     * //         }
     * //       }
     * //     ]
     * //   }
     * ```
     *
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @returns A promise that resolves to {@link IndexList}.
     */
    listIndexes(): Promise<import("./pinecone-generated-ts-fetch/db_control").IndexList>;
    /**
     * Creates a new index.
     *
     * @example
     * The minimum required configuration to create an index is the index `name`, `dimension`, and `spec`.
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     *
     * const pc = new Pinecone();
     *
     * await pc.createIndex({ name: 'my-index', dimension: 128, spec: { serverless: { cloud: 'aws', region: 'us-west-2' }}})
     * ```
     *
     * @example
     * The `spec` object defines how the index should be deployed. For serverless indexes, you define only the cloud and region where the index should be hosted.
     * For pod-based indexes, you define the environment where the index should be hosted, the pod type and size to use, and other index characteristics.
     * In a different example, you can create a pod-based index by specifying the `pod` spec object with the `environment`, `pods`, `podType`, and `metric` properties.
     * For more information on creating indexes, see [Understanding indexes](https://docs.pinecone.io/guides/indexes/understanding-indexes).
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * await pc.createIndex({
     *  name: 'my-index',
     *  dimension: 1536,
     *  metric: 'cosine',
     *  spec: {
     *    pod: {
     *      environment: 'us-west-2-gcp',
     *      pods: 1,
     *      podType: 'p1.x1'
     *    }
     *   },
     *  tags: { 'team': 'data-science' }
     * })
     * ```
     *
     * @example
     * If you would like to create the index only if it does not already exist, you can use the `suppressConflicts` boolean option.
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * await pc.createIndex({
     *   name: 'my-index',
     *   dimension: 1536,
     *   spec: {
     *     serverless: {
     *       cloud: 'aws',
     *       region: 'us-west-2'
     *     }
     *   },
     *   suppressConflicts: true,
     *   tags: { 'team': 'data-science' }
     * })
     * ```
     *
     * @example
     * If you plan to begin upserting immediately after index creation is complete, you should use the `waitUntilReady` option. Otherwise, the index may not be ready to receive data operations when you attempt to upsert.
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * await pc.createIndex({
     *  name: 'my-index',
     *   spec: {
     *     serverless: {
     *       cloud: 'aws',
     *       region: 'us-west-2'
     *     }
     *   },
     *  waitUntilReady: true,
     *  tags: { 'team': 'data-science' }
     * });
     *
     * const records = [
     *   // PineconeRecord objects with your embedding values
     * ]
     * await pc.index('my-index').upsert(records)
     * ```
     *
     * @example
     * By default all metadata fields are indexed when records are upserted with metadata, but if you want to improve performance you can specify the specific fields you want to index. This example is showing a few hypothetical metadata fields, but the values you'd use depend on what metadata you plan to store with records in your Pinecone index.
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * await pc.createIndex({
     *   name: 'my-index',
     *   dimension: 1536,
     *   spec: {
     *     serverless: {
     *       cloud: 'aws',
     *       region: 'us-west-2',
     *       metadataConfig: { 'indexed' : ['productName', 'productDescription'] }
     *     }
     *   },
     *  tags: { 'team': 'data-science' }
     * })
     * ```
     *
     * @param options - The {@link CreateIndexOptions} for creating the index.
     * @see [Distance metrics](https://docs.pinecone.io/docs/indexes#distance-metrics)
     * @see [Pod types and sizes](https://docs.pinecone.io/docs/indexes#pods-pod-types-and-pod-sizes)
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @throws {@link Errors.PineconeBadRequestError} when index creation fails due to invalid parameters being specified or other problem such as project quotas limiting the creation of any additional indexes.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @throws {@link Errors.PineconeConflictError} when attempting to create an index using a name that already exists in your project.
     * @returns A promise that resolves to {@link IndexModel} when the request to create the index is completed. Note that the index is not immediately ready to use. You can use the {@link describeIndex} function to check the status of the index.
     */
    createIndex(options: CreateIndexOptions): Promise<void | import("./pinecone-generated-ts-fetch/db_control").IndexModel>;
    /**
     * Creates a new integrated index which allows working with integrated inference capabilities.
     * @see [Upsert and search with integrated inference](https://docs.pinecone.io/guides/inference/integrated-inference)
     *
     * @example
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * await pc.createIndexForModel({
     *   name: 'integrated-index',
     *   cloud: 'aws',
     *   region: 'us-east-1',
     *   embed: {
     *     model: 'multilingual-e5-large',
     *     fieldMap: { text: 'chunk_text' },
     *   },
     *   waitUntilReady: true,
     * });
     * ```
     *
     * @param options - The {@link CreateIndexForModelOptions} for creating the index.
     * @see [Distance metrics](https://docs.pinecone.io/docs/indexes#distance-metrics)
     * @see [Pod types and sizes](https://docs.pinecone.io/docs/indexes#pods-pod-types-and-pod-sizes)
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @throws {@link Errors.PineconeBadRequestError} when index creation fails due to invalid parameters being specified or other problem such as project quotas limiting the creation of any additional indexes.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @throws {@link Errors.PineconeConflictError} when attempting to create an index using a name that already exists in your project.
     * @returns A promise that resolves to {@link IndexModel} when the request to create the index is completed. Note that the index is not immediately ready to use. You can use the {@link describeIndex} function to check the status of the index.
     */
    createIndexForModel(options: CreateIndexForModelOptions): Promise<void | import("./pinecone-generated-ts-fetch/db_control").IndexModel>;
    /**
     * Deletes an index
     *
     * @example
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * await pc.deleteIndex('my-index')
     * ```
     *
     * @param indexName - The name of the index to delete.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @returns A promise that resolves when the request to delete the index is completed.
     */
    deleteIndex(indexName: IndexName): Promise<void>;
    /**
     * Configure an index
     *
     * Use this method to update configuration on an existing index. For both pod-based and serverless indexes you can update
     * the deletionProtection status of an index and/or change any index tags. For pod-based index you can also
     * configure the number of replicas and pod type.
     *
     * @example
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * await pc.configureIndex('my-index', {
     *   deletionProtection: 'enabled',
     *   spec:{ pod:{ replicas: 2, podType: 'p1.x2' }},
     * });
     * ```
     *
     * @param indexName - The name of the index to configure.
     * @param options - The configuration properties you would like to update
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @returns A promise that resolves to {@link IndexModel} when the request to configure the index is completed.
     */
    configureIndex(indexName: IndexName, options: ConfigureIndexRequest): Promise<import("./pinecone-generated-ts-fetch/db_control").IndexModel>;
    /**
     * Create a new collection from an existing index
     *
     * @example
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * const indexList = await pc.listIndexes()
     * const indexName = indexList.indexes[0].name;
     * await pc.createCollection({
     *  name: 'my-collection',
     *  source: indexName
     * })
     * ```
     *
     * @param options - The collection configuration.
     * @param options.name - The name of the collection. Must be unique within the project and contain alphanumeric and hyphen characters. The name must start and end with alphanumeric characters.
     * @param options.source - The name of the index to use as the source for the collection.
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @returns a promise that resolves to {@link CollectionModel} when the request to create the collection is completed.
     */
    createCollection(options: CreateCollectionRequest): Promise<import("./pinecone-generated-ts-fetch/db_control").CollectionModel>;
    /**
     * List all collections in a project
     *
     * @example
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * await pc.listCollections()
     * ```
     *
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @returns A promise that resolves to {@link CollectionList}.
     */
    listCollections(): Promise<import("./pinecone-generated-ts-fetch/db_control").CollectionList>;
    /**
     * Delete a collection by collection name
     *
     * @example
     * ```
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * const collectionList = await pc.listCollections()
     * const collectionName = collectionList.collections[0].name;
     * await pc.deleteCollection(collectionName)
     * ```
     *
     * @param collectionName - The name of the collection to delete.
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @returns A promise that resolves when the request to delete the collection is completed.
     */
    deleteCollection(collectionName: CollectionName): Promise<void>;
    /**
     * Describe a collection
     *
     * @example
     * ```js
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     *
     * await pc.describeCollection('my-collection')
     * ```
     *
     * @param collectionName - The name of the collection to describe.
     * @throws {@link Errors.PineconeArgumentError} when arguments passed to the method fail a runtime validation.
     * @throws {@link Errors.PineconeConnectionError} when network problems or an outage of Pinecone's APIs prevent the request from being completed.
     * @returns A promise that resolves to a {@link CollectionModel}.
     */
    describeCollection(collectionName: CollectionName): Promise<import("./pinecone-generated-ts-fetch/db_control").CollectionModel>;
    /**
     * Creates a new Assistant.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * await pc.createAssistant({name: 'test1'});
     * // {
     * //  name: 'test11',
     * //  instructions: undefined,
     * //  metadata: undefined,
     * //  status: 'Initializing',
     * //  host: 'https://prod-1-data.ke.pinecone.io',
     * //  createdAt: 2025-01-08T22:52:49.652Z,
     * //  updatedAt: 2025-01-08T22:52:49.652Z
     * // }
     * ```
     *
     * @param options - A {@link CreateAssistantOptions} object containing the `name` of the Assistant to be created.
     * Optionally, users can also specify instructions, metadata, and host region. Region must be one of "us" or "eu"
     * and determines where the Assistant will be hosted.
     * @throws Error if the Assistant API is not initialized.
     * @throws Error if an invalid region is provided.
     * @returns A Promise that resolves to an {@link Assistant} model.
     */
    createAssistant(options: CreateAssistantOptions): Promise<import("./assistant").AssistantModel>;
    /**
     * Deletes an Assistant by name.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * await pc.deleteAssistant('test1');
     * ```
     *
     * @param assistantName - The name of the Assistant to be deleted.
     * @throws Error if the Assistant API is not initialized.
     */
    deleteAssistant(assistantName: string): Promise<void>;
    /**
     * Retrieves information about an Assistant by name.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const test = await pc.describeAssistant('test1');
     * console.log(test);
     * // {
     * //  name: 'test1',
     * //  instructions: undefined,
     * //  metadata: undefined,
     * //  status: 'Ready',
     * //  host: 'https://prod-1-data.ke.pinecone.io',
     * //  createdAt: 2025-01-08T22:24:50.525Z,
     * //  updatedAt: 2025-01-08T22:24:52.303Z
     * // }
     * ```
     *
     * @param assistantName - The name of the Assistant to retrieve.
     * @throws Error if the Assistant API is not initialized.
     * @returns A Promise that resolves to an {@link Assistant} model.
     */
    describeAssistant(assistantName: string): Promise<import("./assistant").AssistantModel>;
    /**
     * Retrieves a list of all Assistants for a given Pinecone API key.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistants = await pc.listAssistants();
     * console.log(assistants);
     * // {
     * //  assistants: [
     * //    {
     * //      name: 'test2',
     * //      instructions: 'test-instructions',
     * //      metadata: [Object],
     * //      status: 'Ready',
     * //      host: 'https://prod-1-data.ke.pinecone.io',
     * //      createdAt: 2025-01-06T19:14:18.633Z,
     * //      updatedAt: 2025-01-06T19:14:36.977Z
     * //    },
     * //  ]
     * // }
     * ```
     *
     * @throws Error if the Assistant API is not initialized.
     * @returns A Promise that resolves to an object containing an array of {@link Assistant} models.
     */
    listAssistants(): Promise<import("./assistant").AssistantList>;
    /**
     * Updates an Assistant by name.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * await pc.updateAssistant('test1', { instructions: 'some new  instructions!'});
     * // {
     * //  assistantName: test1,
     * //  instructions: 'some new instructions!',
     * //  metadata: undefined
     * // }
     * ```
     *
     * @param assistantName - The name of the assistant being updated.
     * @param options - An {@link updateAssistant} object containing the name of the assistant to be updated and
     * optional instructions and metadata.
     * @throws Error if the Assistant API is not initialized.
     * @returns A Promise that resolves to an {@link UpdateAssistant200Response} object.
     */
    updateAssistant(assistantName: string, options: UpdateAssistantOptions): Promise<import("./assistant").UpdateAssistantResponse>;
    /** @internal */
    _checkForBrowser(): void;
    /**
     * @returns The configuration object that was passed to the Pinecone constructor.
     */
    getConfig(): PineconeConfiguration;
    /**
     * Targets a specific index for performing data operations.
     *
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone()
     *
     * const index = pc.index('index-name')
     * ```
     *
     * #### Targeting an index, with user-defined Metadata types
     *
     * If you are storing metadata alongside your vector values inside your Pinecone records, you can pass a type parameter to `index()` in order to get proper TypeScript typechecking when upserting and querying data.
     *
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     *
     * const pc = new Pinecone();
     *
     * type MovieMetadata = {
     *   title: string,
     *   runtime: numbers,
     *   genre: 'comedy' | 'horror' | 'drama' | 'action'
     * }
     *
     * // Specify a custom metadata type while targeting the index
     * const index = pc.index<MovieMetadata>('test-index');
     *
     * // Now you get type errors if upserting malformed metadata
     * await index.upsert([{
     *   id: '1234',
     *   values: [
     *     .... // embedding values
     *   ],
     *   metadata: {
     *     genre: 'Gone with the Wind',
     *     runtime: 238,
     *     genre: 'drama',
     *
     *     // @ts-expect-error because category property not in MovieMetadata
     *     category: 'classic'
     *   }
     * }])
     *
     * const results = await index.query({
     *    vector: [
     *     ... // query embedding
     *    ],
     *    filter: { genre: { '$eq': 'drama' }}
     * })
     * const movie = results.matches[0];
     *
     * if (movie.metadata) {
     *   // Since we passed the MovieMetadata type parameter above,
     *   // we can interact with metadata fields without having to
     *   // do any typecasting.
     *   const { title, runtime, genre } = movie.metadata;
     *   console.log(`The best match in drama was ${title}`)
     * }
     * ```
     *
     * @typeParam T - The type of metadata associated with each record.
     * @param indexName - The name of the index to target.
     * @param indexHostUrl - An optional host url to use for operations against this index. If not provided, the host url will be resolved by calling {@link describeIndex}.
     * @param additionalHeaders - An optional object containing additional headers to pass with each index request.
     * @typeParam T - The type of the metadata object associated with each record.
     * @returns An {@link Index} object that can be used to perform data operations.
     */
    index<T extends RecordMetadata = RecordMetadata>(indexName: string, indexHostUrl?: string, additionalHeaders?: HTTPHeaders): Index<T>;
    /**
     * {@inheritDoc index}
     */
    Index<T extends RecordMetadata = RecordMetadata>(indexName: string, indexHostUrl?: string, additionalHeaders?: HTTPHeaders): Index<T>;
    /**
     * Targets a specific assistant for performing operations.
     *
     * Once an assistant is targeted, you can perform operations such as uploading files,
     * updating instructions, and chatting.
     *
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     *
     * const pc = new Pinecone();
     * const assistant = pc.Assistant('my-assistant');
     *
     * // Upload a file to the assistant
     * await assistant.uploadFile({
     *   path: 'test-file.txt',
     *   metadata: { description: 'Sample test file' }
     * });
     *
     * // Retrieve assistant details
     * const details = await assistant.describe();
     * console.log('Assistant details:', details);
     *
     * // Update assistant instructions
     * await assistant.update({
     *   instructions: 'Provide concise responses only.',
     * });
     *
     * const chatResp = await assistant.chat({
     *   messages: [{ role: 'user', content: 'What is the capital of France?' }],
     * });
     * console.log(chatResp);
     * // {
     * //  id: '000000000000000023e7fb015be9d0ad',
     * //  finishReason: 'stop',
     * //  message: {
     * //    role: 'assistant',
     * //    content: 'The capital of France is Paris.'
     * //  },
     * //  model: 'gpt-4o-2024-05-13',
     * //  citations: [ { position: 209, references: [Array] } ],
     * //  usage: { promptTokens: 493, completionTokens: 38, totalTokens: 531 }
     * // }
     * ```
     *
     * @param assistantName - The name of the assistant to target.
     * @returns An {@link Assistant} object that can be used to perform assistant-related operations.
     */
    assistant(assistantName: string): Assistant;
    /**
     * {@inheritDoc assistant}
     */
    Assistant(assistantName: string): Assistant;
}
