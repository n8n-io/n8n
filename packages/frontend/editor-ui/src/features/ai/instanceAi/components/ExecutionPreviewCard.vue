<script lang="ts" setup>
import { ref, watch } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import type { IWorkflowDb } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import WorkflowMiniCanvas from './WorkflowMiniCanvas.vue';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';

const props = defineProps<{
	executionId: string;
	workflowId: string;
	status: string;
	error?: string;
}>();

const workflowsListStore = useWorkflowsListStore();
const executionsStore = useExecutionsStore();

const workflow = ref<IWorkflowDb | null>(null);
const execution = ref<IExecutionResponse | null>(null);
const modalOpen = ref(false);

watch(
	() => [props.workflowId, props.executionId] as const,
	async ([wfId, execId]) => {
		// Fetch workflow
		if (!workflow.value || workflow.value.id !== wfId) {
			try {
				workflow.value = await workflowsListStore.fetchWorkflow(wfId);
			} catch {
				// Non-critical
			}
		}
		// Fetch execution
		if (!execution.value || execution.value.id !== execId) {
			try {
				const exec = await executionsStore.fetchExecution(execId);
				if (exec) execution.value = exec;
			} catch {
				// Non-critical
			}
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div v-if="workflow" :class="$style.previewBlock">
		<div :class="[$style.previewHeader, props.status === 'error' ? $style.previewHeaderError : '']">
			<N8nIcon
				:icon="props.status === 'error' ? 'triangle-alert' : 'play'"
				size="small"
				:class="props.status === 'error' ? $style.errorIcon : $style.successIcon"
			/>
			<span :class="$style.previewName"> Execution {{ props.status }} </span>
			<button :class="$style.workflowLink" @click="modalOpen = true">
				Details
				<N8nIcon icon="expand" size="small" />
			</button>
			<a
				:href="`/workflow/${props.workflowId}/executions/${props.executionId}`"
				target="_blank"
				:class="$style.workflowLink"
			>
				Open
				<N8nIcon icon="external-link" size="small" />
			</a>
		</div>
		<div v-if="props.error" :class="$style.executionError">
			{{ props.error }}
		</div>
		<div v-if="execution" :class="$style.previewCanvas">
			<WorkflowMiniCanvas
				:workflow="workflow"
				:execution-data="execution"
				:canvas-id="`exec-preview-${props.executionId}`"
			/>
		</div>
		<!-- Execution detail modal -->
		<Teleport to="body">
			<div v-if="modalOpen" :class="$style.modalOverlay" @click.self="modalOpen = false">
				<div :class="$style.modalContent">
					<div :class="$style.modalHeader">
						<span :class="$style.modalTitle">Execution details</span>
						<button :class="$style.modalClose" @click="modalOpen = false">
							<N8nIcon icon="x" size="medium" />
						</button>
					</div>
					<div :class="$style.modalBody">
						<WorkflowPreview
							mode="execution"
							:execution-id="props.executionId"
							:can-open-ndv="true"
							:hide-controls="true"
							loader-type="spinner"
						/>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.previewBlock {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--3xs) 0 var(--spacing--2xs);
	overflow: hidden;
	background: var(--color--background);
}

.previewHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: color-mix(in srgb, var(--color--success) 10%, var(--color--background));
	font-size: var(--font-size--2xs);
	color: var(--color--success);
}

.previewName {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--font-weight--bold);
}

.previewHeaderError {
	background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	color: var(--color--danger);
}

.previewCanvas {
	height: 200px;
	position: relative;
	border-top: var(--border);
}

.executionError {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-size: var(--font-size--3xs);
	font-family: monospace;
	color: var(--color--danger);
	background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	border-top: var(--border);
	white-space: pre-wrap;
	word-break: break-word;
}

.successIcon {
	color: var(--color--success);
}

.errorIcon {
	color: var(--color--danger);
}

.workflowLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--primary);
	text-decoration: none;
	font-family: var(--font-family);
	font-size: inherit;
	font-weight: var(--font-weight--bold);
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;

	&:first-of-type {
		margin-left: auto;
	}

	&:hover {
		text-decoration: underline;
	}
}

.modalOverlay {
	position: fixed;
	inset: 0;
	z-index: 10000;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgb(0 0 0 / 50%);
}

.modalContent {
	display: flex;
	flex-direction: column;
	width: 90vw;
	height: 85vh;
	max-width: 1200px;
	background: var(--color--background);
	border-radius: var(--radius--xl);
	overflow: hidden;
	box-shadow: 0 20px 60px rgb(0 0 0 / 30%);
}

.modalHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.modalTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.modalClose {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	background: none;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.modalBody {
	flex: 1;
	position: relative;
	overflow: hidden;
}
</style>
