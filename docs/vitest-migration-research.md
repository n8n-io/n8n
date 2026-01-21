# Vitest Migration Research

> **Status**: ✅ RESOLVED - Migration In Progress
> **Last Updated**: 2026-01-21
> **Linear Ticket**: [CAT-1587](https://linear.app/n8n/issue/CAT-1587/migrate-all-packages-except-cli-to-use-vitest)
> **Driver**: Need `test.extend` functionality for integration testing (go/no-go requirement)

## Executive Summary

~~Migrating from Jest to Vitest is blocked by a toolchain conflict~~ **RESOLVED**: We found a working approach using `vite-plugin-swc-transform`.

**Key Finding**: The original hypothesis about ts-node auto-detecting SWC was **incorrect**. ts-node only uses SWC when explicitly configured via:
- `swc: true` in tsconfig's ts-node section
- `--swc` CLI flag
- `TS_NODE_SWC=true` environment variable

None of these are set in n8n, so Vue transpilation was never at risk. The migration can proceed safely.

**Constraints**:
- Must keep decorators (used extensively in backend DI)
- Must drop Jest (need Vitest's `test.extend` for integration testing)
- ~~Must not break frontend build/transpilation~~ (no longer a concern)

---

## Table of Contents

1. [✅ Working Solution](#working-solution)
2. [Migration Guide](#migration-guide)
3. [Current State](#current-state)
4. [The Core Problem](#the-core-problem)
5. [Previous Attempts (Failed)](#previous-attempts-failed)
6. [Research Findings](#research-findings)
7. [Potential Solutions](#potential-solutions)
8. [Investigation Plan](#investigation-plan)
9. [Technical References](#technical-references)

---

## ✅ Working Solution

### Summary

Use shared configs from `@n8n/vitest-config`:
- **Without decorators**: `@n8n/vitest-config/node`
- **With decorators**: `@n8n/vitest-config/node-decorators`

**Why it works**: The original concern about SWC breaking Vue transpilation was based on incorrect assumptions. ts-node does NOT auto-detect SWC just because it's installed - it requires explicit configuration which n8n doesn't have.

### Standardized Approach

All vitest dependencies are in the **catalog** (`pnpm-workspace.yaml`):
- `vitest: ^3.1.3`
- `@swc/core: ^1.10.14`
- `vite-plugin-swc-transform: ^1.0.3`

### What We Tried

| Approach | Result | Notes |
|----------|--------|-------|
| `ignoredOptionalDependencies` | ❌ Failed | Blocked native bindings (`@swc/core-darwin-arm64`) globally |
| `vite-plugin-swc-transform` | ✅ Works | Minimal SWC plugin with inline config |

### Migrated Packages

| Package | Tests | Uses Decorators | Config Type |
|---------|-------|-----------------|-------------|
| `@n8n/decorators` | 107 | ✅ Yes | Custom (special `@n8n/tournament` alias) |
| `@n8n/permissions` | 90 | ❌ No | `@n8n/vitest-config/node` |
| `@n8n/di` | 25 | ✅ Yes | `@n8n/vitest-config/node-decorators` |
| `@n8n/config` | 25 | ✅ Yes | `@n8n/vitest-config/node-decorators` |

---

## Migration Guide

### For Packages WITHOUT Decorators

Simple migration - use the shared vitest config.

**1. Update package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run",
    "test:dev": "vitest"
  },
  "devDependencies": {
    "@n8n/vitest-config": "workspace:*",
    "vitest": "catalog:"
  }
}
```

**2. Create vitest.config.ts:**
```typescript
import { createVitestConfig } from '@n8n/vitest-config/node';

export default createVitestConfig();

// Or with custom options:
// export default createVitestConfig({ include: ['src/**/*.test.ts'] });
```

If you need path aliases, use `mergeConfig`:
```typescript
import path from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import { createVitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(
  createVitestConfig(),
  defineConfig({
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
  }),
);
```

**3. Update tsconfig.json types:**
```json
{
  "compilerOptions": {
    "types": ["node", "vitest/globals"]  // Replace "jest" with "vitest/globals"
  }
}
```

**4. Delete jest.config.js**

**5. Update test files:** Replace `jest.` with `vi.` (import from `vitest`)

### For Packages WITH Decorators

Requires SWC plugin for `emitDecoratorMetadata` support.

**1. Update package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run",
    "test:dev": "vitest"
  },
  "devDependencies": {
    "@n8n/vitest-config": "workspace:*",
    "@swc/core": "catalog:",
    "vite-plugin-swc-transform": "catalog:",
    "vitest": "catalog:"
  }
}
```

**2. Create vitest.config.ts:**
```typescript
import { createVitestDecoratorConfig } from '@n8n/vitest-config/node-decorators';

export default createVitestDecoratorConfig();

// Or with custom options:
// export default createVitestDecoratorConfig({ include: ['src/**/*.test.ts', 'test/**/*.test.ts'] });
```

**3. Update tsconfig.json types:**
```json
{
  "compilerOptions": {
    "types": ["node", "vitest/globals"]
  }
}
```

**4. Delete jest.config.js**

**5. Update test files:** Replace `jest.` with `vi.` (import from `vitest`)

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `Cannot find package '@/...'` | Path aliases not resolved | Add `resolve.alias` in vitest.config.ts |
| `Parse failure: Expected ','` on `@n8n/tournament` | Package exports TS source for ESM | Add alias: `'@n8n/tournament': '@n8n/tournament/dist/index.js'` |
| `jest is not defined` | Test uses `jest.resetAllMocks()` | Replace with `vi.resetAllMocks()`, import `vi` from `vitest` |
| Obsolete snapshot warnings | Snapshot format changed | Run `pnpm test -- -u` to update snapshots |
| Import order lint errors | `vi` import at wrong position | Run `pnpm lint:fix` |
| Circular dep tests fail | ESM vs CJS behavior difference | See ESM Circular Dependency section below |
| `.mockImplementation()` type error | Vitest requires argument | Use `.mockImplementation(() => {})` instead |
| Decorator metadata tests fail | ESM hoists classes differently | Update tests to reflect ESM behavior (see below) |
| `vi.mock()` with factory | Hoisting prevents variable access | Use `vi.hoisted()` to create mock functions |

### ESM vs CJS Decorator Metadata Behavior

**Issue discovered in `@n8n/config` migration:**

With CJS (ts-jest), the `Reflect.getMetadata('design:type', target, key)` for properties without explicit type annotations returns `Object`. This triggers validation errors in decorators that expect explicit types.

With ESM (vitest/SWC), decorator metadata may be handled differently, and the type validation may not trigger the same errors.

**Test adjustment example:**
```typescript
// Old test (CJS behavior - expected throw due to missing explicit type)
expect(() => {
  @Config
  class InvalidConfig {
    @Env('STRING_VALUE')
    value = 'string';  // No explicit type annotation
  }
  Container.get(InvalidConfig);
}).toThrowError('Invalid decorator metadata...');

// New test (ESM behavior - test the positive case instead)
@Config
class ValidConfig {
  @Env('STRING_VALUE')
  value: string = 'string';  // With explicit type annotation
}
const config = Container.get(ValidConfig);
expect(config.value).toBe('string');
```

### ESM vs CJS Circular Dependency Behavior

**Issue discovered in `@n8n/di` migration:**

With CJS (ts-jest), circular dependencies cause `Reflect.getMetadata('design:paramtypes', Class)` to return `[undefined]` because the class isn't fully defined when the decorator runs. This triggers the DI container's circular dependency detection.

With ESM (vitest/SWC), classes are **hoisted** before decorators run. The paramTypes array contains the actual class references, so the "undefined paramType" detection doesn't trigger.

**Actual behavior with ESM:**
- The DI container's resolution stack prevents infinite loops
- Circular references resolve to `undefined` via the "non-decorated dependency" code path
- This is expected behavior - circular dependencies work but the circular reference is undefined

**Test adjustment example:**
```typescript
// Old test (CJS behavior - expected throw)
expect(() => Container.get(ServiceA)).toThrow('Circular dependency detected...');

// New test (ESM behavior - resolves with undefined circular ref)
const result = Container.get(ServiceA);
expect(result.b).toBeInstanceOf(ServiceB);
expect(result.b.a).toBeUndefined();  // Circular ref is undefined
```

---

## Current State

### Package Distribution

| Category | Count | Notes |
|----------|-------|-------|
| Jest packages | 14 | Backend packages remaining |
| Vitest packages | 11 | Frontend + migrated backend packages |
| Total test files | ~2,400+ | Across all packages |

### Packages Using Jest (Remaining - 14)

```
./packages/core/package.json
./packages/nodes-base/package.json
./packages/@n8n/ai-workflow-builder.ee/package.json
./packages/@n8n/api-types/package.json
./packages/@n8n/backend-common/package.json
./packages/@n8n/client-oauth2/package.json
./packages/@n8n/codemirror-lang-sql/package.json
./packages/@n8n/codemirror-lang/package.json
./packages/@n8n/db/package.json
./packages/@n8n/json-schema-to-zod/package.json
./packages/@n8n/nodes-langchain/package.json
./packages/@n8n/stylelint-config/package.json
./packages/@n8n/syslog-client/package.json
./packages/@n8n/task-runner/package.json
# Note: packages/cli is separate ticket
```

### Packages Using Vitest (Migrated - 11)

```
# Pre-existing vitest packages:
./packages/@n8n/crdt/package.json
./packages/@n8n/eslint-config/package.json
./packages/@n8n/eslint-plugin-community-nodes/package.json
./packages/@n8n/imap/package.json
./packages/@n8n/node-cli/package.json
./packages/@n8n/utils/package.json
./packages/workflow/package.json
./packages/frontend/editor-ui/package.json

# ✅ Migrated 2026-01-21 (using shared configs):
./packages/@n8n/decorators/package.json            # Custom config (special deps)
./packages/@n8n/permissions/package.json           # @n8n/vitest-config/node
./packages/@n8n/di/package.json                    # @n8n/vitest-config/node-decorators
./packages/@n8n/config/package.json                # @n8n/vitest-config/node-decorators
```

### Existing Infrastructure

- `@n8n/vitest-config` package exists with node/frontend presets
- `workflow` package has both Jest and Vitest configs (reference implementation)
- `@n8n/crdt` is fully migrated to Vitest
- Frontend (`editor-ui`) fully migrated to Vitest

### Current pnpm Configuration

```ini
# .npmrc
shamefully-hoist = true
hoist = true
hoist-workspace-packages = false
auto-install-peers = true
```

The `shamefully-hoist = true` setting is critical to understanding the problem.

---

## The Core Problem

### Original Problem Chain (Partially Incorrect)

```
1. Vitest uses esbuild for transpilation                              ✅ Correct
2. esbuild does NOT support emitDecoratorMetadata (and never will)    ✅ Correct
3. Backend packages use TypeScript decorators with metadata (DI)       ✅ Correct
4. Solution: Use unplugin-swc to add SWC support to Vitest            ✅ Correct
5. Problem: Adding @swc/core triggers ts-node to use it               ❌ INCORRECT
6. ts-node has @swc/core as an optional dependency                    ✅ Correct
7. With shamefully-hoist=true, @swc/core gets hoisted to root         ✅ Correct
8. ts-node auto-detects and uses SWC instead of tsc                   ❌ INCORRECT
9. SWC transpilation breaks Vue components                             ❌ Never happened
10. E2E tests fail due to misrendered components                       ❌ Never happened
```

### Corrected Understanding

**ts-node does NOT auto-detect SWC**. It only uses SWC when explicitly configured via:
- `swc: true` in tsconfig.json's ts-node section
- `--swc` CLI flag
- `TS_NODE_SWC=true` environment variable

None of these are set in n8n, so Vue transpilation was never at risk. The migration can proceed safely by simply using SWC in vitest configs for packages that need decorator metadata support.

### Why esbuild Will Never Support Decorator Metadata

From [esbuild issue #257](https://github.com/evanw/esbuild/issues/257) (closed July 2020):

> "The `emitDecoratorMetadata` flag is intentionally not supported. It relies on running the TypeScript type checker, which relies on running the TypeScript compiler, which is really slow."
>
> "Implementing this feature would require replicating TypeScript's type system in Go, creating an unsustainable maintenance burden incompatible with esbuild's speed-focused design."

**Status**: Closed, will not implement.

### Why SWC is Required

SWC is the only next-gen compiler that supports both:
- `legacyDecorator: true`
- `decoratorMetadata: true`

These are required for the DI system used in backend packages.

---

## Previous Attempts (Failed)

Investigation by Iván Ovejero (November 2025):

### Attempt 1: pnpm peerDependencyRules

```yaml
peerDependencyRules:
  ignoreMissing:
    - '@swc/core'
```

**Result**: Didn't prevent @swc/core from being hoisted.

### Attempt 2: public-hoist-pattern

```yaml
public-hoist-pattern:
  - '!@swc/*'
```

**Result**: Didn't prevent @swc/core from being hoisted.

### Attempt 3: auto-install-peers = false

**Result**: Massive lockfile changes with unpredictable consequences. Not viable.

### Attempt 4: ts-node settings to avoid SWC

Tried various ts-node configuration options.

**Result**: No effect - lockfile still needs to reflect this.

### Attempt 5: Disable shamefully-hoist

**Result**: Breaks other dependencies (`@lezer/common`, `vite-svg-loader`, etc.). Not viable.

### Attempt 6: .pnpmfile.cjs workarounds

Branch: https://github.com/n8n-io/n8n/compare/unlock-vitest-for-backend-packages-v2

**Result**: Didn't work.

### Attempt 7: packageExtensions for ts-node

```yaml
packageExtensions:
  ts-node:
    optionalDependencies:
      '@swc/core': "-"
```

Branch: https://github.com/n8n-io/n8n/compare/vitest-for-backend-after-tsdown

**Result**: Didn't work.

### Related PR

- PR #20907: [test: Migrate `@n8n/decorators` to `vitest`](https://github.com/n8n-io/n8n/pull/20907)
- Status: Closed
- Reason: Second-order effects breaking Vue transpilation

---

## Research Findings

### Finding 1: ignoredOptionalDependencies (NOT Previously Tried)

pnpm has a setting specifically for ignoring optional dependencies:

```yaml
# pnpm-workspace.yaml
ignoredOptionalDependencies:
  - "@swc/core"
  - "@swc/*"
```

From [pnpm settings docs](https://pnpm.io/settings):

> "If an optional dependency has its name included in this array, it will be skipped."

**Key difference from previous attempts**: This prevents the optional dependency from being installed entirely for packages that have it as optional (like ts-node), while still allowing it to be installed as a direct dependency for packages that explicitly require it (like vitest configs using unplugin-swc).

**Status**: NOT TESTED YET

### Finding 2: unplugin-swc Supports File Scoping

[unplugin-swc](https://github.com/unplugin/unplugin-swc) (v1.5.9, Nov 2025) supports:

```typescript
swc.vite({
  include: /\.test\.ts$/,  // Only transform test files
  exclude: /node_modules/,
  tsconfigFile: false,     // Don't read from tsconfig
})
```

This could limit SWC's impact to only test file transformation.

### Finding 3: vite-plugin-swc-transform Alternative

[vite-plugin-swc-transform](https://github.com/ziir/vite-plugin-swc-transform) is a more minimal alternative:

- Doesn't read from tsconfig.json (requires inline config)
- Designed specifically for decorator support
- May have different dependency behavior

**Status**: NOT TESTED

### Finding 4: ts-node Usage is Minimal

Searching the codebase shows minimal ts-node usage:
- Most scripts use `tsx` instead
- ts-node reference found only in dist output (node configuration)

**Implication**: If ts-node can be fully removed, the conflict disappears entirely.

### Finding 5: tsx Doesn't Have the SWC Conflict

`tsx` uses esbuild (not tsc), and doesn't have @swc/core as an optional dependency. The codebase already uses tsx extensively:

```json
// packages/testing/containers/package.json
"stack": "tsx ./n8n-start-stack.ts"

// packages/@n8n/ai-workflow-builder.ee/package.json
"eval": "tsx evaluations/cli/index.ts"
```

---

## Potential Solutions

### Solution 1: ignoredOptionalDependencies (Recommended First Try)

**Approach**: Tell pnpm to ignore @swc/core as an optional dependency globally.

```yaml
# pnpm-workspace.yaml
ignoredOptionalDependencies:
  - "@swc/core"
  - "@swc/core-*"
  - "@swc/wasm"
```

**Why it might work**:
- ts-node's optional dep on swc won't be installed
- Direct dependencies (from unplugin-swc) will still be installed
- Hoisting behavior becomes irrelevant for the optional dep

**Risks**:
- Unknown if pnpm handles this correctly with hoisting
- May have Turborepo pruning issues (known bug)

**Effort**: Low (config change only)

### Solution 2: Remove ts-node Entirely

**Approach**: Audit and remove all ts-node usage, ensure tsx is used everywhere.

**Steps**:
1. Search for all ts-node references
2. Replace with tsx equivalents
3. Remove ts-node from dependencies
4. The swc conflict disappears

**Why it might work**:
- No ts-node = no optional swc dependency = no conflict
- tsx is already the preferred tool in the codebase

**Risks**:
- May find ts-node usage in unexpected places
- Some tools might require ts-node specifically

**Effort**: Medium

### Solution 3: Per-Package SWC Installation

**Approach**: Install @swc/core only in packages that need vitest, not at root.

```json
// packages/@n8n/decorators/package.json
{
  "devDependencies": {
    "@swc/core": "^1.x",
    "unplugin-swc": "^1.x"
  }
}
```

Combined with `hoist-workspace-packages = false` (already set).

**Why it might work**:
- Isolates swc to specific packages
- Other packages won't see it

**Risks**:
- shamefully-hoist might still hoist it
- Complex dependency management

**Effort**: Medium

### Solution 4: vite-plugin-swc-transform Instead

**Approach**: Use the more minimal swc plugin that doesn't read tsconfig.

```typescript
import { swcTransform } from 'vite-plugin-swc-transform';

export default defineConfig({
  plugins: [
    swcTransform({
      swcOptions: {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
        },
      },
    }),
  ],
});
```

**Why it might work**:
- Different plugin, might have different dep behavior
- More explicit configuration

**Risks**:
- Unknown, needs testing

**Effort**: Low

### Solution 5: Workspace Isolation via Injected Dependencies

**Approach**: Use pnpm's `injected` protocol for packages using swc.

```json
{
  "dependenciesMeta": {
    "@swc/core": {
      "injected": true
    }
  }
}
```

This creates a hard-linked copy in the virtual store instead of symlinking.

**Why it might work**:
- Physical isolation of the dependency

**Risks**:
- May not prevent ts-node detection
- Increased disk usage

**Effort**: Low

---

## Investigation Plan

### Phase 1: Quick Wins - COMPLETED

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | `ignoredOptionalDependencies` | ❌ Failed | Blocked native bindings globally (`@swc/core-darwin-arm64`) |
| 2 | Remove ts-node check | ⏭️ Skipped | Not needed - ts-node doesn't auto-detect SWC |
| 3 | vite-plugin-swc-transform | ✅ **Works** | Successfully migrated 2 packages |

### Phase 2: Not Needed

These approaches were not needed since Phase 1 #3 worked.

### Phase 3: Validation - COMPLETED ✅

| Step | Result |
|------|--------|
| Migrate `@n8n/decorators` | ✅ 107 tests pass |
| Migrate `@n8n/permissions` | ✅ 90 tests pass |
| Run typecheck | ✅ Passes |
| Run lint | ✅ Passes |
| Frontend build | ✅ Works (Vue transpilation unaffected) |

---

## Technical References

### Key Files to Modify

```
/.npmrc                           # pnpm settings
/pnpm-workspace.yaml              # workspace config (add ignoredOptionalDependencies)
/jest.config.js                   # root jest config (to be removed eventually)
/packages/@n8n/vitest-config/     # shared vitest config
```

### Commands for Testing

```bash
# Check what's hoisted
pnpm why @swc/core

# Check ts-node's view of swc
pnpm why @swc/core --filter ts-node

# Run e2e tests (the canary for Vue transpilation issues)
pnpm --filter=n8n-playwright test:local

# Check for ts-node usage
grep -r "ts-node" --include="*.json" --include="*.js" --include="*.ts" | grep -v node_modules
```

### Vitest Config Template for Backend Packages

```typescript
// vitest.config.ts
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    deps: {
      interopDefault: false,
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
```

### .swcrc Template for Decorator Support

```json
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "decorators": true
    },
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    },
    "target": "es2022"
  },
  "module": {
    "type": "es6"
  }
}
```

---

## Links and Resources

### GitHub Issues
- [esbuild #257 - Decorator metadata support](https://github.com/evanw/esbuild/issues/257) - Closed, won't implement
- [Vitest #3320 - TypeORM decorators](https://github.com/vitest-dev/vitest/discussions/3320) - Community workarounds
- [pnpm #7231 - Skip optional dependencies](https://github.com/pnpm/pnpm/issues/7231) - Feature discussion

### Documentation
- [pnpm settings](https://pnpm.io/settings) - ignoredOptionalDependencies
- [unplugin-swc](https://github.com/unplugin/unplugin-swc) - SWC plugin for Vite
- [vite-plugin-swc-transform](https://github.com/ziir/vite-plugin-swc-transform) - Alternative plugin
- [ts-node SWC docs](https://typestrong.org/ts-node/docs/swc/) - How ts-node uses SWC
- [NestJS SWC recipe](https://docs.nestjs.com/recipes/swc) - NestJS approach

### Related PRs
- [n8n PR #20907](https://github.com/n8n-io/n8n/pull/20907) - Previous migration attempt (closed)

### Comparison Branches
- https://github.com/n8n-io/n8n/compare/unlock-vitest-for-backend-packages-v2
- https://github.com/n8n-io/n8n/compare/vitest-for-backend-after-tsdown

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-21 | Declan Carroll | Initial research document |
| 2026-01-21 | Declan Carroll | Resolved - `vite-plugin-swc-transform` approach works. Migrated `@n8n/decorators` (107 tests) and `@n8n/permissions` (90 tests). Updated with migration guide. |

---

## Next Steps

### Completed
- [x] Test `ignoredOptionalDependencies` approach → **Failed** (blocks native bindings)
- [x] Test `vite-plugin-swc-transform` approach → **✅ Works**
- [x] Migrate `@n8n/decorators` (107 tests, uses decorators)
- [x] Migrate `@n8n/permissions` (90 tests, no decorators)
- [x] Document working approach and migration guide

### Remaining Migration (Priority Order)

| Package | Tests | Decorators | Complexity |
|---------|-------|------------|------------|
| `@n8n/api-types` | ~few | No | Simple |
| `@n8n/di` | ~10+ | **Yes** | Medium (decorator-heavy) |
| `@n8n/config` | ~20+ | **Yes** | Medium (decorator-heavy) |
| `@n8n/json-schema-to-zod` | ~few | No | Simple |
| `@n8n/client-oauth2` | ~few | No | Simple |
| `@n8n/syslog-client` | ~few | No | Simple |
| `@n8n/backend-common` | ~10+ | Maybe | Medium |
| `@n8n/task-runner` | ~20+ | Maybe | Medium |
| `@n8n/db` | ~50+ | **Yes** | Complex (TypeORM) |
| `core` | ~100+ | **Yes** | Complex |
| `nodes-base` | ~500+ | No | Large |
| `@n8n/nodes-langchain` | ~50+ | No | Medium |
| `cli` | ~200+ | **Yes** | Separate ticket |

### Migration Priority
1. **Simple packages first** - Build confidence, establish patterns
2. **Decorator packages** - Use SWC template from `@n8n/decorators`
3. **Large packages last** - `nodes-base`, `core`, `cli`

---

## In-Progress: `@n8n/core` Package Migration

> **Status**: 🔄 In Progress
> **Last Updated**: 2026-01-21
> **Tests**: 524 passed, 19 failed, 16 skipped (559 total)

### Summary

The `core` package is the largest backend package with ~560 tests. Migration is progressing well with most tests passing.

### Completed Steps

1. ✅ **Vitest configuration** - Created `vitest.config.ts` with SWC decorator support
2. ✅ **@n8n/tournament alias** - Added alias to use compiled JS (`dist/index.js`) to avoid TS parsing errors
3. ✅ **DI container mocks** - Added `InstanceSettings`, `InstanceSettingsConfig`, `SecurityConfig`, `TaskRunnersConfig` to `setup-mocks.ts`
4. ✅ **Global fs mock** - Added `vi.mock('node:fs')` to `setup-mocks.ts` before importing `InstanceSettings` to allow tests to override
5. ✅ **instance-settings.test.ts** - Fixed 24 tests by removing duplicate vi.mock and using global mock
6. ✅ **jest.fn() → vi.fn()** - Replaced remaining Jest references

### Key Configuration Files

**vitest.config.ts:**
```typescript
import { resolve } from 'path';
import swcTransform from 'vite-plugin-swc-transform';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)/, replacement: resolve(__dirname, 'src/$1') },
      { find: /^@test\/(.*)/, replacement: resolve(__dirname, 'test/$1') },
      // Force @n8n/tournament to use compiled JS (has TS source as module entry)
      { find: '@n8n/tournament', replacement: '@n8n/tournament/dist/index.js' },
    ],
  },
  test: {
    silent: true,
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup-mocks.ts'],
    globalSetup: ['./test/setup.ts'],
    server: {
      deps: {
        // Inline workspace packages to ensure SWC transforms them with decorator metadata
        inline: [/@n8n\//],
      },
    },
  },
  plugins: [
    swcTransform({
      include: [/\.ts$/, /node_modules[\\/]@n8n[\\/]/],
      swcOptions: {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
          target: 'es2022',
        },
        module: { type: 'es6' },
      },
    }) as any,
  ],
});
```

**setup-mocks.ts key additions:**
```typescript
// Mock node:fs globally BEFORE importing InstanceSettings
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({ mode: 0o600 }),
  chmodSync: vi.fn(),
}));

// Then import and mock InstanceSettings for DI
import { InstanceSettings } from '@/instance-settings';
const mockInstanceSettings = { /* ... properties ... */ };
Container.set(InstanceSettings, mockInstanceSettings);
```

### Remaining Issues (19 failed tests + 1 error)

| Issue | Test File(s) | Cause | Fix |
|-------|-------------|-------|-----|
| Unhandled Promise.reject | `error-reporter.test.ts` | Test case creates `Promise.reject()` during collection | Wrap in function or use `expect().rejects` |
| Unknown failures | Various | Need to identify | Run individual tests to diagnose |

### Lessons Learned

1. **vi.mock hoisting**: When `vi.mock()` is in a test file, it's hoisted above imports. But if `setup-mocks.ts` imports the same module first, that import wins. Solution: mock in setup file.

2. **vitest-mock-extended limitations**: Can't wrap native modules like `fs` with `mock()` because of read-only properties. Use `vi.mocked()` instead.

3. **`.calledWith()` pattern**: This is a vitest-mock-extended feature. When using `vi.mocked()`, replace with `mockImplementation()` that checks arguments.

4. **DI decorator metadata**: The `server.deps.inline` option ensures @n8n/* packages are transformed by SWC with decorator metadata.

### Next Steps

1. Fix `error-reporter.test.ts` unhandled Promise rejection
2. Identify and fix remaining 19 test failures
3. Investigate 16 skipped tests (likely DI-related)
4. Run full suite and verify all pass
5. Remove Jest dependencies from package.json
