<script setup lang="ts">
import { useExpressionResolveCtx } from '@/components/canvas/experimental/composables/useExpressionResolveCtx';
import { ExpressionLocalResolveContextSymbol } from '@/constants';
import { type INodeUi } from '@/Interface';
import { N8nText } from '@n8n/design-system';
import { type GraphNode } from '@vue-flow/core';
import { computed, provide, ref, watch } from 'vue';
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import { useNDVStore } from '@/stores/ndv.store';

const { node, nodes } = defineProps<{ node: INodeUi; nodes: GraphNode[] }>();

const emit = defineEmits<{ openNdv: [] }>();

const expressionResolveCtx = useExpressionResolveCtx(computed(() => node));
const ndvStore = useNDVStore();

const ndvCloseTimes = ref(0);

// To ensure showing latest parameters, force re-render when NDV is closed
const nodeSettingsViewKey = computed(() => [node.id, ndvCloseTimes.value].join('|'));

// Track closing NDV
watch(
	() => ndvStore.activeNodeName,
	(name, oldName) => {
		if (name === null && oldName !== null) {
			ndvCloseTimes.value += 1;
		}
	},
);

provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);
</script>

<template>
	<div :class="$style.component">
		<N8nText v-if="nodes.length > 1" color="text-base"> {{ nodes.length }} nodes selected </N8nText>
		<ExperimentalCanvasNodeSettings v-else-if="node" :key="nodeSettingsViewKey" :node-id="node.id">
			<template #actions>
				<N8nIconButton
					icon="maximize-2"
					type="secondary"
					text
					size="mini"
					icon-size="large"
					aria-label="Expand"
					@click="emit('openNdv')"
				/>
			</template>
		</ExperimentalCanvasNodeSettings>
	</div>
</template>

<style lang="scss" module>
.component {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	overflow: auto;
}
</style>
