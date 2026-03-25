import { createClient, createConfig } from "@hey-api/client-fetch";
import {
  defaultChromaClientArgs as defaultArgs,
  HttpMethod,
  normalizeMethod,
  parseConnectionPath,
  deserializeMetadata,
  serializeMetadata,
} from "./utils";
import { DefaultService as Api, ChecklistResponse } from "./api";
import { CollectionMetadata, UserIdentity } from "./types";
import { Collection, CollectionImpl } from "./collection";
import { EmbeddingFunction, getEmbeddingFunction } from "./embedding-function";
import { chromaFetch } from "./chroma-fetch";
import * as process from "node:process";
import {
  ChromaConnectionError,
  ChromaUnauthorizedError,
  ChromaValueError,
} from "./errors";
import {
  CreateCollectionConfiguration,
  processCreateCollectionConfig,
} from "./collection-configuration";
import { EMBEDDING_KEY, Schema } from "./schema";
import { client } from "./api/client.gen";

const resolveSchemaEmbeddingFunction = (
  schema: Schema | undefined,
): EmbeddingFunction | undefined => {
  if (!schema) {
    return undefined;
  }

  const embeddingOverride =
    schema.keys[EMBEDDING_KEY]?.floatList?.vectorIndex?.config
      .embeddingFunction ?? undefined;
  if (embeddingOverride) {
    return embeddingOverride;
  }

  return (
    schema.defaults.floatList?.vectorIndex?.config.embeddingFunction ??
    undefined
  );
};

/**
 * Configuration options for the ChromaClient.
 */
export interface ChromaClientArgs {
  /** The host address of the Chroma server. Defaults to 'localhost' */
  host?: string;
  /** The port number of the Chroma server. Defaults to 8000 */
  port?: number;
  /** Whether to use SSL/HTTPS for connections. Defaults to false */
  ssl?: boolean;
  /** The tenant name in the Chroma server to connect to */
  tenant?: string;
  /** The database name to connect to */
  database?: string;
  /** Additional HTTP headers to send with requests */
  headers?: Record<string, string>;
  /** Additional fetch options for HTTP requests */
  fetchOptions?: RequestInit;
  /** @deprecated Use host, port, and ssl instead */
  path?: string;
  /** @deprecated */
  auth?: Record<string, string>;
}

/**
 * Main client class for interacting with ChromaDB.
 * Provides methods for managing collections and performing operations on them.
 */
export class ChromaClient {
  private _tenant: string | undefined;
  private _database: string | undefined;
  private _preflightChecks: ChecklistResponse | undefined;
  private _headers: Record<string, string> | undefined;
  private readonly apiClient: ReturnType<typeof createClient>;

  /**
   * Creates a new ChromaClient instance.
   * @param args - Configuration options for the client
   */
  constructor(args: Partial<ChromaClientArgs> = {}) {
    let {
      host = defaultArgs.host,
      port = defaultArgs.port,
      ssl = defaultArgs.ssl,
      tenant = defaultArgs.tenant,
      database = defaultArgs.database,
      headers = defaultArgs.headers,
      fetchOptions = defaultArgs.fetchOptions,
    } = args;

    if (args.path) {
      console.warn(
        "The 'path' argument is deprecated. Please use 'ssl', 'host', and 'port' instead",
      );
      const parsedPath = parseConnectionPath(args.path);
      ssl = parsedPath.ssl;
      host = parsedPath.host;
      port = parsedPath.port;
    }

    if (args.auth) {
      console.warn(
        "The 'auth' argument is deprecated. Please use 'headers' instead",
      );
      if (!headers) {
        headers = {};
      }
      if (
        !headers["x-chroma-token"] &&
        args.auth.tokenHeaderType === "X_CHROMA_TOKEN" &&
        args.auth.credentials
      ) {
        headers["x-chroma-token"] = args.auth.credentials;
      }
    }

    const baseUrl = `${ssl ? "https" : "http"}://${host}:${port}`;

    this._tenant = tenant || process.env.CHROMA_TENANT;
    this._database = database || process.env.CHROMA_DATABASE;

    this._headers = headers;

    const configOptions = {
      ...fetchOptions,
      method: normalizeMethod(fetchOptions?.method) as HttpMethod,
      baseUrl,
      headers,
    };

    this.apiClient = createClient(createConfig(configOptions));
    this.apiClient.setConfig({ fetch: chromaFetch });
  }

  /**
   * Gets the current tenant name.
   * @returns The tenant name or undefined if not set
   */
  public get tenant(): string | undefined {
    return this._tenant;
  }

