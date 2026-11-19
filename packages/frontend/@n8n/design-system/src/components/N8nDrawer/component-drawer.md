# Component specification

A panel that slides in from one edge of the screen. Use it for a task that stays beside the page, such as a list of updates or a short form. The public behavior matches `N8nDialog`: focus moves into the panel, Escape and the overlay can close it, and the header, body, and footer use the same layout. The panel is anchored to a side, and it uses the dialog size scale on that axis.

Build it on the Reka UI Dialog parts that `N8nDialog` already uses. Reka UI also ships a Drawer primitive (2.10 and later, marked Alpha) with swipe and snap points. This replacement does not need those behaviors, and the repo pins `reka-ui` 2.5.0, which has no Drawer export. Do not upgrade `reka-ui` for this component.

- **Component Name:** N8nDrawer
- **Figma Component:** TBD
- **Element+ Component:** [Drawer](https://element-plus.org/en-US/component/drawer)
- **Reka UI Component:** [Dialog](https://reka-ui.com/docs/components/dialog)

## Component structure

```
N8nDrawer (reka-ui DialogRoot)
└── DialogPortal
    └── portaled layer (`class`, `style`, `containerClass`)
        ├── N8nDrawerOverlay (reka-ui DialogOverlay) — rendered only when `modal` is true
        └── N8nDrawerContent (reka-ui DialogContent)
            ├── Visually hidden DialogTitle when `ariaLabel` is set and no N8nDrawerTitle is present
            ├── Visually hidden DialogDescription when `ariaDescription` is set and no N8nDrawerDescription is present
            ├── N8nDrawerHeader + N8nDrawerTitle when the `header` prop is set
            ├── default slot
            └── N8nDrawerClose when `showCloseButton` is true
```

The root does not render a trigger. The parent owns the open state, the same way `N8nDialog` does.

Do not wrap `N8nDialog`. Its content is centered, and the drawer must sit on an edge. Import the Reka Dialog parts in this folder. Add `components/N8nDrawer` to the existing Dialog row in `wrapped-component-bans.ts` so that import is allowed.

`N8nDrawerHeader`, `N8nDrawerTitle`, `N8nDrawerDescription`, `N8nDrawerBody`, `N8nDrawerFooter`, and `N8nDrawerClose` are public. Callers compose them in the default slot. The root renders the overlay and the content shell.

## Layout

The panel is `position: fixed` and flush to the chosen edge.

| `side` | Cross axis | Main axis (`size`) | Anchored edge |
| --- | --- | --- | --- |
| `left` | full viewport height | width | left |
| `right` | full viewport height | width | right |
| `top` | full viewport width | height | top |
| `bottom` | full viewport width | height | bottom |

`side` is a physical edge. It does not follow the reading direction. `left` stays on the left in RTL.

The two corners on the screen edge are square. The two inner corners use `var(--radius--lg)`. `cover` is inset on every edge, so all four corners use that radius.

The surface, border, and shadow match `N8nDialog` content. The overlay matches `N8nDialog` overlay (fade, blur, and scrim). Render the overlay only when `modal` is true. A non-modal drawer must not dim the page. `N8nDialog` always paints its overlay. This drawer does not.

The header, body, footer, and close button follow the dialog layout:

- The body scrolls. The header and footer stay in place.
- The close button is absolutely positioned, aligned to the first title line, and last in the tab order.
- With no header, the close button sits in the corner and the body keeps space for it.
- Region padding, the focus outline, and the close-button size use the same measurements as `N8nDialog`.

The panel slides in from its off-screen side and slides back out. Drive the slide with the `translate` property. Duration is `var(--animation--duration--snappy)`. The overlay fades with the same token and the same easing as the dialog overlay. Apply the `reduced-motion` mixin from `css/mixins/motion.scss` to both animations. Under reduced motion the panel appears in place.

A click on portaled UI that belongs to a control inside the drawer must not count as an outside click. Use the same exclusion `N8nDialog` uses (Element Plus poppers and CodeMirror tooltips). The dialog stylesheet already restores pointer events on those layers. Do not duplicate that rule.

## Sizes

`size` sets the main-axis length. The values match `N8nDialog`.

| `size` | Main-axis length at 640px and wider | Below 640px |
| --- | --- | --- |
| `small` | 360px | viewport minus `var(--spacing--lg)` |
| `medium` | 480px | viewport minus `var(--spacing--lg)` |
| `large` | 564px | viewport minus `var(--spacing--lg)` |
| `xlarge` | 640px | viewport minus `var(--spacing--lg)` |
| `2xlarge` | 780px | viewport minus `var(--spacing--lg)` |
| `full` | viewport minus `var(--spacing--lg)` | viewport minus `var(--spacing--lg)` |
| `fit` | `fit-content`, max the `full` length | same |
| `cover` | inset by `var(--spacing--lg)` on every edge, on both axes | same |

Default: `medium`.

The size class sets `--n8n-drawer--size-preset` on the panel. The panel length is `var(--n8n-drawer--size, var(--n8n-drawer--size-preset))`. Set `--n8n-drawer--size` on the portaled layer for a length that is not in the scale. That value wins over the preset. The updates panel is 520px wide. Set the variable. Do not add a raw CSS length to the `size` prop.

```css
.updates-drawer {
  --n8n-drawer--size: 520px;
}
```

## Stacking

The portaled layer wraps the overlay and the panel. Both read `--n8n-drawer--z-index` from that layer.

The panel z-index is `var(--n8n-drawer--z-index, 1950)`. The overlay z-index is `calc(var(--n8n-drawer--z-index, 1950) - 1)`. `stacked` adds 2 to each value. `1950` is `APP_Z_INDEXES.DIALOGS`, the same level as `N8nDialog`.

The NPS survey currently uses z-index `3001` so the mask and the panel paint above toasts and the assistant button. Set `--n8n-drawer--z-index: 3001` on the portaled layer. The overlay is then `3000` and the panel is `3001`. A variable set only on the panel leaves the overlay at `1949`. There is no `zIndex` prop.

## Public API Definition

**Props**

- `open?: boolean` — Controlled open state. Bind with `v-model:open`
- `defaultOpen?: boolean` — Initial open state when uncontrolled
- `side?: 'left' | 'right' | 'top' | 'bottom'` — Edge the panel is anchored to. Default: `'right'`
- `size?: DrawerSize` — Main-axis length. See [Sizes](#sizes). Default: `'medium'`
- `modal?: boolean` — When `true`, the drawer shows the overlay, traps focus, and locks scroll. When `false`, the page stays visible and interactive. Default: `true`
- `forceMount?: boolean` — Keep the content mounted for animation control
- `trapFocus?: boolean` — Trap focus inside the drawer. When omitted, the value follows `modal`. Pass `true` or `false` to override that
- `disableOutsidePointerEvents?: boolean` — Block pointer events outside the drawer. When omitted, the value follows `modal`. Pass `true` or `false` to override that
- `closeOnOverlayClick?: boolean` — Close when the user clicks the overlay. Escape and the close button still close the drawer. Default: `true`
- `closeOnEscape?: boolean` — Close when the user presses Escape. An overlay click and the close button still close the drawer. Default: `true`
- `showCloseButton?: boolean` — Show the close button. The button is the last stop in the tab order. Default: `true`
- `ariaLabel?: string` — Accessible name when no `N8nDrawerTitle` is rendered. The name is visually hidden
- `ariaDescription?: string` — Accessible description when no `N8nDrawerDescription` is rendered. The description is visually hidden
- `header?: string` — Renders `N8nDrawerHeader` and `N8nDrawerTitle` with this text. For a custom header, omit this prop and compose the parts in the default slot
- `stacked?: boolean` — Paint this drawer above another open dialog or drawer. Default: `false`
- `containerClass?: string` — Extra class on the portaled layer. Use it to set `--n8n-drawer--size` or `--n8n-drawer--z-index`

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

Give every drawer an accessible name. Set `header`, render `N8nDrawerTitle`, or pass `ariaLabel`.

**Events**

- `update:open(value: boolean)` — The parent owns `open`. To keep the drawer open, leave `open` set to `true`. Use that for a veto such as an unsaved-changes check
- `escapeKeyDown(event: KeyboardEvent)` — Fires for Escape. When `closeOnEscape` is `false`, the component calls `preventDefault` and the drawer stays open
- `interactOutside(event: Event)` — Fires for an outside pointer or focus move. When `closeOnOverlayClick` is `false`, the component calls `preventDefault` and the drawer stays open
- `openAutoFocus(event: Event)` — Fires before focus moves into the drawer. Call `preventDefault` to keep focus where it is
- `closeAutoFocus(event: Event)` — Fires before focus returns to the trigger. Call `preventDefault` to choose another target

**Attributes**

- `inheritAttrs` is `false`. `class` and `style` apply to the portaled layer, so custom properties reach the overlay and the panel. `aria-*` and `data-*` apply to the panel
- The close button sets `data-test-id="drawer-close-button"` and `aria-label` from `t('drawer.close')` (`Close drawer`)

**Slots**

- `default` — Panel content. Place `N8nDrawerBody`, and optional header and footer parts, here

**N8nDrawerClose**

- `asChild?: boolean` — Merge the close behavior onto the child element
- `default` — Replaces the icon. The default child is `N8nIcon` with `icon="x"`

**N8nDrawerTitle** and **N8nDrawerDescription**

- `asChild?: boolean` — Merge the Reka part onto the child element
- `default` — The title or description text

**N8nDrawerHeader**, **N8nDrawerBody**, and **N8nDrawerFooter**

- No props
- `default` — The region content

### Template usage examples

**Basic drawer**

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
} from '@n8n/design-system';

const open = ref(false);
</script>

<template>
  <N8nButton label="Open" @click="open = true" />

  <N8nDrawer v-model:open="open" header="Version updates" side="left" size="large">
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

**Side and size**

```vue
<N8nDrawer v-model:open="open" header="Survey" side="bottom" size="fit">
  <N8nDrawerBody>
    <!-- Short content. The height follows the content. -->
  </N8nDrawerBody>
</N8nDrawer>
```

**Custom header, no close button**

```vue
<N8nDrawer v-model:open="open" side="right" :show-close-button="false" aria-label="Filters">
  <N8nDrawerHeader>
    <N8nDrawerTitle>Filters</N8nDrawerTitle>
  </N8nDrawerHeader>
  <N8nDrawerBody>
    <!-- Filters -->
  </N8nDrawerBody>
  <N8nDrawerFooter>
    <N8nDrawerClose as-child>
      <N8nButton label="Done" />
    </N8nDrawerClose>
  </N8nDrawerFooter>
</N8nDrawer>
```

**Exact length and stacking level**

```vue
<N8nDrawer
  v-model:open="open"
  class="updates-drawer"
  header="What's new"
  side="left"
  :close-on-overlay-click="false"
/>
```

```css
.updates-drawer {
  --n8n-drawer--size: 520px;
  --n8n-drawer--z-index: 3001;
}
```

## Migration from ElDrawer

`ModalDrawer.vue` is the only product caller. It binds the modal store, an optional `beforeClose`, an Enter key listener, and an event-bus `close` event. Keep that behavior in `ModalDrawer`. `N8nDrawer` does not know the modal store.

| `ModalDrawer` / `ElDrawer` | `N8nDrawer` |
| --- | --- |
| `direction="ltr"` | `side="left"` |
| `direction="rtl"` | `side="right"` |
| `direction="ttb"` | `side="top"` |
| `direction="btt"` | `side="bottom"` |
| `:size="width"` with a CSS length | `size` preset, or `--n8n-drawer--size` |
| `uiStore.modalsById[name].open` | `:open` |
| `modal` | `modal` |
| `closeOnClickModal` (default `false` on the wrapper) | `closeOnOverlayClick` (default `true` on `N8nDrawer`) |
| `showClose` | `showCloseButton` |
| `beforeClose` | Keep `open` at `true` until the check allows the close |
| `zIndex` | `--n8n-drawer--z-index` |
| `#header` | `header` prop, or `N8nDrawerHeader` in the default slot |
| `#content` | `N8nDrawerBody` in the default slot |
| `wrapperClosable` | Do not map. `closeOnOverlayClick` is the control |

`ModalDrawer` defaults `closeOnClickModal` to `false`. Both current callers rely on that. Pass `:close-on-overlay-click="false"` from the wrapper unless the caller sets the prop.

Map the current callers:

- Updates panel: `side="left"`, `--n8n-drawer--size: 520px`, overlay click does not close
- NPS survey: `side="bottom"`, `size="fit"`, overlay click does not close, `--n8n-drawer--z-index: 3001`

Focus follows `N8nDialog`. On open, focus moves to the first focusable control inside the drawer. On close, focus returns to the control that opened it. `ModalDrawer` blurs `document.activeElement` once, on mount. Leave that blur in the wrapper if a caller still needs it. Do not put it in `N8nDrawer`.

The Enter listener and the event-bus `close` event stay in `ModalDrawer`. The content wrapper stops `keydown` from bubbling. Keep that stop. Enter inside the panel must not emit the wrapper's `enter` event.

```vue
<N8nDrawer
  :open="uiStore.modalsById[name]?.open ?? false"
  :side="side"
  :modal="modal"
  :close-on-overlay-click="closeOnClickModal"
  :show-close-button="showClose"
  @update:open="onOpenChange"
>
  <N8nDrawerHeader v-if="$slots.header">
    <slot name="header" />
  </N8nDrawerHeader>
  <N8nDrawerBody>
    <span @keydown.stop>
      <slot name="content" />
    </span>
  </N8nDrawerBody>
</N8nDrawer>
```

`onOpenChange(false)` runs `beforeClose` when it is set. It calls `uiStore.closeModal(name)` only when that check does not return `false`.

After the move:

- Remove `ElDrawer` from `allowedElementPlusComponents`
- Add an Element Plus ban row for `ElDrawer` (`componentPaths: ['drawer']`, template names `el-drawer` and `ElDrawer`). `allowedFolders` is empty. `N8nDrawer` does not import Element Plus. The replacement is `N8nDrawer`
- Delete the Element Plus drawer overrides that only `ModalDrawer` needs, once nothing references `.el-drawer`

## Related components

- **N8nDialog** — Centered modal. Use it when the task should sit in the middle of the page.
- **N8nAlertDialog** — Short confirm or cancel step. Do not use a drawer for that step.

## Out of scope

- Reka Drawer swipe-to-dismiss, swipe-to-open, snap points, drag handle, nested indent, and the virtual keyboard provider
- A `reka-ui` upgrade
- A `zIndex` prop or a raw CSS `size` string
- Moving the modal store, the Enter listener, or `beforeClose` into the design system

## Implementation TODO

- [ ] Add `N8nDrawer` and the header, title, description, body, footer, close, overlay, and content parts under `src/components/N8nDrawer`
- [ ] Export the components and the `DrawerSize` and `DrawerSide` types from the design-system barrel
- [ ] Add `drawer.close` (`Close drawer`) next to `dialog.close` in `src/locale/lang/en.ts`
- [ ] Add Storybook stories under `Core/Drawer` for side, size, scroll, no close button, stacked, and controlled open
- [ ] Add unit tests for open and close, Escape, overlay click, the close button name, focus move and restore, `modal="false"` (page stays interactive), each side, the overlay z-index following `--n8n-drawer--z-index`, and the portaled-popper exception
- [ ] Allow this folder to import Reka Dialog parts. Ban `ElDrawer` everywhere
- [ ] Point `ModalDrawer.vue` at `N8nDrawer` and keep its store, Enter, and `beforeClose` behavior
- [ ] Remove the unused Element Plus drawer styles
