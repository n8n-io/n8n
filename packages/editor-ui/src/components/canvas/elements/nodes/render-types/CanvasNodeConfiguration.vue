<script lang="ts" setup>
import { useCssModule } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { CanvasElementData } from '@/types';

defineProps<{
	nodeType: INodeTypeDescription;
	data: CanvasElementData;
}>();

const $style = useCssModule();
</script>

<template>
	<div :class="$style.canvasNodeConfiguration">
		<slot />
	</div>
</template>

<style lang="scss" module>
.canvasNodeConfiguration {
	width: 75px;
	height: 75px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--canvas-node--background, var(--node-type-supplemental-background));
	border: 2px solid var(--canvas-node--border-color, var(--color-foreground-dark));
	border-radius: 50%;
}
</style>
