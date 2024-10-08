<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { ConnectionLineProps } from '@vue-flow/core';
import { BaseEdge } from '@vue-flow/core';
import { computed, useCssModule } from 'vue';
import { getCustomPath } from './utils/edgePath';
import { useCanvas } from '@/composables/useCanvas';
import { NodeConnectionType } from 'n8n-workflow';
import { parseCanvasConnectionHandleString } from '@/utils/canvasUtilsV2';

const props = defineProps<ConnectionLineProps>();

const $style = useCssModule();

const { connectingHandle } = useCanvas();

const connectionType = computed(
	() => parseCanvasConnectionHandleString(connectingHandle.value?.handleId).type,
);

const edgeColor = computed(() => {
	if (connectionType.value !== NodeConnectionType.Main) {
		return 'var(--node-type-supplemental-color)';
	} else {
		return 'var(--color-foreground-xdark)';
	}
});

const edgeStyle = computed(() => ({
	...(connectionType.value === NodeConnectionType.Main ? {} : { strokeDasharray: '8,8' }),
	strokeWidth: 2,
	stroke: edgeColor.value,
}));

const path = computed(() => getCustomPath(props, { connectionType: connectionType.value }));
</script>

<template>
	<BaseEdge :class="$style.edge" :style="edgeStyle" :path="path[0]" :marker-end="markerEnd" />
</template>

<style lang="scss" module>
.edge {
	transition: stroke 0.3s ease;
}
</style>
