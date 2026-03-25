import { ChromaClient } from "./chroma-client";
import * as process from "node:process";
import { AdminClient } from "./admin-client";
import { ChromaUnauthorizedError, ChromaValueError } from "./errors";

/**
 * ChromaDB cloud client for connecting to hosted Chroma instances.
 * Extends ChromaClient with cloud-specific authentication and configuration.
 */
export class CloudClient extends ChromaClient {
  /**
   * Creates a new CloudClient instance for Chroma Cloud.
   * @param args - Cloud client configuration options
   */
  constructor(
    args: Partial<{
      /** API key for authentication (or set CHROMA_API_KEY env var) */
      apiKey?: string;
      /** Host address of the Chroma cloud server. Defaults to 'api.trychroma.com' */
      host?: string;
      /** Port number of the Chroma cloud server. Defaults to 443 */
      port?: number;
      /** Tenant name for multi-tenant deployments */
      tenant?: string;
      /** Database name to connect to */
      database?: string;
      /** Additional fetch options for HTTP requests */
      fetchOptions?: RequestInit;
    }> = {},
  ) {
    const apiKey = args.apiKey || process.env.CHROMA_API_KEY;
    if (!apiKey) {
      throw new ChromaValueError(
        "Missing API key. Please provide it to the CloudClient constructor or set your CHROMA_API_KEY environment variable",
      );
    }

    const tenant = args.tenant || process.env.CHROMA_TENANT;
    const database = args.database || process.env.CHROMA_DATABASE;

    super({
      host: args.host || "api.trychroma.com",
      port: args.port || 443,
      ssl: true,
      tenant,
      database,
      headers: { "x-chroma-token": apiKey },
      fetchOptions: args.fetchOptions,
    });

    // Override from ChromaClient construction in case undefined. This will trigger auto-resolution in the "path" function
    this.tenant = tenant;
    this.database = database;
  }
}

/**
 * Admin client for Chroma Cloud administrative operations.
 * Extends AdminClient with cloud-specific authentication.
 */
export class AdminCloudClient extends AdminClient {
  /**
   * Creates a new AdminCloudClient instance for cloud admin operations.
   * @param args - Admin cloud client configuration options
   */
  constructor(
    args: Partial<{
      /** API key for authentication (or set CHROMA_API_KEY env var) */
      apiKey?: string;
      /** Host address of the Chroma cloud server. Defaults to 'api.trychroma.com' */
      host?: string;
      /** Port number of the Chroma cloud server. Defaults to 443 */
      port?: number;
      /** Additional fetch options for HTTP requests */
      fetchOptions?: RequestInit;
    }> = {},
  ) {
    const apiKey = args.apiKey || process.env.CHROMA_API_KEY;
    if (!apiKey) {
      throw new ChromaValueError(
        "Missing API key. Please provide it to the CloudClient constructor or set your CHROMA_API_KEY environment variable",
      );
    }

    super({
      host: args.host || "api.trychroma.com",
      port: args.port || 443,
      ssl: true,
      headers: { "x-chroma-token": apiKey },
      fetchOptions: args.fetchOptions,
    });
  }
}
