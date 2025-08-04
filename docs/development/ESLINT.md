# ESLint Configuration Guide

This document explains the ESLint configuration for the n8n monorepo, including setup, usage, and customization.

## Overview

n8n uses ESLint v9 with a modern flat configuration system optimized for performance and maintainability across the monorepo structure. The configuration is designed with:

- **Performance-first approach**: Optimized ignores and minimal root configuration
- **Package delegation**: Individual packages manage their own linting rules
- **Modern standards**: ESLint v9 flat config with TypeScript support
- **Comprehensive coverage**: From Node.js backend to Vue.js frontend

## Architecture

### Root Configuration (`eslint.config.js`)

The root configuration is minimal and performance-optimized, focusing only on:
- Global ignores for build outputs, dependencies, and generated files
- Basic rules for root-level configuration files
- Package delegation to individual `eslint.config.mjs` files

```javascript
// Root handles only *.js, *.mjs, *.cjs at project root
// Packages handle their own TypeScript and specialized configurations
```

### Package-Level Configuration

Each package defines its own ESLint configuration using the shared `@n8n/eslint-config` package:

```javascript
// packages/cli/eslint.config.mjs
import { nodeConfig } from '@n8n/eslint-config/node';

export default [
  ...nodeConfig,
  // Package-specific overrides
];
```

## Available Configurations

The `@n8n/eslint-config` package provides several preset configurations:

### 1. Base Configuration (`@n8n/eslint-config/base`)
- Core ESLint rules and TypeScript support
- Import/export validation
- Basic code quality rules

### 2. Node.js Configuration (`@n8n/eslint-config/node`)
- Extends base configuration
- Node.js-specific rules and globals
- Server-side best practices
- Used by: `cli`, `core`, `workflow`, etc.

### 3. Frontend Configuration (`@n8n/eslint-config/frontend`)
- Extends base configuration
- Vue.js and browser-specific rules
- Frontend development patterns
- Used by: `editor-ui`, `design-system`, etc.

### 4. Strict Configuration (`@n8n/eslint-config/strict`)
- Most restrictive ruleset
- Enhanced type safety
- Performance and security focused
- Used for critical packages

### 5. Custom Plugin (`@n8n/eslint-config/plugin`)
- n8n-specific custom rules
- Domain-specific validations
- Business logic enforcement

## Running ESLint

### Available Commands

```bash
# Lint all packages (recommended)
npm run lint

# Lint with auto-fix
npm run lint:fix

# Fast linting (performance optimized)
npm run lint:fast

# Lint only affected files (git-based)
npm run lint:affected

# Performance testing
npm run lint:perf
```

### Package-Specific Linting

```bash
# Lint specific package
cd packages/cli
npx eslint .

# Lint with fix
cd packages/cli
npx eslint . --fix
```

## Performance Optimizations

### Global Ignores

The root configuration includes comprehensive ignores for:

- **Build outputs**: `dist/`, `build/`, `coverage/`, `.turbo/`
- **Dependencies**: `node_modules/`, package lock files
- **Generated files**: `*.d.ts`, `*.min.js`, bundles
- **Media and data**: Images, fonts, JSON, YAML
- **Development artifacts**: IDE files, logs, cache

### Selective Processing

- Root only processes configuration files
- Packages handle their own TypeScript compilation
- No redundant parsing of large files

### CI Optimizations

```bash
# CI uses optimized worker allocation
maxWorkers: process.env.CI ? 2 : '50%'
```

## Adding ESLint to New Packages

### 1. Create Package Configuration

```javascript
// packages/your-package/eslint.config.mjs
import { nodeConfig } from '@n8n/eslint-config/node';
// or { frontendConfig } from '@n8n/eslint-config/frontend';

export default [
  ...nodeConfig,
  {
    ignores: [
      // Package-specific ignores
      'dist/**',
      'coverage/**',
    ],
  },
  {
    rules: {
      // Package-specific rule overrides
      'complexity': 'warn',
    },
  },
];
```

### 2. Add Lint Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### 3. Configure IDE Integration

Most IDEs will automatically detect the ESLint configuration. For optimal experience:

