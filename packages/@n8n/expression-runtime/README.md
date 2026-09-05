# @n8n/expression-runtime

Secure, isolated expression evaluation runtime for n8n workflows.

## Status

**Shipped — the `vm` engine is n8n's default expression engine.**

- ✅ TypeScript interfaces and architecture design
- ✅ Runtime bundle: extension functions, deep lazy proxy system
- ✅ `IsolatedVmBridge`: V8 isolate management via `isolated-vm`
- ✅ `ExpressionEvaluator`: tournament integration, expression code caching, isolate pooling
- ✅ Workflow integration — default engine; `N8N_EXPRESSION_ENGINE=legacy` opts out
- ✅ Observability (metrics, traces, logs) wired up in `packages/cli`

Coming later:
- 🚧 Web Worker support (Phase 2+)
- 🚧 Performance optimizations (Phase 3)

## Overview

This package provides a secure runtime for evaluating expressions in isolated contexts.

Currently supports:
- **Node.js Backend**: Uses `isolated-vm` for V8 isolate-based isolation with lazy data loading

Future support (Phase 2+):
- **Browser Frontend**: Will use Web Workers for browser-based isolation
- **Task Runners**: Will use IPC for separate process isolation

## Features

- 🔒 **Secure**: Expressions run in isolated V8 contexts with memory limits (128MB) and timeouts (5s)
- 🚀 **Performant**: Lazy data loading via proxies, script compilation caching, and expression code caching
- 📊 **Observable**: Built-in metrics, traces, and logs support via `ObservabilityProvider`
- 🌐 **Universal**: Works in Node.js backend (browsers and task runners in Phase 2+)
- 🛡️ **AST Security**: Tournament AST hooks (`ThisSanitizer`, `PrototypeSanitizer`, `DollarSignValidator`) validate expressions before execution

## Architecture

The runtime uses a three-layer architecture:

1. **Runtime** (Layer 1): Runs inside isolated context, provides expression execution environment
2. **Bridge** (Layer 2): Manages communication between host and isolated context
3. **Evaluator** (Layer 3): Public API with Tournament integration and observability

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design documentation.

## Installation

```bash
pnpm add @n8n/expression-runtime
```

## Usage

### Basic Example

```typescript
import { ExpressionEvaluator, IsolatedVmBridge } from '@n8n/expression-runtime';

// Create evaluator with a bridge factory (bridges are pooled)
const evaluator = new ExpressionEvaluator({
  createBridge: () => new IsolatedVmBridge({ memoryLimit: 128, timeout: 5000 }),
  maxCodeCacheSize: 1024,
});

// Initialize
await evaluator.initialize();

// Acquire an isolate for a caller, evaluate, release
const caller = {};
await evaluator.acquire(caller);

const result = evaluator.evaluate(
  '{{ $json.user.email }}',
  {
    $json: {
      user: { email: 'test@example.com' }
    }
  },
  caller,
);

console.log(result); // "test@example.com"

await evaluator.release(caller);

// Clean up
await evaluator.dispose();
```

### With Security Hooks (Production)

Pass AST security hooks from `expression-sandboxing.ts` to enable full security validation. This is the pattern used by the workflow package:

```typescript
import { ExpressionEvaluator, IsolatedVmBridge } from '@n8n/expression-runtime';
import {
  ThisSanitizer,
  PrototypeSanitizer,
  DollarSignValidator,
} from 'n8n-workflow/expression-sandboxing';

const evaluator = new ExpressionEvaluator({
  createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
  maxCodeCacheSize: 1024,
  hooks: {
    before: [ThisSanitizer],
    after: [PrototypeSanitizer, DollarSignValidator],
  },
});

await evaluator.initialize();
```

When `hooks` is omitted the evaluator still runs tournament transformation (template parsing, `this` binding) but without AST security validation — suitable for development and testing.

### With Observability

Pass an `ObservabilityProvider` implementation to emit metrics, traces, and logs for evaluations:

```typescript
const evaluator = new ExpressionEvaluator({
  createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
  maxCodeCacheSize: 1024,
  observability,
});
```

This package defines the `ObservabilityProvider` interface; the production implementation lives in `packages/cli/src/expression-observability/expression-observability.provider.ts` and is wired up during backend startup. It is controlled via the `N8N_EXPRESSION_ENGINE_OBSERVABILITY_*` and `N8N_EXPRESSION_ENGINE_TRACES_*` environment variables (see below).

## API

### ExpressionEvaluator

Main class for expression evaluation.

```typescript
class ExpressionEvaluator {
  constructor(config: EvaluatorConfig);
  initialize(): Promise<void>;
  acquire(owner: object): Promise<boolean>;
  evaluate(expression: string, data: WorkflowData, caller: object, options?: EvaluateOptions): unknown;
  release(owner: object): Promise<void>;
  dispose(): Promise<void>;
  isDisposed(): boolean;
}
```

### RuntimeBridge

Abstract interface for bridge implementations.

```typescript
interface RuntimeBridge {
  initialize(): Promise<void>;
  execute(code: string, data: Record<string, unknown>): unknown;
  dispose(): Promise<void>;
  isDisposed(): boolean;
}
```

