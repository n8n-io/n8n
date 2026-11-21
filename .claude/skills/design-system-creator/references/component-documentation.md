# Component Documentation Template

Standard format for documenting design system components.

---

## Component Documentation Structure

```markdown
# Button

## Purpose
Primary interactive element for user actions. Use for submitting forms,
triggering actions, and navigating when styled as a link.

## Anatomy

┌─────────────────────────────────────┐
│  [icon]  Label Text  [icon]         │
└─────────────────────────────────────┘
    ↑          ↑           ↑
 Leading    Label      Trailing
  Icon    (required)     Icon

**Parts:**
1. Container (background, border, padding)
2. Label (required, text content)
3. Leading icon (optional)
4. Trailing icon (optional)

## Variants

| Variant   | Use Case                        | Visual                |
|-----------|--------------------------------|----------------------|
| Primary   | Main CTA, form submit          | Solid brand color    |
| Secondary | Supporting actions             | Outlined             |
| Tertiary  | Low-emphasis actions           | Text only            |
| Danger    | Destructive actions            | Red tones            |
| Ghost     | Minimal UI, icon buttons       | Transparent          |

## Sizes

| Size | Height | Padding      | Font Size | Use Case           |
|------|--------|--------------|-----------|-------------------|
| sm   | 32px   | 8px 12px     | 14px      | Dense UIs, tables |
| md   | 40px   | 10px 16px    | 16px      | Default           |
| lg   | 48px   | 12px 24px    | 18px      | Hero CTAs         |

## States

### Interactive States
- **Default**: Resting state
- **Hover**: Mouse over (desktop)
- **Active**: Being pressed
- **Focus**: Keyboard navigation (visible focus ring)

### Semantic States
- **Disabled**: Cannot be interacted with
- **Loading**: Action in progress (show spinner)

## Responsive Behavior

- **Mobile**: Full-width in forms, fixed bottom for primary CTAs
- **Tablet+**: Inline, min-width based on content
- **Touch targets**: Minimum 44×44px

## Accessibility

### Requirements
- Minimum 4.5:1 contrast for text
- 3:1 contrast for non-text (borders, backgrounds)
- Focus indicator visible (2px outline, 2px offset)
- Disabled state announced to screen readers

### ARIA
- Use `<button>` element (not `<div>`)
- `aria-disabled="true"` for disabled (keep focusable)
- `aria-busy="true"` when loading
- `aria-label` for icon-only buttons

### Keyboard
- `Enter` or `Space` to activate
- Tab to focus

## Code Examples

### HTML
```html
<!-- Primary button --&gt;
<button class="btn btn--primary">
  Submit Form
</button>

<!-- With icon --&gt;
<button class="btn btn--primary">
  <svg class="btn__icon" aria-hidden="true">...</svg>
  Download
</button>

<!-- Icon only --&gt;
<button class="btn btn--ghost btn--icon" aria-label="Close">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Loading --&gt;
<button class="btn btn--primary" aria-busy="true" disabled>
  <svg class="btn__spinner" aria-hidden="true">...</svg>
  Saving...
</button>

<!-- Disabled --&gt;
<button class="btn btn--primary" aria-disabled="true">
  Unavailable
</button>
```

### React
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}
```

## Do's and Don'ts

### ✅ Do
- Use verb-led labels ("Submit", "Save", "Delete")
- Keep labels short (1-3 words)
- Use one primary button per view
- Provide feedback for async actions

### ❌ Don't
- Don't use for navigation (use links)
- Don't disable without explanation
- Don't stack more than 2 buttons horizontally
- Don't use all caps (harder to read)

## Related Components
- **Link**: For navigation
- **IconButton**: Icon-only variant
- **ButtonGroup**: Multiple related actions
- **SplitButton**: Primary + dropdown

## Changelog
- v2.0: Added loading state, updated focus styles
- v1.1: Added ghost variant
- v1.0: Initial release
```

---

## Quick Reference Card Format

For at-a-glance reference:

```
┌─────────────────────────────────────────────────────────────┐
│ BUTTON                                              v2.0    │
├─────────────────────────────────────────────────────────────┤
│ VARIANTS: primary | secondary | tertiary | danger | ghost   │
│ SIZES: sm (32px) | md (40px) | lg (48px)                    │
│ STATES: default | hover | active | focus | disabled         │
├─────────────────────────────────────────────────────────────┤
│ TOKENS                                                      │
│ --button-bg, --button-text, --button-border                 │
│ --button-padding-x, --button-padding-y                      │
│ --button-radius, --button-font-size                         │
├─────────────────────────────────────────────────────────────┤
│ A11Y: 4.5:1 contrast | 44px touch | focus ring | `<button>` │
├─────────────────────────────────────────────────────────────┤
│ ✅ Verb labels | Short | One primary per view               │
│ ❌ Navigation | All caps | Stacking 3+                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Visual Documentation

Include visual examples for each state:

```
┌─────────────────────────────────────────────────────────────┐
│                     BUTTON STATES                           │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Default    │    Hover     │    Active    │    Focus      │
│  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │  ╔════════╗   │
│  │ Button │  │  │ Button │  │  │ Button │  │  ║ Button ║   │
│  └────────┘  │  └────────┘  │  └────────┘  │  ╚════════╝   │
│   #3b82f6    │   #2563eb    │   #1d4ed8    │  +focus ring  │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                       DISABLED                              │
│               ┌─ ─ ─ ─ ─ ─ ─┐                              │
│               │   Button    │  opacity: 0.5                │
│               └─ ─ ─ ─ ─ ─ ─┘  cursor: not-allowed         │
└─────────────────────────────────────────────────────────────┘
```

---

## Storybook-Style Categories

Organize documentation by:

1. **Overview** - Purpose, when to use
2. **Playground** - Interactive demo with controls
3. **Variants** - All visual variations
4. **Sizes** - All size options
5. **States** - All interactive/semantic states
6. **Composition** - With icons, in groups
7. **Accessibility** - Testing checklist
8. **Code** - Implementation examples
