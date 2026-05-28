<script setup lang="ts">
import {
	App,
	applyDocumentTheme,
	applyHostFonts,
	applyHostStyleVariables,
	type McpUiHostContext,
} from '@modelcontextprotocol/ext-apps';
import { N8nButton, N8nIcon, N8nSpinner } from '@n8n/design-system';
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
	shallowRef,
	watch,
	watchEffect,
} from 'vue';
import { useI18n } from 'vue-i18n';

import { isAllowedWorkflowUrl, resolveWorkflowDemoUrl } from './url';
import { setLocaleFromHost, type MessageSchema } from '../../i18n';

type WorkflowResult = {
	workflowId?: unknown;
	url?: unknown;
	previewUrl?: unknown;
	name?: unknown;
	nodeCount?: unknown;
};

type WorkflowPreviewData = {
	id: string;
	name?: string | null;
	nodes: unknown[];
	connections: Record<string, unknown>;
	settings?: unknown;
	meta?: unknown;
};

function isWorkflowResult(value: unknown): value is WorkflowResult {
	return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkflowPreviewData(value: unknown): value is WorkflowPreviewData {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		(value.name === undefined || value.name === null || typeof value.name === 'string') &&
		Array.isArray(value.nodes) &&
		isRecord(value.connections)
	);
}

