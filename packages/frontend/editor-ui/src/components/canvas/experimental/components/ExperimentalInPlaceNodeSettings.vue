<script setup lang="ts">
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import { ref, computed } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExperimentalNdvStore } from '../experimentalNdv.store';
import NodeTitle from '@/components/NodeTitle.vue';
import { N8nIconButton } from '@n8n/design-system';
import { useVueFlow } from '@vue-flow/core';
import { watchOnce } from '@vueuse/core';

const { nodeId } = defineProps<{ nodeId: string }>();

const experimentalNdvStore = useExperimentalNdvStore();
const isExpanded = computed(() => !experimentalNdvStore.collapsedNodes[nodeId]);
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const node = computed(() => workflowsStore.getNodeById(nodeId) ?? null);
const nodeType = computed(() => {
	if (node.value) {
		return nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion);
	}
	return null;
});
const vf = useVueFlow(workflowsStore.workflowId);

const isVisible = computed(() =>
	vf.isNodeIntersecting(
		{ id: nodeId },
		{
			x: -vf.viewport.value.x / vf.viewport.value.zoom,
			y: -vf.viewport.value.y / vf.viewport.value.zoom,
			width: vf.viewportRef.value?.offsetWidth ?? 0,
			height: vf.viewportRef.value?.offsetHeight ?? 0,
		},
	),
);
const isOnceVisible = ref(isVisible.value);

watchOnce(isVisible, (visible) => {
	isOnceVisible.value = isOnceVisible.value || visible;
});

function handleToggleExpand() {
	experimentalNdvStore.setNodeExpanded(nodeId);
}
</script>

<template>
	<div
		ref="container"
		:class="[$style.component, isExpanded ? $style.expanded : $style.collapsed]"
		:style="{ '--zoom': `${1 / experimentalNdvStore.maxCanvasZoom}` }"
	>
		<template v-if="isOnceVisible">
			<ExperimentalCanvasNodeSettings
				v-if="isExpanded"
				:node-id="nodeId"
				:class="$style.settingsView"
			>
				<template #actions>
					<N8nIconButton
						:icon="isExpanded ? 'compress' : 'expand'"
						type="secondary"
						text
						size="mini"
						icon-size="large"
						aria-label="Toggle expand"
						@click="handleToggleExpand"
					/>
				</template>
			</ExperimentalCanvasNodeSettings>
			<div v-else :class="$style.collapsedContent" is-read-only :node="node" :node-type="nodeType">
				<NodeTitle v-if="node" class="node-name" :model-value="node.name" :node-type="nodeType" />
				<N8nIconButton
					:icon="isExpanded ? 'compress' : 'expand'"
					type="secondary"
					text
					size="mini"
					icon-size="large"
					aria-label="Toggle expand"
					@click="handleToggleExpand"
				/>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.component {
	position: relative;
	align-items: flex-start;
	justify-content: stretch;
	overflow: auto;
	cursor: default !important;
	overflow: visible !important;
	border-width: 0 !important;
	outline: none !important;
	box-shadow: none !important;
	background-color: transparent !important;

	&.collapsed {
		height: calc(var(--canvas-node--width) * 0.5) !important;
		margin-block: calc(var(--canvas-node--width) * 0.25) !important;
	}
}

:global(.vue-flow__node):has(.component) {
	z-index: 10 !important;

	:global(.selected) & {
		z-index: 11 !important;
	}
}

.collapsedContent,
.settingsView {
	border-radius: 4px !important;
	border: 1px solid var(--canvas-node--border-color, var(--color-foreground-xdark));
	z-index: 1000;
	position: absolute;
	left: calc(var(--canvas-node--width) * -0.25);
	width: calc(var(--canvas-node--width) * 1.5) !important;

	:global(.selected) & {
		box-shadow: 0 0 0 4px var(--color-canvas-selected-transparent);
		z-index: 1001;
	}

	& > * {
		zoom: var(--zoom);
	}
}

.settingsView {
	height: auto !important;
	max-height: min(200%, 300px) !important;
	top: -10%;
	min-height: 120% !important;
}

.collapsedContent {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-s);
	background-color: white;
	padding: var(--spacing-2xs);
	background-color: var(--color-background-base);
}
</style>
