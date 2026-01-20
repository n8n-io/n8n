<script setup lang="ts">
import type { CanvasNode, CanvasConnection } from '@/features/workflows/canvas/canvas.types';
import type { INodeUi } from '@/Interface';
import SyncedWorkflowCanvas from './SyncedWorkflowCanvas.vue';
import WorkflowDiffAside from './WorkflowDiffAside.vue';
import NodeDiff from './NodeDiff.vue';
import HighlightedEdge from './HighlightedEdge.vue';
import Node from '@/features/workflows/canvas/components/elements/nodes/CanvasNode.vue';
import { useI18n } from '@n8n/i18n';
import { useCssModule } from 'vue';
import { N8nHeading, N8nText } from '@n8n/design-system';
import { NodeDiffStatus } from 'n8n-workflow';

const props = defineProps<{
	sourceNodes: CanvasNode[];
	sourceConnections: CanvasConnection[];
	targetNodes: CanvasNode[];
	targetConnections: CanvasConnection[];
	sourceLabel: string;
	targetLabel: string;
	sourceExists: boolean;
	targetExists: boolean;
	selectedNode?: INodeUi;
	nodeDiffs: { oldString: string; newString: string };
	isSourceWorkflowNew: boolean;
	applyLayout?: boolean;
	nodesDiff: Map<string, { status: NodeDiffStatus; node: INodeUi }>;
	connectionsDiff: Map<string, { status: NodeDiffStatus; connection: unknown }>;
}>();

const emit = defineEmits<{
	closeAside: [];
}>();

const i18n = useI18n();
const $style = useCssModule();

function getNodeStatusClass(id: string) {
	const status = props.nodesDiff?.get(id)?.status ?? 'equal';
	return $style[status];
}

function getEdgeStatusClass(id: string) {
	const status = props.connectionsDiff?.get(id)?.status ?? NodeDiffStatus.Eq;
	return $style[`edge-${status}`];
}
</script>

<template>
	<div :class="$style.workflowDiffContent">
		<div :class="$style.workflowDiff">
			<!-- Source panel -->
			<div :class="$style.workflowDiffPanel">
				<slot name="sourceLabel">
					<N8nText color="text-dark" size="small" :class="$style.sourceBadge">
						{{ sourceLabel }}
					</N8nText>
				</slot>
				<template v-if="sourceExists">
					<SyncedWorkflowCanvas
						id="top"
						:nodes="sourceNodes"
						:connections="sourceConnections"
						:apply-layout="applyLayout"
					>
						<template #node="{ nodeProps }">
							<Node v-bind="nodeProps" :class="{ [getNodeStatusClass(nodeProps.id)]: true }">
								<template #toolbar />
							</Node>
						</template>
						<template #edge="{ edgeProps, arrowHeadMarkerId }">
							<HighlightedEdge
								v-bind="edgeProps"
								:marker-end="`url(#${arrowHeadMarkerId})`"
								:class="{ [getEdgeStatusClass(edgeProps.id)]: true }"
							/>
						</template>
					</SyncedWorkflowCanvas>
				</template>
				<template v-else>
					<div :class="$style.emptyWorkflow">
						<N8nHeading size="large">
							{{
								isSourceWorkflowNew
									? i18n.baseText('workflowDiff.newWorkflow')
									: i18n.baseText('workflowDiff.deletedWorkflow')
							}}
						</N8nHeading>
						<slot name="sourceEmptyText" />
					</div>
				</template>
			</div>

			<!-- Target panel -->
			<div :class="$style.workflowDiffPanel">
				<slot name="targetLabel">
					<N8nText color="text-dark" size="small" :class="$style.sourceBadge">
						{{ targetLabel }}
					</N8nText>
				</slot>
				<template v-if="targetExists">
					<SyncedWorkflowCanvas
						id="bottom"
						:nodes="targetNodes"
						:connections="targetConnections"
						:apply-layout="applyLayout"
					>
						<template #node="{ nodeProps }">
							<Node v-bind="nodeProps" :class="{ [getNodeStatusClass(nodeProps.id)]: true }">
								<template #toolbar />
							</Node>
						</template>
						<template #edge="{ edgeProps, arrowHeadMarkerId }">
							<HighlightedEdge
								v-bind="edgeProps"
								:marker-end="`url(#${arrowHeadMarkerId})`"
								:class="{ [getEdgeStatusClass(edgeProps.id)]: true }"
							/>
						</template>
					</SyncedWorkflowCanvas>
				</template>
				<template v-else>
					<div :class="$style.emptyWorkflow">
						<N8nHeading size="large">
							{{ i18n.baseText('workflowDiff.deletedWorkflow') }}
						</N8nHeading>
						<slot name="targetEmptyText" />
					</div>
				</template>
			</div>
		</div>

		<WorkflowDiffAside v-if="selectedNode" :node="selectedNode" @close="emit('closeAside')">
			<template #default="{ outputFormat }">
				<NodeDiff v-bind="nodeDiffs" :output-format="outputFormat" />
			</template>
		</WorkflowDiffAside>
	</div>
