<script lang="ts" setup>
import { useCssModule } from 'vue';
import { N8nTooltip } from '@n8n/design-system';

defineProps<{
	content: string;
}>();

const $style = useCssModule();
</script>

<template>
	<div :class="$style.tooltipContainer">
		<N8nTooltip
			:content="content"
			placement="top"
			:teleported="false"
			:offset="8"
			:content-class="$style.content"
		>
			<slot />
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.tooltipContainer {
	position: relative;
}

.content {
	white-space: nowrap;
}
</style>
