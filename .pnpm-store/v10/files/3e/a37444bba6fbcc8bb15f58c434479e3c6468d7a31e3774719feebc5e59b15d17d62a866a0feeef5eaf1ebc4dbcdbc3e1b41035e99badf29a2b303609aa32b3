import { defaultAdminClientArgs, HttpMethod, normalizeMethod } from "./utils";
import { createClient, createConfig } from "@hey-api/client-fetch";
import { Database, DefaultService as Api } from "./api";
import { chromaFetch } from "./chroma-fetch";

/**
 * Configuration options for the AdminClient.
 */
export interface AdminClientArgs {
  /** The host address of the Chroma server */
  host: string;
  /** The port number of the Chroma server */
  port: number;
  /** Whether to use SSL/HTTPS for connections */
  ssl: boolean;
  /** Additional HTTP headers to send with requests */
  headers?: Record<string, string>;
  /** Additional fetch options for HTTP requests */
  fetchOptions?: RequestInit;
}

/**
 * Arguments for listing databases within a tenant.
 */
export interface ListDatabasesArgs {
  /** The tenant name to list databases for */
  tenant: string;
  /** Maximum number of databases to return (default: 100) */
  limit?: number;
  /** Number of databases to skip (default: 0) */
  offset?: number;
}

/**
 * Administrative client for managing ChromaDB tenants and databases.
 * Provides methods for creating, deleting, and listing tenants and databases.
 */
export class AdminClient {
  private readonly apiClient: ReturnType<typeof createClient>;

  /**
   * Creates a new AdminClient instance.
   * @param args - Optional configuration for the admin client
   */
  constructor(args?: AdminClientArgs) {
    const { host, port, ssl, headers, fetchOptions } =
      args || defaultAdminClientArgs;

    const baseUrl = `${ssl ? "https" : "http"}://${host}:${port}`;

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
   * Creates a new database within a tenant.
   * @param options - Database creation options
   * @param options.name - Name of the database to create
   * @param options.tenant - Tenant that will own the database
   */
  public async createDatabase({
    name,
    tenant,
  }: {
    name: string;
    tenant: string;
  }): Promise<void> {
    await Api.createDatabase({
      client: this.apiClient,
      path: { tenant },
      body: { name },
    });
  }

  /**
   * Retrieves information about a specific database.
   * @param options - Database retrieval options
   * @param options.name - Name of the database to retrieve
   * @param options.tenant - Tenant that owns the database
   * @returns Promise resolving to database information
   */
  public async getDatabase({
    name,
    tenant,
  }: {
    name: string;
    tenant: string;
  }): Promise<Database> {
    const { data } = await Api.getDatabase({
      client: this.apiClient,
      path: { tenant, database: name },
    });

    return data;
  }

  /**
   * Deletes a database and all its data.
   * @param options - Database deletion options
   * @param options.name - Name of the database to delete
   * @param options.tenant - Tenant that owns the database
   * @warning This operation is irreversible and will delete all data
   */
  public async deleteDatabase({
    name,
    tenant,
  }: {
    name: string;
    tenant: string;
  }): Promise<void> {
    await Api.deleteDatabase({
      client: this.apiClient,
      path: { tenant, database: name },
    });
  }

  /**
   * Lists all databases within a tenant.
   * @param args - Listing parameters including tenant and pagination
   * @returns Promise resolving to an array of database information
   */
  public async listDatabases(args: ListDatabasesArgs): Promise<Database[]> {
    const { limit = 100, offset = 0, tenant } = args;
    const { data } = await Api.listDatabases({
      client: this.apiClient,
      path: { tenant },
      query: { limit, offset },
    });

    return data;
  }

  /**
   * Creates a new tenant.
   * @param options - Tenant creation options
   * @param options.name - Name of the tenant to create
   */
  public async createTenant({ name }: { name: string }): Promise<void> {
    await Api.createTenant({
      client: this.apiClient,
      body: { name },
    });
  }

  /**
   * Retrieves information about a specific tenant.
   * @param options - Tenant retrieval options
   * @param options.name - Name of the tenant to retrieve
   * @returns Promise resolving to the tenant name
   */
  public async getTenant({ name }: { name: string }): Promise<string> {
    const { data } = await Api.getTenant({
      client: this.apiClient,
      path: { tenant_name: name },
    });

    return data.name;
  }
}
