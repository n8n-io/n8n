<script lang="ts" setup>
import type { EdgeProps } from '@vue-flow/core';
import { BaseEdge, getBezierPath } from '@vue-flow/core';
import { computed } from 'vue';

const props = defineProps<EdgeProps>();

const edgeStyle = computed(() => ({
	strokeWidth: 2,
	...props.style,
}));

const path = computed(() =>
	getBezierPath({
		sourceX: props.sourceX,
		sourceY: props.sourceY,
		sourcePosition: props.sourcePosition,
		targetX: props.targetX,
		targetY: props.targetY,
		targetPosition: props.targetPosition,
	}),
);
</script>

<template>
	<BaseEdge
		:id="id"
		:style="edgeStyle"
		:path="path[0]"
		:marker-end="markerEnd"
		:label="data?.label"
		:label-x="path[1]"
		:label-y="path[2]"
		:label-style="{ fill: 'white' }"
		:label-show-bg="true"
		:label-bg-style="{ fill: 'red' }"
		:label-bg-padding="[2, 4]"
		:label-bg-border-radius="2"
	/>
</template>
