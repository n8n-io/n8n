# intento-core

Core functionality for the Intento extension for n8n. This package provides foundational abstractions and utilities for building robust, observable, and retry-capable data suppliers within n8n workflows.

## Overview

`intento-core` offers:

- **Supply Chain Pattern**: Abstract base classes for request/response/error handling with built-in retry logic
- **Execution Context**: Configurable retry strategies, timeouts, and delays with n8n UI integration
- **Distributed Tracing**: Automatic request correlation across workflow nodes with structured logging
- **Type-Safe Utilities**: Pipeline data access, delay helpers, and context factories

## Key Features

### 🔄 Supplier Pattern

The `SupplierBase` class provides a standardized approach to data supply operations with:

- Exponential backoff retries
- Automatic request cloning per attempt
- Full integration with n8n's execution tracking
- Graceful error handling with detailed context

```typescript
import { SupplierBase, SupplyRequestBase, SupplyResponseBase, SupplyErrorBase } from 'intento-core';

class TranslationSupplier extends SupplierBase<TranslationRequest, TranslationResponse, TranslationError> {
  protected async supply(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | TranslationError> {
    const response = await this.api.translate(request.text, request.from, request.to, signal);
    if (response.ok) return new TranslationResponse(request, response.data);
    return new TranslationError(request, response.status, response.message);
  }
}
```

### 🎯 Execution Context

Configure retry behavior, timeouts, and delays through n8n UI parameters:

```typescript
import { ExecutionContext } from 'intento-core';

const context = new ExecutionContext(functions, 0);
// Access validated configuration:
// - max_attempts: 1-50 (default: 5)
// - max_delay_ms: 100-60000ms (default: 5000)
// - max_jitter: 0.1-0.9 (default: 0.2)
// - timeout_ms: 1000-600000ms (default: 10000)
```

### 🔍 Distributed Tracing

The `Tracer` class provides automatic context enrichment and request correlation:

```typescript
import { Tracer } from 'intento-core';

const tracer = new Tracer(functions);
// Automatically resolves traceId from customData cache or upstream pipeline outputs

tracer.debug('Starting supply attempt', { attempt: 1, requestId: 'abc-123' });
// Logs: { message, traceId, nodeName, workflowId, executionId, attempt, requestId }

tracer.errorAndThrow('Supply failed', { attempt: 3, latencyMs: 5000 });
// → Logs error with full metadata
// → Throws CoreError for upstream catching
```

**TraceId Propagation:**
- Via `customData` cache for fast O(1) lookups within same execution
- Via pipeline outputs (`json.traceId`) for cross-node correlation
- Enables request tracking across sequential nodes, split/merge scenarios, and retries

### 🔧 Utilities

**Pipeline Data Access:**

```typescript
import { Pipeline } from 'intento-core';

const outputs = Pipeline.readPipeline(functions);
const dataFromNodeA = outputs['Node A']; // Access any upstream node's output
```

**Smart Delays:**

```typescript
import { Delay } from 'intento-core';

await Delay.exponentialBackoffMs(attempt, maxDelayMs, jitter);
// Calculates delay with exponential backoff and optional jitter
```

## Package Structure

```
src/
├── context/              # Execution context and configuration
│   ├── execution-context.ts
│   └── context-factory.ts
├── supply/              # Supply chain pattern implementation
│   ├── supply-request-base.ts
│   ├── supply-response-base.ts
│   ├── supply-error-base.ts
│   ├── supply-factory.ts
│   └── supplier-base.ts
├── tracing/             # Distributed tracing and logging
│   └── tracer.ts
├── types/               # Core type definitions
│   ├── context-interface.ts
│   ├── data-provider-interface.ts
│   ├── functions-interface.ts
│   ├── traceable-interface.ts
│   └── core-error.ts
└── utils/               # Utility functions
    ├── pipeline.ts
    └── delay.ts
```

## Error Handling

The package uses `CoreError` for expected error conditions with structured metadata:

```typescript
import { CoreError } from 'intento-core';

// Catch and differentiate between expected and unexpected errors
catch (error) {
  if (error instanceof CoreError) {
    // Known error - use message as-is
    return error.message;
  } else {
    // Unexpected bug - wrap with context
    return `🐞 [BUG] Unexpected error: ${error.message}`;
  }
}
```

**Error Types:**
- **CoreError**: Expected conditions (timeouts, validation failures, config errors)
- **Generic Error**: Unexpected bugs that need developer attention

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:dev

# Type checking
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# Format
pnpm format
```

## Testing

The package includes comprehensive unit tests with high coverage:

```bash
pnpm test              # Run all tests with coverage
pnpm test:unit         # Run unit tests with coverage
pnpm test:dev          # Watch mode for development
```

Test files are co-located with source files in `__tests__/` directories.

## Dependencies

- **n8n-core**: Core n8n functionality
- **n8n-workflow**: n8n workflow types and utilities
- **reflect-metadata**: Runtime reflection for decorators

## Usage in Intento Packages

This package serves as the foundation for:

- `@intento/nodes-base`: n8n nodes for Intento services
- `@intento/translation`: Translation-specific implementations

## License

See the root LICENSE files for licensing information.
