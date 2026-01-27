<script lang="ts" setup>
import { useCanvasNode } from '../../../../../composables/useCanvasNode';
import { computed } from 'vue';
import type { CanvasNodeDefaultRender } from '../../../../../canvas.types';

import { N8nTooltip } from '@n8n/design-system';
defineProps<{
	visible: boolean;
}>();

const { render } = useCanvasNode();

const renderOptions = computed(() => render.value.options as CanvasNodeDefaultRender['options']);
</script>

<template>
	<N8nTooltip
		placement="top"
		:show-after="500"
		:visible="visible"
		:teleported="false"
		:content-class="$style.content"
		:avoid-collisions="false"
	>
		<template #content>
			{{ renderOptions.tooltip }}
		</template>
		<div :class="$style.tooltipTrigger" />
	</N8nTooltip>
</template>

<style lang="scss" module>
.tooltipTrigger {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}

.content {
	white-space: nowrap;
}
</style>
