# Component specification

A panel that slides in from one edge of the screen. Use it for a task that stays beside the page, such as a list of updates or a short form. Built on Reka UI `Dialog`. Focus, dismiss, and the header, body, and footer match `N8nDialog`.

- **Component Name:** N8nDrawer
- **Reka UI Component:** [Dialog](https://reka-ui.com/docs/components/dialog)
- **Related Component:** `N8nDialog`

## Public API Definition

**Props**

- `open?: boolean` Controlled open state. Bind with `v-model:open`.
- `defaultOpen?: boolean` Initial open state when uncontrolled. | `default: false`
- `side?: DrawerSide` Edge the panel is anchored to. `left` stays on the left in a right-to-left layout. | `default: 'right'`
- `size?: DrawerSize` Length on the axis that leaves the edge. Width for `left` and `right`. Height for `top` and `bottom`. The values and lengths match `N8nDialog`. | `default: 'medium'`
- `modal?: boolean` When `true`, the drawer shows the overlay, traps focus, and locks scroll. When `false`, the page stays visible and interactive. | `default: true`
- `forceMount?: boolean` Keep the content mounted for animation control. | `default: false`
- `trapFocus?: boolean` Trap focus inside the drawer. | `default: true`
- `disableOutsidePointerEvents?: boolean` Block pointer events outside the drawer. | `default: true`
- `closeOnOverlayClick?: boolean` Close when the user clicks the overlay. Escape and the close button still close the drawer. | `default: true`
- `closeOnEscape?: boolean` Close when the user presses Escape. An overlay click and the close button still close the drawer. | `default: true`
- `showCloseButton?: boolean` The drawer draws the close button. The button is the last stop in the tab order. With no header, the body keeps space for the button. | `default: true`
- `ariaLabel?: string` Accessible name when no `N8nDrawerTitle` is rendered. The name is visually hidden.
- `ariaDescription?: string` Accessible description when no `N8nDrawerDescription` is rendered. The description is visually hidden.
- `stacked?: boolean` Paint this drawer above another open dialog or drawer. | `default: false`
- `containerClass?: string` Extra class on the portaled layer. Set `--n8n-drawer--size` or `--n8n-drawer--z-index` here.

**Tokens**

Set a token on `containerClass`. The overlay and the panel both read `--n8n-drawer--z-index` from the portaled layer. The panel reads the other tokens.

- `--n8n-drawer--size` Main-axis length. When set, this value replaces the `size` preset. Pass a scale value to `size`. Set this token for any other length. | `default: the size preset`
- `--n8n-drawer--z-index` Stacking level for the panel. The overlay uses the value below it. Set this token on `containerClass` so the overlay and the panel share it. | `default: 1950`
- `--n8n-drawer--padding` Padding of the header, the body, and the footer. Matches `--n8n-dialog-content--padding`. | `default: --spacing--md`
- `--n8n-drawer-body--padding-block-start` Top padding of the body. Matches `--n8n-dialog-body--padding-block-start`. When unset, a header leaves the focus outline. With no header, the edge leaves room for the close button.
- `--n8n-drawer-body--padding-block-end` Bottom padding of the body. Matches `--n8n-dialog-body--padding-block-end`. When unset, a footer leaves the focus outline. With no footer, the edge uses `--n8n-drawer--padding`.
- `--n8n-drawer-body--padding-inline` Inline padding of the body. Matches `--n8n-dialog-body--padding-inline`. | `default: --n8n-drawer--padding`

```css
.updates-drawer {
  --n8n-drawer--size: 520px;
}
```

**Events**

- `update:open(value: boolean)` The parent owns `open`. To keep the drawer open, leave `open` set to `true`. Use that for a veto such as an unsaved-changes check.
- `escapeKeyDown(event: KeyboardEvent)` Fires for Escape. When `closeOnEscape` is `false`, the component calls `preventDefault` and the drawer stays open.
- `interactOutside(event: Event)` Fires for an outside pointer or focus move. When `closeOnOverlayClick` is `false`, the component calls `preventDefault` and the drawer stays open.
- `openAutoFocus(event: Event)` Fires before focus moves into the drawer. Call `preventDefault` to keep focus where it is.
- `closeAutoFocus(event: Event)` Fires before focus returns to the trigger. Call `preventDefault` to choose another target.

**Slots**

- `default` Panel content. Place `N8nDrawerHeader`, `N8nDrawerBody`, and `N8nDrawerFooter` here.

**N8nDrawerClose**

Use this part for another close control, such as a button in the footer. The drawer still draws its own close button when `showCloseButton` is `true`.

- `asChild?: boolean` Merge the close behavior onto the child element. | `default: false`
- `default` Replaces the icon. The default child is `N8nIcon` with `icon="x"`.

**N8nDrawerTitle** and **N8nDrawerDescription**

- `asChild?: boolean` Merge the Reka part onto the child element. | `default: false`
- `default` The title or description text.

**N8nDrawerHeader**, **N8nDrawerBody**, and **N8nDrawerFooter**

- `default` The region content.

**Types**

```typescript
type DrawerSize =
  | 'small'
  | 'medium'
  | 'large'
  | 'xlarge'
  | '2xlarge'
  | 'fit'
  | 'full'
  | 'cover';

type DrawerSide = 'left' | 'right' | 'top' | 'bottom';
```

### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  N8nButton,
  N8nDrawer,
  N8nDrawerBody,
  N8nDrawerClose,
  N8nDrawerDescription,
  N8nDrawerFooter,
  N8nDrawerHeader,
  N8nDrawerTitle,
} from '@n8n/design-system';

const open = ref(false);
</script>

<template>
  <N8nButton label="Open" @click="open = true" />

  <N8nDrawer v-model:open="open" side="left" size="large">
    <N8nDrawerHeader>
      <N8nDrawerTitle>Version updates</N8nDrawerTitle>
    </N8nDrawerHeader>
    <N8nDrawerBody>
      <N8nDrawerDescription>You are two versions behind the latest.</N8nDrawerDescription>
    </N8nDrawerBody>
    <N8nDrawerFooter>
      <N8nDrawerClose as-child>
        <N8nButton variant="outline" label="Close" />
      </N8nDrawerClose>
    </N8nDrawerFooter>
  </N8nDrawer>
</template>
```
