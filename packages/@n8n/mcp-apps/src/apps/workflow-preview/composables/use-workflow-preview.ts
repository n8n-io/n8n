import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { isRecord } from '@n8n/utils';
import { computed, ref, shallowRef, type Ref, type ShallowRef, watch } from 'vue';

import { useI18n } from '@mcp-apps/i18n';
import { useTelemetry } from '@mcp-apps/telemetry';
import { getMcpClientTelemetryProperties } from '@mcp-apps/telemetry/client-info';
import { sanitizeTelemetryErrorMessage } from '@mcp-apps/telemetry/sanitize';

import {
	WORKFLOW_PREVIEW_APP_SLUG,
	WORKFLOW_PREVIEW_CRASH_SOURCES,
	WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES,
	WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS,
	WORKFLOW_PREVIEW_TELEMETRY_EVENTS,
	WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES,
	WORKFLOW_PREVIEW_TOOL_NAMES,
	type WorkflowPreviewOpenInN8nSource,
	type WorkflowPreviewRenderFailureReason,
	type WorkflowPreviewToolCallOutcome,
} from '../constants';
import { isWorkflowPreviewData, isWorkflowResult } from '../type-guards';
import type { WorkflowPreviewData } from '../types';
import { applyWorkflowDemoTheme, isAllowedWorkflowUrl, resolveWorkflowDemoUrl } from '../utils/url';

type UseWorkflowPreviewOptions = {
	app: Readonly<ShallowRef<App | undefined>>;
	appSlug?: string;
	hostContext: Readonly<Ref<McpUiHostContext | undefined>>;
	hostVersion?: Readonly<Ref<Implementation | undefined>>;
	toolResult: Readonly<ShallowRef<unknown>>;
};

