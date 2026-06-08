import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { computed, ref, shallowRef, type Ref, type ShallowRef, watch } from 'vue';

import { useI18n } from '@mcp-apps/i18n';
import { MCP_APP_EVENTS, useTelemetry } from '@mcp-apps/telemetry';
import { isRecord } from '@mcp-apps/utils/guards';

import { isWorkflowPreviewData, isWorkflowResult } from '../type-guards';
import type { WorkflowPreviewData } from '../types';
import { applyWorkflowDemoTheme, isAllowedWorkflowUrl, resolveWorkflowDemoUrl } from '../utils/url';

type UseWorkflowPreviewOptions = {
	app: Readonly<ShallowRef<App | undefined>>;
	appSlug?: string;
	hostContext: Readonly<Ref<McpUiHostContext | undefined>>;
	toolResult: Readonly<ShallowRef<unknown>>;
};

export function useWorkflowPreview({
	app,
	appSlug = 'workflow-preview',
	hostContext,
	toolResult,
}: UseWorkflowPreviewOptions) {
	const { t } = useI18n();
	const telemetry = useTelemetry();

	const workflowUrl = ref<string>();
	const workflowId = ref<string>();
	const workflowName = ref<string>();
	const workflowNodeCount = ref<number>();
	const previewBaseUrl = ref<string>();
	const previewWorkflow = shallowRef<WorkflowPreviewData>();
	const previewError = ref<string>();
	const previewLoading = ref(false);
	const previewSent = ref(false);
	const previewTheme = computed(() => hostContext.value?.theme);
	const workflowDetailsRevision = ref(0);
	let latestPreviewLoadRequestId = 0;

	const ariaLabel = computed(() =>
		previewWorkflow.value
			? t('workflowPreview.ariaLabel.preview')
			: workflowUrl.value
				? t('workflowPreview.ariaLabel.ready')
				: t('workflowPreview.ariaLabel.creating'),
	);

	const previewUrl = ref<string>();

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

	watch(
		[workflowId, app, workflowDetailsRevision],
		([id, mcpApp]) => {
			if (!id || !mcpApp) return;
			void loadPreviewWorkflow(mcpApp, id);
		},
		{ immediate: true },
	);

	watch(toolResult, (structuredContent) => {
		applyToolResult(structuredContent);
	});

	watch(previewTheme, () => {
		previewUrl.value = buildPreviewUrl();
	});

	async function handleOpenWorkflow() {
		const mcpApp = app.value;
		const url = workflowUrl.value;
		if (!mcpApp || !url) return;

		if (!isAllowedWorkflowUrl(url)) {
			console.warn('[n8n MCP App] Refusing to open unexpected workflow URL', { url });
			return;
		}

		telemetry.track(MCP_APP_EVENTS.OPEN_IN_N8N_CLICKED, getOpenWorkflowTelemetryPayload());

		try {
			const result = await mcpApp.openLink({ url });
			if (result.isError) {
				console.warn('[n8n MCP App] Host denied open-link request', { url });
			}
		} catch (error) {
			console.error('[n8n MCP App] Failed to open workflow link', error);
		}
	}

	function getOpenWorkflowTelemetryPayload() {
		const payload: Record<string, unknown> = {
			app: appSlug,
			preview_status: getPreviewStatus(),
		};

		if (workflowId.value) {
			payload.workflow_id = workflowId.value;
		}

		return payload;
	}

	function getPreviewStatus() {
		if (previewError.value) return 'error';
		if (previewLoading.value) return 'loading';
		if (isPreviewVisible.value) return 'visible';
		return 'fallback';
	}

	async function loadPreviewWorkflow(mcpApp: App, id: string) {
		const requestId = ++latestPreviewLoadRequestId;

		previewLoading.value = true;
		previewError.value = undefined;

		try {
			const result = await mcpApp.callServerTool({
				name: 'get_workflow_details',
				arguments: { workflowId: id },
			});

			if (!isLatestPreviewLoadRequest(requestId)) return;

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
			if (!isLatestPreviewLoadRequest(requestId)) return;

			console.warn('[n8n MCP App] Failed to load workflow preview data', error);
			previewError.value = t('workflowPreview.error.detailsUnavailable');
		} finally {
			if (isLatestPreviewLoadRequest(requestId)) {
				previewLoading.value = false;
			}
		}
	}

	function isLatestPreviewLoadRequest(requestId: number) {
		return requestId === latestPreviewLoadRequestId;
	}

	function resetPreviewState() {
		latestPreviewLoadRequestId += 1;
		previewWorkflow.value = undefined;
		previewError.value = undefined;
		previewLoading.value = false;
		previewSent.value = false;
	}

	function applyToolResult(structuredContent: unknown) {
		if (!isWorkflowResult(structuredContent)) return;

		resetPreviewState();

		const candidateUrl = structuredContent.url;
		if (isAllowedWorkflowUrl(candidateUrl)) {
			workflowUrl.value = candidateUrl;
			previewBaseUrl.value = resolveWorkflowDemoUrl({
				workflowUrl: candidateUrl,
				previewUrl: structuredContent.previewUrl,
			});
			previewUrl.value = buildPreviewUrl();
		} else {
			workflowUrl.value = undefined;
			previewBaseUrl.value = undefined;
			previewUrl.value = undefined;

			if (candidateUrl !== undefined) {
				console.warn('[n8n MCP App] Ignoring unexpected workflow URL in tool result', {
					url: candidateUrl,
				});
			}
		}

		if (typeof structuredContent.workflowId === 'string') {
			workflowId.value = structuredContent.workflowId;
		} else {
			workflowId.value = undefined;
		}
		workflowDetailsRevision.value += 1;

		if (typeof structuredContent.name === 'string') {
			workflowName.value = structuredContent.name;
		}

		if (typeof structuredContent.nodeCount === 'number') {
			workflowNodeCount.value = structuredContent.nodeCount;
		}
	}

	function buildPreviewUrl() {
		return applyWorkflowDemoTheme({
			previewUrl: previewBaseUrl.value,
			workflowUrl: workflowUrl.value,
			theme: previewTheme.value,
		});
	}

	return {
		workflowUrl,
		workflowName,
		previewUrl,
		previewWorkflow,
		previewError,
		previewLoading,
		previewSent,
		previewTheme,
		ariaLabel,
		isPreviewVisible,
		nodeCountLabel,
		handleOpenWorkflow,
	};
}
