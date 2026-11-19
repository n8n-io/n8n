# MCP Security Hardening Guide

## Security Checklist

Before deploying any MCP server, verify:

```
INPUT VALIDATION
├── [ ] All inputs validated with schema (Zod/JSON Schema)
├── [ ] String lengths limited
├── [ ] Numeric ranges constrained
├── [ ] Regex patterns for format validation
├── [ ] No SQL/command injection vectors
└── [ ] Arrays have max length limits

AUTHENTICATION & AUTHORIZATION
├── [ ] Credentials in environment variables only
├── [ ] Secrets never logged or returned in errors
├── [ ] API keys rotated regularly
├── [ ] Minimum required permissions
└── [ ] Token validation on every request

RATE LIMITING
├── [ ] Per-user rate limits
├── [ ] Per-tool rate limits
├── [ ] Global rate limits
├── [ ] Graceful degradation on limit
└── [ ] Rate limit headers in responses

ERROR HANDLING
├── [ ] No stack traces in production
├── [ ] Sensitive data sanitized from errors
├── [ ] Generic errors for auth failures
├── [ ] Structured error responses
└── [ ] All errors logged securely

NETWORK SECURITY
├── [ ] HTTPS for all external calls
├── [ ] Certificate validation enabled
├── [ ] Timeouts on all requests
├── [ ] No SSRF vulnerabilities
└── [ ] IP allowlisting where appropriate
```

## Input Validation Patterns

### Using Zod (Recommended)
```typescript
import { z } from "zod";

// Define strict schemas
const UserQuerySchema = z.object({
  userId: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid userId format"),

  query: z.string()
    .max(10000)
    .refine(
      (q) => !containsSqlInjection(q),
      { message: "Invalid query content" }
    ),

  options: z.object({
    limit: z.number().int().min(1).max(1000).default(100),
    offset: z.number().int().min(0).default(0),
    sortBy: z.enum(["created", "updated", "name"]).default("created"),
  }).optional(),
});

// Validate in handler
async function handleUserQuery(args: unknown) {
  const validated = UserQuerySchema.parse(args);
  // Safe to use validated.userId, validated.query, etc.
}
```

### SQL Injection Prevention
```typescript
// ✅ Good: Parameterized queries
const result = await pool.query(
  "SELECT * FROM users WHERE id = $1 AND status = $2",
  [userId, status]
);

// ✅ Good: Query builder with escaping
const users = await knex("users")
  .where({ id: userId, status })
  .select("*");

// ❌ BAD: String concatenation
const result = await pool.query(
  `SELECT * FROM users WHERE id = '${userId}'`  // SQL INJECTION!
);
```

### Command Injection Prevention
```typescript
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ✅ Good: execFile with array arguments
async function runGitCommand(args: string[]) {
  // Validate args don't contain shell metacharacters
  for (const arg of args) {
    if (/[;&|`$]/.test(arg)) {
      throw new Error("Invalid characters in argument");
    }
  }

  const { stdout } = await execFileAsync("git", args);
  return stdout;
}

// ❌ BAD: exec with string
import { exec } from "child_process";
exec(`git ${userInput}`);  // COMMAND INJECTION!
```

### Path Traversal Prevention
```typescript
import path from "path";

function safePath(basePath: string, userPath: string): string {
  const resolved = path.resolve(basePath, userPath);

  // Ensure resolved path is within base
  if (!resolved.startsWith(path.resolve(basePath))) {
    throw new Error("Path traversal attempt detected");
  }

  return resolved;
}

// Usage
const filePath = safePath("/app/data", userSuppliedPath);
await fs.readFile(filePath);
```

## Secret Management

### Environment Variables (Minimum)
```typescript
// config.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export const CONFIG = {
  apiKey: requireEnv("SERVICE_API_KEY"),
  dbUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
};
```

### Secret Manager Integration
```typescript
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();