export function useWorkflowPreview({
	app,
	appSlug = WORKFLOW_PREVIEW_APP_SLUG,
	hostContext,
	hostVersion,
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
	const previewFailureReason = ref<WorkflowPreviewRenderFailureReason>();
	const previewLoading = ref(false);
	const previewSent = ref(false);
	const previewTheme = computed(() => hostContext.value?.theme);
	const workflowDetailsRevision = ref(0);
	let latestPreviewLoadRequestId = 0;
	let trackedPreviewFailureRevision: number | undefined;

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
	const previewRenderFailureReason = computed<WorkflowPreviewRenderFailureReason | undefined>(
		() => {
			if (!workflowUrl.value || previewSent.value) return undefined;
			if (previewError.value) {
				return (
					previewFailureReason.value ??
					WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.WORKFLOW_DETAILS_UNAVAILABLE
				);
			}
			if (!previewLoading.value && !previewUrl.value) {
				return WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.PREVIEW_NOT_SUPPORTED;
			}

			return undefined;
		},
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

	watch([previewRenderFailureReason, workflowDetailsRevision], ([reason, revision]) => {
		if (!reason || trackedPreviewFailureRevision === revision) return;

		trackedPreviewFailureRevision = revision;
		telemetry.track(WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_RENDER_FAILED, {
			...getPreviewTelemetryPayload(),
			reason,
		});
	});

	watch(previewSent, (sent) => {
		if (!sent) return;

		telemetry.track(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_RENDERED_SUCCESSFULLY,
			getPreviewTelemetryPayload(),
		);
	});

	async function handleOpenWorkflow(
		source: WorkflowPreviewOpenInN8nSource = WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES.FALLBACK_CARD,
	) {
		const mcpApp = app.value;
		const url = workflowUrl.value;
		if (!mcpApp || !url) return;

		if (!isAllowedWorkflowUrl(url)) {
			console.warn('[n8n MCP App] Refusing to open unexpected workflow URL', { url });
			return;
		}

		telemetry.track(WORKFLOW_PREVIEW_TELEMETRY_EVENTS.OPEN_IN_N8N_CLICKED, {
			...getPreviewTelemetryPayload(),
			source,
		});

		try {
			const result = await mcpApp.openLink({ url });
			if (result.isError) {
				console.warn('[n8n MCP App] Host denied open-link request', { url });
			}
		} catch (error) {
			console.error('[n8n MCP App] Failed to open workflow link', error);
		}
	}

	function getPreviewTelemetryPayload() {
		const payload: Record<string, unknown> = {
			app: appSlug,
			...getMcpClientTelemetryProperties(hostVersion?.value),
			preview_status: getPreviewStatus(),
		};

		if (workflowId.value) {
			payload.workflow_id = workflowId.value;
		}

		return payload;
	}

	function getPreviewToolCallTelemetryPayload(requestId: number) {
		return {
			...getPreviewTelemetryPayload(),
			load_request_id: requestId,
			tool_name: WORKFLOW_PREVIEW_TOOL_NAMES.GET_WORKFLOW_DETAILS,
		};
	}

	function trackPreviewToolCallCompleted({
		outcome,
		requestId,
		startedAt,
	}: {
		outcome: WorkflowPreviewToolCallOutcome;
		requestId: number;
		startedAt: number;
	}) {
		telemetry.track(WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_TOOL_CALL_COMPLETED, {
			...getPreviewToolCallTelemetryPayload(requestId),
			duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
			outcome,
		});
	}

	function getPreviewStatus() {
		if (previewError.value) return 'error';
		if (previewLoading.value) return 'loading';
		if (isPreviewVisible.value) return 'visible';
		return 'fallback';
	}

	function handlePreviewError(message: string) {
		setPreviewError(message, WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.PREVIEW_NOT_SUPPORTED);
	}

	function handlePreviewCrash(message?: string) {
		telemetry.track(WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_CRASHED, {
			...getPreviewTelemetryPayload(),
			...(message ? { error_message: sanitizeTelemetryErrorMessage(message) } : {}),
			source: WORKFLOW_PREVIEW_CRASH_SOURCES.PREVIEW_IFRAME_ERROR,
		});
		setPreviewError(
			t('workflowPreview.error.previewUnavailable'),
			WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.PREVIEW_CRASHED,
		);
	}

	function setPreviewError(message: string, reason: WorkflowPreviewRenderFailureReason) {
		previewError.value = message;
		previewFailureReason.value = reason;
	}

	async function loadPreviewWorkflow(mcpApp: App, id: string) {
		const requestId = ++latestPreviewLoadRequestId;
		const startedAt = performance.now();

		previewLoading.value = true;
		previewError.value = undefined;
		telemetry.track(
			WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_TOOL_CALL_REQUESTED,
			getPreviewToolCallTelemetryPayload(requestId),
		);

		try {
			const result = await mcpApp.callServerTool({
				name: WORKFLOW_PREVIEW_TOOL_NAMES.GET_WORKFLOW_DETAILS,
				arguments: { workflowId: id },
			});

			if (!isLatestPreviewLoadRequest(requestId)) {
				trackPreviewToolCallCompleted({
					outcome: WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES.STALE,
					requestId,
					startedAt,
				});
				return;
			}

			if (result.isError) {
				trackPreviewToolCallCompleted({
					outcome: WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES.TOOL_ERROR,
					requestId,
					startedAt,
				});
				setPreviewError(
					t('workflowPreview.error.detailsUnavailable'),
					WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.WORKFLOW_DETAILS_UNAVAILABLE,
				);
				return;
			}

			const structuredContent = isRecord(result.structuredContent)
				? result.structuredContent
				: undefined;
			const workflow = structuredContent?.workflow;
			if (!isWorkflowPreviewData(workflow)) {
				trackPreviewToolCallCompleted({
					outcome: WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES.INVALID_WORKFLOW,
					requestId,
					startedAt,
				});
				setPreviewError(
					t('workflowPreview.error.invalidWorkflow'),
					WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.INVALID_WORKFLOW,
				);
				return;
			}

			previewWorkflow.value = workflow;
			trackPreviewToolCallCompleted({
				outcome: WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES.SUCCESS,
				requestId,
				startedAt,
			});
		} catch (error) {
			if (!isLatestPreviewLoadRequest(requestId)) {
				trackPreviewToolCallCompleted({
					outcome: WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES.STALE,
					requestId,
					startedAt,
				});
				return;
			}

			console.warn('[n8n MCP App] Failed to load workflow preview data', error);
			trackPreviewToolCallCompleted({
				outcome: WORKFLOW_PREVIEW_TOOL_CALL_OUTCOMES.REQUEST_ERROR,
				requestId,
				startedAt,
			});
			setPreviewError(
				t('workflowPreview.error.detailsUnavailable'),
				WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.WORKFLOW_DETAILS_UNAVAILABLE,
			);
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
		previewFailureReason.value = undefined;
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
		handlePreviewCrash,
		handlePreviewError,
		handleOpenWorkflow,
	};
}
