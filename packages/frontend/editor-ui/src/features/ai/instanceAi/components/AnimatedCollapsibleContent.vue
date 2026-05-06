<script lang="ts" setup>
import { CollapsibleContent } from 'reka-ui';
</script>

<template>
	<CollapsibleContent :class="$style.content">
		<slot />
	</CollapsibleContent>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.content {
	overflow: hidden;

	&[data-state='open'] {
		--animation--collapsible-slide--duration: 0.2s;
		@include motion.collapsible-slide-down;
	}

	&[data-state='closed'] {
		--animation--collapsible-slide--duration: 0.2s;
		@include motion.collapsible-slide-up;
	}
}
</style>
