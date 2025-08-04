# ESLint Quick Reference

## Common Commands

```bash
# Lint all packages
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Fast linting (optimized)
npm run lint:fast

# Lint only changed files
npm run lint:affected
```

## Package Structure

- **Root config**: `eslint.config.js` - minimal, performance-optimized
- **Package configs**: `packages/*/eslint.config.mjs` - package-specific rules
- **Shared configs**: `@n8n/eslint-config/*` - reusable configurations

## Available Configurations

- `@n8n/eslint-config/base` - Core rules + TypeScript
- `@n8n/eslint-config/node` - Node.js backend packages
- `@n8n/eslint-config/frontend` - Vue.js frontend packages
- `@n8n/eslint-config/strict` - Most restrictive rules

## Adding ESLint to New Package

```javascript
// packages/your-package/eslint.config.mjs
import { nodeConfig } from '@n8n/eslint-config/node';

export default [
  ...nodeConfig,
  {
    rules: {
      // Your overrides
    },
  },
];
```

## Troubleshooting

- **Slow linting**: Use `npm run lint:fast`
- **Memory issues**: Add `--max-workers=2`
- **Config debugging**: `npx eslint --print-config file.ts`

📖 **Full documentation**: [docs/development/ESLINT.md](docs/development/ESLINT.md)