# Native JSON Serialization Implementation

## Overview

This implementation adds experimental support for using native `JSON.stringify/parse` instead of `flatted` for execution data serialization, providing significant performance improvements.

## Performance Benefits

Based on benchmarking with real n8n database (100 executions):

- **Overall speedup**: 4.52x faster
- **Stringify**: 2.14x faster (4.9ms vs 10.5ms)
- **Parse**: 6.36x faster (6.4ms vs 40.5ms) ⭐
- **By data size**:
  - Small (<10KB): 9.51x faster
  - Medium (10-100KB): 8.89x faster
  - Large (>100KB): 5.75x faster

**Real-world impact**:
- Average time saved: 39.8ms per execution
- At 10,000 executions/day: 6.6 minutes saved per day
- Only 0.47% of executions need fallback to flatted

## Feature Flag

**Environment variable**: `EXPERIMENTAL_EXECUTIONS_NATIVE_JSON_SERIALIZATION=true`

**Default**: `false` (disabled for safety)

## How It Works

### Backend (Serialization)

When **enabled**, the system:
1. Tries `JSON.stringify()` first (fast path)
2. If circular reference error occurs, falls back to `flatted.stringify()` (0.47% of cases)

When **disabled**:
- Uses `flatted.stringify()` for all data (current behavior)

### Backend & Frontend (Parsing)

When **enabled**:
1. Detects format by checking if string starts with `[` (flatted always wraps in array)
2. If flatted format: uses `flatted.parse()`
3. Otherwise: uses `JSON.parse()` (fast path)

When **disabled**:
- Uses `flatted.parse()` for all data (current behavior)

This provides **backward compatibility** - old flatted data can be parsed with new code, and vice versa.

## Implementation Details

### Core Utilities

**File**: `packages/workflow/src/utils.ts`

```typescript
safeStringify(data, experimentalNativeJson: boolean): string
safeParse<T>(data, experimentalNativeJson: boolean): T
```

### Backend Integration

**Files modified**:
1. `packages/@n8n/db/src/repositories/execution.repository.ts`
   - Reads flag from config
   - Uses `safeStringify/safeParse` for database operations

2. `packages/cli/src/execution-lifecycle/execution-lifecycle-hooks.ts`
   - Uses `safeStringify` for push messages

### Frontend Integration

**Files modified**:
1. `packages/frontend/editor-ui/src/utils/executionUtils.ts`
2. `packages/frontend/editor-ui/src/features/logs/composables/useLogsExecutionData.ts`
3. `packages/frontend/editor-ui/src/composables/usePushConnection/handlers/executionStarted.ts`
4. `packages/frontend/editor-ui/src/composables/usePushConnection/handlers/executionFinished.ts`

Frontend always uses `safeParse(..., true)` to auto-detect format (no flag needed on frontend).

## Testing

Tests added in `packages/workflow/test/utils.test.ts`:
- Feature flag disabled behavior
- Feature flag enabled behavior
- Circular reference fallback
- Auto-detection of flatted vs JSON format
- Backward compatibility

Run tests:
```bash
cd packages/workflow
pnpm test utils.test.ts
```

## Migration Path

### Phase 1: Internal Testing (Current)
```bash
EXPERIMENTAL_EXECUTIONS_NATIVE_JSON_SERIALIZATION=true
```
- Test on staging environment
- Monitor for any issues
- Verify performance improvements

### Phase 2: Gradual Rollout
- Enable for subset of customers
- Monitor metrics and error rates
- Collect feedback

### Phase 3: Default Enabled
- Make default `true` in config
- Keep flag for easy rollback if needed

### Phase 4: Remove Flag (Future)
- After sufficient time with default enabled
- Remove flag and flatted fallback
- Keep flatted parsing for old data

## Circular Reference Analysis

Use the provided analysis tools to understand circular reference patterns:

```bash
# Analyze database for circular references
pnpm tsx scripts/analyze-circular-refs-simple.ts

# Benchmark performance
pnpm tsx scripts/benchmark-json-vs-flatted.ts

# Inspect specific execution
pnpm tsx scripts/check-execution-circular-ref.ts <execution-id>
```

## Known Circular Reference Sources

Based on analysis (0.47% of executions):
1. **Code node** - Users create circular structures in custom code
2. **Error objects** - Error context with node references
3. **Edit Fields node** - Some transformations create circular refs

These are handled gracefully with automatic fallback to flatted.

## Monitoring

When enabled, monitor:
- Execution save/load times (should decrease)
- Database write performance (should improve)
- Push message latency (should decrease)
- Any serialization errors (should be none)

## Rollback

If issues occur:
```bash
EXPERIMENTAL_EXECUTIONS_NATIVE_JSON_SERIALIZATION=false
```

Or remove the environment variable entirely. System will immediately revert to flatted for all operations.

## Future Improvements

1. **Telemetry**: Track how often fallback to flatted occurs
2. **Node fixes**: Fix nodes that create circular refs unnecessarily
3. **Metrics**: Add performance metrics to compare before/after
4. **Remove flatted**: Once confident, remove dependency entirely

## Files Changed

### Created:
- `packages/workflow/src/utils.ts` - Added `safeStringify/safeParse`
- `packages/workflow/test/utils.test.ts` - Added tests
- `packages/@n8n/config/src/configs/executions.config.ts` - Added flag
- Analysis scripts (see `scripts/CIRCULAR_REF_ANALYSIS.md`)

### Modified:
- `packages/workflow/src/index.ts` - Exported new functions
- `packages/@n8n/db/src/repositories/execution.repository.ts` - Using safe functions
- `packages/cli/src/execution-lifecycle/execution-lifecycle-hooks.ts` - Using safe functions
- `packages/frontend/editor-ui/src/utils/executionUtils.ts` - Using safeParse
- `packages/frontend/editor-ui/src/features/logs/composables/useLogsExecutionData.ts` - Using safeParse
- `packages/frontend/editor-ui/src/composables/usePushConnection/handlers/executionStarted.ts` - Using safeParse
- `packages/frontend/editor-ui/src/composables/usePushConnection/handlers/executionFinished.ts` - Using safeParse

## Questions?

See:
- `CIRCULAR_REF_ANALYSIS_SUMMARY.md` - Investigation background
- `scripts/CIRCULAR_REF_ANALYSIS.md` - Analysis tools documentation
