#!/usr/bin/env node
/**
 * Authenticated API MCP Server Template
 *
 * Production-ready MCP server for external API integration with:
 * - Secure credential management
 * - Rate limiting
 * - Retry with exponential backoff
 * - Response caching
 * - Comprehensive error handling
 *
 * Usage:
 * 1. Set environment variables (API_KEY, API_BASE_URL)
 * 2. Customize the API client methods
 * 3. Add your tool definitions
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

interface Config {
  name: string;
  version: string;
  apiBaseUrl: string;
  apiKey: string;
  rateLimitPerMinute: number;
  cacheTtlMs: number;
  maxRetries: number;
  timeoutMs: number;
}

function loadConfig(): Config {
  const apiKey = process.env.API_KEY;
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiKey) {
    throw new Error("API_KEY environment variable is required");
  }

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL environment variable is required");
  }

  return {
    name: "authenticated-api-mcp",
    version: "1.0.0",
    apiBaseUrl,
    apiKey,
    rateLimitPerMinute: parseInt(process.env.RATE_LIMIT || "60"),
    cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || "300000"), // 5 min
    maxRetries: parseInt(process.env.MAX_RETRIES || "3"),
    timeoutMs: parseInt(process.env.TIMEOUT_MS || "30000"), // 30 sec
  };
}

const CONFIG = loadConfig();

// =============================================================================
// Rate Limiter
// =============================================================================

class RateLimiter {
  private requests: number[] = [];

  canProceed(): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Remove old requests
    this.requests = this.requests.filter(t => t > windowStart);

    if (this.requests.length >= CONFIG.rateLimitPerMinute) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;

    const oldestInWindow = Math.min(...this.requests);
    const windowEnd = oldestInWindow + 60000;
    return Math.max(0, windowEnd - Date.now());
  }
}

const rateLimiter = new RateLimiter();

// =============================================================================
// Cache
// =============================================================================

interface CacheEntry<T> {
  value: T;
  expires: number;
}

class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs: number = CONFIG.cacheTtlMs): void {
    this.store.set(key, {
      value,
      expires: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

const responseCache = new Cache<unknown>();

// =============================================================================
// API Client
// =============================================================================

interface ApiError {
  status: number;
  message: string;
  retryable: boolean;
}

async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    useCache?: boolean;
    cacheKey?: string;
  } = {}
): Promise<T> {
  const { method = "GET", body, useCache = true, cacheKey } = options;

  // Check cache for GET requests
  const cacheKeyFinal = cacheKey || `${method}:${endpoint}`;
  if (useCache && method === "GET") {
    const cached = responseCache.get(cacheKeyFinal);
    if (cached) {
      console.error(`Cache hit: ${cacheKeyFinal}`);
      return cached as T;
    }
  }

  // Check rate limit
  if (!rateLimiter.canProceed()) {
    const waitTime = rateLimiter.getWaitTime();
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Rate limit exceeded. Retry after ${Math.ceil(waitTime / 1000)} seconds.`
    );
  }

  // Retry logic
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

      const response = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, {
        method,
        headers: {
          "Authorization": `Bearer ${CONFIG.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": `${CONFIG.name}/${CONFIG.version}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = {
          status: response.status,
          message: errorBody,
          retryable: response.status >= 500 || response.status === 429,
        };

        if (!lastError.retryable) {
          break; // Don't retry client errors
        }

        // Handle rate limit from API
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitMs = retryAfter
            ? parseInt(retryAfter) * 1000
            : Math.min(1000 * Math.pow(2, attempt), 30000);

          console.error(`Rate limited by API, waiting ${waitMs}ms...`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }

        // Exponential backoff for server errors
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.error(`Request failed (attempt ${attempt + 1}), retrying in ${backoffMs}ms...`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      const data = await response.json();

      // Cache successful GET responses
      if (useCache && method === "GET") {
        responseCache.set(cacheKeyFinal, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = {
          status: 0,
          message: "Request timeout",
          retryable: true,
        };
      } else {
        throw error;
      }
    }
  }

  // All retries exhausted
  throw new McpError(
    lastError?.status === 401 || lastError?.status === 403
      ? ErrorCode.InvalidRequest
      : ErrorCode.InternalError,
    `API request failed: ${lastError?.message || "Unknown error"}`
  );
}

// =============================================================================
// Input Schemas
// =============================================================================

const GetResourceSchema = z.object({
  resourceId: z.string().min(1).max(100),
  includeDetails: z.boolean().default(false),
});

const SearchResourcesSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const CreateResourceSchema = z.object({
  name: z.string().min(1).max(200),
  data: z.record(z.unknown()),
});

// =============================================================================
// Tool Implementations
// =============================================================================

interface Resource {
  id: string;
  name: string;
  data: Record<string, unknown>;
}

interface SearchResult {
  items: Resource[];
  total: number;
}

async function getResource(args: z.infer<typeof GetResourceSchema>): Promise<Resource> {
  return apiRequest<Resource>(`/resources/${args.resourceId}`);
}

async function searchResources(args: z.infer<typeof SearchResourcesSchema>): Promise<SearchResult> {
  const params = new URLSearchParams({
    q: args.query,
    limit: args.limit.toString(),
    offset: args.offset.toString(),
  });

  return apiRequest<SearchResult>(`/resources/search?${params}`);
}

async function createResource(args: z.infer<typeof CreateResourceSchema>): Promise<Resource> {
  return apiRequest<Resource>("/resources", {
    method: "POST",
    body: args,
    useCache: false,
  });
}

// =============================================================================
// Tool Definitions
// =============================================================================

const TOOLS = [
  {
    name: "get_resource",
    description: "Get a resource by ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        resourceId: { type: "string", description: "Resource ID" },
        includeDetails: { type: "boolean", default: false },
      },
      required: ["resourceId"],
    },
  },
  {
    name: "search_resources",
    description: "Search resources by query",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        offset: { type: "integer", minimum: 0, default: 0 },
      },
      required: ["query"],
    },
  },
  {
    name: "create_resource",
    description: "Create a new resource",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Resource name" },
        data: { type: "object", description: "Resource data" },
      },
      required: ["name", "data"],
    },
  },
  {
    name: "clear_cache",
    description: "Clear the response cache",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  { name: CONFIG.name, version: CONFIG.version },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "get_resource":
        result = await getResource(GetResourceSchema.parse(args));
        break;

      case "search_resources":
        result = await searchResources(SearchResourcesSchema.parse(args));
        break;

      case "create_resource":
        result = await createResource(CreateResourceSchema.parse(args));
        break;

      case "clear_cache":
        responseCache.clear();
        result = { success: true, message: "Cache cleared" };
        break;

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Validation error: ${error.errors.map(e => `${e.path}: ${e.message}`).join(", ")}`
      );
    }
    throw error;
  }
});

// =============================================================================
// Start Server
// =============================================================================

async function main() {
  console.error(`Starting ${CONFIG.name} v${CONFIG.version}`);
  console.error(`API: ${CONFIG.apiBaseUrl}`);
  console.error(`Rate limit: ${CONFIG.rateLimitPerMinute}/min`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
