<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, useAttrs } from 'vue';

import { AccordionRoot, useForwardPropsEmits } from './reka-ui';
import type { AccordionRootEmits, AccordionRootProps } from './reka-ui';

defineOptions({ name: 'N8nAccordion', inheritAttrs: false });

const props = defineProps<AccordionRootProps>();
const emit = defineEmits<AccordionRootEmits>();
const forwarded = useForwardPropsEmits(props, emit);

const attrs = useAttrs();
const restAttrs = reactiveOmit(attrs, 'class');
const bindings = computed(() => ({
	...forwarded.value,
	...restAttrs,
}));
</script>

<template>
	<AccordionRoot v-bind="bindings" :class="[$style.root, attrs.class]">
		<template #default="slotProps">
			<slot v-bind="slotProps" />
		</template>
	</AccordionRoot>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	overflow: hidden;

	&[data-orientation='horizontal'] {
		display: flex;
		align-items: flex-start;
	}
}
</style>
