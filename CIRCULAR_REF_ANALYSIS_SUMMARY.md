# Circular Reference Analysis - Summary

## Overview

This document summarizes the investigation into replacing the `flatted` library with native `JSON.stringify/parse` for better performance in the n8n codebase.

## Current Situation

**Usage of `flatted` library:**
- `packages/@n8n/db/src/repositories/execution.repository.ts` - Database serialization
- `packages/frontend/editor-ui/src/features/logs/composables/useLogsExecutionData.ts` - Frontend data parsing
- `packages/frontend/editor-ui/src/utils/executionUtils.ts` - Execution response handling
- `packages/cli/src/execution-lifecycle/execution-lifecycle-hooks.ts` - Push message serialization

## Historical Context

From git history analysis:

1. **Circular references DO occur in specific scenarios:**
   - HTTP Request nodes: `response.request` creates circular refs (mitigated in commit 5b7ea16d9a)
   - Error objects from external libraries (Axios, etc.)
   - Some nodes inadvertently create circular structures

2. **There's already handling for this:**
   - `removeCircularRefs()` utility in `packages/workflow/src/utils.ts`
   - Used in HTTP Request nodes (V1, V2, V3) and error handling

3. **Previous attempt to replace flatted:**
   - Commit 380803ac7d attempted to replace with custom serializer
   - Not yet merged to master

## Key Finding

**Circular references are NOT inherent to execution data structure**, but occur in edge cases:
- HTTP response objects (mostly mitigated)
- Error objects from libraries
- Specific node implementations

## Tools Created

### 1. Database Analysis Script
**File:** `scripts/analyze-circular-refs-simple.ts`

Analyzes execution data from your database to determine what percentage contains circular references.

**Quick Start:**
```bash
pnpm tsx scripts/analyze-circular-refs-simple.ts
```

**Features:**
- Supports both SQLite and PostgreSQL
- Sample or analyze all executions
- Provides actionable recommendations
- Shows statistics and sample IDs

### 2. Single Execution Inspector
**File:** `scripts/check-execution-circular-ref.ts`

Inspects a specific execution to find exactly where circular references occur.

**Usage:**
```bash
pnpm tsx scripts/check-execution-circular-ref.ts <execution-id>
```

**Features:**
- Shows exact paths to circular references
- Identifies common patterns
- Compares size with JSON vs flatted

### 3. CLI Command (Alternative)
**File:** `packages/cli/src/commands/analyze-circular-refs.ts`

Integrated into n8n CLI for production use.

### 4. Documentation
**File:** `scripts/CIRCULAR_REF_ANALYSIS.md`

Complete documentation on using the analysis tools.

## Recommended Next Steps

### Step 1: Run Analysis
```bash
# Quick check with 1000 samples
pnpm tsx scripts/analyze-circular-refs-simple.ts

# Or analyze everything (may take time)
pnpm tsx scripts/analyze-circular-refs-simple.ts all
```

### Step 2: Interpret Results

**If 0% have circular refs:**
✅ Safe to replace `flatted` with `JSON.stringify/parse` directly
- Expected performance improvement: 2-5x faster
- No migration complexity

**If < 1% have circular refs:**
⚠️ Use conditional fallback approach:
```typescript
function safeParse(data: string) {
  try {
    return JSON.parse(data);
  } catch (error) {
    if (error.message.includes('circular')) {
      return parse(data); // fallback to flatted
    }
    throw error;
  }
}
```

**If 1-10% have circular refs:**
⚠️ Investigate and fix root causes first:
1. Use `check-execution-circular-ref.ts` to inspect problematic executions
2. Identify which nodes create circular refs
3. Fix those nodes (use `removeCircularRefs()`)
4. Re-analyze

**If > 10% have circular refs:**
❌ Keep `flatted` for now:
- Too many issues to safely migrate
- Investigate why circular refs are so common
- May indicate deeper structural issues

### Step 3: Performance Benchmarking

If analysis shows < 1% circular refs, benchmark the improvement:

```typescript
// Before (with flatted)
const start = performance.now();
const data = stringify(executionData);
const parsed = parse(data);
console.log('Time:', performance.now() - start);

// After (with JSON)
const start = performance.now();
const data = JSON.stringify(executionData);
const parsed = JSON.parse(data);
console.log('Time:', performance.now() - start);
```

### Step 4: Implementation Plan

If replacing `flatted` is viable:

1. **Create utility functions:**
   ```typescript
   // In packages/workflow/src/utils.ts
   export function safeParse<T = unknown>(data: string): T {
     try {
       return JSON.parse(data) as T;
     } catch (error) {
       if (error instanceof Error && error.message.includes('circular')) {
         return parse(data) as T;
       }
       throw error;
     }
   }

   export function safeStringify(data: unknown): string {
     try {
       return JSON.stringify(data);
     } catch (error) {
       if (error instanceof Error && error.message.includes('circular')) {
         return stringify(data);
       }
       throw error;
     }
   }
   ```

2. **Replace usage incrementally:**
   - Start with execution.repository.ts (backend)
   - Then execution-lifecycle-hooks.ts
   - Finally frontend utils
   - Keep fallback for safety

3. **Add monitoring:**
   - Log when fallback to flatted occurs
   - Track which nodes cause it
   - Create issues to fix root causes

4. **Performance testing:**
   - Benchmark before/after
   - Test with large executions
   - Monitor production metrics

## Expected Benefits

If circular refs are < 1% of cases:

### Performance Improvements
- **Serialization:** 2-5x faster (JSON.stringify vs flatted.stringify)
- **Parsing:** 2-5x faster (JSON.parse vs flatted.parse)
- **Bundle size:** ~3KB smaller (remove flatted dependency)

### Impact Areas
- **Execution saving:** Faster writes to database
- **Execution loading:** Faster reads from database
- **WebSocket messages:** Faster serialization for push updates
- **API responses:** Faster response times

### Rough Estimates
For a workflow execution with 100 nodes:
- Current: ~50ms for stringify + parse
- With JSON: ~10-20ms for stringify + parse
- Savings: ~30-40ms per execution

At scale (10k executions/day):
- Time saved: ~5-7 minutes/day
- Database IO improved

## Files Modified/Created

### Created:
1. `scripts/analyze-circular-refs-simple.ts` - Main analysis script
2. `scripts/check-execution-circular-ref.ts` - Single execution inspector
3. `scripts/CIRCULAR_REF_ANALYSIS.md` - Documentation
4. `packages/cli/src/commands/analyze-circular-refs.ts` - CLI command
5. `CIRCULAR_REF_ANALYSIS_SUMMARY.md` - This file

### To Be Modified (if viable):
1. `packages/@n8n/db/src/repositories/execution.repository.ts`
2. `packages/cli/src/execution-lifecycle/execution-lifecycle-hooks.ts`
3. `packages/frontend/editor-ui/src/features/logs/composables/useLogsExecutionData.ts`
4. `packages/frontend/editor-ui/src/utils/executionUtils.ts`
5. `packages/workflow/src/utils.ts` - Add safe wrapper functions

## Questions to Answer

Run the analysis to answer:
1. What % of executions have circular refs?
2. Which execution IDs have circular refs?
3. What's the common pattern in circular refs?
4. Which nodes typically create them?
5. Are they in error objects or data objects?

## Related Resources

- Original PR replacing HTTP circular refs: https://github.com/n8n-io/n8n/pull/8030
- Previous attempt at custom serializer: commit 380803ac7d
- Flatted library: https://github.com/WebReflection/flatted
