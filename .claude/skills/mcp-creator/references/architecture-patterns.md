# MCP Architecture Patterns

## Transport Layers

### Stdio Transport (Recommended for CLI)
```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Best for: CLI tools, local development, Claude Code integration
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Pros**: Simple, no network config, secure (process-level isolation)
**Cons**: Single client, no remote access

### SSE Transport (HTTP)
```typescript
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const app = express();
app.use("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});
app.listen(3000);
```

**Pros**: Multiple clients, remote access, browser-compatible
**Cons**: More complex, requires HTTP server

### Custom Transport
```typescript
class CustomTransport implements Transport {
  async start(): Promise<void> { /* Initialize connection */ }
  async close(): Promise<void> { /* Cleanup */ }
  async send(message: JSONRPCMessage): Promise<void> { /* Send message */ }
  onMessage?: (message: JSONRPCMessage) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}
```

## Server Lifecycle

### Initialization Pattern
```typescript
class MCPServer {
  private pool: Pool | null = null;
  private cache: Cache | null = null;

  async initialize(): Promise<void> {
    // 1. Validate configuration
    this.validateConfig();

    // 2. Initialize connections (parallel)
    const [pool, cache] = await Promise.all([
      this.initDatabase(),
      this.initCache(),
    ]);

    this.pool = pool;
    this.cache = cache;

    // 3. Warm caches if needed
    await this.warmCaches();

    // 4. Register signal handlers
    this.registerShutdownHandlers();
  }

  private registerShutdownHandlers(): void {
    const shutdown = async () => {
      console.error("Shutting down...");
      await this.pool?.end();
      await this.cache?.quit();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
}
```

### Health Check Pattern
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "health_check",
      description: "Check server health and dependencies",
      inputSchema: { type: "object", properties: {} },
    },
    // ... other tools
  ],
}));

async function healthCheck(): Promise<HealthStatus> {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkCache(),
    checkExternalApi(),
  ]);

  return {
    status: checks.every(c => c.status === "fulfilled") ? "healthy" : "degraded",
    checks: {
      database: checks[0].status === "fulfilled" ? "ok" : "failed",
      cache: checks[1].status === "fulfilled" ? "ok" : "failed",
      externalApi: checks[2].status === "fulfilled" ? "ok" : "failed",
    },
    timestamp: new Date().toISOString(),
  };
}
```

## Resource Management

### Connection Pool Pattern
```typescript
import { Pool, PoolConfig } from "pg";

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,                        // Max connections
  idleTimeoutMillis: 30000,       // Close idle connections after 30s
  connectionTimeoutMillis: 2000,  // Fail fast if can't connect
  statement_timeout: 30000,       // Kill queries after 30s
};

const pool = new Pool(poolConfig);

// Monitor pool health
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});

pool.on("connect", () => {
  console.error("New client connected to pool");
});
```

### Resource Cleanup Pattern
```typescript
class ResourceManager {
  private resources: Set<Disposable> = new Set();

  register<T extends Disposable>(resource: T): T {
    this.resources.add(resource);
    return resource;
  }

  async disposeAll(): Promise<void> {
    const errors: Error[] = [];

    for (const resource of this.resources) {
      try {
        await resource.dispose();
      } catch (error) {
        errors.push(error as Error);
      }
    }

    this.resources.clear();

    if (errors.length > 0) {
      throw new AggregateError(errors, "Resource disposal failed");
    }
  }
}
```

## State Management

### Stateless Design (Preferred)
```typescript
// Each request is self-contained
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Get state from request or external store
  const session = await getSession(request.params.sessionId);

  // Process
  const result = await processWithSession(session, request.params);

  // Persist state externally
  await saveSession(session);

  return result;
});
```

### Stateful Design (When Necessary)
```typescript
// For WebSockets, long-running connections
class StatefulServer {
  private sessions: Map<string, Session> = new Map();

  async handleConnection(clientId: string): Promise<Session> {
    const session = new Session(clientId);
    this.sessions.set(clientId, session);

    // Set TTL for cleanup
    setTimeout(() => this.cleanup(clientId), 3600000); // 1 hour

    return session;
  }

  private cleanup(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (session?.isExpired()) {
      session.dispose();
      this.sessions.delete(clientId);
    }
  }
}
```

## Capabilities Declaration

### Tools Capability
```typescript
const server = new Server(
  { name: "my-server", version: "1.0.0" },
  {
    capabilities: {
      tools: {},  // Enable tools
    },
  }
);
```

### Resources Capability
```typescript
const server = new Server(
  { name: "my-server", version: "1.0.0" },
  {
    capabilities: {
      resources: {
        subscribe: true,  // Enable resource subscriptions
      },
    },
  }
);

// Define resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "config://settings",
      name: "Server Settings",
      description: "Current server configuration",
      mimeType: "application/json",
    },
  ],
}));

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "config://settings") {
    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(getConfig()),
      }],
    };
  }
});
```

### Prompts Capability
```typescript
const server = new Server(
  { name: "my-server", version: "1.0.0" },
  {
    capabilities: {
      prompts: {},  // Enable prompts
    },
  }
);

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "analyze_code",
      description: "Analyze code for issues",
      arguments: [
        { name: "code", description: "Code to analyze", required: true },
        { name: "language", description: "Programming language" },
      ],
    },
  ],
}));
```

## Multi-Server Coordination

### Shared Configuration
```typescript
// config.ts - Shared across servers
export const CONFIG = {
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  rateLimit: {
    requestsPerMinute: 100,
    burstSize: 20,
  },
};
```

### Service Registry Pattern
```typescript
// For discovering other MCP servers
class ServiceRegistry {
  private services: Map<string, ServiceInfo> = new Map();

  register(name: string, info: ServiceInfo): void {
    this.services.set(name, info);
  }

  discover(name: string): ServiceInfo | undefined {
    return this.services.get(name);
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, info] of this.services) {
      try {
        const response = await fetch(`${info.url}/health`);
        results[name] = response.ok;
      } catch {
        results[name] = false;
      }
    }

    return results;
  }
}
```

## Logging Best Practices

### Structured Logging
```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// In handlers
logger.info({ tool: "my_tool", args: sanitizedArgs }, "Tool invoked");
logger.error({ err, tool: "my_tool" }, "Tool failed");
```

### Audit Logging
```typescript
interface AuditLog {
  timestamp: string;
  tool: string;
  userId?: string;
  args: Record<string, unknown>;
  result: "success" | "failure";
  duration: number;
  errorCode?: string;
}

async function auditLog(entry: AuditLog): Promise<void> {
  // To file, database, or external service
  await appendToAuditLog(entry);
}
```

## Versioning Strategy

### Semantic Versioning
```typescript
const server = new Server(
  {
    name: "my-server",
    version: "2.1.0",  // MAJOR.MINOR.PATCH
  },
  { capabilities: { tools: {} } }
);
```

### Backwards Compatibility
```typescript
// Support old and new parameter names
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments;

  // Support both old and new field names
  const userId = args.userId || args.user_id;  // New or legacy

  // Deprecation warning
  if (args.user_id) {
    console.warn("user_id is deprecated, use userId");
  }
});
```
