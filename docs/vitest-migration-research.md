# Vitest Migration Research

> **Status**: Active Investigation
> **Last Updated**: 2026-01-21
> **Linear Ticket**: [CAT-1587](https://linear.app/n8n/issue/CAT-1587/migrate-all-packages-except-cli-to-use-vitest)
> **Driver**: Need `test.extend` functionality for integration testing (go/no-go requirement)

## Executive Summary

Migrating from Jest to Vitest is blocked by a toolchain conflict: Vitest uses esbuild which doesn't support TypeScript decorator metadata (`emitDecoratorMetadata`). The workaround (using SWC via `unplugin-swc`) causes side effects that break Vue transpilation in the monorepo due to dependency hoisting.

**Constraints**:
- Must keep decorators (used extensively in backend DI)
- Must drop Jest (need Vitest's `test.extend` for integration testing)
- Must not break frontend build/transpilation

---

## Table of Contents

1. [Current State](#current-state)
2. [The Core Problem](#the-core-problem)
3. [Previous Attempts (Failed)](#previous-attempts-failed)
4. [Research Findings](#research-findings)
5. [Potential Solutions](#potential-solutions)
6. [Investigation Plan](#investigation-plan)
7. [Technical References](#technical-references)

---

## Current State

### Package Distribution

| Category | Count | Notes |
|----------|-------|-------|
| Jest packages | 24 | Most backend packages |
| Vitest packages | 3 | `@n8n/crdt`, `workflow`, `editor-ui` |
| Total test files | ~2,400+ | Across all packages |
| Jest config files | 25 | Various formats |

### Packages Using Jest

```
./package.json (root)
./packages/core/package.json
./packages/nodes-base/package.json
./packages/@n8n/backend-common/package.json
./packages/@n8n/di/package.json
./packages/@n8n/config/package.json
./packages/@n8n/decorators/package.json
./packages/@n8n/nodes-langchain/package.json
./packages/@n8n/ai-workflow-builder.ee/package.json
./packages/@n8n/json-schema-to-zod/package.json
./packages/@n8n/codemirror-lang-sql/package.json
./packages/@n8n/permissions/package.json
./packages/@n8n/stylelint-config/package.json
./packages/@n8n/codemirror-lang/package.json
./packages/@n8n/api-types/package.json
./packages/@n8n/client-oauth2/package.json
./packages/@n8n/db/package.json
./packages/@n8n/task-runner/package.json
./packages/@n8n/syslog-client/package.json
./packages/cli/package.json
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

### Problem Chain

```
1. Vitest uses esbuild for transpilation
2. esbuild does NOT support emitDecoratorMetadata (and never will)
3. Backend packages use TypeScript decorators with metadata (DI system)
4. Solution: Use unplugin-swc to add SWC support to Vitest
5. Problem: Adding @swc/core triggers ts-node to use it
6. ts-node has @swc/core as an optional dependency
7. With shamefully-hoist=true, @swc/core gets hoisted to root
8. ts-node auto-detects and uses SWC instead of tsc
9. SWC transpilation breaks Vue components
10. E2E tests fail due to misrendered components
```

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

### Phase 1: Quick Wins (Try First)

| # | Test | How | Success Criteria |
|---|------|-----|------------------|
| 1 | `ignoredOptionalDependencies` | Add to pnpm-workspace.yaml, install, run e2e | Vue components render correctly |
| 2 | Remove ts-node check | Audit codebase for ts-node usage | Confirm it's removable |
| 3 | vite-plugin-swc-transform | Swap plugin in test package | Tests pass, no side effects |

### Phase 2: If Quick Wins Fail

| # | Test | How |
|---|------|-----|
| 4 | Per-package swc install | Restructure dependencies |
| 5 | Injected dependencies | Add dependenciesMeta config |
| 6 | Custom .pnpmfile.cjs | Hook into resolution |

### Phase 3: Validation

For any successful approach:
1. Migrate one small package (`@n8n/decorators`)
2. Run full e2e suite
3. Run frontend build
4. Check bundle sizes
5. Verify no runtime errors

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

---

## Next Steps

1. [ ] Test `ignoredOptionalDependencies` approach
2. [ ] Audit ts-node usage in codebase
3. [ ] Create test branch with `@n8n/decorators` migration
4. [ ] Run e2e validation
5. [ ] Document results in this file
