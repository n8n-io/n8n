# MCP Testing and Debugging Guide

## Testing Tools

### MCP Inspector (Official)
```bash
# Install globally
npm install -g @modelcontextprotocol/inspector

# Run inspector
npx @modelcontextprotocol/inspector

# Connect to your server
# In inspector UI: Connect to stdio server
```

**Inspector capabilities:**
- List available tools and resources
- Execute tool calls with custom arguments
- View request/response JSON
- Test error handling
- Profile performance

### Manual Testing with Node
```typescript
// test-client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

async function testServer() {
  // Spawn server process
  const serverProcess = spawn("node", ["dist/index.js"]);

  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0",
  }, {
    capabilities: {},
  });

  await client.connect(transport);

  // List tools
  const tools = await client.listTools();
  console.log("Available tools:", tools);

  // Call a tool
  const result = await client.callTool({
    name: "my_tool",
    arguments: { input: "test" },
  });
  console.log("Result:", result);

  await client.close();
}

testServer().catch(console.error);
```

## Unit Testing

### Testing Tool Handlers
```typescript
// __tests__/handlers.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { handleMyTool } from "../src/handlers";

describe("handleMyTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate input correctly", async () => {
    await expect(handleMyTool({ input: "" }))
      .rejects.toThrow("Input is required");
  });

  it("should process valid input", async () => {
    const result = await handleMyTool({ input: "test" });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("data");
  });

  it("should handle options correctly", async () => {
    const result = await handleMyTool({
      input: "test",
      options: { format: "text" },
    });

    expect(typeof result).toBe("string");
  });
});
```

### Testing Input Validation
```typescript
// __tests__/validation.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { MyToolSchema } from "../src/schemas";

describe("MyToolSchema", () => {
  it("should accept valid input", () => {
    const input = { userId: "abc123", action: "read" };
    expect(() => MyToolSchema.parse(input)).not.toThrow();
  });

  it("should reject missing required fields", () => {
    const input = { action: "read" };
    expect(() => MyToolSchema.parse(input)).toThrow();
  });

  it("should reject invalid userId format", () => {
    const input = { userId: "invalid!!!", action: "read" };
    expect(() => MyToolSchema.parse(input)).toThrow();
  });

  it("should reject invalid enum values", () => {
    const input = { userId: "abc123", action: "invalid" };
    expect(() => MyToolSchema.parse(input)).toThrow();
  });

  it("should apply defaults", () => {
    const input = { userId: "abc123", action: "read" };
    const result = MyToolSchema.parse(input);
    expect(result.options?.limit).toBe(10);
  });
});
```

### Testing Rate Limiter
```typescript
// __tests__/rate-limiter.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RateLimiter } from "../src/rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter(10, 60000); // 10 per minute
  });

  it("should allow requests under limit", () => {
    for (let i = 0; i < 10; i++) {
      expect(limiter.canProceed("user1")).toBe(true);
    }
  });

  it("should block requests over limit", () => {
    for (let i = 0; i < 10; i++) {
      limiter.canProceed("user1");
    }
    expect(limiter.canProceed("user1")).toBe(false);
  });

  it("should reset after window expires", () => {
    for (let i = 0; i < 10; i++) {
      limiter.canProceed("user1");
    }

    // Advance time by 1 minute
    vi.advanceTimersByTime(60000);

    expect(limiter.canProceed("user1")).toBe(true);
  });

  it("should track users independently", () => {
    for (let i = 0; i < 10; i++) {
      limiter.canProceed("user1");
    }

    expect(limiter.canProceed("user1")).toBe(false);
    expect(limiter.canProceed("user2")).toBe(true);
  });
});
```

### Testing API Client
```typescript
// __tests__/api-client.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiRequest } from "../src/api-client";

// Mock fetch
global.fetch = vi.fn();

describe("apiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should make successful request", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "test" }),
    });

    const result = await apiRequest("/endpoint");
    expect(result).toEqual({ data: "test" });
  });

  it("should retry on 5xx errors", async () => {
    (fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "Error" })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: "success" }) });

    const result = await apiRequest("/endpoint");
    expect(result).toEqual({ data: "success" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should not retry on 4xx errors", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad request",
    });

    await expect(apiRequest("/endpoint")).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("should handle timeout", async () => {
    vi.useFakeTimers();

    (fetch as any).mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    const promise = apiRequest("/endpoint", { timeout: 1000 });

    vi.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow("timeout");
  });
});
```

