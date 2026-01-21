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
	composes: sourceBadge from './workflowDiff.module.scss';
}

.emptyWorkflow {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

/* Node status styles - composed from shared module */
.deleted {
	composes: deleted from './workflowDiff.module.scss';
}

.added {
	composes: added from './workflowDiff.module.scss';
}

.equal {
	composes: equal from './workflowDiff.module.scss';
}

.modified {
	composes: modified from './workflowDiff.module.scss';
}

/* Edge status styles - composed from shared module */
.edge-deleted {
	composes: edge-deleted from './workflowDiff.module.scss';
}

.edge-added {
	composes: edge-added from './workflowDiff.module.scss';
}

.edge-equal {
	composes: edge-equal from './workflowDiff.module.scss';
}
</style>
