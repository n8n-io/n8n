# Component specification

- **Component Name:** N8nButton

## Public API Definition

**Props**

| Prop      | Type                                                              | Default   | Description                                           |
| --------- | ----------------------------------------------------------------- | --------- | ----------------------------------------------------- |
| `variant` | `'solid'` \| `'subtle'` \| `'outline'` \| `'ghost'` \| `'danger'` | Required  | Visual style of the button                            |
| `size`    | `'xsmall'` \| `'small'` \| `'medium'`                             | `'small'` | Size of the button                                    |
| `href`    | `string`                                                          | -         | When provided, renders as `<a>` instead of `<button>` |
| `loading` | `boolean`                                                         | `false`   | Shows spinner and disables interaction                |

Extends `ButtonHTMLAttributes` for native button attributes (`disabled`, `type`, `class`, etc.)

**Events**

| Event   | Payload      | Description                                             |
| ------- | ------------ | ------------------------------------------------------- |
| `click` | `MouseEvent` | Fired on button click (not fired when disabled/loading) |
| `focus` | `FocusEvent` | Fired when button receives focus                        |
| `blur`  | `FocusEvent` | Fired when button loses focus                           |

**Slots**

| Slot      | Description                           |
| --------- | ------------------------------------- |
| `default` | Button content (text, icons, or both) |

Icons are passed as slot content, allowing flexible positioning (leading, trailing, or both).

**Accessibility**

- Sets `aria-busy="true"` when loading
- Sets `aria-disabled="true"` when disabled
- Includes `aria-live="polite"` for state announcements
- When `href` is provided with external URLs, adds `rel="noopener noreferrer"`

**CSS Variables**

For each variant, the following CSS variables are available for theming:

```css
--button-{variant}--bg
--button-{variant}--bg-hover
--button-{variant}--bg-active
--button-{variant}--bg-disabled
--button-{variant}--text
--button-{variant}--text-disabled
--button-{variant}--border
--button-{variant}--border-disabled
```

---

## Styling via Class Overrides

For layout-specific styling (full-width, square icon buttons, custom colors), use the `class` prop with scoped CSS rather than dedicated props. This keeps the API surface minimal.

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

```vue
<template>
	<N8nButton variant="ghost" :class="$style.iconButton" aria-label="Add item">
		<N8nIcon name="plus" size="small" />
	</N8nButton>
</template>

<style module lang="scss">
.iconButton {
	width: 32px;
	height: 32px;
	padding: 0;
}
</style>
```

#### Custom Color (Success) via CSS Variables

```vue
<template>
	<N8nButton variant="solid" :class="$style.success"> Confirm </N8nButton>
</template>

<style module lang="scss">
.success {
	--button-solid--bg: var(--color-success);
	--button-solid--bg-hover: var(--color-success-dark);
	--button-solid--bg-active: var(--color-success-darker);
}
</style>
```

---

## Behavior

**Loading state:**

- Displays a spinner in place of any leading icon
- Text content is hidden
- Button is non-interactive (`pointer-events: none`)
- Click events are not emitted

**Link buttons (`href`):**

- Renders as `<a>` element
- Supports all anchor attributes via `ButtonHTMLAttributes`
- External links should include `target="_blank"` explicitly if desired

**Icon sizing:**

- Icons passed via slots should use the appropriate size to match the button
- Recommended: `xsmall` icons for `xsmall`/`small` buttons, `small` icons for `medium` buttons

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
<N8nButton variant="danger">Delete</N8nButton>
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

#### Link Button

```vue
<N8nButton variant="ghost" href="https://n8n.io" target="_blank">
  Learn more
  <N8nIcon name="external-link" size="xsmall" />
</N8nButton>
```

---

## Migration from Legacy N8nButton

| Legacy             | New                                               |
| ------------------ | ------------------------------------------------- |
| `type="primary"`   | `variant="solid"`                                 |
| `type="secondary"` | `variant="subtle"`                                |
| `type="tertiary"`  | `variant="ghost"`                                 |
| `type="danger"`    | `variant="danger"`                                |
| `type="success"`   | `variant="solid"` + custom class (see overrides)  |
| `type="warning"`   | `variant="solid"` + custom class (see overrides)  |
| `outline`          | `variant="outline"`                               |
| `text`             | `variant="ghost"`                                 |
| `block`            | Custom class with `width: 100%`                   |
| `square`           | Custom class with fixed dimensions + `padding: 0` |
| `icon="name"`      | `<N8nIcon name="name" />` in slot                 |
| `label="text"`     | Pass text as slot content                         |
| `element="a"`      | Use `href` prop                                   |
