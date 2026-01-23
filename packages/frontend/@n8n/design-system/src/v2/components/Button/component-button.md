# Component specification

- **Component Name:** N8nButton

## Public API Definition

**Props**

| Prop       | Type                                                                   | Default     | Description                                              |
| ---------- | ---------------------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| `variant`  | `'solid'` \| `'subtle'` \| `'outline'` \| `'ghost'` \| `'destructive'` | `'outline'` | Visual style of the button                               |
| `size`     | `'xsmall'` \| `'small'` \| `'medium'`                                  | `'small'`   | Size of the button                                       |
| `href`     | `string`                                                               | -           | When provided, renders as `<a>` instead of `<button>`    |
| `loading`  | `boolean`                                                              | `false`     | Shows spinner and disables interaction                   |
| `icon`     | `boolean`                                                              | `false`     | Forces equal width and height (square button for icons)  |
| `disabled` | `boolean`                                                              | `false`     | Disables the button                                      |
| `class`    | `string`                                                               | -           | Additional classes to apply to the button                |

Extends `ButtonHTMLAttributes` for native button attributes (`type`, etc.)

**Slots**

| Slot      | Description                           |
| --------- | ------------------------------------- |
| `default` | Button content (text, icons, or both) |

Icons are passed as slot content, allowing flexible positioning (leading, trailing, or both).

**Accessibility**

- Sets `aria-disabled="true"` when disabled
- When `href` is provided, adds `target="_blank"` and `rel="nofollow noopener"`
- Icon-only buttons (with `icon` prop) should include `aria-label`, `aria-labelledby`, or `title` attribute (warning shown in dev mode if missing)

---

## Styling via Class Overrides

For layout-specific styling (full-width, custom colors), use the `class` prop with scoped CSS rather than dedicated props. This keeps the API surface minimal.

#### Full Width Button

```vue
<template>
	<N8nButton variant="solid" :class="$style.fullWidth"> Save changes </N8nButton>
</template>

<style module lang="scss">
.fullWidth {
	width: 100%;
}
</style>
```

#### Square Icon-Only Button

Use the `icon` prop for square icon buttons:

```vue
<template>
	<N8nButton variant="ghost" icon aria-label="Add item">
		<N8nIcon name="plus" size="small" />
	</N8nButton>
</template>
```

---

## Behavior

**Loading state:**

- Displays a spinner with fade transition
- Button content is hidden (opacity: 0)
- Button is non-interactive (`pointer-events: none`)

**Disabled state:**

- Button has reduced opacity (0.5)
- Cursor changes to `not-allowed`
- Sets `disabled` and `aria-disabled` attributes

**Link buttons (`href`):**

- Renders as `<a>` element
- Automatically adds `target="_blank"` and `rel="nofollow noopener"`

**Icon sizing:**

- Icons passed via slots should use the appropriate size to match the button
- The `icon` prop forces the button to be square (width equals height)

---

## Template Usage Examples

#### Basic Button

```vue
<N8nButton variant="solid">Save changes</N8nButton>
```

#### Button with Leading Icon

```vue
<N8nButton variant="solid">
  <N8nIcon name="plus" size="xsmall" />
  Add item
</N8nButton>
```

#### Button with Trailing Icon

```vue
<N8nButton variant="outline">
  Next step
  <N8nIcon name="arrow-right" size="xsmall" />
</N8nButton>
```

#### All Variants

```vue
<N8nButton variant="solid">Solid</N8nButton>
<N8nButton variant="subtle">Subtle</N8nButton>
<N8nButton variant="outline">Outline</N8nButton>
<N8nButton variant="ghost">Ghost</N8nButton>
<N8nButton variant="destructive">Delete</N8nButton>
```

#### Size Variants

```vue
<N8nButton variant="solid" size="xsmall">Extra small</N8nButton>
<N8nButton variant="solid" size="small">Small</N8nButton>
<N8nButton variant="solid" size="medium">Medium</N8nButton>
```

#### Loading State

```vue
<N8nButton variant="solid" loading>
  Saving...
</N8nButton>
```

#### Disabled State

```vue
<N8nButton variant="solid" disabled>
  Cannot click
</N8nButton>
```

#### Icon-Only Button

```vue
<N8nButton variant="ghost" icon aria-label="Add item">
  <N8nIcon name="plus" size="small" />
</N8nButton>
```

#### Link Button

```vue
<N8nButton variant="ghost" href="https://n8n.io">
  Learn more
  <N8nIcon name="external-link" size="xsmall" />
</N8nButton>
```

---

## Migration from Legacy N8nButton

| Legacy             | New                                              |
| ------------------ | ------------------------------------------------ |
| `type="primary"`   | `variant="solid"`                                |
| `type="secondary"` | `variant="subtle"`                               |
| `type="tertiary"`  | `variant="ghost"`                                |
| `type="danger"`    | `variant="destructive"`                          |
| `type="success"`   | `variant="solid"` + custom class (see overrides) |
| `type="warning"`   | `variant="solid"` + custom class (see overrides) |
| `outline`          | `variant="outline"`                              |
| `text`             | `variant="ghost"`                                |
| `block`            | Custom class with `width: 100%`                  |
| `square`           | Use `icon` prop                                  |
| `icon="name"`      | `<N8nIcon name="name" />` in slot                |
| `label="text"`     | Pass text as slot content                        |
| `element="a"`      | Use `href` prop                                  |
