<script lang="ts" setup>
import { BaseEdge, getBezierPath, Position } from '@vue-flow/core';
import { computed, PropType } from 'vue';

const props = defineProps({
	id: {
		type: String,
		required: true,
	},
	sourceX: {
		type: Number,
		required: true,
	},
	sourceY: {
		type: Number,
		required: true,
	},
	targetX: {
		type: Number,
		required: true,
	},
	targetY: {
		type: Number,
		required: true,
	},
	sourcePosition: {
		type: String as PropType<Position>,
		required: true,
	},
	targetPosition: {
		type: String as PropType<Position>,
		required: true,
	},
	data: {
		type: Object,
		required: false,
	},
	markerEnd: {
		type: String,
		required: false,
	},
	style: {
		type: Object,
		required: false,
	},
});

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
