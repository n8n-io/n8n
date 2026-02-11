# Implementation Phases

This document maps interfaces to implementation phases to help developers focus on what's needed when.

## Phase 1.1: Core Runtime Package (MVP)

**Goal**: Basic expression evaluation working in CLI/backend

**Interfaces Needed**:
- `RuntimeBridge` - Main bridge interface
- `BridgeConfig` (without `debug` field)
- `RuntimeHostInterface` - Runtime-to-host communication
- `RuntimeGlobals` - Globals injected into runtime
- `WorkflowDataProxy` - Data access helper
- `IExpressionEvaluator` - Public API
- `EvaluatorConfig` (without observability)
- `WorkflowData` - Input data format
- `EvaluateOptions` (basic)

**Implementations Required**:
- `IsolatedVmBridge` - For CLI/backend
- `NodeVmBridge` - For testing
- `ExpressionEvaluator` - Main evaluator class
- Runtime code (runs inside isolate)
- Lazy loading proxies
- Code cache

**Can Skip**:
- Observability (use `NoOpProvider` stub)
- Debug mode
- Specific error types (use generic `Error`)
- Web Workers
- Task runners

## Phase 0.2: Observability Infrastructure (PARALLEL)

**Goal**: Add metrics, traces, and logs

**Interfaces Needed**:
- `ObservabilityProvider`
- `MetricsAPI`
- `TracesAPI`
- `LogsAPI`
- `Span`

**Implementations Required**:
- `NoOpProvider` (zero overhead when disabled)
- `OpenTelemetryProvider`
- `PostHogProvider` (optional)
- `CompositeProvider` (use multiple providers)

**Integration**:
- Add to `EvaluatorConfig.observability`
- Emit metrics/traces from evaluator and bridge
- Smart sampling implementation

## Phase 1.2: Isolate Pooling

**Goal**: Handle concurrent evaluations

**New Interfaces**: None (uses existing `RuntimeBridge`)

**Implementations Required**:
- `IsolatePool` class
- Pool configuration
- Acquire/release mechanism
- Disposal detection and replacement

## Phase 1.3: Extension Framework

**Goal**: 100% test compatibility

**New Interfaces**: None

**Implementation**: Extension functions in runtime

## Phase 1.4: Error Handling

**Goal**: Graceful error handling with clear messages

**Interfaces Needed**:
- `ExpressionError`
- `MemoryLimitError`
- `TimeoutError`
- `SecurityViolationError`
- `SyntaxError`

**Implementation**: Error handling in all code paths

## Phase 2+: Future Enhancements

### Web Worker Support
**Interfaces**: Already defined (same `RuntimeBridge`)

**Implementations**:
- `WebWorkerBridge`
- Runtime bundled as ESM
- Note: No lazy loading initially (pre-fetch data)

### Chrome DevTools Debugging
**Config**: `BridgeConfig.debug` field

**Implementation**:
- Inspector protocol integration
- Debug mode in IsolatedVmBridge

### Task Runner Integration
**Interfaces**: Already defined (same `RuntimeBridge`)

**Implementations**:
- `TaskRunnerBridge`
- IPC communication

---

## Quick Start Guides

### For Frontend Developers (Web Worker Integration)

**Phase 1**: Skip - Web Workers are Phase 2+

**Phase 2**: Focus on:
1. `RuntimeBridge` interface - Your bridge must implement this
2. `BridgeConfig` - Configuration options
3. `WorkflowDataProxy` - How to structure data
4. Ignore: Observability interfaces (optional)

**Key Difference**: Web Workers can't do lazy loading initially, so you'll need to pre-fetch all data before calling `execute()`.

### For CLI/Backend Developers

**Phase 1.1**: Focus on:
1. `IsolatedVmBridge` implementation
2. `ExpressionEvaluator` class
3. Runtime code (runs inside isolate)
4. Code cache implementation

**Use**: `NoOpProvider` for observability initially

**Phase 0.2**: Add real observability providers

### For Testing

Use `NodeVmBridge` for fast tests without native `isolated-vm` dependency.

All interfaces in `src/types/` are designed to work with `NodeVmBridge` for testing.
