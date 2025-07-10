<script setup lang="ts">
import { GRID_SIZE } from '@/utils/nodeViewUtils';
import CanvasBackgroundStripedPattern from './CanvasBackgroundStripedPattern.vue';
import { Background } from '@vue-flow/background';
import type { ViewportTransform } from '@vue-flow/core';

defineProps<{
	striped: boolean;
	viewport: ViewportTransform;
}>();
</script>
<template>
	<Background data-test-id="canvas-background" pattern-color="#aaa" :gap="GRID_SIZE">
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
