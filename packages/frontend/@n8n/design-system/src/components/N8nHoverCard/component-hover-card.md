# Component specification

Displays contextual information when a user hovers or focuses a trigger. Hover cards are for lightweight preview/details content that benefits from richer layout than `N8nTooltip`, but should not require a click or modal interaction.

- **Component Name:** N8nHoverCard
- **Figma Component:** TBD
- **Reka UI Component:** [Hover Card](https://reka-ui.com/docs/components/hover-card)
- **Related Component:** `N8nPopover` for click-triggered overlays and shared floating-surface styling

## Current usage research

`editor-ui` currently has one direct Reka HoverCard usage:

- `packages/frontend/editor-ui/src/features/agents/components/SessionTimelineChart.vue`

That implementation uses:

- A controlled `open` state bound to `HoverCardRoot`.
- `closeDelay={0}` on `HoverCardRoot`.
- A hidden `HoverCardTrigger` because the chart uses one shared hover card instead of one card per timeline segment.
- `HoverCardContent.reference` to anchor content to the currently hovered/focused timeline segment element.
- `side="top"`, `align="center"`, and `sideOffset={8}`.
- `HoverCardPortal` with default teleport behavior.
- Custom content class for compact, single-line, popover-like surface styling.

The design-system wrapper must therefore support both normal trigger-slot usage and advanced reference-based usage for shared hover cards.

## Public API definition

### Props

- `open?: boolean` - Controlled visibility state. Supports two-way binding via `v-model:open`.
- `defaultOpen?: boolean` - Initial uncontrolled visibility state.
- `openDelay?: number` - Delay in milliseconds before opening on hover/focus. Default: `600`.
- `closeDelay?: number` - Delay in milliseconds before closing after hover/focus leaves. Default: `0`.
- `disabled?: boolean` - Disables opening the hover card.
- `side?: 'top' | 'right' | 'bottom' | 'left'` - Preferred side of the trigger/reference. Default: `'bottom'`.
- `align?: 'start' | 'center' | 'end'` - Alignment along the side axis. Default: `'center'`.
- `sideOffset?: number` - Offset from the trigger/reference in pixels. Default: `4`, matching `N8nPopover`.
- `alignOffset?: number` - Offset along the alignment axis.
- `avoidCollisions?: boolean` - Whether to avoid viewport collisions. Default: `true`.
- `collisionPadding?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>` - Padding from collision boundaries. Default: `5`, matching `N8nPopover`.
- `sideFlip?: boolean` - Whether to flip to the opposite side when there is not enough space.
- `reference?: Element | VirtualElement` - Custom reference element for positioning. Required for shared/virtual hover card patterns where the trigger slot is hidden or not the positioning anchor.
- `maxWidth?: string` - Hover card max content width, for example `'280px'` or `'auto'`.
- `maxHeight?: string` - Maximum height for scrollable content.
- `enableScrolling?: boolean` - Whether to wrap content in `N8nScrollArea`. Default: `false` because hover cards are expected to be compact.
- `forceMount?: boolean` - Whether to force mount the content even when closed.
- `teleported?: boolean` - Whether to render content in a portal. Default: `true`.
- `contentClass?: string` - Additional class for the content element.
- `triggerClass?: string` - Additional class for the trigger wrapper.
- `triggerAsChild?: boolean` - Whether to render the trigger slot as the trigger element. Default: `true`.
- `hideTrigger?: boolean` - Renders an inert hidden trigger for reference-based/shared patterns. Default: `false`.

`VirtualElement` should use the compatible Floating UI shape accepted by Reka `HoverCardContent.reference`.

### Events

- `update:open` - Emitted when visibility changes. Payload: `boolean`. Used with `v-model:open`.
- `before-enter` - Emitted when the hover card transitions from closed to open.
- `after-leave` - Emitted when the hover card transitions from open to closed.

### Slots

- `trigger` - Element that activates the hover card. Optional only when `hideTrigger` and `reference` are used for a shared/virtual hover card pattern.
- `content` - Hover card content. Receives `{ close: () => void }` scope for programmatic closing.

## Styling

The content surface should reuse `N8nPopover`'s visual language:

- `border-radius: var(--radius--xs)`
- `background-color: var(--background--surface)`
- `box-shadow: var(--shadow--md), inset var(--shadow--outline)`
- `transform-origin` derived from Reka/Floating data attributes
- `motion.popover-in` for the open-state entrance animation
- `[data-state='closed'] { display: none; }`
- Add the entrance animation from `_motion.scss`; it should be origin-aware like `N8nPopover` and `N8nDropdownMenu`. Do not animate on exit.

The wrapper should not use `N8nTooltip`'s dark tooltip surface. Hover cards can contain structured content and should adapt to light/dark mode like popovers.

## Template usage examples

### Basic preview card

```vue
<script setup lang="ts">
import { N8nHoverCard, N8nButton, N8nText } from '@n8n/design-system';
</script>

<template>
	<N8nHoverCard side="right" max-width="280px">
		<template #trigger>
			<N8nButton type="secondary">View workflow details</N8nButton>
		</template>
		<template #content>
			<div class="workflow-preview">
				<N8nText bold>Customer onboarding</N8nText>
				<N8nText size="small" color="text-light">
					Runs when a new account is created and sends setup tasks to the owner.
				</N8nText>
			</div>
		</template>
	</N8nHoverCard>
</template>
```

### Controlled open state

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nHoverCard, N8nTag } from '@n8n/design-system';

