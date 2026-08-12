<script setup lang="ts">
import type { WorkflowVersionData } from '@mcp-apps/apps/workflow-diff/types';
import type { WorkflowPreviewNodeType } from '@mcp-apps/apps/workflow-preview/types';
import { useI18n } from '@mcp-apps/i18n';

import OpenInN8nButton from '../open-in-n8n-button.vue';
import WorkflowDiffCanvasHost from './workflow-diff-canvas-host.vue';

defineProps<{
	sourceWorkflow: WorkflowVersionData;
	targetWorkflow: WorkflowVersionData;
	nodeTypes: WorkflowPreviewNodeType[];
	workflowUrl: string;
	workflowName?: string;
	diffRendered: boolean;
}>();

const emit = defineEmits<{
	open: [];
	diffCrash: [message?: string];
	diffRenderedChange: [value: boolean];
}>();

const { t } = useI18n();

function handleReady() {
	emit('diffRenderedChange', true);
}

function handleError(error: unknown) {
	emit('diffCrash', error instanceof Error ? error.message : undefined);
}
</script>

<template>
	<section class="diff-card">
		<header class="diff-header">
			<div class="workflow-meta">
				<p class="eyebrow">{{ t('workflowDiff.updatedLabel') }}</p>
				<h1>{{ workflowName ?? t('workflowDiff.untitledWorkflow') }}</h1>
			</div>
			<OpenInN8nButton @click="emit('open')" />
		</header>
		<div class="diff-shell" :class="{ 'is-ready': diffRendered }">
			<WorkflowDiffCanvasHost
				:source-workflow="sourceWorkflow"
				:target-workflow="targetWorkflow"
				:workflow-name="workflowName"
				:node-types="nodeTypes"
				@ready="handleReady"
				@error="handleError"
			/>
		</div>
	</section>
</template>

<style scoped lang="scss">
.diff-card {
	display: flex;
	flex-direction: column;
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	box-shadow:
		var(--shadow--xs),
		inset var(--shadow--outline);
	overflow: hidden;
}

.diff-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.workflow-meta {
	min-width: 0;
}

.workflow-meta h1,
.workflow-meta p {
	margin: 0;
}

.workflow-meta h1 {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	color: var(--text-color);
}

.eyebrow {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	color: var(--text-color--subtler);
}

.diff-shell {
	position: relative;
	flex: 1;
	height: 480px;
	min-height: 400px;
	background: var(--canvas--color--background);
	opacity: 0;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
}

.diff-shell.is-ready {
	opacity: 1;
}
</style>