### Bridge Implementations

- **IsolatedVmBridge**: ✅ For Node.js backend (isolated-vm with V8 isolates)
  - Memory isolation with hard 128MB limit
  - Timeout enforcement (5s default)
  - Deep lazy proxy system for workflow data
  - Synchronous callbacks via ivm.Reference
  - Security wrappers (SafeObject, SafeError)
  - `E()` error handler for tournament-generated try-catch code
- **WebWorkerBridge**: 🚧 For browser frontend (Web Workers) - Phase 2+
- **Task Runner Integration**: 🚧 TBD - May use IsolatedVmBridge locally or direct evaluation - Phase 2+

## Configuration

```typescript
interface EvaluatorConfig {
  createBridge: () => RuntimeBridge;       // required - factory, bridges are pooled
  maxCodeCacheSize: number;                // required - LRU size for tournament-transformed code
  observability?: ObservabilityProvider;   // optional - metrics/traces/logs provider
  hooks?: TournamentHooks;                 // optional - AST security hooks for tournament
  poolSize?: number;                       // optional - pre-warmed bridges, default 1
  idleTimeoutMs?: number;                  // optional - scale pool to 0 after idle period
  logger?: Logger;                         // optional - falls back to no-op
}
```

## Environment Variables

In n8n, the evaluator is configured via `ExpressionEngineConfig` (`@n8n/config`):

```bash
# Engine selection ('vm' is the default; 'legacy' opts out of isolation)
N8N_EXPRESSION_ENGINE=vm

# Isolate pool and code cache
N8N_EXPRESSION_ENGINE_POOL_SIZE=1
N8N_EXPRESSION_ENGINE_MAX_CODE_CACHE_SIZE=1024
N8N_EXPRESSION_ENGINE_IDLE_TIMEOUT=       # seconds; unset = pool never scales to 0

# Bridge limits
N8N_EXPRESSION_ENGINE_TIMEOUT=5000        # ms; positive integer
N8N_EXPRESSION_ENGINE_MEMORY_LIMIT=128    # MB; minimum 8

# Observability
N8N_EXPRESSION_ENGINE_OBSERVABILITY_ENABLED=true
N8N_EXPRESSION_ENGINE_TRACES_ENABLED=true
N8N_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS=50
N8N_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE=0.0
```

See `packages/@n8n/config/src/configs/expression-engine.config.ts` for the authoritative list and defaults.

## Development

```bash
# Install dependencies
pnpm install

# Build package
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Testing

The package uses vitest for fast, isolated testing:

```typescript
import { ExpressionEvaluator, IsolatedVmBridge } from '@n8n/expression-runtime';

describe('ExpressionEvaluator', () => {
  it('evaluates simple expression', async () => {
    const evaluator = new ExpressionEvaluator({
      createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
      maxCodeCacheSize: 1024,
    });

    await evaluator.initialize();

    const caller = {};
    await evaluator.acquire(caller);
    const result = evaluator.evaluate('{{ $json.value }}', { $json: { value: 42 } }, caller);
    expect(result).toBe(42);
    await evaluator.release(caller);

    await evaluator.dispose();
  });
});
```

Run tests:
```bash
pnpm test                # Run all tests
pnpm test integration    # Run integration tests only
```

## Performance

The runtime uses several optimizations (implemented in PRs 2–4):

- **Lazy Loading**: Only fetch data fields that expressions actually access via proxy traps
- **Script Compilation Caching**: Compiled scripts are cached to avoid recompilation
- **Metadata-Driven**: Only structure (keys, lengths) transferred across isolate boundary, not full data
- **Expression Code Caching**: Tournament-transformed code is cached per evaluator instance (same expressions repeat within a workflow, so cache hit rate is high in practice)

Performance characteristics:
- Arrays: Always lazy-loaded — only length transferred, elements fetched on demand
- Objects: Always lazy-loaded — only keys transferred, values fetched on demand

## Security

The runtime enforces strict security at multiple layers (implemented in PRs 2–4):

- **Memory limits**: Hard 128MB limit via isolated-vm (configurable)
- **Execution timeouts**: 5s default timeout (configurable)
- **Complete isolation**: No access to Node.js APIs (require, fs, process, etc.)
- **Security wrappers**: SafeObject and SafeError prevent dangerous method access
- **Native function blocking**: Prevents access to native code
- **AST transforms**: `ThisSanitizer` rewrites `$json` → `this.$json`; `PrototypeSanitizer` wraps computed property access in `this.__sanitize(key)` to block prototype chain attacks; `DollarSignValidator` enforces correct `$`-variable usage
- **Runtime sanitizer**: `__sanitize()` inside the isolate blocks access to `__proto__`, `constructor`, `prototype`, and other dangerous properties at runtime

Future security features (Phase 2+):
- 🚧 Additional sandboxing for browser environments

## Contributing

See the main n8n repository for contribution guidelines.

## License

See [LICENSE.md](../../../LICENSE.md) in the n8n repository root.

## Related

- [n8n workflow package](../workflow/)
- [isolated-vm](https://github.com/laverdet/isolated-vm)
- [@n8n/tournament](https://github.com/n8n-io/tournament)
