<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, provide } from 'vue';
import { useI18n } from '@n8n/i18n';
import { Workflow } from 'n8n-workflow';
import type { IDataObject, INodeExecutionData, IRunData } from 'n8n-workflow';
import { ChatSymbol } from '@n8n/chat/constants';
import type { Chat } from '@n8n/chat/types';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import RunData from '@/features/ndv/runData/components/RunData.vue';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { IWorkflowDb, INodeUi } from '@/Interface';
import type { WorkflowObjectAccessors } from '@/app/types/workflow';

/**
 * Renders input/output for a single tool/node call using the same RunData
 * schema view that the workflow log viewer uses for node I/O — but without
 * the surrounding node list, since a tool call is always one logical node.
 *
 * Synthesizes a fake two-node workflow (an input source + the tool node) so
 * RunData's input pane has a previous node to walk back to, populates the
 * workflows store with the synthesized execution, and tears it all down on
 * unmount.
 */
const props = defineProps<{
	name: string;
	input: unknown;
	output: unknown;
	nodeType?: string;
	nodeTypeVersion?: number;
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const workflowState = useWorkflowState();
const nodeTypesStore = useNodeTypesStore();

const SYNTHETIC_ID = '__tool_io__';
const INPUT_NODE_NAME = '__tool_io_input__';

provide(
	WorkflowIdKey,
	computed(() => SYNTHETIC_ID),
);
provide(ChatSymbol, null as unknown as Chat);

function wrap(value: unknown): INodeExecutionData[] {
	if (value === undefined || value === null) return [{ json: {} }];
	if (Array.isArray(value)) {
		return value.map((v) =>
			typeof v === 'object' && v !== null
				? { json: v as IDataObject }
				: { json: { value: v as IDataObject[string] } },
		);
	}
	if (typeof value === 'object') return [{ json: value as IDataObject }];
	return [{ json: { value: value as IDataObject[string] } }];
}

const synthExecution = computed<IExecutionResponse>(() => {
	const inputItems = wrap(props.input);
	const outputItems = wrap(props.output);

	const inputNode: INodeUi = {
		id: INPUT_NODE_NAME,
		name: INPUT_NODE_NAME,
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	const toolNode: INodeUi = {
		id: props.name,
		name: props.name,
		type: props.nodeType ?? 'n8n-nodes-base.set',
		typeVersion: props.nodeTypeVersion ?? 1,
		position: [220, 0],
		parameters: {},
	};

	const workflowData: IWorkflowDb = {
		id: SYNTHETIC_ID,
		name: SYNTHETIC_ID,
		active: false,
		isArchived: false,
		nodes: [inputNode, toolNode],
		connections: {
			[INPUT_NODE_NAME]: {
				main: [[{ node: props.name, type: 'main', index: 0 }]],
			},
		},
		settings: {},
		pinData: {},
		versionId: '',
		usedCredentials: [],
		sharedWithProjects: [],
		homeProject: undefined,
		scopes: [],
		tags: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	} as unknown as IWorkflowDb;

	const runData: IRunData = {
		[INPUT_NODE_NAME]: [
			{
				startTime: 0,
				executionIndex: 0,
				executionTime: 0,
				executionStatus: 'success',
				source: [],
				data: { main: [inputItems] },
			},
		],
		[props.name]: [
			{
				startTime: 0,
				executionIndex: 0,
				executionTime: 0,
				executionStatus: 'success',
				source: [{ previousNode: INPUT_NODE_NAME, previousNodeOutput: 0, previousNodeRun: 0 }],
				data: { main: [outputItems] },
			},
		],
	};

	const now = new Date();
	return {
		id: SYNTHETIC_ID,
		finished: true,
		mode: 'manual',
		status: 'success',
		startedAt: now,
		createdAt: now,
		stoppedAt: now,
		workflowId: SYNTHETIC_ID,
		workflowData,
		data: {
			startData: {},
			resultData: { runData },
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		},
	} as unknown as IExecutionResponse;
});

const synthWorkflow = computed<WorkflowObjectAccessors>(
	() =>
		new Workflow({
			...synthExecution.value.workflowData,
			nodeTypes: workflowsStore.getNodeTypes(),
		}) as unknown as WorkflowObjectAccessors,
);

const toolNodeUi = computed<INodeUi>(() => {
	return synthExecution.value.workflowData.nodes.find((n) => n.name === props.name) as INodeUi;
});

let previousWorkflowExecutionData: typeof workflowsStore.workflowExecutionData | null = null;
let unmounted = false;

onMounted(async () => {
	previousWorkflowExecutionData = workflowsStore.workflowExecutionData;
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
	// If the component unmounted while node-types were loading, the unmount
	// hook already restored the previous execution data — installing the synth
	// payload now would clobber the real workflow's state.
	if (unmounted) return;
	workflowState.setWorkflowExecutionData(synthExecution.value);
});

onBeforeUnmount(() => {
	unmounted = true;
	workflowState.setWorkflowExecutionData(previousWorkflowExecutionData);
});
</script>

<template>
	<div :class="$style.root">
		<div :class="$style.pane">
			<div :class="$style.paneTitle">
				{{ i18n.baseText('agentSessions.timeline.input') }}
			</div>
			<RunData
				:key="`tool-input-${name}`"
				:node="toolNodeUi"
				:run-index="0"
				:workflow-object="synthWorkflow"
				:workflow-execution="synthExecution.data"
				pane-type="input"
				display-mode="schema"
				:disable-display-mode-selection="true"
				:disable-run-index-selection="true"
				:compact="true"
				:show-actions-on-hover="true"
				:disable-pin="true"
				:disable-edit="true"
				:disable-hover-highlight="true"
				:disable-settings-hint="true"
				:collapsing-table-column-name="null"
				table-header-bg-color="light"
				executing-message=""
				no-data-in-branch-message=""
			/>
		</div>
		<div :class="$style.pane">
			<div :class="$style.paneTitle">
				{{ i18n.baseText('agentSessions.timeline.output') }}
			</div>
			<RunData
				:key="`tool-output-${name}`"
				:node="toolNodeUi"
				:run-index="0"
				:workflow-object="synthWorkflow"
				:workflow-execution="synthExecution.data"
				pane-type="output"
				display-mode="schema"
				:disable-display-mode-selection="true"
				:disable-run-index-selection="true"
				:compact="true"
				:show-actions-on-hover="true"
				:disable-pin="true"
				:disable-edit="true"
				:disable-hover-highlight="true"
				:disable-settings-hint="true"
				:collapsing-table-column-name="null"
				table-header-bg-color="light"
				executing-message=""
				no-data-in-branch-message=""
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.pane {
	display: flex;
	flex-direction: column;
	min-height: 220px;
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}
.paneTitle {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
	background-color: var(--color--foreground--tint-2);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}
.pane > :not(.paneTitle) {
	padding-top: var(--spacing--2xs);
}
</style>
