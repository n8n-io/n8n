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
			popper-class="canvas-edge-toolbar-popper"
		>
			<slot />
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.tooltipContainer {
	position: relative;
}
</style>

<style lang="scss">
.canvas-edge-toolbar-popper {
	white-space: nowrap;

	.el-popper__arrow {
		// override default margin as it moves the arrow off the center
		margin: 0 !important;
	}
}
</style>
