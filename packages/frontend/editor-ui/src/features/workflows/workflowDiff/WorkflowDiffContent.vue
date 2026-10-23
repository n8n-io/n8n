<script setup lang="ts">
import type { CanvasNode, CanvasConnection } from '@/features/workflows/canvas/canvas.types';
import type { CanvasRenderData } from '@/features/workflows/canvas/canvas.utils';
import type { INodeUi } from '@/Interface';
import WorkflowDiffPanels from './WorkflowDiffPanels.vue';
import SyncedWorkflowCanvas from './SyncedWorkflowCanvas.vue';
import WorkflowDiffAside from './WorkflowDiffAside.vue';
import NodeDiff from './NodeDiff.vue';
import HighlightedEdge from './HighlightedEdge.vue';
import Node from '@/features/workflows/canvas/components/elements/nodes/CanvasNode.vue';
import { useI18n } from '@n8n/i18n';
import { computed, useCssModule } from 'vue';
import { N8nHeading } from '@n8n/design-system';
import { NodeDiffStatus } from 'n8n-workflow';

const props = defineProps<{
	sourceNodes: CanvasNode[];
	sourceConnections: CanvasConnection[];
	sourceRenderData: CanvasRenderData;
	targetNodes: CanvasNode[];
	targetConnections: CanvasConnection[];
	targetRenderData: CanvasRenderData;
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
	/** Prefix for the Vue Flow store ids. Set it when several diffs can be mounted at once. */
	canvasIdPrefix?: string;
}>();

const emit = defineEmits<{
	closeAside: [];
}>();

const i18n = useI18n();
const $style = useCssModule();

// Vue Flow shares one store for each id across the page.
const sourceCanvasId = computed(() =>
	props.canvasIdPrefix ? `${props.canvasIdPrefix}-top` : 'top',
);
const targetCanvasId = computed(() =>
	props.canvasIdPrefix ? `${props.canvasIdPrefix}-bottom` : 'bottom',
);

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
		<WorkflowDiffPanels :source-label="sourceLabel" :target-label="targetLabel">
			<template v-if="$slots.sourceLabel" #sourceLabel><slot name="sourceLabel" /></template>
			<template v-if="$slots.targetLabel" #targetLabel><slot name="targetLabel" /></template>
			<template #source>
				<template v-if="sourceExists">
					<SyncedWorkflowCanvas
						:id="sourceCanvasId"
						:nodes="sourceNodes"
						:connections="sourceConnections"
						:render-data="sourceRenderData"
						:apply-layout="applyLayout"
					>
						<template #node="{ nodeProps }">
							<Node
								v-bind="nodeProps"
								:read-only="true"
								:class="{ [getNodeStatusClass(nodeProps.id)]: true }"
							>
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
			</template>
			<template #target>
				<template v-if="targetExists">
					<SyncedWorkflowCanvas
						:id="targetCanvasId"
						:nodes="targetNodes"
						:connections="targetConnections"
						:render-data="targetRenderData"
						:apply-layout="applyLayout"
					>
						<template #node="{ nodeProps }">
							<Node
								v-bind="nodeProps"
								:read-only="true"
								:class="{ [getNodeStatusClass(nodeProps.id)]: true }"
							>
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
			</template>
		</WorkflowDiffPanels>

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
