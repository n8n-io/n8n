---
name: mcp-creator
description: Expert MCP (Model Context Protocol) server developer creating safe, performant, production-ready servers with proper security, error handling, and developer experience. Activate on 'create
  MCP', 'MCP server', 'build MCP', 'custom tool server', 'MCP development', 'Model Context Protocol'. NOT for using existing MCPs (just invoke them), general API development (use backend-architect), or
  skills/agents without external state (use skill-coach/agent-creator).
allowed-tools: Read,Write,Edit,Bash,Grep,Glob,WebSearch,WebFetch
metadata:
  category: Productivity & Meta
  pairs-with:
  - skill: agent-creator
    reason: Skills that use the MCP tools
  - skill: security-auditor
    reason: Secure MCP server development
  tags:
  - mcp
  - model-context-protocol
  - tools
  - integration
  - servers
---

# MCP Creator

Expert in building production-ready Model Context Protocol servers. Creates safe, performant MCPs with proper security boundaries, robust error handling, and excellent developer experience.

## When to Use This Skill

**Use MCP when you need:**
- External API integration with authentication
- Stateful connections (databases, WebSockets, sessions)
- Multiple related tools sharing configuration
- Security boundaries between Claude and external services
- Connection pooling and resource management

**Do NOT use MCP for:**
- Pure domain expertise (use Skill)
- Multi-step orchestration (use Agent)
- Local stateless operations (use Script)
- Simple file processing (use Claude's built-in tools)

## Quick Start

```bash
# Scaffold new MCP server
npx @modelcontextprotocol/create-server my-mcp-server

# Install SDK
npm install @modelcontextprotocol/sdk

# Test with inspector
npx @modelcontextprotocol/inspector
```

## MCP Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Claude                               │
└─────────────────────────┬───────────────────────────────────┘
                          │ MCP Protocol (JSON-RPC)
┌─────────────────────────┴───────────────────────────────────┐
│                    MCP Server                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Tools     │  │  Resources  │  │     Prompts         │ │
│  │ (actions)   │  │ (read-only) │  │ (templates)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                          │                                  │
│  ┌───────────────────────┴──────────────────────────────┐  │
│  │           Auth / Rate Limiting / Caching              │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    External Services                         │
│         APIs │ Databases │ File Systems │ WebSockets         │
└─────────────────────────────────────────────────────────────┘
```

## Core MCP Server Template

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "my-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "my_tool",
      description: "Clear description of what this tool does",
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string", description: "Input description" },
        },
        required: ["input"],
      },
    },
  ],
}));

// Tool implementation
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "my_tool") {
    try {
      const result = await processInput(args.input);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, error.message);
    }
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Tool Design Principles

### 1. Clear Naming
```typescript
// ✅ Good: Action-oriented, specific
"get_user_profile"
"create_issue"
"analyze_sentiment"

// ❌ Bad: Vague, generic
"process"
"do_thing"
"handle"
```

### 2. Precise Input Schemas
```typescript
// ✅ Good: Typed, constrained, documented
{
  type: "object",
  properties: {
    userId: { type: "string", pattern: "^[a-f0-9]{24}$" },
    action: { type: "string", enum: ["read", "write", "delete"] },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 10 }
  },
  required: ["userId", "action"],
  additionalProperties: false
}

// ❌ Bad: Untyped, unconstrained
{ type: "object" }
```

### 3. Structured Outputs
```typescript
// ✅ Good: Consistent structure
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      success: true,
      data: result,
      metadata: { requestId, timestamp }
    }, null, 2)
  }]
};

// ❌ Bad: Inconsistent, unstructured
return { content: [{ type: "text", text: "done" }] };
```

## Security Hardening (CRITICAL)

### Input Validation
```typescript
import { z } from "zod";

const UserInputSchema = z.object({
  userId: z.string().regex(/^[a-f0-9]{24}$/),
  email: z.string().email(),
  query: z.string().max(1000).refine(
    (q) => !q.includes("--") && !q.includes(";"),
    { message: "Invalid characters in query" }
  ),
});

async function handleTool(args: unknown) {
  const validated = UserInputSchema.parse(args); // Throws on invalid
  // Safe to use validated data
}
```

### Secret Management
```typescript
// ✅ Good: Environment variables
const API_KEY = process.env.SERVICE_API_KEY;
if (!API_KEY) throw new Error("SERVICE_API_KEY required");

// ✅ Good: Secret manager integration
const secret = await secretManager.getSecret("service-api-key");

// ❌ NEVER: Hardcoded secrets
const API_KEY = "sk-abc123..."; // SECURITY VULNERABILITY
```

### Rate Limiting
```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canProceed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const recent = timestamps.filter(t => now - t < windowMs);

    if (recent.length >= limit) return false;

    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}

const limiter = new RateLimiter();

