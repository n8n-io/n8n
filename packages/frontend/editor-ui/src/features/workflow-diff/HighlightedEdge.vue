<script setup lang="ts">
import type { CanvasEdgeProps } from '@/features/canvas/components/elements/edges/CanvasEdge.vue';
import Edge from '@/features/canvas/components/elements/edges/CanvasEdge.vue';
import { BaseEdge } from '@vue-flow/core';

const props = defineProps<CanvasEdgeProps>();
</script>

<template>
	<Edge v-bind="props" read-only :selected="false" :selectable="false">
		<template #highlight="{ segments }">
			<BaseEdge
				v-for="segment in segments"
				:key="segment[0]"
				:style="{
					strokeWidth: 15,
					stroke: 'var(--edge-highlight-color)',
				}"
				:path="segment[0]"
				:interaction-width="0"
			/>
		</template>
	</Edge>
</template>
