# 🔍 Pre-Push Build Validation Guide

## TL;DR - Catch Build Errors Before Production

```bash
# Run this before every git push:
./scripts/validate-build.sh
```

## VSCode Quick Access

1. Press `F5` (or click "Run and Debug" sidebar)
2. Select from dropdown:
   - **"Build: Check for Errors (Quick)"** ← Use this 90% of the time
   - **"Build: Full Validation"** ← Before major releases
   - **"TypeCheck: All Packages"** ← Type errors only

3. Watch the terminal for errors

## What Gets Validated

### ✅ Layer 1: Critical Package Builds
- `@n8n/api-types` - All DTO/interface definitions
- `n8n` (CLI) - Main server package

**Time**: ~2-3 minutes
**Why**: These packages break production if they fail

### ✅ Layer 2: TypeScript Type Checking
- Validates all type definitions
- Catches missing imports/exports
- Finds interface mismatches

**Time**: ~1 minute
**Why**: Prevents runtime type errors

### ✅ Layer 3: Code Formatting
- Biome formatter (primary)
- Prettier fallback
- Auto-fixes style issues

**Time**: ~10 seconds
**Why**: Keeps code consistent

## Common Build Errors & Fixes

### 1. Missing Export Error
```
error TS2305: Module '"@n8n/api-types"' has no exported member 'RenameDataTableColumnDto'
```

**Fix**:
```typescript
// In packages/@n8n/api-types/src/dto/index.ts
export { RenameDataTableColumnDto } from './data-table/rename-data-table-column.dto';
```

### 2. Missing Import Error
```
error TS2552: Cannot find name 'DataTableColumnNotFoundError'
```

**Fix**:
```typescript
// In the file showing the error
import { DataTableColumnNotFoundError } from './errors/data-table-column-not-found.error';
```

### 3. Zod Type Compatibility Errors
```
error TS2740: Type 'ZodObject<...>' is missing properties from type 'ZodObject<...>'
```

**Fix**: Usually safe to ignore if:
- ✅ You didn't modify the affected file
- ✅ `pnpm dev` runs without errors
- ✅ No runtime issues occur

**Root Cause**: Upstream zod/zod-class version conflicts

## Manual Validation Commands

```bash
# Quick validation (recommended)
pnpm build --filter @n8n/api-types --filter n8n

# Full build (all packages)
pnpm build

# Type check only
pnpm typecheck

# Lint CLI package
cd packages/cli && pnpm lint

# Format code
pnpm biome check --write
pnpm prettier --write "src/**/*.ts"
```

## VSCode Tasks (Ctrl+Shift+B)

1. Press `Ctrl+Shift+B` (Build Tasks)
2. Select:
   - **"Build: Quick Check"** - Fast validation
   - **"Build: Full"** - Complete build
   - **"TypeCheck: CLI Package"** - Just type checking
   - **"Pre-Push: Full Validation"** - All checks in sequence

## Integration with Git Hooks

### Option 1: Manual Pre-Push Check
```bash
# Before git push:
./scripts/validate-build.sh && git push
```

### Option 2: Automatic (Optional)
```bash
# Create .git/hooks/pre-push
#!/bin/bash
./scripts/validate-build.sh
```

## Performance Tips

### Speed Up Validation
```bash
# Skip node_modules install if unchanged
pnpm build --filter @n8n/api-types --filter n8n --no-frozen-lockfile

# Use turbo cache
export TURBO_CACHE_DIR=.turbo/cache
```

### Parallel Checks
```bash
# Run type checking while building
pnpm typecheck & pnpm build --filter n8n
```

## Troubleshooting

### "Command not found: pnpm"
```bash
npm install -g pnpm@latest
```

### Build hangs/freezes
```bash
# Kill all node processes
pkill -9 node

# Clear turbo cache
rm -rf .turbo node_modules/.cache

# Reinstall
pnpm install
```

### Type errors won't go away
```bash
# Restart TypeScript server in VSCode
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

## Logs Location

All validation logs are saved to `/tmp/`:
- `/tmp/n8n-build-quick.log` - Build output
- `/tmp/n8n-typecheck.log` - Type checking results

View with:
```bash
tail -50 /tmp/n8n-build-quick.log
```

## Success Criteria

Before pushing to production, ensure:
- ✅ `./scripts/validate-build.sh` exits with code 0
- ✅ No TypeScript errors in files you modified
- ✅ `pnpm dev` runs successfully
- ✅ Manual testing shows no regressions

## Questions?

See [scripts/README.md](scripts/README.md) for more details.
