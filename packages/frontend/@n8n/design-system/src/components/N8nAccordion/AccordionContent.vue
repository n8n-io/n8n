<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, useAttrs } from 'vue';

import { AccordionContent, useForwardProps } from './reka-ui';
import type { AccordionContentProps } from './reka-ui';

defineOptions({ name: 'N8nAccordionContent', inheritAttrs: false });

const props = defineProps<AccordionContentProps>();
const forwarded = useForwardProps(props);

const attrs = useAttrs();
const restAttrs = reactiveOmit(attrs, 'class');
const bindings = computed(() => ({
	...forwarded.value,
	...restAttrs,
}));
</script>

<template>
	<AccordionContent v-if="asChild" v-bind="bindings" :class="[$style.content, attrs.class]">
		<slot />
	</AccordionContent>
	<AccordionContent v-else v-bind="bindings" :class="[$style.content, attrs.class]">
		<div :class="$style.body">
			<slot />
		</div>
	</AccordionContent>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.content {
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	/* The slide mixins read the collapsible variable. Point it at the accordion size. */
	--reka-collapsible-content-height: var(--reka-accordion-content-height);
	--reka-collapsible-content-width: var(--reka-accordion-content-width);
	display: flex;
	flex-direction: column;
	overflow: hidden;

	&[data-state='open'] {
		@include motion.collapsible-slide-down;
	}

	&[data-state='closed'] {
		@include motion.collapsible-slide-up;
	}
}

.body {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	padding: var(--accordion--content--padding, var(--spacing--sm));
}
</style>