const isOpen = ref(false);
</script>

<template>
	<N8nHoverCard v-model:open="isOpen" side="top" :close-delay="600">
		<template #trigger>
			<N8nTag text="Production" />
		</template>
		<template #content>
			<div class="environment-card">Last deployed 14 minutes ago</div>
		</template>
	</N8nHoverCard>
</template>
```

### Shared reference-based hover card

This is the API shape needed to replace the manual Reka usage in `SessionTimelineChart.vue`.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nHoverCard } from '@n8n/design-system';

const open = ref(false);
const activeReference = ref<HTMLElement | null>(null);
const activeLabel = ref('');

function showCard(event: MouseEvent, label: string) {
	if (!(event.currentTarget instanceof HTMLElement)) return;
	activeReference.value = event.currentTarget;
	activeLabel.value = label;
	open.value = true;
}

function hideCard() {
	open.value = false;
	activeReference.value = null;
}
</script>

<template>
	<N8nHoverCard
		v-model:open="open"
		hide-trigger
		:reference="activeReference ?? undefined"
		side="top"
		align="center"
		:side-offset="8"
		:close-delay="0"
		content-class="timeline-hover-card"
	>
		<template #content>
			<span>{{ activeLabel }}</span>
		</template>
	</N8nHoverCard>

	<button @mouseenter="showCard($event, 'Agent step')" @mouseleave="hideCard">
		Timeline segment
	</button>
</template>
```

### With scrollable content

```vue
<script setup lang="ts">
import { N8nHoverCard } from '@n8n/design-system';
</script>

<template>
	<N8nHoverCard max-width="320px" max-height="240px" enable-scrolling>
		<template #trigger>
			<span>Show recent executions</span>
		</template>
		<template #content>
			<ul class="execution-list">
				<li v-for="execution in recentExecutions" :key="execution.id">
					{{ execution.workflowName }}
				</li>
			</ul>
		</template>
	</N8nHoverCard>
</template>
```

## Migration plan

1. Add `N8nHoverCard/HoverCard.vue`, `index.ts`, stories, and tests in `@n8n/design-system`.
2. Export `N8nHoverCard` from `packages/frontend/@n8n/design-system/src/components/index.ts`.
3. Replace the direct Reka imports in `SessionTimelineChart.vue` with `N8nHoverCard`.
4. Keep the timeline's delayed-open timer because it is domain behavior tied to active segment state, not generic hover-card behavior.
5. Remove duplicated popover-like surface styles from `SessionTimelineChart.vue` once the wrapper provides the shared base surface.

## PR summary draft

Added an API specification for a new `N8nHoverCard` design-system component. The spec is based on the existing direct Reka HoverCard usage in `SessionTimelineChart.vue` and defines the wrapper props, events, slots, styling direction, examples, and migration plan needed before implementing the component.
