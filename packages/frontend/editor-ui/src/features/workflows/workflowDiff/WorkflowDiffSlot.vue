<script setup lang="ts">
import type { SlotWorkflowDiffProps, SlotWorkflowDiffSnapshot } from '@n8n/frontend-module-sdk';
import { computed } from 'vue';

import type { IWorkflowDb } from '@/Interface';

import WorkflowDiffView from './WorkflowDiffView.vue';
import { toDiffWorkflow } from './workflowDiff.utils';

const props = defineProps<SlotWorkflowDiffProps>();

function toWorkflow(
	snapshot: SlotWorkflowDiffSnapshot | undefined,
	side: 'source' | 'target',
): IWorkflowDb | undefined {
	if (!snapshot) return undefined;
	return toDiffWorkflow({
		id: props.workflowId,
		name: snapshot.workflowName ?? props.workflowName,
		// Graph-only snapshots still need separate canvas document identities.
		versionId: snapshot.versionId ?? side,
		createdAt: snapshot.createdAt,
		nodes: snapshot.nodes,
		connections: snapshot.connections,
		nodeGroups: snapshot.nodeGroups,
		settings: snapshot.settings,
		// The diff compares tags in order, but the tags of a workflow have no order.
		tags: snapshot.tags && [...snapshot.tags].sort((a, b) => a.name.localeCompare(b.name)),
		isArchived: snapshot.isArchived,
	});
}

const sourceWorkflow = computed(() => toWorkflow(props.sourceSnapshot, 'source'));
const targetWorkflow = computed(() => toWorkflow(props.targetSnapshot, 'target'));
</script>

<template>
	<WorkflowDiffView
		:source-workflow="sourceWorkflow"
		:target-workflow="targetWorkflow"
		:source-label="sourceLabel"
		:target-label="targetLabel"
		:show-fullscreen-button="showFullscreenButton"
		:require-canvas-focus="requireCanvasFocus"
		:canvas-id-prefix="canvasIdPrefix"
		:hide-title="hideTitle"
	>
		<template v-if="$slots.sourceLabel" #sourceLabel><slot name="sourceLabel" /></template>
		<template v-if="$slots.targetLabel" #targetLabel><slot name="targetLabel" /></template>
		<template v-if="$slots.sourceEmptyText" #sourceEmptyText
			><slot name="sourceEmptyText"
		/></template>
		<template v-if="$slots.targetEmptyText" #targetEmptyText
			><slot name="targetEmptyText"
		/></template>
	</WorkflowDiffView>
</template>
