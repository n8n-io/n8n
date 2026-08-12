<script setup lang="ts">
import { onErrorCaptured } from 'vue';

import type {
	WorkflowPreviewData,
	WorkflowPreviewNodeType,
} from '@mcp-apps/apps/workflow-preview/types';
import { useI18n } from '@mcp-apps/i18n';

import OpenInN8nButton from '../open-in-n8n-button.vue';
import WorkflowCanvasHost from './workflow-canvas-host.vue';

defineProps<{
	workflow: WorkflowPreviewData;
	nodeTypes: WorkflowPreviewNodeType[];
	workflowUrl: string;
	workflowName?: string;
	nodeCountLabel?: string;
	previewRendered: boolean;
}>();

const emit = defineEmits<{
	open: [];
	previewCrash: [message?: string];
	previewRenderedChange: [value: boolean];
}>();

const { t } = useI18n();

function handleCanvasReady() {
	emit('previewRenderedChange', true);
}

function handleCanvasError(error: unknown) {
	emit('previewCrash', error instanceof Error ? error.message : undefined);
}

// The embedded canvas is a large component subtree; treat any rendering error
// in it as a preview crash so the app can fall back to the open-workflow card.
onErrorCaptured((error) => {
	handleCanvasError(error);
	return false;
});
</script>

<template>
	<section class="preview-card">
		<header class="preview-header">
			<div class="workflow-meta">
				<p class="eyebrow">{{ t('workflowPreview.readyLabel') }}</p>
				<h1>{{ workflowName ?? t('workflowPreview.untitledWorkflow') }}</h1>
				<p v-if="nodeCountLabel" class="node-count">
					{{ nodeCountLabel }}
				</p>
			</div>
			<OpenInN8nButton @click="emit('open')" />
		</header>
		<div class="canvas-shell" :class="{ 'is-ready': previewRendered }">
			<WorkflowCanvasHost
				:workflow="workflow"
				:node-types="nodeTypes"
				@ready="handleCanvasReady"
				@error="handleCanvasError"
			/>
		</div>
	</section>
</template>

<style scoped lang="scss">
.preview-card {
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

.preview-header {
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

.eyebrow,
.node-count {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	color: var(--text-color--subtler);
}

.canvas-shell {
	position: relative;
	flex: 1;
	height: 320px;
	min-height: 280px;
	background: var(--canvas--color--background);
	opacity: 0;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
}

.canvas-shell.is-ready {
	opacity: 1;
}
</style>
