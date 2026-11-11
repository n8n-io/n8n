<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, useAttrs } from 'vue';

import N8nIcon from '../N8nIcon';
import { AccordionTrigger, useForwardProps } from './reka-ui';
import type { AccordionTriggerProps } from './reka-ui';

defineOptions({ name: 'N8nAccordionTrigger', inheritAttrs: false });

const props = defineProps<AccordionTriggerProps>();
const forwarded = useForwardProps(props);

const attrs = useAttrs();
const restAttrs = reactiveOmit(attrs, 'class');
const bindings = computed(() => ({
	...forwarded.value,
	...restAttrs,
}));

/**
 * Fixed icon. The slot is the section name, so every trigger shows the same chevron.
 * size stays small so the icon matches the trigger text.
 */
const chevron = {
	icon: 'chevron-down',
	size: 'small',
} as const;
</script>

<template>
	<AccordionTrigger v-if="asChild" v-bind="bindings" :class="[$style.trigger, attrs.class]">
		<slot />
	</AccordionTrigger>
	<AccordionTrigger v-else v-bind="bindings" :class="[$style.trigger, attrs.class]">
		<span :class="$style.label">
			<slot />
		</span>
		<span :class="$style.chevron">
			<N8nIcon :icon="chevron.icon" :size="chevron.size" />
		</span>
	</AccordionTrigger>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	/* Reset the native button border. The open state draws its own edge. */
	border: 0;
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		@include focus.focus-ring;
		outline-offset: calc(-1 * var(--focus--border-width));
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}

	&[data-orientation='vertical'][data-state='open'] {
		border-bottom: var(--border);
	}

	&[data-orientation='horizontal'] {
		width: auto;
	}
}

.label {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
}

.chevron {
	display: inline-flex;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	transition: transform var(--duration--snappy) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.trigger[data-state='closed'] .chevron {
	transform: rotate(-90deg);
}
</style>
