<script setup lang="ts">
import type { WorkflowReviewVersionSnapshot } from '@n8n/api-types';
import type { SlotWorkflowDiffProps } from '@n8n/frontend-module-sdk';
import { computed } from 'vue';

import type { IWorkflowDb } from '@/Interface';

import WorkflowDiffView from './WorkflowDiffView.vue';
import { toDiffWorkflow } from './workflowDiff.utils';

const props = defineProps<SlotWorkflowDiffProps>();

function toWorkflow(snapshot: WorkflowReviewVersionSnapshot | undefined): IWorkflowDb | undefined {
	if (!snapshot) return undefined;
	return toDiffWorkflow({
		id: props.workflowId,
		name: props.workflowName,
		versionId: snapshot.versionId,
		createdAt: snapshot.createdAt,
		nodes: snapshot.nodes,
		connections: snapshot.connections,
		nodeGroups: snapshot.nodeGroups,
	});
}

const sourceWorkflow = computed(() => toWorkflow(props.sourceSnapshot));
const targetWorkflow = computed(() => toWorkflow(props.targetSnapshot));
</script>

<template>
	<WorkflowDiffView
		:source-workflow="sourceWorkflow"
		:target-workflow="targetWorkflow"
		:source-label="sourceLabel"
		:target-label="targetLabel"
		:show-fullscreen-button="showFullscreenButton"
		:canvas-id-prefix="canvasIdPrefix"
		:hide-title="hideTitle"
	>
		<template v-if="$slots.sourceLabel" #sourceLabel><slot name="sourceLabel" /></template>
		<template v-if="$slots.targetLabel" #targetLabel><slot name="targetLabel" /></template>
		<template v-if="$slots.sourceEmptyText" #sourceEmptyText
			><slot name="sourceEmptyText"
		/></template>
	</WorkflowDiffView>
</template>
