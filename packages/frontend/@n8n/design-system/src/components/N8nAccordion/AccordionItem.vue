<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, useAttrs } from 'vue';

import { AccordionItem, useForwardProps } from './reka-ui';
import type { AccordionItemProps } from './reka-ui';

defineOptions({ name: 'N8nAccordionItem', inheritAttrs: false });

const props = defineProps<AccordionItemProps>();
const forwarded = useForwardProps(props);

const attrs = useAttrs();
const restAttrs = reactiveOmit(attrs, 'class');
const bindings = computed(() => ({
	...forwarded.value,
	...restAttrs,
}));
</script>

<template>
	<AccordionItem v-bind="bindings" :class="[$style.item, attrs.class]">
		<template #default="slotProps">
			<slot v-bind="slotProps" />
		</template>
	</AccordionItem>
</template>

<style lang="scss" module>
.item[data-orientation='vertical'] + .item[data-orientation='vertical'] {
	border-top: var(--border);
}

.item[data-orientation='horizontal'] {
	border-right: var(--border);

	/* The root already draws the outer edge. */
	&:last-child {
		border-right: 0;
	}
}
</style>