#### VS Code
```json
// .vscode/settings.json
{
  "eslint.validate": [
    "javascript", 
    "typescript", 
    "vue"
  ],
  "eslint.workingDirectories": ["packages/*"]
}
```

## Rule Customization

### Temporary Rule Adjustments

During refactoring or migration, you can temporarily adjust rules:

```javascript
{
  rules: {
    // Temporarily downgrade to warnings during migration
    'no-console': 'warn',
    'prefer-const': 'warn',
    
    // Disable problematic rules during refactoring
    'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
  },
}
```

### Package-Specific Overrides

```javascript
{
  rules: {
    // Increase complexity limit for CLI package
    'complexity': ['warn', { max: 15 }],
    
    // Allow console in development tools
    'no-console': process.env.NODE_ENV === 'development' ? 'off' : 'error',
  },
}
```

## Custom Rules

n8n includes custom ESLint rules for domain-specific validation:

### Available Custom Rules

- `n8n-local-rules/misplaced-n8n-typeorm-import`: Ensures correct TypeORM imports
- `n8n-local-rules/no-type-unsafe-event-emitter`: Type-safe event emitter usage

### Adding Custom Rules

Custom rules are defined in `packages/@n8n/eslint-config/src/plugin.ts`:

```typescript
export const plugin = {
  rules: {
    'your-custom-rule': {
      meta: {
        type: 'problem',
        docs: { description: 'Your rule description' },
      },
      create(context) {
        // Rule implementation
      },
    },
  },
};
```

## Troubleshooting

### Common Issues

#### 1. "No files matching the pattern were found"
**Cause**: ESLint ignores are too broad or misconfigured.

**Solution**: Check package-specific ignores and ensure source files aren't ignored.

#### 2. "Parsing error: Cannot find module"
**Cause**: TypeScript project configuration issues.

**Solution**: Verify `tsconfig.json` exists and is properly configured.

#### 3. "Rule 'rule-name' is deprecated"
**Cause**: Using outdated rule names.

**Solution**: Update to modern rule equivalents or disable deprecated rules.

### Performance Issues

#### 1. Slow linting
- Check for large ignored directories in global config
- Use `npm run lint:fast` for faster execution
- Consider running `npm run lint:affected` for incremental linting

#### 2. Memory issues
- Reduce worker count: `--max-workers=2`
- Increase Node.js memory: `node --max-old-space-size=4096`

### Configuration Debugging

```bash
# Check effective configuration
npx eslint --print-config src/index.ts

# Inspect ignored files
npx eslint --debug src/

# Test specific rules
npx eslint --rule 'no-console: error' src/index.ts
```

## Migration Guide

### From Legacy ESLint Config

If migrating from an older ESLint setup:

1. **Remove legacy files**: `.eslintrc.*`, `eslint.config.json`
2. **Install dependencies**: `@n8n/eslint-config`
3. **Create flat config**: `eslint.config.mjs`
4. **Update scripts**: Use modern CLI flags
5. **Test configuration**: Run `npm run lint`

### Updating Rules

When updating ESLint or rule configurations:

1. **Test changes locally**: Run full lint suite
2. **Check CI impact**: Monitor build times
3. **Document breaking changes**: Update this guide
4. **Communicate changes**: Notify development team

## Best Practices

### 1. Performance-First Configuration
- Use global ignores for build outputs
- Minimize root-level processing
- Delegate to package-specific configs

### 2. Incremental Rule Adoption
- Start with warnings for new rules
- Gradually promote to errors
- Use `// TODO:` comments for temporary suppressions

### 3. Consistent Package Structure
- Use appropriate base configuration (`node`, `frontend`, `strict`)
- Apply consistent ignore patterns
- Document package-specific overrides

### 4. CI Integration
- Use `npm run lint:affected` for pull requests
- Cache ESLint results for performance
- Fail builds on errors, allow warnings

## Contributing

When contributing to ESLint configuration:

1. **Test thoroughly**: Ensure no performance regression
2. **Document changes**: Update this guide
3. **Consider impact**: Evaluate effect on existing code
4. **Seek review**: Get approval from maintainers

For questions or suggestions, please refer to the development team or create an issue in the project repository.