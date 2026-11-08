<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, useAttrs } from 'vue';

import { AccordionHeader, useForwardProps } from './reka-ui';
import type { AccordionHeaderProps } from './reka-ui';

defineOptions({ name: 'N8nAccordionHeader', inheritAttrs: false });

const props = defineProps<AccordionHeaderProps>();
const forwarded = useForwardProps(props);

const attrs = useAttrs();
const restAttrs = reactiveOmit(attrs, 'class');
const bindings = computed(() => ({
	...forwarded.value,
	...restAttrs,
}));
</script>

<template>
	<AccordionHeader v-bind="bindings" :class="[$style.header, attrs.class]">
		<slot />
	</AccordionHeader>
</template>

<style lang="scss" module>
.header {
	/* The native heading margin would add a gap the trigger padding already covers. */
	margin: 0;
}
</style>
