<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { ConnectionLineProps } from '@vue-flow/core';
import { BaseEdge } from '@vue-flow/core';
import { computed, useCssModule } from 'vue';
import { getCustomPath } from './utils/edgePath';

const props = defineProps<ConnectionLineProps>();

const $style = useCssModule();

const edgeStyle = computed(() => ({
	strokeWidth: 2,
}));

const path = computed(() => getCustomPath(props));
</script>

<template>
	<BaseEdge :class="$style.edge" :style="edgeStyle" :path="path[0]" :marker-end="markerEnd" />
</template>

<style lang="scss" module>
.edge {
	transition: stroke 0.3s ease;
}
</style>
