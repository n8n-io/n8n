# Component specification

A group of sections. Each section has a heading that shows or hides its content. The parts ship with the accordion layout: border, trigger, chevron, and content padding.

- **Component Name:** N8nAccordion
- **Figma Component:** TBD
- **Reka UI Component:** [Accordion](https://reka-ui.com/docs/components/accordion)
- **WAI-ARIA pattern:** [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)

Use `N8nInfoAccordion` for one information block. Use `N8nCollapsiblePanel` for one titled panel. Use `N8nAccordion` when the page has more than one section.

## Component structure

```
N8nAccordion
└── N8nAccordionItem (one per section, unique value)
    ├── N8nAccordionHeader (h3 by default)
    │   └── N8nAccordionTrigger (button)
    └── N8nAccordionContent
```

`N8nAccordion` and `N8nAccordionRoot` are the same component. The package barrel exports `N8nAccordion`.

Import the parts from `@n8n/design-system`. Do not import `AccordionRoot` or the other Accordion parts from `reka-ui`.

## Appearance

- The root draws a border, a radius, and a surface background.
- Vertical items draw a top border between sections. Horizontal items sit in a row and draw a right border between sections.
- The trigger is a full-width button. It includes a chevron. Put the section name in the trigger slot.
- The chevron points down when the section is open and turns when the section is closed.
- Open content has padding. Set `--accordion--content--padding` on `N8nAccordionContent` to change it. Use `0` when the section must sit flush with the trigger.
- Open and close animate the content height. The animation uses `collapsible-slide-down` and `collapsible-slide-up`. Set `--animation--collapsible-slide--duration: 0s` on `N8nAccordionContent` to turn the animation off.
- Pass `class` on a part when a screen needs a local override. The component class stays on the element.

## Public API Definition

**N8nAccordion props**

- `type?: 'single' | 'multiple'` — `single` keeps one section open. `multiple` keeps any number of sections open. When you omit `type`, an array value selects `multiple`. Any other value selects `single`.
- `modelValue?: string | string[]` — The controlled open value. Bind with `v-model`. For `type="single"`, pass a section `value` or `undefined`. For `type="multiple"`, pass an array of section values.
- `defaultValue?: string | string[]` — The open value on first render. Use this when the parent does not own the value. The shape matches `modelValue`.
- `collapsible?: boolean` — When `type` is `single`, the open section can close. Default: `false`. This prop has no effect when `type` is `multiple`.
- `disabled?: boolean` — The accordion ignores clicks and keys. Default: `false`.
- `orientation?: 'vertical' | 'horizontal'` — The direction of the sections and of the arrow keys. Default: `'vertical'`.
- `dir?: 'ltr' | 'rtl'` — The reading direction. Default: `'ltr'`.
- `unmountOnHide?: boolean` — Remove closed content from the page. Default: `true`. Set this to `false` when closed text must stay available.
- `as?: string | Component` — The element that the root renders. Default: `'div'`.
- `asChild?: boolean` — Merge the root props onto the child element.

**N8nAccordion events**

- `update:modelValue(value: string | string[] | undefined)` — The open value changed. `v-model` listens to this event.

**N8nAccordion slot**

- `default`: `{ modelValue: string | string[] | undefined }` — The sections.

**N8nAccordionItem props**

- `value: string` — The id of the section. Each item in one accordion uses a different value.
- `disabled?: boolean` — This section ignores clicks and keys. Default: `false`. A disabled root disables every item.
- `as?: string | Component` — The element that the item renders.
- `asChild?: boolean` — Merge the item props onto the child element.

**N8nAccordionItem slot**

- `default`: `{ open: boolean }` — The header and the content.

**N8nAccordionHeader props**

- `as?: string | Component` — The heading element. Default: `'h3'`. Change this when the page outline needs another level.
- `asChild?: boolean` — Merge the header props onto the child element.

**N8nAccordionTrigger props**

- `as?: string | Component` — The element that the trigger renders. Default: `'button'`.
- `asChild?: boolean` — Merge the trigger props onto the child element. The child must be a button, or another control that toggles the section. `asChild` skips the chevron. The child draws its own icon.

**N8nAccordionContent props**

- `forceMount?: boolean` — Keep the content mounted while you run your own animation.
- `as?: string | Component` — The element that the content renders.
- `asChild?: boolean` — Merge the content props onto the child element.

**Data attributes**

Style the open, closed, and disabled states with these attributes. Do not add a class from script for the same states.

| Part                                 | Attribute          | Values                            |
| ------------------------------------ | ------------------ | --------------------------------- |
| Root, item, header, trigger, content | `data-orientation` | `vertical`, `horizontal`          |
| Item, header, trigger, content       | `data-state`       | `open`, `closed`                  |
| Item, header, trigger, content       | `data-disabled`    | Present when the part is disabled |

Content sets these CSS variables while it opens and closes:

- `--reka-accordion-content-height` — The content height.
- `--reka-accordion-content-width` — The content width.

**Keyboard**

| Key                   | Result                                                          |
| --------------------- | --------------------------------------------------------------- |
| Enter, Space          | Toggle the focused trigger.                                     |
| ArrowDown, ArrowUp    | Move focus between triggers when `orientation` is `vertical`.   |
| ArrowRight, ArrowLeft | Move focus between triggers when `orientation` is `horizontal`. |
| Home, End             | Move focus to the first or last trigger.                        |
| Tab, Shift+Tab        | Move focus out of the trigger row.                              |

## Accessibility

- The header renders an `h3`. Set `as` on `N8nAccordionHeader` when the page outline needs another heading level.
- The trigger is a button. The button name is the section name.
- Do not put a button or a link inside the trigger.

### Examples

**One open section that can close**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
	N8nAccordion,
	N8nAccordionContent,
	N8nAccordionHeader,
	N8nAccordionItem,
	N8nAccordionTrigger,
} from '@n8n/design-system';

const expanded = ref<string | undefined>('details');
</script>

<template>
	<N8nAccordion v-model="expanded" type="single" collapsible>
		<N8nAccordionItem value="details">
			<N8nAccordionHeader>
				<N8nAccordionTrigger>Details</N8nAccordionTrigger>
			</N8nAccordionHeader>
			<N8nAccordionContent>Section content</N8nAccordionContent>
		</N8nAccordionItem>
		<N8nAccordionItem value="history">
			<N8nAccordionHeader>
				<N8nAccordionTrigger>History</N8nAccordionTrigger>
			</N8nAccordionHeader>
			<N8nAccordionContent>Earlier changes</N8nAccordionContent>
		</N8nAccordionItem>
	</N8nAccordion>
</template>
```

**Several open sections**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
	N8nAccordion,
	N8nAccordionContent,
	N8nAccordionHeader,
	N8nAccordionItem,
	N8nAccordionTrigger,
} from '@n8n/design-system';

const expanded = ref<string[]>(['details']);
</script>

<template>
	<N8nAccordion v-model="expanded" type="multiple">
		<N8nAccordionItem value="details">
			<N8nAccordionHeader>
				<N8nAccordionTrigger>Details</N8nAccordionTrigger>
			</N8nAccordionHeader>
			<N8nAccordionContent>Section content</N8nAccordionContent>
		</N8nAccordionItem>
	</N8nAccordion>
</template>
```

**Trigger with extra text**

The chevron stays on the trigger. Put the extra text in the slot.

```vue
<N8nAccordionTrigger>
	<span>Details</span>
	<span>Version 4</span>
</N8nAccordionTrigger>
```
