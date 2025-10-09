<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { ConnectionLineProps } from '@vue-flow/core';
import { BaseEdge } from '@vue-flow/core';
import { computed, onMounted, ref, useCssModule } from 'vue';
import { getEdgeRenderData } from './utils';
import { useCanvas } from '../../../composables/useCanvas';
import { NodeConnectionTypes } from 'n8n-workflow';
import { parseCanvasConnectionHandleString } from '../../../canvas.utils';

const props = defineProps<ConnectionLineProps>();

const $style = useCssModule();

const { connectingHandle } = useCanvas();

const connectionType = computed(
	() => parseCanvasConnectionHandleString(connectingHandle.value?.handleId).type,
);

const classes = computed(() => {
	return {
		[$style.edge]: true,
		[$style.visible]: isVisible.value,
	};
});

const edgeColor = computed(() => {
	if (connectionType.value !== NodeConnectionTypes.Main) {
		return 'var(--node-type-supplemental-color)';
	} else {
		return 'var(--color--foreground--shade-2)';
	}
});

const edgeStyle = computed(() => ({
	...(connectionType.value === NodeConnectionTypes.Main ? {} : { strokeDasharray: '8,8' }),
	strokeWidth: 2,
	stroke: edgeColor.value,
}));

const renderData = computed(() =>
	getEdgeRenderData(props, { connectionType: connectionType.value }),
);

const segments = computed(() => renderData.value.segments);

/**
 * Used to delay the visibility of the connection line to prevent flickering
 * when the actual user intent is to click the plus button
 */
const isVisible = ref(false);

onMounted(() => {
	setTimeout(() => {
		isVisible.value = true;
	}, 300);
});
</script>

<template>
	<BaseEdge
		v-for="segment in segments"
		:key="segment[0]"
		:class="classes"
		:style="edgeStyle"
		:path="segment[0]"
		:marker-end="markerEnd"
	/>
</template>

<style lang="scss" module>
.edge {
	transition-property: stroke, opacity;
	transition-duration: 300ms;
	transition-timing-function: ease;
	opacity: 0;

	&.visible {
		opacity: 1;
	}
}
</style>