## Integration Testing

### Full Server Test
```typescript
// __tests__/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("MCP Server Integration", () => {
  let client: Client;
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["dist/index.js"],
      env: {
        ...process.env,
        API_KEY: "test-key",
        API_BASE_URL: "http://localhost:3000",
      },
    });

    client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it("should list tools", async () => {
    const { tools } = await client.listTools();

    expect(tools).toBeInstanceOf(Array);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0]).toHaveProperty("name");
    expect(tools[0]).toHaveProperty("inputSchema");
  });

  it("should execute tool successfully", async () => {
    const result = await client.callTool({
      name: "example_tool",
      arguments: { input: "test" },
    });

    expect(result.content).toBeInstanceOf(Array);
    expect(result.content[0].type).toBe("text");
  });

  it("should handle invalid arguments", async () => {
    await expect(
      client.callTool({
        name: "example_tool",
        arguments: { input: "" },
      })
    ).rejects.toThrow();
  });
});
```

## Debugging Techniques

### Structured Logging
```typescript
// Add to your server
const DEBUG = process.env.DEBUG === "true";

function debug(message: string, data?: unknown) {
  if (DEBUG) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "debug",
      message,
      data,
    }));
  }
}

// In handlers
debug("Tool called", { name, args });
debug("API response", { status, body });
```

### Request Tracing
```typescript
import { randomUUID } from "crypto";

interface RequestContext {
  requestId: string;
  startTime: number;
  tool: string;
}

const activeRequests = new Map<string, RequestContext>();

function startRequest(tool: string): string {
  const requestId = randomUUID();
  activeRequests.set(requestId, {
    requestId,
    startTime: Date.now(),
    tool,
  });
  console.error(`[${requestId}] START ${tool}`);
  return requestId;
}

function endRequest(requestId: string, success: boolean) {
  const ctx = activeRequests.get(requestId);
  if (ctx) {
    const duration = Date.now() - ctx.startTime;
    console.error(`[${requestId}] END ${ctx.tool} ${success ? "OK" : "FAIL"} ${duration}ms`);
    activeRequests.delete(requestId);
  }
}
```

### Error Debugging
```typescript
// Detailed error logging
function logError(error: unknown, context: Record<string, unknown>) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    type: error instanceof Error ? error.constructor.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  };

  console.error("ERROR:", JSON.stringify(errorInfo, null, 2));
}

// Usage in handlers
try {
  // ... handler code
} catch (error) {
  logError(error, { tool: name, args: sanitizedArgs });
  throw error;
}
```

## Performance Profiling

### Simple Timing
```typescript
function withTiming<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = process.hrtime.bigint();

  return fn().finally(() => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    console.error(`TIMING ${name}: ${durationMs.toFixed(2)}ms`);
  });
}

// Usage
const result = await withTiming("api_call", () => apiRequest("/endpoint"));
```

### Memory Monitoring
```typescript
function logMemory() {
  const usage = process.memoryUsage();
  console.error("MEMORY:", {
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
  });
}

// Log periodically
setInterval(logMemory, 60000);
```

## Common Issues and Solutions

### Issue: Server Hangs on Startup
**Cause**: Blocking initialization (missing await, sync I/O)
**Solution**: Ensure all initialization is async
```typescript
// ❌ Bad
const config = fs.readFileSync("config.json");  // Blocks

// ✅ Good
const config = await fs.promises.readFile("config.json");
```

### Issue: Memory Leaks
**Cause**: Unbounded caches, event listener accumulation
**Solution**: Set limits, cleanup old entries
```typescript
// Add TTL and max size to caches
class BoundedCache<T> {
  private store = new Map<string, { value: T; expires: number }>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttlMs: number) {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
    }
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }
}
```

### Issue: Rate Limit Errors from API
**Cause**: Not respecting Retry-After header
**Solution**: Parse and respect rate limit headers
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After");
  const waitMs = retryAfter
    ? parseInt(retryAfter) * 1000
    : 60000;  // Default 1 minute

  console.error(`Rate limited, waiting ${waitMs}ms`);
  await new Promise(r => setTimeout(r, waitMs));
  // Retry...
}
```

### Issue: Timeout Errors
**Cause**: No timeout on external requests
**Solution**: Always set timeouts
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```
