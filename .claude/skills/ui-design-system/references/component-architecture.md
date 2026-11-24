# Component Architecture Guide

Reference for design system component organization, naming conventions, and documentation patterns.

---

## Table of Contents

- [Component Hierarchy](#component-hierarchy)
- [Naming Conventions](#naming-conventions)
- [Component Documentation](#component-documentation)
- [Variant Patterns](#variant-patterns)
- [Token Integration](#token-integration)

---

## Component Hierarchy

### Atomic Design Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT HIERARCHY                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TOKENS (Foundation)                                        │
│    └── Colors, Typography, Spacing, Shadows                 │
│                                                             │
│  ATOMS (Basic Elements)                                     │
│    └── Button, Input, Icon, Label, Badge                    │
│                                                             │
│  MOLECULES (Simple Combinations)                            │
│    └── FormField, SearchBar, Card, ListItem                 │
│                                                             │
│  ORGANISMS (Complex Components)                             │
│    └── Header, Footer, DataTable, Modal                     │
│                                                             │
│  TEMPLATES (Page Layouts)                                   │
│    └── DashboardLayout, AuthLayout, SettingsLayout          │
│                                                             │
│  PAGES (Specific Instances)                                 │
│    └── HomePage, LoginPage, UserProfile                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Primitives** | Base HTML wrapper | Box, Text, Flex, Grid |
| **Inputs** | User interaction | Button, Input, Select, Checkbox |
| **Display** | Content presentation | Card, Badge, Avatar, Icon |
| **Feedback** | User feedback | Alert, Toast, Progress, Skeleton |
| **Navigation** | Route management | Link, Menu, Tabs, Breadcrumb |
| **Overlay** | Layer above content | Modal, Drawer, Popover, Tooltip |
| **Layout** | Structure | Stack, Container, Divider |

---

## Naming Conventions

### Token Naming

```
{category}-{property}-{variant}-{state}

Examples:
  color-primary-500
  color-primary-500-hover
  spacing-md
  fontSize-lg
  shadow-md
  radius-lg
```

### Component Naming

```
{ComponentName}             # PascalCase for components
{componentName}{Variant}    # Variant suffix

Examples:
  Button
  ButtonPrimary
  ButtonOutline
  ButtonGhost
```

### CSS Class Naming (BEM)

```
.block__element--modifier

Examples:
  .button
  .button__icon
  .button--primary
  .button--lg
  .button__icon--loading
```

### File Structure

```
components/
├── Button/
│   ├── Button.tsx           # Main component
│   ├── Button.styles.ts     # Styles/tokens
│   ├── Button.test.tsx      # Tests
│   ├── Button.stories.tsx   # Storybook
│   ├── Button.types.ts      # TypeScript types
│   └── index.ts             # Export
├── Input/
│   └── ...
└── index.ts                 # Barrel export
```

---

## Component Documentation

### Documentation Template

```markdown
# ComponentName

Brief description of what this component does.

## Usage

\`\`\`tsx
import { Button } from '@design-system/components'

<Button variant="primary" size="md">
  Click me
</Button>
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'ghost' | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Component size |
| disabled | boolean | false | Disabled state |
| onClick | () => void | - | Click handler |

## Variants

### Primary
Use for main actions.

### Secondary
Use for secondary actions.

### Ghost
Use for tertiary or inline actions.

## Accessibility

- Uses `button` role by default
- Supports `aria-disabled` for disabled state
- Focus ring visible for keyboard navigation

## Design Tokens Used

- `color-primary-*` for primary variant
- `spacing-*` for padding
- `radius-md` for border radius
- `shadow-sm` for elevation
```

### Props Interface Pattern

```typescript
interface ButtonProps {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';

  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';

  /** Whether button is disabled */
  disabled?: boolean;

  /** Whether button shows loading state */
  loading?: boolean;

  /** Left icon element */
  leftIcon?: React.ReactNode;

  /** Right icon element */
  rightIcon?: React.ReactNode;

  /** Click handler */
  onClick?: () => void;

  /** Button content */
  children: React.ReactNode;
}
```

---

## Variant Patterns

### Size Variants

```typescript
const sizeTokens = {
  sm: {
    height: 'sizing-button-sm-height',    // 32px
    paddingX: 'sizing-button-sm-paddingX', // 12px
    fontSize: 'fontSize-sm',               // 14px
    iconSize: 'sizing-icon-sm'             // 16px
  },
  md: {
    height: 'sizing-button-md-height',    // 40px
    paddingX: 'sizing-button-md-paddingX', // 16px
    fontSize: 'fontSize-base',             // 16px
    iconSize: 'sizing-icon-md'             // 20px
  },
  lg: {
    height: 'sizing-button-lg-height',    // 48px
    paddingX: 'sizing-button-lg-paddingX', // 20px
    fontSize: 'fontSize-lg',               // 18px
    iconSize: 'sizing-icon-lg'             // 24px
  }
};
```

### Color Variants

```typescript
const variantTokens = {
  primary: {
    background: 'color-primary-500',
    backgroundHover: 'color-primary-600',
    backgroundActive: 'color-primary-700',
    text: 'color-white',
    border: 'transparent'
  },
  secondary: {
    background: 'color-neutral-100',
    backgroundHover: 'color-neutral-200',
    backgroundActive: 'color-neutral-300',
    text: 'color-neutral-900',
    border: 'transparent'
  },
  outline: {
    background: 'transparent',
    backgroundHover: 'color-primary-50',
    backgroundActive: 'color-primary-100',
    text: 'color-primary-500',
    border: 'color-primary-500'
  },
  ghost: {
    background: 'transparent',
    backgroundHover: 'color-neutral-100',
    backgroundActive: 'color-neutral-200',
    text: 'color-neutral-700',
    border: 'transparent'
  }
};
```

### State Variants

```typescript
const stateStyles = {
  default: {
    cursor: 'pointer',
    opacity: 1
  },
  hover: {
    // Uses variantTokens backgroundHover
  },
  active: {
    // Uses variantTokens backgroundActive
    transform: 'scale(0.98)'
  },
  focus: {
    outline: 'none',
    boxShadow: '0 0 0 2px color-primary-200'
  },
  disabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
    pointerEvents: 'none'
  },
  loading: {
    cursor: 'wait',
    pointerEvents: 'none'
  }
};
```

---

## Token Integration

### Consuming Tokens in Components

**CSS Custom Properties:**

```css
.button {
  height: var(--sizing-button-md-height);
  padding-left: var(--sizing-button-md-paddingX);
  padding-right: var(--sizing-button-md-paddingX);
  font-size: var(--typography-fontSize-base);
  border-radius: var(--borders-radius-md);
}

.button--primary {
  background-color: var(--colors-primary-500);
  color: var(--colors-surface-background);
}

.button--primary:hover {
  background-color: var(--colors-primary-600);
}
```

**JavaScript/TypeScript:**

```typescript
import tokens from './design-tokens.json';

const buttonStyles = {
  height: tokens.sizing.components.button.md.height,
  paddingLeft: tokens.sizing.components.button.md.paddingX,
  backgroundColor: tokens.colors.primary['500'],
  borderRadius: tokens.borders.radius.md
};
```

**Styled Components:**

```typescript
import styled from 'styled-components';

const Button = styled.button`
  height: ${({ theme }) => theme.sizing.components.button.md.height};
  padding: 0 ${({ theme }) => theme.sizing.components.button.md.paddingX};
  background: ${({ theme }) => theme.colors.primary['500']};
  border-radius: ${({ theme }) => theme.borders.radius.md};

  &:hover {
    background: ${({ theme }) => theme.colors.primary['600']};
  }
`;
```

### Token-to-Component Mapping

| Component | Token Categories Used |
|-----------|----------------------|
| Button | colors, sizing, borders, shadows, typography |
| Input | colors, sizing, borders, spacing |
| Card | colors, borders, shadows, spacing |
| Typography | typography (all), colors |
| Icon | sizing, colors |
| Modal | colors, shadows, spacing, z-index, animation |

---

## Component Checklist

### Before Release

- [ ] All sizes implemented (sm, md, lg)
- [ ] All variants implemented (primary, secondary, etc.)
- [ ] All states working (hover, active, focus, disabled)
- [ ] Keyboard accessible
- [ ] Screen reader tested
- [ ] Uses only design tokens (no hardcoded values)
- [ ] TypeScript types complete
- [ ] Storybook stories for all variants
- [ ] Unit tests passing
- [ ] Documentation complete

### Accessibility Checklist

- [ ] Correct semantic HTML element
- [ ] ARIA attributes where needed
- [ ] Visible focus indicator
- [ ] Color contrast meets AA
- [ ] Works with keyboard only
- [ ] Screen reader announces correctly
- [ ] Touch target ≥ 44×44px

---

*See also: `token-generation.md` for token creation*
