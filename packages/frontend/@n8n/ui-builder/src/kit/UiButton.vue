<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { computed } from 'vue';

defineOptions({ name: 'UiButton' });

const props = withDefaults(
	defineProps<{
		label?: string;
		variant?: 'primary' | 'secondary' | 'tertiary';
		disabled?: boolean;
		/** Computed by the renderer, not authored: one of this button's actions is calling out. */
		busy?: boolean;
		/** Marks this button as the current one, which is how a repeat over `$pages` becomes a nav bar. */
		active?: boolean;
	}>(),
	{ label: 'Button', variant: 'primary', disabled: false, busy: false, active: false },
);

/**
 * The kit offers an app author primary, secondary and tertiary, which is what
 * they think in; the design system thinks in solid, outline and ghost.
 *
 * This used to be handed over as `type`, which that button does not take, so it
 * landed on the DOM as an invalid native button type and every button rendered
 * the same whatever the author picked. Stored documents are untouched and start
 * rendering as they always asked to.
 */
const VARIANTS = { primary: 'solid', secondary: 'outline', tertiary: 'ghost' } as const;

const buttonVariant = computed(() => VARIANTS[props.variant] ?? 'solid');

// The renderer binds this to the component's `onClick` action prop. The binding
// is always there; the renderer drops the event in edit mode, so a button in
// the canvas is inert.
const emit = defineEmits<{ act: [] }>();

// A busy button already carries the disabled attribute the design system sets
// while loading. The guard is here so that starting the same chain twice does
// not depend on what the button underneath does about pointer events.
function act() {
	if (props.disabled || props.busy) return;
	emit('act');
}
</script>

<template>
	<N8nButton
		:variant="buttonVariant"
		:disabled="disabled"
		:loading="busy"
		:class="{ 'ui-button--active': active }"
		:aria-current="active || undefined"
		@click="act"
	>
		{{ label }}
	</N8nButton>
</template>

<style scoped>
/*
 * There is no "current" state to borrow from the design system: its only
 * active-looking hook is `[aria-expanded]`, which says a disclosure is open and
 * would be untrue of a nav button. So the marker is a rule of our own, laid
 * over whichever variant the author picked, and `aria-current` carries the same
 * fact to anything not looking at the pixels.
 */
.ui-button--active {
	position: relative;
}

.ui-button--active::after {
	content: '';
	position: absolute;
	right: 8px;
	bottom: 3px;
	left: 8px;
	height: 2px;
	border-radius: 1px;
	background: var(--color--primary, #ff6d5a);
}
</style>
