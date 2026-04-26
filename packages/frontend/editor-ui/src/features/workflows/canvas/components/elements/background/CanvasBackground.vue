<script setup lang="ts">
import { GRID_SIZE } from '@/app/utils/nodeViewUtils';
import CanvasBackgroundStripedPattern from './CanvasBackgroundStripedPattern.vue';
import { Background } from '@vue-flow/background';
import type { ViewportTransform } from '@vue-flow/core';

withDefaults(
	defineProps<{
		striped: boolean;
		viewport: ViewportTransform;
		variant?: 'dots' | 'lines';
		patternColor?: string;
	}>(),
	{
		variant: 'dots',
		patternColor: 'var(--canvas--dot--color)',
	},
);
</script>
<template>
	<Background
		data-test-id="canvas-background"
		:pattern-color="patternColor"
		:variant="variant"
		:gap="GRID_SIZE"
	>
		<template v-if="striped" #pattern-container="patternProps">
			<CanvasBackgroundStripedPattern
				:id="patternProps.id"
				data-test-id="canvas-background-striped-pattern"
				:x="viewport.x"
				:y="viewport.y"
				:zoom="viewport.zoom"
			/>
		</template>
	</Background>
</template>
