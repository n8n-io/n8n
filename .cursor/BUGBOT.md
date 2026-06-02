# BugBot Rules for n8n

TypeScript pnpm monorepo. Top-level packages live in `packages/`: `cli/`, `core/`, `frontend/`, `nodes-base/`, `workflow/`, `node-dev/`, `extensions/`, `testing/`, and `@n8n/`.

Humans maintain `README.md`, `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md`. BugBot only sees this file. Do not re-derive guidance from those files.

## Package map

Use this to locate the "nearest relevant module" when flagging changes or missing tests.

- `packages/cli/`         server, REST API, CLI entrypoints
- `packages/core/`        execution engine, credentials, secrets
- `packages/workflow/`    workflow type definitions, expression engine
- `packages/nodes-base/`  built-in nodes (integrations)
- `packages/frontend/`    editor UI (Vue)
- `packages/@n8n/`        internal scoped packages
- `packages/node-dev/`    node SDK tooling
- `packages/extensions/`  extension API
- `packages/testing/`     shared test helpers
- `docker/`               container builds
- `scripts/`              repo automation

## Documentation-only and ignored-path pull requests

When a PR changes **only** the paths below and nothing else (no `.ts`, `.tsx`, `.vue`, `.json` config, Dockerfile, or build script):

- `**/*.md`, `LICENSE*`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`
- `assets/**`
- `**/.gitignore`, `**/.gitattributes`

Then:

- Leave **no** review comments and raise **no** blocking findings.
- Do not suggest running pnpm, jest, or build commands.
- Exception: if a changed file embeds secrets, credentials, tokens, or unsafe operational instructions, report that single issue only.

Mixed PRs (ignored paths plus any other path) are reviewed normally, but only comment on the non-ignored paths.

## Do not report (wastes tokens; existing tooling covers)

- Formatting, import order, naming nits, or "run Biome / ESLint".
- Findings that `tsc`, Biome, ESLint, or Jest already catch (style, common bugs, type errors, coverage).
- Style or wording on `*.md` files unless the security exception above applies.
- `node_modules/`, `dist/`, or other generated paths.

## Comment style

One paragraph maximum per finding. Name the file and line. Propose a fix or ask one specific question. Do not hedge with multiple alternative interpretations.

---

## Rule: LLM Model Defaults Must Not Use Opus-Class Models

**Rule**: Product code, demo code, config, env defaults, and test env fixtures must not set an Anthropic Opus-class model ID as a default.

### Problem

Opus-class models are significantly more expensive than Sonnet-class models. Setting them as defaults silently inflates customer bills and inference costs.

### Solution

Use `claude-sonnet-4-6` by default. Allow Opus only behind an explicit opt-in (config flag, environment variable, or per-request override) and document the approval.

```ts
// ❌ BAD: Opus set as a default in product code
class AnalystAgent {
  private analystModel: string = 'claude-opus-4-1';
}

// ✅ GOOD: Sonnet default, Opus available behind an approved override
class AnalystAgent {
  private analystModel: string = 'claude-sonnet-4-6';
  constructor(modelOverride?: string) {
    if (modelOverride) {
      this.analystModel = modelOverride; // caller is accountable for Opus opt-in
    }
  }
}

// ✅ GOOD: documented one-off approval
// opus-approved: https://example.atlassian.net/browse/N8N-1234
const HEAVY_REASONING_MODEL = 'claude-opus-4-1';
```

### When to Flag

- Any changed hunk containing a string that matches `/claude[^'"\n]*opus/i` and represents a default model selection in product, demo, config, or env paths
- The match has no adjacent `opus-approved: <URL>` comment in the same hunk and no link to the approval in the PR description

Add a blocking Bug titled **"Use Sonnet-class model by default"** with the body:

> Opus-class models should not be defaults in n8n product or demo paths. Use `claude-sonnet-4-6` unless an Opus run was explicitly approved.

Suggest replacing the Opus model ID with `claude-sonnet-4-6`.

### Exceptions

- Model-picker tests that enumerate available models
- Telemetry samples and mock fixtures that reference Opus as a non-default example
- Documentation files (`*.md`)
- This `BUGBOT.md` file
- Hunks with an adjacent `opus-approved: <URL>` comment and a linked approval in the PR description

---

## Rule: Credentials and Secrets Must Not Be Logged in Plain Text

**Rule**: Credential values, API keys, OAuth tokens, and other secrets must not appear in `console.log`, `Logger`, error messages, or telemetry payloads.

### Problem

n8n stores customer credentials across many third-party services. Logging them in plain text exposes them in log aggregation, error reporting, and shared diagnostic bundles.

### Solution

```ts
// ❌ BAD: token in log line
this.logger.info(`Calling API with token ${credentials.apiKey}`);

// ❌ BAD: token in thrown error
throw new Error(`Auth failed with token ${credentials.apiKey}`);

// ✅ GOOD: log only metadata
this.logger.info('Calling API', { hasApiKey: Boolean(credentials.apiKey) });

// ✅ GOOD: redact in error
throw new Error('Auth failed: invalid API key');
```

### When to Flag

- Log, error, or telemetry call that interpolates a value read from `credentials.*`, `oauthTokenData.*`, `process.env.*` for secret-shaped names, or a header value
- Stringification of an object that contains a known credential property without a redaction step

### Exceptions

- Test fixtures with obviously fake values (e.g., `"test-key"`, `"xxx"`)
- Logging of last-4 characters or a SHA-256 hash of the value, where this is the explicit intent

---

## Rule: Node Execution Errors Must Use NodeOperationError or NodeApiError

**Rule**: Errors thrown from a node's `execute()` or `poll()` must be `NodeOperationError` or `NodeApiError`, not raw `Error`.

### Problem

Raw `Error` instances bypass n8n's structured error handling. The user-facing UI cannot show actionable messages, continue-on-fail does not work correctly, and error reporting loses node context.

### Solution

```ts
// ❌ BAD: raw Error loses node context
throw new Error('Invalid input: expected an array');

// ✅ GOOD: NodeOperationError for input/config issues
throw new NodeOperationError(this.getNode(), 'Invalid input: expected an array', {
  itemIndex,
});

// ✅ GOOD: NodeApiError for third-party API failures
throw new NodeApiError(this.getNode(), response as JsonObject);
```

### When to Flag

- `throw new Error(...)` inside an `execute`, `poll`, or `trigger` method in `packages/nodes-base/` or any node definition
- Catch block that rethrows a generic `Error` instead of wrapping in a node-aware error

### Exceptions

- Errors thrown by shared utility functions outside the node API surface
- Errors caught and explicitly converted at the node boundary

---

## Extra scrutiny

- `packages/cli/src/` REST endpoints: authn, authz, and input validation.
- `packages/core/src/Credentials` and any code that reads or persists credentials.
- `packages/nodes-base/credentials/` definitions.
- `docker/` and `Dockerfile` changes that affect runtime, ports, or user permissions.
- Migration files under `packages/cli/src/databases/migrations/`.

## Focus areas (high value)

- **Correctness** in workflow execution, especially around retries, partial failures, and continue-on-fail.
- **Security**: credential handling, secret logging, SSRF in node HTTP requests, injection in expression evaluation.
- **Performance**: unbounded loops over workflow items, synchronous IO in hot paths.
- **API compatibility**: breaking changes to public node interfaces or workflow schema.
- **Migrations**: missing rollback, destructive operations without a feature flag.

Good findings name a concrete file, the affected user behavior, and a one-line fix or a specific question.
