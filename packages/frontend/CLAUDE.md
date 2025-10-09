# CLAUDE.md

Extra information, specific to the frontend codebase.

### CSS Variables Reference

Use the following CSS variables to maintain consistency across the
application. These variables cover colors, spacing, typography, and borders.

#### Colors
```css
/* Primary Colors */
--color--primary--shade-1
--color--primary
--color--primary--tint-1
--color--primary--tint-2
--color--primary--tint-3

/* Secondary Colors */
--color--secondary--shade-1
--color--secondary
--color--secondary--tint-1
--color--secondary--tint-2

/* Success Colors */
--color--success--shade-1
--color--success
--color--success--tint-1
--color--success--tint-2
--color--success--tint-3
--color--success--tint-4

/* Warning Colors */
--color--warning--shade-1
--color--warning
--color--warning--tint-1
--color--warning--tint-2

/* Danger Colors */
--color--danger--shade-1
--color--danger
--color--danger--tint-3
--color--danger--tint-4

/* Text Colors */
--color--text--shade-1
--color--text
--color--text--tint-1
--color--text--tint-2
--color--text--tint-3
--color--text--danger

/* Foreground Colors */
--color--foreground--shade-2
--color--foreground--shade-1
--color--foreground
--color--foreground--tint-1
--color--foreground--tint-2

/* Background Colors */
--color--background--shade-2
--color--background--shade-1
--color--background
--color--background--light-2
--color--background--light-3
```

#### Spacing
```css
--spacing-5xs: 2px
--spacing-4xs: 4px
--spacing-3xs: 6px
--spacing-2xs: 8px
--spacing-xs: 12px
--spacing-s: 16px
--spacing-m: 20px
--spacing-l: 24px
--spacing-xl: 32px
--spacing-2xl: 48px
--spacing-3xl: 64px
--spacing-4xl: 128px
--spacing-5xl: 256px
```

#### Typography
```css
--font-size-3xs: 10px
--font-size-2xs: 12px
--font-size-xs: 13px
--font-size-s: 14px
--font-size-m: 16px
--font-size-l: 18px
--font-size-xl: 20px
--font-size-2xl: 28px

--font-line-height-compact: 1.25
--font-line-height-regular: 1.3
--font-line-height-loose: 1.35
--font-line-height-xloose: 1.5

--font-weight-regular: 400
--font-weight-bold: 600
--font-family: InterVariable, sans-serif
```

#### Borders
```css
--border-radius-small: 2px
--border-radius-base: 4px
--border-radius-large: 8px
--border-radius-xlarge: 12px

--border-width-base: 1px
--border-style-base: solid
--border-base: var(--border-width-base) var(--border-style-base) var(--color--foreground)
```

