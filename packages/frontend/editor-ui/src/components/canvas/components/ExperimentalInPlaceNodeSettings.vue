<script setup lang="ts">
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import { useNodeSettingsInCanvas } from '../composables/useNodeSettingsInCanvas';
import { useCanvasStore } from '@/stores/canvas.store';
import { computed } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

const { nodeId } = defineProps<{ nodeId: string }>();

const { maxCanvasZoom = 4 } = useNodeSettingsInCanvas();
const canvasStore = useCanvasStore();
const isExpanded = computed(() => !canvasStore.collapsedNodes[nodeId]);
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const node = computed(() => workflowsStore.getNodeById(nodeId) ?? null);
const nodeType = computed(() => {
	if (node.value) {
		return nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion);
	}
	return null;
});

function handleToggleExpand() {
	canvasStore.setNodeExpanded(nodeId);
}
</script>

<template>
	<div
		:class="['nowheel', $style.component, isExpanded ? $style.expanded : $style.collapsed]"
		:style="{ '--zoom': `${1 / maxCanvasZoom}` }"
	>
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
		<NodeSettingsHeader
			v-else
			:class="$style.collapsedContent"
			is-read-only
			:node="node"
			:node-type="nodeType"
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
		</NodeSettingsHeader>
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