function readJsonMessage(data: unknown): Record<string, unknown> | undefined {
	if (typeof data !== 'string' || !data.includes('"command"')) return undefined;

	try {
		const parsed: unknown = JSON.parse(data);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

const { t } = useI18n<{ message: MessageSchema }>({ useScope: 'global' });

const hostContext = ref<McpUiHostContext>();
const workflowUrl = ref<string>();
const workflowId = ref<string>();
const workflowName = ref<string>();
const workflowNodeCount = ref<number>();
const previewUrl = ref<string>();
const previewWorkflow = shallowRef<WorkflowPreviewData>();
const previewError = ref<string>();
const previewLoading = ref(false);
const previewReady = ref(false);
const previewSent = ref(false);
const iframeRef = ref<HTMLIFrameElement>();
const appRef = shallowRef<App>();
let previewReadyTimeout: ReturnType<typeof setTimeout> | undefined;

const ariaLabel = computed(() =>
	previewWorkflow.value
		? t('workflowPreview.ariaLabel.preview')
		: workflowUrl.value
			? t('workflowPreview.ariaLabel.ready')
			: t('workflowPreview.ariaLabel.creating'),
);

const isPreviewVisible = computed(
	() => !!previewUrl.value && !!previewWorkflow.value && !previewError.value,
);

const nodeCountLabel = computed(() => {
	const count = workflowNodeCount.value;
	if (count === undefined) return undefined;

	return count === 1
		? t('workflowPreview.nodeCount.one')
		: t('workflowPreview.nodeCount.many', { count });
});

watchEffect(() => {
	const context = hostContext.value;

	if (context?.theme) {
		applyDocumentTheme(context.theme);
	}

	if (context?.styles?.variables) {
		applyHostStyleVariables(context.styles.variables);
	}

	if (context?.styles?.css?.fonts) {
		applyHostFonts(context.styles.css.fonts);
	}

	setLocaleFromHost(context?.locale);
});

watch([previewUrl, previewWorkflow], () => {
	previewReady.value = false;
	previewSent.value = false;
	clearPreviewReadyTimeout();

	if (previewUrl.value && previewWorkflow.value) {
		previewReadyTimeout = setTimeout(() => {
			if (!previewReady.value) {
				previewError.value = t('workflowPreview.error.previewUnavailable');
			}
		}, 8000);
	}
});

watch([previewReady, previewWorkflow], () => {
	void maybeSendWorkflowToPreview();
});

watch(
	[workflowId, appRef],
	([id, app]) => {
		if (!id || !app) return;
		void loadPreviewWorkflow(app, id);
	},
	{ immediate: true },
);

function clearPreviewReadyTimeout() {
	if (!previewReadyTimeout) return;
	clearTimeout(previewReadyTimeout);
	previewReadyTimeout = undefined;
}

async function handleOpenWorkflow() {
	const app = appRef.value;
	const url = workflowUrl.value;
	if (!app || !url) return;

	if (!isAllowedWorkflowUrl(url)) {
		console.warn('[n8n MCP App] Refusing to open unexpected workflow URL', { url });
		return;
	}

	try {
		const result = await app.openLink({ url });
		if (result.isError) {
			console.warn('[n8n MCP App] Host denied open-link request', { url });
		}
	} catch (error) {
		console.error('[n8n MCP App] Failed to open workflow link', error);
	}
}

async function loadPreviewWorkflow(app: App, id: string) {
	if (previewLoading.value) return;

	previewLoading.value = true;
	previewError.value = undefined;

	try {
		const result = await app.callServerTool({
			name: 'get_workflow_details',
			arguments: { workflowId: id },
		});

		if (result.isError) {
			previewError.value = t('workflowPreview.error.detailsUnavailable');
			return;
		}

		const structuredContent = isRecord(result.structuredContent)
			? result.structuredContent
			: undefined;
		const workflow = structuredContent?.workflow;
		if (!isWorkflowPreviewData(workflow)) {
			previewError.value = t('workflowPreview.error.invalidWorkflow');
			return;
		}

		previewWorkflow.value = workflow;
	} catch (error) {
		console.warn('[n8n MCP App] Failed to load workflow preview data', error);
		previewError.value = t('workflowPreview.error.detailsUnavailable');
	} finally {
		previewLoading.value = false;
	}
}

async function maybeSendWorkflowToPreview() {
	const iframe = iframeRef.value;
	const workflow = previewWorkflow.value;
	if (!iframe?.contentWindow || !workflow || !previewReady.value || previewSent.value) {
		return;
	}

	await nextTick();
	iframe.contentWindow.postMessage(
		JSON.stringify({
			command: 'openWorkflow',
			workflow,
			hideNodeIssues: true,
			suppressNotifications: true,
		}),
		// The preview service may redirect or run under a host-provided frame origin;
		// this matches the existing n8n demo preview contract.
		'*',
	);
	previewSent.value = true;
}

function handlePreviewMessage(event: MessageEvent) {
	if (event.source !== iframeRef.value?.contentWindow) return;

	const message = readJsonMessage(event.data);
	if (!message) return;

	if (message.command === 'n8nReady') {
		previewReady.value = true;
		previewError.value = undefined;
		clearPreviewReadyTimeout();
	} else if (message.command === 'error') {
		previewError.value = t('workflowPreview.error.previewUnavailable');
	}
}

function applyToolResult(structuredContent: unknown) {
	if (!isWorkflowResult(structuredContent)) return;

	const candidateUrl = structuredContent.url;
	if (isAllowedWorkflowUrl(candidateUrl)) {
		workflowUrl.value = candidateUrl;
		previewUrl.value = resolveWorkflowDemoUrl({
			workflowUrl: candidateUrl,
			previewUrl: structuredContent.previewUrl,
		});
	} else if (candidateUrl !== undefined) {
		console.warn('[n8n MCP App] Ignoring unexpected workflow URL in tool result', {
			url: candidateUrl,
		});
	}

	if (typeof structuredContent.workflowId === 'string') {
		workflowId.value = structuredContent.workflowId;
	}

	if (typeof structuredContent.name === 'string') {
		workflowName.value = structuredContent.name;
	}

	if (typeof structuredContent.nodeCount === 'number') {
		workflowNodeCount.value = structuredContent.nodeCount;
	}
}

onMounted(async () => {
	window.addEventListener('message', handlePreviewMessage);

	const app = new App({ name: 'n8n Workflow Preview', version: '0.1.0' });
	appRef.value = app;

	app.onhostcontextchanged = (params) => {
		hostContext.value = { ...hostContext.value, ...params };
	};

	app.ontoolresult = (params) => {
		applyToolResult(params.structuredContent);
	};

	app.onerror = console.error;

	try {
		await app.connect();
		hostContext.value = app.getHostContext();
	} catch (error) {
		console.error('[n8n MCP App] Failed to connect to host', error);
	}
});

onBeforeUnmount(() => {
	window.removeEventListener('message', handlePreviewMessage);
	clearPreviewReadyTimeout();
});
</script>

<template>
	<main
		class="container"
		:aria-busy="!workflowUrl || previewLoading || (isPreviewVisible && !previewSent)"
		:aria-label="ariaLabel"
	>
		<section v-if="isPreviewVisible" class="preview-card">
			<header class="preview-header">
				<div class="workflow-meta">
					<p class="eyebrow">{{ t('workflowPreview.readyLabel') }}</p>
					<h1>{{ workflowName ?? t('workflowPreview.untitledWorkflow') }}</h1>
					<p v-if="nodeCountLabel" class="node-count">
						{{ nodeCountLabel }}
					</p>
				</div>
				<N8nButton variant="subtle" size="small" @click="handleOpenWorkflow">
					{{ t('workflowPreview.openButton') }}
					<template #icon>
						<N8nIcon icon="arrow-up-right" />
					</template>
				</N8nButton>
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

		<section
			v-else-if="workflowUrl && !previewError && (previewLoading || previewUrl)"
			class="fallback-card"
		>
			<N8nSpinner type="ring" />
			<h1>{{ t('workflowPreview.fallbackTitle') }}</h1>
			<p>{{ t('workflowPreview.loadingPreview') }}</p>
			<N8nButton variant="subtle" size="small" @click="handleOpenWorkflow">
				{{ t('workflowPreview.openButton') }}
				<template #icon>
					<N8nIcon icon="arrow-up-right" />
				</template>
			</N8nButton>
		</section>

		<section v-else-if="workflowUrl" class="fallback-card">
			<N8nIcon icon="workflow" class="fallback-icon" />
			<h1>{{ t('workflowPreview.fallbackTitle') }}</h1>
			<p>{{ previewError ?? t('workflowPreview.fallbackDescription') }}</p>
			<N8nButton class="open-button" variant="solid" size="medium" @click="handleOpenWorkflow">
				{{ t('workflowPreview.openButton') }}
				<template #icon>
					<N8nIcon icon="arrow-up-right" />
				</template>
			</N8nButton>
		</section>
		<N8nSpinner v-else type="ring" />
	</main>
</template>

<style scoped lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.container {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	padding: var(--spacing--xs);
	background: transparent;
}

.open-button {
	@include motion.fade-in-up;
}

.preview-card,
.fallback-card {
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	box-shadow:
		var(--shadow--xs),
		inset var(--shadow--outline);
	overflow: hidden;
}

.preview-card {
	display: flex;
	flex-direction: column;
	min-height: 320px;
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
.fallback-card h1,
.workflow-meta p,
.fallback-card p {
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

.fallback-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	max-width: 420px;
	padding: var(--spacing--lg);
	text-align: center;
}

.fallback-card h1 {
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	color: var(--text-color);
}

.fallback-card p {
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.fallback-icon {
	color: var(--icon-color--strong);
}
</style>