  protected set tenant(tenant: string | undefined) {
    this._tenant = tenant;
  }

  /**
   * Gets the current database name.
   * @returns The database name or undefined if not set
   */
  public get database(): string | undefined {
    return this._database;
  }

  protected set database(database: string | undefined) {
    this._database = database;
  }

  /**
   * Gets the preflight checks
   * @returns The preflight checks or undefined if not set
   */
  public get preflightChecks(): ChecklistResponse | undefined {
    return this._preflightChecks;
  }

  protected set preflightChecks(
    preflightChecks: ChecklistResponse | undefined,
  ) {
    this._preflightChecks = preflightChecks;
  }

  public get headers(): Record<string, string> | undefined {
    return this._headers;
  }

  /** @ignore */
  public async _path(): Promise<{ tenant: string; database: string }> {
    if (!this._tenant || !this._database) {
      const { tenant, databases } = await this.getUserIdentity();
      const uniqueDBs = [...new Set(databases)];
      this._tenant = tenant;
      if (uniqueDBs.length === 0) {
        throw new ChromaUnauthorizedError(
          `Your API key does not have access to any DBs for tenant ${this.tenant}`,
        );
      }
      if (uniqueDBs.length > 1 || uniqueDBs[0] === "*") {
        throw new ChromaValueError(
          "Your API key is scoped to more than 1 DB. Please provide a DB name to the CloudClient constructor",
        );
      }
      this._database = uniqueDBs[0];
    }
    return { tenant: this._tenant, database: this._database };
  }

  /**
   * Gets the user identity information including tenant and accessible databases.
   * @returns Promise resolving to user identity data
   */
  public async getUserIdentity(): Promise<UserIdentity> {
    const { data } = await Api.getUserIdentity({
      client: this.apiClient,
    });
    return data;
  }

  /**
   * Sends a heartbeat request to check server connectivity.
   * @returns Promise resolving to the server's nanosecond heartbeat timestamp
   */
  public async heartbeat(): Promise<number> {
    const { data } = await Api.heartbeat({
      client: this.apiClient,
    });
    return data["nanosecond heartbeat"];
  }

  /**
   * Lists all collections in the current database.
   * @param args - Optional pagination parameters
   * @param args.limit - Maximum number of collections to return (default: 100)
   * @param args.offset - Number of collections to skip (default: 0)
   * @returns Promise resolving to an array of Collection instances
   */
  public async listCollections(
    args?: Partial<{
      limit: number;
      offset: number;
    }>,
  ): Promise<Collection[]> {
    const { limit = 100, offset = 0 } = args || {};

    const { data } = await Api.listCollections({
      client: this.apiClient,
      path: await this._path(),
      query: { limit, offset },
    });

    return Promise.all(
      data.map(async (collection) => {
        const schema = await Schema.deserializeFromJSON(
          collection.schema ?? null,
          this,
        );
        const schemaEmbeddingFunction = resolveSchemaEmbeddingFunction(schema);
        const resolvedEmbeddingFunction =
          (await getEmbeddingFunction({
            collectionName: collection.name,
            client: this,
            efConfig:
              collection.configuration_json.embedding_function ?? undefined,
          })) ?? schemaEmbeddingFunction;

        return new CollectionImpl({
          chromaClient: this,
          apiClient: this.apiClient,
          tenant: collection.tenant,
          database: collection.database,
          name: collection.name,
          id: collection.id,
          embeddingFunction: resolvedEmbeddingFunction,
          configuration: collection.configuration_json,
          metadata:
            deserializeMetadata(collection.metadata ?? undefined) ?? undefined,
          schema,
        });
      }),
    );
  }

  /**
   * Gets the total number of collections in the current database.
   * @returns Promise resolving to the collection count
   */
  public async countCollections(): Promise<number> {
    const { data } = await Api.countCollections({
      client: this.apiClient,
      path: await this._path(),
    });

    return data;
  }

