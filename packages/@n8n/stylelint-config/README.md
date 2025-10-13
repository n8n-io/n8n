# @n8n/stylelint-config

Stylelint configuration for n8n projects with custom CSS variable naming convention enforcement.

## Features

- Pre-configured stylelint rules for SCSS/Sass and Vue files
- Custom CSS variable naming convention based on the [proposal.md](../../../proposal.md)
- Automatic enforcement via pre-commit hooks
- CI/CD integration

## Installation

This package is already configured in n8n frontend packages. To use it in a new package:

```json
{
  "devDependencies": {
    "@n8n/stylelint-config": "workspace:*"
  }
}
```

## Usage

Create a `stylelint.config.mjs` file:

```javascript
import { baseConfig } from '@n8n/stylelint-config/base';

export default baseConfig;
```

Add scripts to your `package.json`:

```json
{
  "scripts": {
    "lint:styles": "stylelint \"src/**/*.{scss,sass,vue}\" --cache",
    "lint:styles:fix": "stylelint \"src/**/*.{scss,sass,vue}\" --fix --cache"
  }
}
```

## CSS Variable Naming Convention

The `@n8n/css-var-naming` rule enforces a structured naming pattern for CSS custom properties (variables).

### Pattern Structure

```
--[namespace--][component[--part]--]property--value[--variant][--state][--mode][--media]
```

**Required groups:**
- `property`: Property name from vocabulary (color, background, spacing, etc.)
- `value`: Semantic name or scale value

**Optional groups (in order):**
- `namespace`: `n8n`, `chat`, or `p` (for primitives)
- `component`: Component name (e.g., `button`, `input`)
- `part`: Sub-component (e.g., `menu`, `tab`, `arrow`)
- `variant`: Visual style (e.g., `solid`, `outline`, `ghost`)
- `state`: Interaction state (e.g., `hover`, `active`, `focus`, `disabled`)
- `mode`: Theme/environment (e.g., `light`, `dark`, `hc`)
- `media`: Breakpoint (e.g., `sm`, `md`, `lg`)

### Rules

1. **Pattern**: Double dash `--` between groups, single dash `-` within groups (kebab-case)
2. **Case**: Lowercase alphanumerics only
3. **Groups**: Minimum 2, maximum 8 groups
4. **Order**: Groups must follow the canonical order shown above

### Valid Examples

```css
/* Global tokens */
--color--primary: #0d6efd;
--spacing--md: 20px;
--text-color--muted: #888;

/* With namespace */
--n8n--color--primary: #0d6efd;
--chat--button--background--primary: #0d6efd;
--p--color--primary-500: #0d6efd;
--p--color--gray-740: #2e3440;

/* Component tokens */
--button--background--primary: #0d6efd;
--button--text-color--on-primary: #fff;
--tabs--tab--text-color--muted: #888;

/* With states */
--button--background--primary--hover: #0b5ed7;
--input--border-color--primary--focus: blue;

/* With variants */
--button--background--primary--solid: #0d6efd;
--button--background--primary--outline: transparent;

/* With variants and states */
--button--background--primary--solid--hover: #0b5ed7;
--button--background--primary--outline--focus: rgba(13, 110, 253, 0.5);

/* With modes */
--color--primary--dark: #66a3ff;
--background--surface--dark: #000;

/* Complex patterns */
--n8n--button--background--primary--solid--hover--dark: #0a58ca;
```

### Invalid Examples

```css
/* ❌ Single dash between groups */
--color-primary: #0d6efd;

/* ❌ Only one group */
--primary: #0d6efd;

/* ❌ Uppercase letters */
--Color--Primary: #0d6efd;

/* ❌ Missing property from vocabulary */
--button--main--primary: #0d6efd;

/* ❌ Invalid value (too short) */
--color--xyz: #0d6efd;

/* ❌ Wrong order (state before variant) */
--button--background--primary--hover--solid: #0d6efd;

/* ❌ Missing required property */
--p--gray-740: #2e3440;
```

## Property Vocabulary

The following properties are recognized:

| Property | CSS Mapping | Description |
|----------|-------------|-------------|
| `color` | `color` | Text/element color |
| `text-color` | `color` | Text-specific color |
| `background` | `background-color` | Background color |
| `border-color` | `border-color` | Border color |
| `border-width` | `border-width` | Border width |
| `icon-color` | `fill`/`stroke` | Icon color |
| `radius` | `border-radius` | Border radius |
| `shadow` | `box-shadow` | Box shadow |
| `spacing` | `margin`/`padding` | Spacing scale |
| `font-size` | `font-size` | Font size |
| `font-weight` | `font-weight` | Font weight |
| `line-height` | `line-height` | Line height |
| `z` | `z-index` | Z-index |
| `duration` | `transition-duration` | Animation duration |
| `easing` | `transition-timing-function` | Animation easing |
| `outline-color` | `outline-color` | Outline color |
| `outline-width` | `outline-width` | Outline width |

