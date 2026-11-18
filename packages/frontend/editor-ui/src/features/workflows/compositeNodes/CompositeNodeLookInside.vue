<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import type { ExpandedCompositeNode } from '@n8n/api-types';
import { N8nButton, N8nDialog, N8nDialogBody, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ExecutionStatus } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { ExecutionPreviewNodeSchema } from '@/features/execution/executions/executions.types';

import { expandCompositeNode } from './compositeNodes.api';
import { toInnerNodeStatuses } from './compositeNodes.utils';

const { nodeName } = defineProps<{ nodeName: string }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const open = ref(false);
const loading = ref(false);
const nodeStatuses = shallowRef<Record<string, ExecutionPreviewNodeSchema>>();
const executionStatus = ref<ExecutionStatus>();

const node = computed(() => workflowDocumentStore.value.getNodeByName(nodeName) ?? null);

// Built once for each opening: a new object makes WorkflowPreview load the
// workflow again, and that drops the marks of the last execution.
const previewWorkflow = shallowRef<{
	id: string;
	name: string;
	nodes: ExpandedCompositeNode['nodes'];
	connections: ExpandedCompositeNode['connections'];
}>();

function toPreviewWorkflow({ nodes, connections }: ExpandedCompositeNode) {
	return {
		id: workflowDocumentStore.value.workflowId,
		name: nodeName,
		// The canvas expects node ids to be UUIDs; inner ids such as "poll:request 1" are not.
		nodes: nodes.map((inner) => ({ ...inner, id: uuid() })),
		connections,
	};
}

/** The execution the editor shows, when it is a finished run that the backend stored. */
function lastExecutionId(): string | undefined {
	const state = useWorkflowExecutionStateStore(workflowDocumentStore.value.documentId);
	const id = state.activeExecution?.id;
	return id && id !== IN_PROGRESS_EXECUTION_ID ? id : undefined;
}

async function loadLastExecution(nodes: ExpandedCompositeNode['nodes']) {
	const executionId = lastExecutionId();
	if (!executionId) return;
	try {
		const execution = await workflowsStore.fetchExecutionDataById(executionId);
		const statuses = toInnerNodeStatuses(nodes, execution?.data?.resultData.runData);
		if (Object.keys(statuses).length === 0) return;
		nodeStatuses.value = statuses;
		executionStatus.value = execution?.status;
	} catch {
		// The view is still useful without the marks of the last execution.
	}
}

async function lookInside() {
	if (!node.value || loading.value) return;
	loading.value = true;
	previewWorkflow.value = undefined;
	nodeStatuses.value = undefined;
	try {
		const result = await expandCompositeNode(
			rootStore.restApiContext,
			workflowDocumentStore.value.workflowId,
			node.value,
		);
		await loadLastExecution(result.nodes);
		previewWorkflow.value = toPreviewWorkflow(result);
		open.value = true;
	} catch (error) {
		toast.showError(error, i18n.baseText('compositeNode.lookInside.error'));
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<div :class="$style.lookInside">
		<N8nButton
			variant="outline"
			size="small"
			icon="layers"
			:loading="loading"
			data-test-id="composite-node-look-inside"
			data-attr="composite-node-look-inside"
			@click="lookInside"
		>
			{{ i18n.baseText('compositeNode.lookInside') }}
		</N8nButton>
		<N8nDialog
			v-if="open && previewWorkflow"
			open
			size="full"
			:header="i18n.baseText('compositeNode.lookInside.title', { interpolate: { nodeName } })"
			data-test-id="composite-node-look-inside-dialog"
			@update:open="open = $event"
		>
			<N8nDialogBody :class="$style.body">
				<N8nText tag="p" color="text-light">
					{{
						nodeStatuses
							? i18n.baseText('compositeNode.lookInside.description.withExecution')
							: i18n.baseText('compositeNode.lookInside.description')
					}}
				</N8nText>
				<div :class="$style.canvas">
					<WorkflowPreview
						mode="workflow"
						:workflow="previewWorkflow"
						:node-statuses="nodeStatuses"
						:execution-status="executionStatus"
						:can-open-ndv="true"
						hide-node-issues
						suppress-notifications
						loader-type="spinner"
					/>
				</div>
			</N8nDialogBody>
		</N8nDialog>
	</div>
</template>

<style lang="scss" module>
.lookInside {
	display: flex;
	margin-right: var(--spacing--2xs);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	height: 100%;
}

.canvas {
	// WorkflowPreview fills its parent, so the parent needs a fixed height.
	height: 70vh;
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
