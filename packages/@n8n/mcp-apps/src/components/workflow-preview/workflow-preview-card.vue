<script setup lang="ts">
import { N8nSpinner } from '@n8n/design-system';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { WorkflowPreviewData } from '@mcp-apps/apps/workflow-preview/types';
import { useI18n } from '@mcp-apps/i18n';
import { readJsonMessage } from '@mcp-apps/utils/post-message';

import OpenInN8nButton from '../open-in-n8n-button.vue';

const props = defineProps<{
	workflow: WorkflowPreviewData;
	workflowName?: string;
	nodeCountLabel?: string;
	previewUrl: string;
	previewSent: boolean;
	previewTheme?: 'light' | 'dark';
}>();

const emit = defineEmits<{
	open: [];
	previewError: [message: string];
	previewSentChange: [value: boolean];
}>();

const { t } = useI18n();

const previewReady = ref(false);
const iframeRef = ref<HTMLIFrameElement>();
let previewReadyTimeout: ReturnType<typeof setTimeout> | undefined;

watch(
	() => [props.previewUrl, props.workflow] as const,
	() => {
		previewReady.value = false;
		emit('previewSentChange', false);
		clearPreviewReadyTimeout();

		previewReadyTimeout = setTimeout(() => {
			if (!previewReady.value) {
				emit('previewError', t('workflowPreview.error.previewUnavailable'));
			}
		}, 8000);
	},
	{ immediate: true },
);

watch([previewReady, () => props.workflow], () => {
	void maybeSendWorkflowToPreview();
});

function clearPreviewReadyTimeout() {
	if (!previewReadyTimeout) return;
	clearTimeout(previewReadyTimeout);
	previewReadyTimeout = undefined;
}

async function maybeSendWorkflowToPreview() {
	const iframe = iframeRef.value;
	if (!iframe?.contentWindow || !previewReady.value || props.previewSent) {
		return;
	}

	await nextTick();
	iframe.contentWindow.postMessage(
		JSON.stringify({
			command: 'openWorkflow',
			workflow: props.workflow,
			canOpenNDV: false,
			hideNodeIssues: true,
			suppressNotifications: true,
		}),
		// The preview service may redirect or run under a host-provided frame origin;
		// this matches the existing n8n demo preview contract.
		'*',
	);
	emit('previewSentChange', true);
}
function handlePreviewMessage(event: MessageEvent) {
	if (event.source !== iframeRef.value?.contentWindow) return;

	const message = readJsonMessage(event.data);
	if (!message) return;

	if (message.command === 'n8nReady') {
		previewReady.value = true;
		clearPreviewReadyTimeout();
	} else if (message.command === 'error') {
		emit('previewError', t('workflowPreview.error.previewUnavailable'));
	}
}

onMounted(() => {
	window.addEventListener('message', handlePreviewMessage);
});

onBeforeUnmount(() => {
	window.removeEventListener('message', handlePreviewMessage);
	clearPreviewReadyTimeout();
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
		<div class="iframe-shell">
			<N8nSpinner v-if="!previewSent" class="preview-spinner" type="ring" />
			<iframe
				ref="iframeRef"
				class="preview-frame"
				:class="{ 'is-ready': previewSent }"
				:src="previewUrl"
				:title="t('workflowPreview.frameTitle')"
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

.iframe-shell {
	position: relative;
	flex: 1;
	min-height: 280px;
	background: var(--canvas--color--background);
}

.preview-frame {
	width: 100%;
	height: 100%;
	min-height: 280px;
	border: 0;
	opacity: 0;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
}

.preview-frame.is-ready {
	opacity: 1;
}

.preview-spinner {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 1;
}
</style>