async function getSecret(name: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/my-project/secrets/${name}/versions/latest`,
  });

  return version.payload?.data?.toString() || "";
}

// Cache secrets on startup
let cachedSecrets: Record<string, string> = {};

async function initializeSecrets(): Promise<void> {
  const secretNames = ["API_KEY", "DB_PASSWORD", "JWT_SECRET"];

  const results = await Promise.all(
    secretNames.map(async (name) => [name, await getSecret(name)])
  );

  cachedSecrets = Object.fromEntries(results);
}
```

### Secret Rotation
```typescript
class RotatingSecret {
  private currentSecret: string;
  private previousSecret: string | null = null;
  private rotationInterval: NodeJS.Timeout;

  constructor(
    private fetchSecret: () => Promise<string>,
    rotationMs: number = 3600000  // 1 hour
  ) {
    this.rotationInterval = setInterval(() => this.rotate(), rotationMs);
  }

  async initialize(): Promise<void> {
    this.currentSecret = await this.fetchSecret();
  }

  private async rotate(): Promise<void> {
    this.previousSecret = this.currentSecret;
    this.currentSecret = await this.fetchSecret();

    // Keep previous valid for grace period
    setTimeout(() => {
      this.previousSecret = null;
    }, 60000);  // 1 minute grace
  }

  validate(token: string): boolean {
    return token === this.currentSecret ||
           (this.previousSecret && token === this.previousSecret);
  }
}
```

## Rate Limiting Implementation

### Token Bucket Algorithm
```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number  // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// Per-user buckets
const userBuckets = new Map<string, TokenBucket>();

function getRateLimiter(userId: string): TokenBucket {
  if (!userBuckets.has(userId)) {
    userBuckets.set(userId, new TokenBucket(100, 10));  // 100 capacity, 10/sec
  }
  return userBuckets.get(userId)!;
}
```

### Sliding Window Counter
```typescript
class SlidingWindowCounter {
  private windows: Map<string, Map<number, number>> = new Map();

  constructor(
    private windowSizeMs: number,
    private limit: number
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowSizeMs) * this.windowSizeMs;
    const prevWindowStart = windowStart - this.windowSizeMs;

    let keyWindows = this.windows.get(key);
    if (!keyWindows) {
      keyWindows = new Map();
      this.windows.set(key, keyWindows);
    }

    // Get counts
    const currentCount = keyWindows.get(windowStart) || 0;
    const prevCount = keyWindows.get(prevWindowStart) || 0;

    // Weight previous window by overlap
    const prevWeight = (this.windowSizeMs - (now - windowStart)) / this.windowSizeMs;
    const totalCount = currentCount + Math.floor(prevCount * prevWeight);

    if (totalCount >= this.limit) {
      return false;
    }

    // Increment current window
    keyWindows.set(windowStart, currentCount + 1);

    // Cleanup old windows
    for (const [windowTime] of keyWindows) {
      if (windowTime < prevWindowStart) {
        keyWindows.delete(windowTime);
      }
    }

    return true;
  }
}
```

## OWASP Top 10 Mitigations

### A01: Broken Access Control
```typescript
// Verify permissions on every request
async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const permissions = await getPermissions(userId);
  return permissions.includes(`${resource}:${action}`);
}

// In handler
if (!await checkPermission(userId, "documents", "read")) {
  throw new McpError(ErrorCode.InvalidRequest, "Access denied");
}
```

### A02: Cryptographic Failures
```typescript
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// ✅ Good: Use strong hashing
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

// ✅ Good: Timing-safe comparison
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedHash = await scryptAsync(password, salt, 64) as Buffer;
  return timingSafeEqual(hashBuffer, suppliedHash);
}

// ❌ BAD: Weak algorithms
import { createHash } from "crypto";
createHash("md5").update(password).digest("hex");  // INSECURE!
```

### A03: Injection
See SQL and Command Injection sections above.

### A05: Security Misconfiguration
```typescript
// Validate all configuration
function validateConfig(config: Config): void {
  // No default credentials
  if (config.adminPassword === "admin") {
    throw new Error("Default admin password detected");
  }

  // HTTPS required in production
  if (config.nodeEnv === "production" && !config.apiUrl.startsWith("https")) {
    throw new Error("HTTPS required in production");
  }

  // Debug mode off in production
  if (config.nodeEnv === "production" && config.debug) {
    throw new Error("Debug mode must be off in production");
  }
}
```

### A10: Server-Side Request Forgery (SSRF)
```typescript
import { URL } from "url";
import dns from "dns/promises";

const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^0\./,
];

async function safeFetch(urlString: string): Promise<Response> {
  const url = new URL(urlString);

  // Only allow HTTPS
  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS URLs allowed");
  }

  // Resolve hostname and check for private IPs
  const addresses = await dns.resolve4(url.hostname);
  for (const addr of addresses) {
    if (PRIVATE_RANGES.some(r => r.test(addr))) {
      throw new Error("Private IP addresses not allowed");
    }
  }

  // Allow-list domains if possible
  const allowedDomains = ["api.example.com", "service.example.org"];
  if (!allowedDomains.includes(url.hostname)) {
    throw new Error("Domain not in allow list");
  }

  return fetch(urlString);
}
```

## Error Handling Security

### Sanitize Error Messages
```typescript
class SecureError extends Error {
  constructor(
    public userMessage: string,
    public internalMessage: string,
    public code: string
  ) {
    super(internalMessage);
  }
}

function handleError(error: unknown): McpError {
  // Log full error internally
  console.error("Internal error:", error);

  // Return safe message to user
  if (error instanceof SecureError) {
    return new McpError(ErrorCode.InternalError, error.userMessage);
  }

  if (error instanceof z.ZodError) {
    return new McpError(
      ErrorCode.InvalidParams,
      "Invalid input parameters"  // Don't expose field names
    );
  }

  // Generic error for unexpected cases
  return new McpError(
    ErrorCode.InternalError,
    "An unexpected error occurred"
  );
}
```

### Secure Logging
```typescript
// Redact sensitive fields
function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ["password", "token", "apiKey", "secret", "authorization"];
  const redacted = { ...obj };

  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = "[REDACTED]";
    }
  }

  return redacted;
}

// Usage
logger.info({ args: redactSensitive(args) }, "Tool called");
```
