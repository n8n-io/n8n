<script setup lang="ts">
import { UnexpectedError, type IRunExecutionData } from 'n8n-workflow';
import { inject } from 'vue';
import type { INodeUi } from '@/Interface';
import type { WorkflowObjectAccessors } from '@/app/types/workflow';
import type { NodePanelType } from '@/features/ndv/shared/ndv.types';
import { StandaloneRunDataHostKey } from '@/features/ndv/runData/standaloneRunData';
import RunData from '@/features/ndv/runData/components/RunData.vue';

withDefaults(
	defineProps<{
		workflowObject: WorkflowObjectAccessors;
		workflowExecution?: IRunExecutionData;
		runIndex: number;
		paneType: NodePanelType;
		node?: INodeUi | null;
		overrideOutputs?: number[];
	}>(),
	{
		workflowExecution: undefined,
		node: null,
		overrideOutputs: undefined,
	},
);

if (!inject(StandaloneRunDataHostKey, false)) {
	throw new UnexpectedError('StandaloneRunData must be rendered inside StandaloneRunDataHost');
}
</script>

<template>
	<RunData
		:node="node"
		:run-index="runIndex"
		:override-outputs="overrideOutputs"
		:workflow-object="workflowObject"
		:workflow-execution="workflowExecution"
		:pane-type="paneType"
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
</template>
