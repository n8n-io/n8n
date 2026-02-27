# @n8n/expression-runtime

Secure, isolated expression evaluation runtime for n8n workflows.

## Status

**In progress — landing as a series of incremental PRs.**

Implemented so far:
- ✅ TypeScript interfaces and architecture design (PR 1)
- ✅ Core architecture documentation (PR 1)
- ✅ Runtime bundle: extension functions, deep lazy proxy system (PR 2)
- ✅ `IsolatedVmBridge`: V8 isolate management via `isolated-vm` (PR 3)

Coming in later PRs:
- 🚧 `ExpressionEvaluator`: tournament integration, expression code caching (PR 4)
- 🚧 Integration tests (PR 4)
- 🚧 Workflow integration behind `N8N_EXPRESSION_ENGINE=vm` flag (PR 5)
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
- 📊 **Observable**: Built-in metrics, traces, and logs support (interfaces defined; providers coming later)
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

// Create bridge
const bridge = new IsolatedVmBridge({
  memoryLimit: 128,
  timeout: 5000,
});

// Create evaluator
const evaluator = new ExpressionEvaluator({
  bridge,
});

// Initialize
await evaluator.initialize();

// Evaluate expression using {{ }} template syntax
const result = evaluator.evaluate(
  '{{ $json.user.email }}',
  {
    $json: {
      user: { email: 'test@example.com' }
    }
  }
);

console.log(result); // "test@example.com"

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

const bridge = new IsolatedVmBridge({ timeout: 5000 });
const evaluator = new ExpressionEvaluator({
  bridge,
  hooks: {
    before: [ThisSanitizer],
    after: [PrototypeSanitizer, DollarSignValidator],
  },
});

await evaluator.initialize();
```

When `hooks` is omitted the evaluator still runs tournament transformation (template parsing, `this` binding) but without AST security validation — suitable for development and testing.

### With Observability (Not Yet Implemented)

```typescript
import { OpenTelemetryProvider } from '@n8n/expression-runtime/observability';

const observability = new OpenTelemetryProvider({
  serviceName: 'n8n-expressions',
});

const evaluator = new ExpressionEvaluator({
  bridge,
  observability,
});
```

**Note**: Observability providers are not yet implemented. The `ObservabilityProvider` interface exists but no implementations are available yet.

## API

### ExpressionEvaluator

Main class for expression evaluation.

```typescript
class ExpressionEvaluator {
  constructor(config: EvaluatorConfig);
  initialize(): Promise<void>;
  evaluate(expression: string, data: WorkflowData, options?: EvaluateOptions): unknown;
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
  bridge: RuntimeBridge;                   // required
  observability?: ObservabilityProvider;   // optional - interfaces defined, providers not yet implemented
  hooks?: TournamentHooks;                 // optional - AST security hooks for tournament (PR 4)
}

interface BridgeConfig {
  memoryLimit?: number;        // Default: 128 MB
  timeout?: number;            // Default: 5000 ms
  debug?: boolean;             // Default: false
}
```

## Environment Variables (Not Yet Implemented)

```bash
# Bridge configuration (not yet implemented)
N8N_EXPRESSION_MEMORY_LIMIT_MB=128
N8N_EXPRESSION_TIMEOUT_MS=5000
N8N_EXPRESSION_DEBUG=false

# Code cache (not yet implemented - caches transformed code, not results)
N8N_EXPRESSION_CODE_CACHE_ENABLED=true
N8N_EXPRESSION_CODE_CACHE_MAX_SIZE=1000

# Observability (not yet implemented)
N8N_EXPRESSION_OBSERVABILITY_ENABLED=true
N8N_EXPRESSION_METRICS_ENABLED=true
N8N_EXPRESSION_TRACES_ENABLED=true
N8N_EXPRESSION_TRACE_SAMPLE_RATE=0.01
```

**Note**: Currently, configuration is passed via constructor options. Environment variable support will be added in future phases.

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
    const bridge = new IsolatedVmBridge({ timeout: 5000 });
    const evaluator = new ExpressionEvaluator({ bridge });

    await evaluator.initialize();

    const result = evaluator.evaluate('{{ $json.value }}', { $json: { value: 42 } });
    expect(result).toBe(42);

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

See [LICENSE.md](../../LICENSE.md) in the n8n repository root.

## Related

- [n8n workflow package](../workflow/)
- [isolated-vm](https://github.com/laverdet/isolated-vm)
- [@n8n/tournament](https://github.com/n8n-io/tournament)