// In tool handler
if (!limiter.canProceed(userId, 100, 60000)) {
  throw new McpError(ErrorCode.InvalidRequest, "Rate limit exceeded");
}
```

### Authentication Boundaries
```typescript
// Validate credentials before any operation
async function withAuth<T>(
  credentials: Credentials,
  operation: () => Promise<T>
): Promise<T> {
  if (!await validateCredentials(credentials)) {
    throw new McpError(ErrorCode.InvalidRequest, "Invalid credentials");
  }
  return operation();
}
```

## Error Handling Patterns

### Structured Error Responses
```typescript
// Define error types
enum ServiceError {
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  RATE_LIMITED = "RATE_LIMITED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}

// Map to MCP errors
function toMcpError(error: unknown): McpError {
  if (error instanceof z.ZodError) {
    return new McpError(
      ErrorCode.InvalidParams,
      `Validation error: ${error.errors.map(e => e.message).join(", ")}`
    );
  }

  if (error instanceof ServiceError) {
    return new McpError(ErrorCode.InternalError, error.message);
  }

  return new McpError(ErrorCode.InternalError, "Unknown error occurred");
}
```

### Graceful Degradation
```typescript
async function fetchWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  options: { retries?: number; timeout?: number } = {}
): Promise<T> {
  const { retries = 3, timeout = 5000 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      return await Promise.race([
        primary(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeout)
        ),
      ]);
    } catch (error) {
      if (i === retries - 1) {
        console.error("Primary failed, trying fallback:", error);
        return fallback();
      }
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Backoff
    }
  }
  throw new Error("All retries exhausted");
}
```

## Performance Optimization

### Connection Pooling
```typescript
// PostgreSQL pool
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Reuse connections
async function query(sql: string, params: unknown[]) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}
```

### Caching Layer
```typescript
class Cache<T> {
  private store: Map<string, { value: T; expires: number }> = new Map();

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }
}

const cache = new Cache<ApiResponse>();

async function fetchWithCache(url: string): Promise<ApiResponse> {
  const cached = cache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  const data = await response.json();
  cache.set(url, data, 300000); // 5 min TTL
  return data;
}
```

## Anti-Patterns

### Anti-Pattern: No Input Validation
**What it looks like**: Passing user input directly to APIs/databases
**Why wrong**: SQL injection, command injection, data corruption
**Instead**: Validate with Zod, sanitize inputs, use parameterized queries

### Anti-Pattern: Secrets in Code
**What it looks like**: Hardcoded API keys, tokens in source
**Why wrong**: Secrets leak via git, logs, error messages
**Instead**: Environment variables, secret managers, encrypted config

### Anti-Pattern: No Rate Limiting
**What it looks like**: Unlimited API calls to external services
**Why wrong**: Cost explosion, API bans, resource exhaustion
**Instead**: Token bucket, sliding window, or adaptive rate limiting

### Anti-Pattern: Synchronous Blocking
**What it looks like**: `sleep()`, blocking I/O in async handlers
**Why wrong**: Blocks all requests, causes timeouts
**Instead**: Proper async/await, non-blocking patterns

### Anti-Pattern: Silent Failures
**What it looks like**: Empty catch blocks, swallowed errors
**Why wrong**: Debugging impossible, data corruption undetected
**Instead**: Structured error handling, logging, proper propagation

### Anti-Pattern: No Timeouts
**What it looks like**: Waiting indefinitely for external services
**Why wrong**: Hung connections, resource leaks
**Instead**: Explicit timeouts on all external calls, circuit breakers

## Testing Your MCP

### Using MCP Inspector
```bash
# Start inspector
npx @modelcontextprotocol/inspector

# In another terminal, start your server
node dist/index.js

# Connect inspector to your server
# Test tool invocations manually
```

### Unit Testing
```typescript
import { describe, it, expect } from "vitest";

describe("my_tool", () => {
  it("should validate input", async () => {
    await expect(
      handleTool({ userId: "invalid" })
    ).rejects.toThrow("Invalid userId format");
  });

  it("should return structured output", async () => {
    const result = await handleTool({ userId: "507f1f77bcf86cd799439011" });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("data");
  });
});
```

## Decision Tree: When to Add to MCP

```
Does this tool need...
├── External API with auth? → Add to MCP
├── Persistent state/connection? → Add to MCP
├── Rate limiting for external service? → Add to MCP
├── Shared credentials with other tools? → Add to MCP
├── Security boundary from Claude? → Add to MCP
└── None of the above? → Consider Script instead
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Tool latency P95 | &lt; 500ms |
| Error rate | &lt; 1% |
| Input validation coverage | 100% |
| Secret exposure | 0 |
| Rate limit violations | 0 |

## Reference Files

| File | Contents |
|------|----------|
| `references/architecture-patterns.md` | Transport layers, server lifecycle, resource management |
| `references/tool-design.md` | Schema patterns, naming conventions, output formats |
| `references/security-hardening.md` | Complete OWASP-aligned security checklist |
| `references/error-handling.md` | Error types, recovery strategies, logging |
| `references/testing-debugging.md` | Inspector usage, unit/integration tests |
| `references/performance.md` | Caching, pooling, async patterns |
| `templates/` | Production-ready server templates |

---

**Creates**: Safe, performant MCP servers | Robust tool interfaces | Security-hardened integrations

**Use with**: security-auditor (security review) | site-reliability-engineer (deployment) | agent-creator (when MCP supports agents)
