# @n8n/expression-runtime

Secure, isolated expression evaluation runtime for n8n workflows.

## Status

⚠️ **This package is under active development.**

Currently implemented:
- ✅ TypeScript interfaces and architecture design
- ✅ Core architecture documentation

Coming soon:
- 🚧 Runtime implementation (Phase 1.1)
- 🚧 IsolatedVmBridge (Phase 1.1)
- 🚧 Web Worker support (Phase 2+)

## Overview

This package provides a robust, environment-agnostic runtime for evaluating expressions in isolated contexts. It supports multiple execution environments:

- **Node.js Backend**: Uses `isolated-vm` for V8 isolate-based isolation with lazy data loading
- **Browser Frontend**: Uses Web Workers for browser-based isolation (Phase 2, no lazy loading initially)
- **Task Runners**: Uses IPC for separate process isolation

## Features

- 🔒 **Secure**: Expressions run in isolated contexts with memory limits and timeouts
- 🚀 **Performant**: Lazy data loading and code caching minimize overhead
- 📊 **Observable**: Built-in metrics, traces, and logs
- 🌐 **Universal**: Works in Node.js, browsers, and separate processes
- 🧪 **Testable**: Fast testing with NodeVmBridge (no native dependencies)

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

// Evaluate expression
const result = await evaluator.evaluate(
  '{{ $json.user.email }}',
  {
    json: {
      user: { email: 'test@example.com' }
    }
  }
);

console.log(result); // "test@example.com"

// Clean up
await evaluator.dispose();
```

### With Observability

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

### With Tournament (Security)

```typescript
import { Tournament } from '@n8n/tournament';

const tournament = new Tournament();

const evaluator = new ExpressionEvaluator({
  bridge,
  tournament,
});
```

## API

### ExpressionEvaluator

Main class for expression evaluation.

```typescript
class ExpressionEvaluator {
  constructor(config: EvaluatorConfig);
  initialize(): Promise<void>;
  evaluate(expression: string, data: WorkflowData, options?: EvaluateOptions): Promise<unknown>;
  dispose(): Promise<void>;
  isDisposed(): boolean;
}
```

### RuntimeBridge

Abstract interface for bridge implementations.

```typescript
interface RuntimeBridge {
  initialize(): Promise<void>;
  execute(code: string, dataId: string): Promise<unknown>;
  getData(dataId: string, path: string): Promise<unknown>;
  dispose(): Promise<void>;
  isDisposed(): boolean;
}
```

### Bridge Implementations

- **IsolatedVmBridge**: For Node.js backend (isolated-vm)
- **WebWorkerBridge**: For browser frontend (Web Workers)
- **TaskRunnerBridge**: For separate processes (IPC)
- **NodeVmBridge**: For testing (Node.js vm module)

## Configuration

```typescript
interface EvaluatorConfig {
  bridge: RuntimeBridge;
  observability?: ObservabilityProvider;
  tournament?: TournamentInstance;
  enableCodeCache?: boolean;   // Default: true (caches transformed code)
  maxCodeCacheSize?: number;   // Default: 1000
}

interface BridgeConfig {
  memoryLimit?: number;        // Default: 128 MB
  timeout?: number;            // Default: 5000 ms
  debug?: boolean;             // Default: false
}
```

## Environment Variables

```bash
# Bridge configuration
N8N_EXPRESSION_MEMORY_LIMIT_MB=128
N8N_EXPRESSION_TIMEOUT_MS=5000
N8N_EXPRESSION_DEBUG=false

# Code cache (caches transformed code, not results)
N8N_EXPRESSION_CODE_CACHE_ENABLED=true
N8N_EXPRESSION_CODE_CACHE_MAX_SIZE=1000

# Observability
N8N_EXPRESSION_OBSERVABILITY_ENABLED=true
N8N_EXPRESSION_METRICS_ENABLED=true
N8N_EXPRESSION_TRACES_ENABLED=true
N8N_EXPRESSION_TRACE_SAMPLE_RATE=0.01
```

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
import { ExpressionEvaluator, NodeVmBridge } from '@n8n/expression-runtime';

describe('ExpressionEvaluator', () => {
  it('evaluates simple expression', async () => {
    const bridge = new NodeVmBridge();
    const evaluator = new ExpressionEvaluator({ bridge });

    await evaluator.initialize();

    const result = await evaluator.evaluate('{{ 1 + 1 }}', {});
    expect(result).toBe(2);

    await evaluator.dispose();
  });
});
```

## Performance

The runtime uses several optimizations:

- **Lazy Loading**: Only fetch data fields that expressions actually access
- **Code Caching**: Cache transformed expressions to avoid re-transformation
- **Efficient Serialization**: Minimize data transfer between host and isolation

Typical overhead: 24-46% compared to unsafe eval (measured with 99.6% compatibility).

## Security

The runtime enforces strict security:

- ✅ Memory limits (default: 128MB)
- ✅ Execution timeouts (default: 5s)
- ✅ No access to Node.js APIs in isolation
- ✅ AST transformation via Tournament
- ✅ Security validation before execution

## Contributing

See the main n8n repository for contribution guidelines.

## License

See [LICENSE.md](../../LICENSE.md) in the n8n repository root.

## Related

- [n8n workflow package](../workflow/)
- [Tournament](../../packages/@n8n/tournament/)
- [isolated-vm](https://github.com/laverdet/isolated-vm)
