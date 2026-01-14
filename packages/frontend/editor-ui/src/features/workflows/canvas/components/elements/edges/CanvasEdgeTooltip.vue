<script lang="ts" setup>
import { ref, useCssModule } from 'vue';
import { N8nTooltip } from '@n8n/design-system';

const props = defineProps<{
	content: string;
}>();

const $style = useCssModule();

const visible = ref(false);

function onMouseEnter() {
	visible.value = true;
}

function onMouseLeave() {
	visible.value = false;
}
</script>

<template>
	<div :class="$style.tooltipContainer">
		<N8nTooltip
			:visible="visible"
			:content="content"
			placement="top"
			:teleported="false"
			:offset="8"
			popper-class="canvas-edge-toolbar-popper"
		>
			<div @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
				<slot />
			</div>
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
