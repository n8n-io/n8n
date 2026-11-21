# Developer Handoff Guide

Reference for integrating design tokens into development workflows and design tool collaboration.

---

## Table of Contents

- [Export Formats](#export-formats)
- [Integration Patterns](#integration-patterns)
- [Framework Setup](#framework-setup)
- [Design Tool Integration](#design-tool-integration)
- [Handoff Checklist](#handoff-checklist)

---

## Export Formats

### JSON (Recommended for Most Projects)

**File:** `design-tokens.json`

```json
{
  "meta": {
    "version": "1.0.0",
    "style": "modern",
    "generated": "2024-01-15"
  },
  "colors": {
    "primary": {
      "50": "#E6F2FF",
      "100": "#CCE5FF",
      "500": "#0066CC",
      "900": "#002855"
    }
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter, system-ui, sans-serif",
      "mono": "Fira Code, monospace"
    },
    "fontSize": {
      "xs": "10px",
      "sm": "13px",
      "base": "16px",
      "lg": "20px"
    }
  },
  "spacing": {
    "0": "0px",
    "1": "4px",
    "2": "8px",
    "4": "16px"
  }
}
```

**Use Case:** JavaScript/TypeScript projects, build tools, Figma plugins

### CSS Custom Properties

**File:** `design-tokens.css`

```css
:root {
  /* Colors */
  --color-primary-50: #E6F2FF;
  --color-primary-100: #CCE5FF;
  --color-primary-500: #0066CC;
  --color-primary-900: #002855;

  /* Typography */
  --font-family-sans: Inter, system-ui, sans-serif;
  --font-family-mono: Fira Code, monospace;
  --font-size-xs: 10px;
  --font-size-sm: 13px;
  --font-size-base: 16px;
  --font-size-lg: 20px;

  /* Spacing */
  --spacing-0: 0px;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-4: 16px;
}
```

**Use Case:** Plain CSS, CSS-in-JS, any web project

### SCSS Variables

**File:** `_design-tokens.scss`

```scss
// Colors
$color-primary-50: #E6F2FF;
$color-primary-100: #CCE5FF;
$color-primary-500: #0066CC;
$color-primary-900: #002855;

// Typography
$font-family-sans: Inter, system-ui, sans-serif;
$font-family-mono: Fira Code, monospace;
$font-size-xs: 10px;
$font-size-sm: 13px;
$font-size-base: 16px;
$font-size-lg: 20px;

// Spacing
$spacing-0: 0px;
$spacing-1: 4px;
$spacing-2: 8px;
$spacing-4: 16px;

// Maps for programmatic access
$colors-primary: (
  '50': $color-primary-50,
  '100': $color-primary-100,
  '500': $color-primary-500,
  '900': $color-primary-900
);
```

**Use Case:** SASS/SCSS pipelines, component libraries

---

## Integration Patterns

### Pattern 1: CSS Variables (Universal)

Works with any framework or vanilla CSS.

```css
/* Import tokens */
@import 'design-tokens.css';

/* Use in styles */
.button {
  background-color: var(--color-primary-500);
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-base);
  border-radius: var(--radius-md);
}

.button:hover {
  background-color: var(--color-primary-600);
}
```

### Pattern 2: JavaScript Theme Object

For CSS-in-JS libraries (styled-components, Emotion, etc.)

```typescript
// theme.ts
import tokens from './design-tokens.json';

export const theme = {
  colors: {
    primary: tokens.colors.primary,
    secondary: tokens.colors.secondary,
    neutral: tokens.colors.neutral,
    semantic: tokens.colors.semantic
  },
  typography: {
    fontFamily: tokens.typography.fontFamily,
    fontSize: tokens.typography.fontSize,
    fontWeight: tokens.typography.fontWeight
  },
  spacing: tokens.spacing,
  shadows: tokens.shadows,
  radii: tokens.borders.radius
};

export type Theme = typeof theme;
```

```typescript
// styled-components usage
import styled from 'styled-components';

const Button = styled.button`
  background: ${({ theme }) => theme.colors.primary['500']};
  padding: ${({ theme }) => theme.spacing['2']} ${({ theme }) => theme.spacing['4']};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`;
```

### Pattern 3: Tailwind Config

```javascript
// tailwind.config.js
const tokens = require('./design-tokens.json');

module.exports = {
  theme: {
    colors: {
      primary: tokens.colors.primary,
      secondary: tokens.colors.secondary,
      neutral: tokens.colors.neutral,
      success: tokens.colors.semantic.success,
      warning: tokens.colors.semantic.warning,
      error: tokens.colors.semantic.error
    },
    fontFamily: {
      sans: [tokens.typography.fontFamily.sans],
      serif: [tokens.typography.fontFamily.serif],
      mono: [tokens.typography.fontFamily.mono]
    },
    spacing: {
      0: tokens.spacing['0'],
      1: tokens.spacing['1'],
      2: tokens.spacing['2'],
      // ... etc
    },
    borderRadius: tokens.borders.radius,
    boxShadow: tokens.shadows
  }
};
```

---

## Framework Setup

### React + CSS Variables

```tsx
// App.tsx
import './design-tokens.css';
import './styles.css';

function App() {
  return (
    <button className="btn btn-primary">
      Click me
    </button>
  );
}
```

```css
/* styles.css */
.btn {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  transition: background-color var(--animation-duration-fast);
}

.btn-primary {
  background: var(--color-primary-500);
  color: var(--color-surface-background);
}

.btn-primary:hover {
  background: var(--color-primary-600);
}
```

### React + styled-components

```tsx
// ThemeProvider.tsx
import { ThemeProvider } from 'styled-components';
import { theme } from './theme';

export function AppThemeProvider({ children }) {
  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
}
```

```tsx
// Button.tsx
import styled from 'styled-components';

export const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => `${theme.spacing['2']} ${theme.spacing['4']}`};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  border-radius: ${({ theme }) => theme.radii.md};

  ${({ variant = 'primary', theme }) => variant === 'primary' && `
    background: ${theme.colors.primary['500']};
    color: ${theme.colors.surface.background};

    &:hover {
      background: ${theme.colors.primary['600']};
    }
  `}
`;
```

### Vue + CSS Variables

```vue
<!-- App.vue -->
<template>
  <button class="btn btn-primary">Click me</button>
</template>

<style>
@import './design-tokens.css';

.btn {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-base);
  border-radius: var(--radius-md);
}

.btn-primary {
  background: var(--color-primary-500);
  color: var(--color-surface-background);
}
</style>
```

### Next.js + Tailwind

```javascript
// tailwind.config.js
const tokens = require('./design-tokens.json');

module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: {
        sans: tokens.typography.fontFamily.sans.split(', ')
      }
    }
  }
};
```

```tsx
// page.tsx
export default function Page() {
  return (
    <button className="bg-primary-500 hover:bg-primary-600 px-4 py-2 rounded-md text-white">
      Click me
    </button>
  );
}
```

---

## Design Tool Integration

### Figma

**Option 1: Tokens Studio Plugin**
1. Install "Tokens Studio for Figma" plugin
2. Import `design-tokens.json`
3. Tokens sync automatically with Figma styles

**Option 2: Figma Variables (Native)**
1. Open Variables panel
2. Create collections matching token structure
3. Import JSON via plugin or API

**Sync Workflow:**
```
design_token_generator.py
        ↓
design-tokens.json
        ↓
Tokens Studio Plugin
        ↓
Figma Styles & Variables
```

### Storybook

```javascript
// .storybook/preview.js
import '../design-tokens.css';

export const parameters = {
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#FFFFFF' },
      { name: 'dark', value: '#111827' }
    ]
  }
};
```

```javascript
// Button.stories.tsx
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Button'
  }
};
```

### Design Tool Comparison

| Tool | Token Format | Sync Method |
|------|--------------|-------------|
| Figma | JSON | Tokens Studio plugin / Variables |
| Sketch | JSON | Craft / Shared Styles |
| Adobe XD | JSON | Design Tokens plugin |
| InVision DSM | JSON | Native import |
| Zeroheight | JSON/CSS | Direct import |

---

## Handoff Checklist

### Token Generation

- [ ] Brand color defined
- [ ] Style selected (modern/classic/playful)
- [ ] Tokens generated: `python scripts/design_token_generator.py "#0066CC" modern`
- [ ] All formats exported (JSON, CSS, SCSS)

### Developer Setup

- [ ] Token files added to project
- [ ] Build pipeline configured
- [ ] Theme/CSS variables imported
- [ ] Hot reload working for token changes

### Design Sync

- [ ] Figma/design tool updated with tokens
- [ ] Component library aligned
- [ ] Documentation generated
- [ ] Storybook stories created

### Validation

- [ ] Colors render correctly
- [ ] Typography scales properly
- [ ] Spacing matches design
- [ ] Responsive breakpoints work
- [ ] Dark mode tokens (if applicable)

### Documentation Deliverables

| Document | Contents |
|----------|----------|
| `design-tokens.json` | All tokens in JSON |
| `design-tokens.css` | CSS custom properties |
| `_design-tokens.scss` | SCSS variables |
| `README.md` | Usage instructions |
| `CHANGELOG.md` | Token version history |

---

## Version Control

### Token Versioning

```json
{
  "meta": {
    "version": "1.2.0",
    "style": "modern",
    "generated": "2024-01-15",
    "changelog": [
      "1.2.0 - Added animation tokens",
      "1.1.0 - Updated primary color",
      "1.0.0 - Initial release"
    ]
  }
}
```

### Breaking Change Policy

| Change Type | Version Bump | Migration |
|-------------|--------------|-----------|
| Add new token | Patch (1.0.x) | None |
| Change token value | Minor (1.x.0) | Optional |
| Rename/remove token | Major (x.0.0) | Required |

---

*See also: `token-generation.md` for generation options*
