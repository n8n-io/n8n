# Component specification

A compact label that identifies a status, category, count, or other metadata. A badge can include leading and trailing icons. It can also act as a button when the user must interact with it.

- **Component Name:** N8nBadge
- **Figma Component:** TBD
- **Current Implementation:** Custom component built with Reka UI `Primitive`
- **Reka UI Component:** [Primitive](https://reka-ui.com/docs/utilities/primitive)


## Public API Definition

**Props**

- `variant?: BadgeVariant` - Visual style of the badge | `default: 'outline'`
  - `filled`: Neutral filled badge for general metadata
  - `primary`: Brand-filled badge for prominent information
  - `secondary`: Purple-filled badge for secondary or AI-related information
  - `subtle`: Surface badge with a border and shadow
  - `outline`: Transparent badge with a visible border
  - `ghost`: Transparent badge without a visible border
  - `warning`: Yellow badge for states that need attention
  - `danger`: Red badge for failed or critical states
  - `success`: Green badge for positive or complete states
- `size?: BadgeSize` - Badge height, horizontal padding, text size, and icon size | `default: 'xsmall'`
- `clickable?: boolean` - When `true`, renders the badge as a native `button` instead of a `span` and enables hover, active, focus, and disabled styles | `default: false`
- `disabled?: boolean` - Disables the native button when `clickable` is `true`. Use this prop only with `clickable`
- `leadingIcon?: IconName` - Icon shown before the label
- `trailingIcon?: IconName` - Icon shown after the label


**Events**

The component does not declare custom events. Native events, such as `click`, fall through to the root element.


**Slots**

- `default` - Badge label. The component renders this content in a bold `N8nText` element


**Types**

```typescript
type BadgeVariant =
  | 'filled'
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'outline'
  | 'ghost'
  | 'warning'
  | 'danger'
  | 'success';

type BadgeSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
```


## Behavior

- A non-clickable badge renders as a `span`.
- A clickable badge renders as a native `button` with `type="button"`.
- Clickable badges show a pointer cursor and distinct hover, active, focus-visible, and disabled states.
- The label stays on one line. Overflowing label text is truncated with an ellipsis when a consumer limits the badge width.
- Leading and trailing icons do not shrink.
- `xsmall`, `small`, and `medium` badges use medium icons. `large` and `xlarge` badges use xlarge icons.
- `xsmall` badges use `2xs` text. `small` and `medium` badges use `xs` text. `large` and `xlarge` badges use `sm` text.
- The badge supports light and dark color modes through design tokens.


## Accessibility

- Use `clickable` only when activating the badge performs an action.
- Do not use a clickable badge for navigation. Use a link component for navigation.
- The native button supplies keyboard activation and disabled semantics.
- The visible label must describe the action when the badge is clickable.
- Icons are supporting decoration. Do not use an icon as the only source of meaning.
- Status color must not be the only way that the badge communicates state. Include a clear text label.


## Template usage examples

**Status badge:**

```vue
<template>
  <N8nBadge variant="success" leading-icon="circle-check">
    Active
  </N8nBadge>
</template>
```

**Metadata badge:**

```vue
<template>
  <N8nBadge variant="secondary" leading-icon="bot">
    AI generated
  </N8nBadge>
</template>
```

**Badge with a trailing icon:**

```vue
<template>
  <N8nBadge variant="outline" trailing-icon="external-link">
    Open workflow
  </N8nBadge>
</template>
```

**Clickable badge:**

```vue
<script setup lang="ts">
function removeFilter() {
  /* Remove the active filter. */
}
</script>

<template>
  <N8nBadge clickable leading-icon="list-filter" @click="removeFilter">
    Filter applied
  </N8nBadge>
</template>
```

**Disabled clickable badge:**

```vue
<template>
  <N8nBadge clickable disabled leading-icon="lock">
    Locked
  </N8nBadge>
</template>
```

**Available sizes:**

```vue
<template>
  <N8nBadge size="xsmall">Extra small</N8nBadge>
  <N8nBadge size="small">Small</N8nBadge>
  <N8nBadge size="medium">Medium</N8nBadge>
  <N8nBadge size="large">Large</N8nBadge>
  <N8nBadge size="xlarge">Extra large</N8nBadge>
</template>
```
