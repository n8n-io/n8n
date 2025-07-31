# n8n ESLint Configuration

Shared ESLint configurations for the n8n monorepo, providing consistent code quality standards across all packages.

## Available Configurations

### Base Configuration (`@n8n/eslint-config/base`)
Core ESLint rules for TypeScript/JavaScript projects with comprehensive linting standards.

### Node Configuration (`@n8n/eslint-config/node`)
Extends base configuration with Node.js-specific rules and environment settings.

### Frontend Configuration (`@n8n/eslint-config/frontend`)
Extends base configuration with frontend-specific rules including Vue.js support.

### Strict Configuration (`@n8n/eslint-config/strict`)
**NEW**: Stricter rule sets for packages ready to enforce higher code quality standards.

## Using Strict Rules

The strict configuration provides graduated rule enforcement for packages ready to upgrade from warnings to errors.

### Basic Strict Rules

```javascript
// eslint.config.mjs
import { nodeConfig } from '@n8n/eslint-config/node';
import { strictRules } from '@n8n/eslint-config/strict';

export default [
  ...nodeConfig,
  {
    rules: {
      ...strictRules,
      // package-specific overrides
    }
  }
];
```

### Available Strict Rule Sets

1. **`strictRules`** - Safe upgrades from warnings to errors
   - JavaScript core rules (`no-useless-escape`, `prefer-const`, etc.)
   - TypeScript best practices (`prefer-optional-chain`, `no-empty-object-type`)
   - Import organization rules

2. **`extendedStrictRules`** - More aggressive enforcement
   - Includes all `strictRules`
   - High-violation TypeScript rules (`no-unsafe-*` rules)
   - Should only be applied to packages with low violation counts

3. **`securityStrictRules`** - Security-focused rules
   - Prevents common security vulnerabilities
   - Can be applied alongside other rule sets

### Implementation Strategy

**Phase 1: Start with smaller, cleaner packages**
```javascript
// For packages like @n8n/utils, @n8n/errors
import { strictRules } from '@n8n/eslint-config/strict';
```

**Phase 2: Apply to medium-complexity packages**
```javascript
// For most backend packages
import { strictRules, securityStrictRules } from '@n8n/eslint-config/strict';

export default [
  ...nodeConfig,
  {
    rules: {
      ...strictRules,
      ...securityStrictRules,
    }
  }
];
```

**Phase 3: Extended rules for well-maintained packages**
```javascript
// Only for packages with very low violation counts
import { extendedStrictRules } from '@n8n/eslint-config/strict';
```

## Pre-commit Integration

ESLint checks are now integrated into pre-commit hooks via lefthook:

```yaml
# lefthook.yml
pre-commit:
  commands:
    eslint_check:
      glob: 'packages/**/*.{js,ts,vue}'
      run: pnpm eslint --fix --max-warnings 0 {staged_files}
      stage_fixed: true
```

This ensures:
- Code is automatically fixed where possible
- No warnings are allowed in committed code
- Consistent code style across the monorepo

## Migration Guidelines

### From Warnings to Errors

1. **Identify Current Violations**
   ```bash
   pnpm eslint packages/your-package --format=compact
   ```

2. **Apply Strict Rules Gradually**
   - Start with `strictRules`
   - Fix violations as they're identified
   - Gradually add more restrictive rule sets

3. **Package-by-Package Approach**
   - Begin with packages that have few violations
   - Apply stricter rules as packages are cleaned up
   - Use TODO comments to track progress

### Example Migration

```javascript
// Before: Package with warnings
export default [
  ...nodeConfig,
  {
    rules: {
      'prefer-const': 'warn',           // TODO: Remove this
      'no-empty': 'warn',               // TODO: Remove this
      'no-useless-escape': 'warn',      // TODO: Remove this
    }
  }
];

// After: Using strict rules
import { strictRules } from '@n8n/eslint-config/strict';

export default [
  ...nodeConfig,
  {
    rules: {
      ...strictRules,
      // All previous warnings now enforced as errors
    }
  }
];
```

## Benefits

- **Consistent Code Quality**: Uniform standards across all packages
- **Gradual Improvement**: Opt-in strict rules allow incremental upgrades
- **Pre-commit Safety**: Automatic fixing and validation before commits
- **Security Focus**: Dedicated security rules prevent common vulnerabilities
- **Performance**: Optimized configurations reduce linting overhead

## Troubleshooting

### High Violation Counts
If applying strict rules results in many violations:
1. Start with `strictRules` only
2. Fix violations systematically
3. Consider package-specific rule overrides temporarily
4. Document TODO items for future cleanup

### Build Failures
If ESLint checks fail in CI:
1. Run `pnpm eslint --fix` to auto-fix issues
2. Address remaining violations manually
3. Consider temporarily downgrading rules to warnings
4. Update this README with lessons learned