  /**
   * Creates a new collection with the specified configuration.
   * @param options - Collection creation options
   * @param options.name - The name of the collection
   * @param options.configuration - Optional collection configuration
   * @param options.metadata - Optional metadata for the collection
   * @param options.embeddingFunction - Optional embedding function to use. Defaults to `DefaultEmbeddingFunction` from @chroma-core/default-embed
   * @returns Promise resolving to the created Collection instance
   * @throws Error if a collection with the same name already exists
   */
  public async createCollection({
    name,
    configuration,
    metadata,
    embeddingFunction,
    schema,
  }: {
    name: string;
    configuration?: CreateCollectionConfiguration;
    metadata?: CollectionMetadata;
    embeddingFunction?: EmbeddingFunction | null;
    schema?: Schema;
  }): Promise<Collection> {
    const collectionConfig = await processCreateCollectionConfig({
      configuration,
      embeddingFunction,
      metadata,
      schema,
    });

    const { data } = await Api.createCollection({
      client: this.apiClient,
      path: await this._path(),
      body: {
        name,
        configuration: collectionConfig,
        metadata: serializeMetadata(metadata),
        get_or_create: false,
        schema: schema ? schema.serializeToJSON() : undefined,
      },
    });

    const serverSchema = await Schema.deserializeFromJSON(
      data.schema ?? null,
      this,
    );
    const schemaEmbeddingFunction =
      resolveSchemaEmbeddingFunction(serverSchema);
    const resolvedEmbeddingFunction =
      embeddingFunction ??
      (await getEmbeddingFunction({
        collectionName: data.name,
        client: this,
        efConfig: data.configuration_json.embedding_function ?? undefined,
      })) ??
      schemaEmbeddingFunction;

    return new CollectionImpl({
      chromaClient: this,
      apiClient: this.apiClient,
      name,
      tenant: data.tenant,
      database: data.database,
      configuration: data.configuration_json,
      metadata: deserializeMetadata(data.metadata ?? undefined) ?? undefined,
      embeddingFunction: resolvedEmbeddingFunction,
      id: data.id,
      schema: serverSchema,
    });
  }

  /**
   * Retrieves an existing collection by name.
   * @param options - Collection retrieval options
   * @param options.name - The name of the collection to retrieve
   * @param options.embeddingFunction - Optional embedding function. Should match the one used to create the collection.
   * @returns Promise resolving to the Collection instance
   * @throws Error if the collection does not exist
   */
  public async getCollection({
    name,
    embeddingFunction,
  }: {
    name: string;
    embeddingFunction?: EmbeddingFunction;
  }): Promise<Collection> {
    const { data } = await Api.getCollection({
      client: this.apiClient,
      path: { ...(await this._path()), collection_id: name },
    });

    const schema = await Schema.deserializeFromJSON(data.schema ?? null, this);
    const schemaEmbeddingFunction = resolveSchemaEmbeddingFunction(schema);
    const resolvedEmbeddingFunction =
      embeddingFunction ??
      (await getEmbeddingFunction({
        collectionName: data.name,
        client: this,
        efConfig: data.configuration_json.embedding_function ?? undefined,
      })) ??
      schemaEmbeddingFunction;

    return new CollectionImpl({
      chromaClient: this,
      apiClient: this.apiClient,
      name,
      tenant: data.tenant,
      database: data.database,
      configuration: data.configuration_json,
      metadata: deserializeMetadata(data.metadata ?? undefined) ?? undefined,
      embeddingFunction: resolvedEmbeddingFunction,
      id: data.id,
      schema,
    });
  }

  /**
   * Retrieves an existing collection by its Chroma Resource Name (CRN).
   * @param crn - The Chroma Resource Name of the collection to retrieve
   * @returns Promise resolving to the Collection instance
   * @throws Error if the collection does not exist
   */
  public async getCollectionByCrn(crn: string): Promise<Collection> {
    const { data } = await Api.getCollectionByCrn({
      client: this.apiClient,
      path: { crn },
    });
    const schema = await Schema.deserializeFromJSON(data.schema ?? null, this);
    const schemaEmbeddingFunction = resolveSchemaEmbeddingFunction(schema);
    const resolvedEmbeddingFunction =
      (await getEmbeddingFunction({
        collectionName: data.name,
        efConfig: data.configuration_json.embedding_function ?? undefined,
        client: this,
      })) ?? schemaEmbeddingFunction;
    return new CollectionImpl({
      chromaClient: this,
      apiClient: this.apiClient,
      name: data.name,
      tenant: data.tenant,
      database: data.database,
      configuration: data.configuration_json,
      metadata: deserializeMetadata(data.metadata ?? undefined) ?? undefined,
      embeddingFunction: resolvedEmbeddingFunction,
      id: data.id,
      schema,
    });
  }