## Value Types

### Semantic Values

Use semantic names for values when possible:

- **Colors**: `primary`, `secondary`, `success`, `warning`, `danger`, `info`, `muted`, `surface`, `on-primary`, `on-surface`
- **Variants**: `solid`, `outline`, `ghost`, `link`, `soft`, `subtle`
- **States**: `hover`, `active`, `focus`, `focus-visible`, `visited`, `disabled`, `selected`, `checked`, `invalid`, `opened`, `closed`, `loading`
- **Modes**: `light`, `dark`, `hc` (high-contrast), `rtl`, `print`

### Scale Values

Use scale values for sizes and spacing:

- **Size scales**: `none`, `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`
- **Special**: `pill`, `full`
- **Font weights**: `regular`, `medium`, `semibold`, `bold`
- **Numeric scales**: `primary-100`, `primary-500`, `danger-700`

### Custom Values

Descriptive value names with 4+ characters are also accepted:
- `base`, `thin`, `thick`, `fast`, `slow`, `modal`, `tooltip`, `purple`, `teal`

## Usage in CSS/SCSS/Vue

### Global Tokens

Define global design tokens in a central location:

```scss
:root {
  --color--primary: #0d6efd;
  --color--secondary: #6c757d;
  --spacing--sm: 8px;
  --spacing--md: 16px;
  --spacing--lg: 24px;
}
```

### Component Tokens

Create component-specific tokens that reference globals:

```scss
:root {
  --button--background--primary: var(--color--primary);
  --button--text-color--on-primary: #ffffff;
  --button--radius--md: var(--radius--md);
  --button--padding--md: var(--spacing--md);
}
```

### Usage in Components

```scss
.button {
  background: var(--button--background--primary);
  color: var(--button--text-color--on-primary);
  border-radius: var(--button--radius--md);
  padding: var(--button--padding--md);

  &:hover {
    background: var(--button--background--primary--hover);
  }
}
```

### Theming

Override variables for different themes:

```scss
:root {
  --color--primary: #0d6efd;
  --color--surface: #ffffff;
  --button--background--primary: var(--color--primary);
}

:root[data-theme="dark"] {
  --color--primary: #66a3ff;
  --color--surface: #0f1115;
  /* button tokens automatically update through var() references */
}
```

### Namespaced Tokens

Use namespaces for cross-app libraries:

```scss
/* In @n8n/design-system */
:root {
  --n8n--color--primary: #ff6d5a;
  --n8n--button--background--primary: var(--n8n--color--primary);
}

/* In @n8n/chat */
:root {
  --chat--color--primary: #0d6efd;
  --chat--button--background--primary: var(--chat--color--primary);
}
```

## CI/CD Integration

The stylelint rule runs automatically in:

1. **Pre-commit hooks** (via lefthook):
   - Validates CSS variables before commit
   - Auto-fixes issues when possible

2. **GitHub Actions CI**:
   - Runs on all pull requests
   - Blocks merging if violations are found

## Development

### Running Tests

```bash
cd packages/@n8n/stylelint-config
pnpm test
```

### Building

```bash
pnpm build
```

### Testing the Rule

```bash
# Test on a specific file
pnpm stylelint "path/to/file.scss" --config stylelint.config.mjs

# Test with auto-fix
pnpm stylelint "path/to/file.scss" --fix --config stylelint.config.mjs
```

## Troubleshooting

### Common Issues

**Issue**: Rule not being applied
- **Solution**: Make sure package is built: `pnpm build`

**Issue**: Too many violations in existing codebase
- **Solution**: Use `--fix` to auto-fix pattern issues, or add `/* stylelint-disable @n8n/css-var-naming */` temporarily

**Issue**: False positive for a valid pattern
- **Solution**: Check the pattern follows the canonical structure. If it's a legitimate case, please file an issue.

### Disabling the Rule

To disable for a specific line:
```css
/* stylelint-disable-next-line @n8n/css-var-naming */
--legacy-var-name: value;
```

To disable for a file:
```css
/* stylelint-disable @n8n/css-var-naming */
```

To disable in config (not recommended):
```javascript
export default {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    '@n8n/css-var-naming': null,
  },
};
```

## References

- [Stylelint Documentation](https://stylelint.io/)
- [n8n Design System](../frontend/@n8n/design-system/)

## Contributing

When modifying the rule:

1. Update the rule in `src/rules/css-var-naming.ts`
2. Add/update tests in `src/rules/css-var-naming.test.ts`
3. Run tests: `pnpm test`
4. Build: `pnpm build`
5. Update this README if needed

All tests must pass before submitting changes.
