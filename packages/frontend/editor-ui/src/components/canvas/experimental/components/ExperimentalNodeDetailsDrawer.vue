<script setup lang="ts">
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import { N8nText } from '@n8n/design-system';
import { computed, provide } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';
import { useVueFlow } from '@vue-flow/core';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExpressionResolveCtx } from '@/components/canvas/experimental/composables/useExpressionResolveCtx';
import { ExpressionLocalResolveContextSymbol } from '@/constants';

const workflowsStore = useWorkflowsStore();
const { setActiveNodeName } = useNDVStore();
const vueFlow = useVueFlow(workflowsStore.workflowId);

const node = computed(() => {
	const node = vueFlow.getSelectedNodes.value[0];

	return node ? (workflowsStore.allNodes.find((n) => n.id === node.id) ?? null) : null;
});
const expressionResolveCtx = useExpressionResolveCtx(node);

function handleOpenNdv() {
	if (node.value) {
		setActiveNodeName(node.value.name);
	}
}

provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);
</script>

<template>
	<div :class="$style.component">
		<N8nText v-if="vueFlow.getSelectedNodes.value.length > 1" color="text-base">
			{{ vueFlow.getSelectedNodes.value.length }} nodes selected
		</N8nText>
		<ExperimentalCanvasNodeSettings v-else-if="node" :key="node.id" :node-id="node.id">
			<template #actions>
				<N8nIconButton
					icon="maximize-2"
					type="secondary"
					text
					size="mini"
					icon-size="large"
					aria-label="Expand"
					@click="handleOpenNdv"
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
