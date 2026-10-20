<script setup lang="ts">
import type { SlotWorkflowDiffProps, SlotWorkflowDiffSnapshot } from '@n8n/frontend-module-sdk';
import { deepCopy } from 'n8n-workflow';
import { computed, markRaw } from 'vue';

import type { IWorkflowDb } from '@/Interface';

import WorkflowDiffView from './WorkflowDiffView.vue';

const props = defineProps<SlotWorkflowDiffProps>();

function toWorkflow(
	snapshot: SlotWorkflowDiffSnapshot | undefined,
	side: 'source' | 'target',
): IWorkflowDb | undefined {
	if (!snapshot) return undefined;
	return markRaw(
		deepCopy({
			id: props.workflowId,
			name: props.workflowName,
			active: false,
			isArchived: false,
			createdAt: snapshot.createdAt ?? '',
			updatedAt: snapshot.createdAt ?? '',
			// Graph-only snapshots still need separate canvas document identities.
			versionId: snapshot.versionId ?? side,
			activeVersionId: null,
			nodes: snapshot.nodes,
			connections: snapshot.connections,
			nodeGroups: snapshot.nodeGroups,
		}),
	);
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
	>
		<template v-if="$slots.sourceLabel" #sourceLabel><slot name="sourceLabel" /></template>
		<template v-if="$slots.targetLabel" #targetLabel><slot name="targetLabel" /></template>
		<template v-if="$slots.sourceEmptyText" #sourceEmptyText
			><slot name="sourceEmptyText"
		/></template>
	</WorkflowDiffView>
</template>