</template>

<style module lang="scss">
.workflowDiffContent {
	display: flex;
	height: 100%;
	flex: 1;
	overflow: hidden;
}

.workflowDiff {
	display: flex;
	flex-direction: column;
	height: 100%;
	flex: 1;
}

.workflowDiffPanel {
	flex: 1;
	position: relative;
	border-top: 1px solid var(--color--foreground);
	background: var(--canvas--color--background);
}

.sourceBadge {
	position: absolute;
	top: 12px;
	left: 12px;
	z-index: 1;
	border-radius: 4px;
	border: 1px solid var(--color--foreground--tint-1);
	background: var(--color--foreground--tint-2);
	display: flex;
	height: 30px;
	padding: 0 12px;
	align-items: center;
	gap: 8px;
	align-self: stretch;
}

.emptyWorkflow {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

/* Node status styles */
.deleted,
.added,
.modified {
	position: relative;
	&::before {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translate(-50%, -50%);
		border-radius: 4px;
		color: var(--color--text--tint-3);
		font-family: Inter, var(--font-family);
		font-size: 10px;
		font-weight: 700;
		z-index: 1;
		width: 16px;
		height: 16px;
		display: inline-flex;
		justify-content: center;
		align-items: center;
	}
}

.deleted {
	--canvas-node--color--background: var(--diff--color--deleted--faint);
	--canvas-node--border-color: var(--diff--color--deleted);
	--sticky--color--background: var(--diff--color--deleted--faint);
	--sticky--border-color: var(--diff--color--deleted);

	:global(> div) {
		--canvas-node--border-width: 2px;
	}

	&::before {
		content: 'D';
		background-color: var(--diff--color--deleted);
	}
	:global(.canvas-node-handle-main-output .source),
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--diff--color--deleted);
		border: none;
	}

	:global([class*='disabled']) {
		--canvas-node--border-color: var(--diff--color--deleted) !important;
	}
}

.added {
	--canvas-node--border-color: var(--diff--color--new);
	--canvas-node--color--background: var(--diff--color--new--faint);
	--sticky--color--background: var(--diff--color--new--faint);
	--sticky--border-color: var(--diff--color--new);
	position: relative;

	:global(> div) {
		--canvas-node--border-width: 2px;
	}

	&::before {
		content: 'N';
		background-color: var(--diff--color--new);
	}

	:global(.canvas-node-handle-main-output .source),
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--diff--color--new);
		border: none;
	}

	:global([class*='disabled']) {
		--canvas-node--border-color: var(--diff--color--new) !important;
	}
}

.equal {
	opacity: 0.5;
	position: relative;
	pointer-events: none;
	cursor: default;
	--sticky--color--background: rgba(126, 129, 134, 0.2);
	--canvas-node--icon-color: var(--color--foreground--shade-2);
	--sticky--border-color: var(--color--foreground--shade-2);
	&:deep(img) {
		filter: contrast(0) grayscale(100%);
	}
}

.modified {
	--canvas-node--border-width: 2px;
	--canvas-node--border-color: var(--diff--color--modified);
	--canvas-node--color--background: var(--diff--color--modified--faint);
	--sticky--color--background: var(--diff--color--modified--faint);
	--sticky--border-color: var(--diff--color--modified);
	position: relative;

	:global(> div) {
		--canvas-node--border-width: 2px;
	}

	&::before {
		content: 'M';
		background-color: var(--diff--color--modified);
	}
	:global(.canvas-node-handle-main-output .source),
	:global(.canvas-node-handle-main-input .target) {
		background-color: var(--diff--color--modified);
		border: none;
	}

	:global([class*='disabled']) {
		--canvas-node--border-color: var(--diff--color--modified) !important;
	}
}

/* Edge status styles */
.edge-deleted {
	--canvas-edge--color: var(--diff--color--deleted);
	--edge--color--highlight: var(--diff--color--deleted--light);
}

.edge-added {
	--canvas-edge--color: var(--diff--color--new);
	--edge--color--highlight: var(--diff--color--new--light);
}

.edge-equal {
	opacity: 0.5;
}
</style>
