<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import type { EdgeProps } from '@vue-flow/core';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core';
import { computed } from 'vue';

type CanvasEdgeProps = EdgeProps<{ references: string[] }>;

const props = defineProps<CanvasEdgeProps>();

const path = computed(() => getBezierPath(props));
</script>

<template>
	<BaseEdge :id="id" :style="style" :path="path[0]" :marker-end="markerEnd" />
	<EdgeLabelRenderer>
		<div
			:style="{
				pointerEvents: 'all',
				position: 'absolute',
				transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2]}px)`,
			}"
			class="nodrag nopan"
		>
			{{ props.data?.references.length }} Refs
		</div>
	</EdgeLabelRenderer>
</template>