  /**
   * Retrieves multiple collections by name.
   * @param items - Array of collection names or objects with name and optional embedding function (should match the ones used to create the collections)
   * @returns Promise resolving to an array of Collection instances
   */
  public async getCollections(
    items: string[] | { name: string; embeddingFunction?: EmbeddingFunction }[],
  ): Promise<Collection[]> {
    if (items.length === 0) return [];

    let requestedCollections = items;
    if (typeof items[0] === "string") {
      requestedCollections = (items as string[]).map((item) => {
        return { name: item, embeddingFunction: undefined };
      });
    }

    let collections = requestedCollections as {
      name: string;
      embeddingFunction?: EmbeddingFunction;
    }[];

    return Promise.all(
      collections.map(async (collection) => {
        return this.getCollection({ ...collection });
      }),
    );
  }

  /**
   * Gets an existing collection or creates it if it doesn't exist.
   * @param options - Collection options
   * @param options.name - The name of the collection
   * @param options.configuration - Optional collection configuration (used only if creating)
   * @param options.metadata - Optional metadata for the collection (used only if creating)
   * @param options.embeddingFunction - Optional embedding function to use
   * @returns Promise resolving to the Collection instance
   */
  public async getOrCreateCollection({
    name,
    configuration,
    metadata,
    embeddingFunction,
    schema,
  }: {
    name: string;
    configuration?: CreateCollectionConfiguration;
    metadata?: CollectionMetadata;
    embeddingFunction?: EmbeddingFunction | null;
    schema?: Schema;
  }): Promise<Collection> {
    const collectionConfig = await processCreateCollectionConfig({
      configuration,
      embeddingFunction,
      metadata,
      schema,
    });

    const { data } = await Api.createCollection({
      client: this.apiClient,
      path: await this._path(),
      body: {
        name,
        configuration: collectionConfig,
        metadata: serializeMetadata(metadata),
        get_or_create: true,
        schema: schema ? schema.serializeToJSON() : undefined,
      },
    });

    const serverSchema = await Schema.deserializeFromJSON(
      data.schema ?? null,
      this,
    );
    const schemaEmbeddingFunction =
      resolveSchemaEmbeddingFunction(serverSchema);
    const resolvedEmbeddingFunction =
      embeddingFunction ??
      (await getEmbeddingFunction({
        collectionName: name,
        efConfig: data.configuration_json.embedding_function ?? undefined,
        client: this,
      })) ??
      schemaEmbeddingFunction;

    return new CollectionImpl({
      chromaClient: this,
      apiClient: this.apiClient,
      name,
      tenant: data.tenant,
      database: data.database,
      configuration: data.configuration_json,
      metadata: deserializeMetadata(data.metadata ?? undefined) ?? undefined,
      embeddingFunction: resolvedEmbeddingFunction,
      id: data.id,
      schema: serverSchema,
    });
  }

  /**
   * Deletes a collection and all its data.
   * @param options - Deletion options
   * @param options.name - The name of the collection to delete
   */
  public async deleteCollection({ name }: { name: string }): Promise<void> {
    await Api.deleteCollection({
      client: this.apiClient,
      path: { ...(await this._path()), collection_id: name },
    });
  }

  /**
   * Resets the entire database, deleting all collections and data.
   * @returns Promise that resolves when the reset is complete
   * @warning This operation is irreversible and will delete all data
   */
  public async reset(): Promise<void> {
    await Api.reset({
      client: this.apiClient,
    });
  }

  /**
   * Gets the version of the Chroma server.
   * @returns Promise resolving to the server version string
   */
  public async version(): Promise<string> {
    const { data } = await Api.version({
      client: this.apiClient,
    });
    return data;
  }

  /**
   * Gets the preflight checks
   * @returns Promise resolving to the preflight checks
   */
  public async getPreflightChecks(): Promise<ChecklistResponse> {
    if (!this.preflightChecks) {
      const { data } = await Api.preFlightChecks({
        client: this.apiClient,
      });
      this.preflightChecks = data;
      return this.preflightChecks;
    }
    return this.preflightChecks;
  }

  /**
   * Gets the max batch size
   * @returns Promise resolving to the max batch size
   */
  public async getMaxBatchSize(): Promise<number> {
    const preflightChecks = await this.getPreflightChecks();
    return preflightChecks.max_batch_size ?? -1;
  }

  /**
   * Gets whether base64_encoding is supported by the connected server
   * @returns Promise resolving to whether base64_encoding is supported
   */
  public async supportsBase64Encoding(): Promise<boolean> {
    const preflightChecks = await this.getPreflightChecks();
    return preflightChecks.supports_base64_encoding ?? false;
  }
}
