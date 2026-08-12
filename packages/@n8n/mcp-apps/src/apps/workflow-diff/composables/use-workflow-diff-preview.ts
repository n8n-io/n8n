import type { App } from '@modelcontextprotocol/ext-apps';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { isRecord } from '@n8n/utils/is-record';
import { computed, ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue';

import { toWorkflowPreviewNodeTypes } from '@mcp-apps/apps/workflow-preview/type-guards';
import type { WorkflowPreviewNodeType } from '@mcp-apps/apps/workflow-preview/types';
import { isAllowedWorkflowUrl } from '@mcp-apps/apps/workflow-preview/utils/url';
import { useI18n } from '@mcp-apps/i18n';
import { useTelemetry } from '@mcp-apps/telemetry';
import { getMcpClientTelemetryProperties } from '@mcp-apps/telemetry/client-info';
import { sanitizeTelemetryErrorMessage } from '@mcp-apps/telemetry/sanitize';

import {
	WORKFLOW_DIFF_APP_SLUG,
	WORKFLOW_DIFF_CRASH_SOURCES,
	WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES,
	WORKFLOW_DIFF_RENDER_FAILURE_REASONS,
	WORKFLOW_DIFF_TELEMETRY_EVENTS,
	WORKFLOW_DIFF_TOOL_CALL_OUTCOMES,
	WORKFLOW_DIFF_TOOL_NAMES,
	type WorkflowDiffOpenInN8nSource,
	type WorkflowDiffRenderFailureReason,
	type WorkflowDiffToolCallOutcome,
} from '../constants';
import { isUpdateWorkflowResult, isWorkflowVersionData } from '../type-guards';
import type { WorkflowVersionData } from '../types';

type UseWorkflowDiffPreviewOptions = {
	app: Readonly<ShallowRef<App | undefined>>;
	appSlug?: string;
	hostVersion?: Readonly<Ref<Implementation | undefined>>;
	toolResult: Readonly<ShallowRef<unknown>>;
};

export function useWorkflowDiffPreview({
	app,
	appSlug = WORKFLOW_DIFF_APP_SLUG,
	hostVersion,
	toolResult,
}: UseWorkflowDiffPreviewOptions) {
	const { t } = useI18n();
	const telemetry = useTelemetry();

	const workflowUrl = ref<string>();
	const workflowId = ref<string>();
	const workflowName = ref<string>();
	const versionId = ref<string>();
	const previousVersionId = ref<string>();
	const sourceWorkflow = shallowRef<WorkflowVersionData>();
	const targetWorkflow = shallowRef<WorkflowVersionData>();
	const diffNodeTypes = shallowRef<WorkflowPreviewNodeType[]>([]);
	const diffError = ref<string>();
	const diffFailureReason = ref<WorkflowDiffRenderFailureReason>();
	const diffLoading = ref(false);
	// True once the embedded diff canvases have rendered.
	const diffRendered = ref(false);
	const diffRevision = ref(0);
	let latestDiffLoadRequestId = 0;
	let trackedDiffFailureRevision: number | undefined;

	// A settings/tags-only update produces no new version — there is no graph
	// change to visualize.
	const hasNoVisualChanges = computed(
		() =>
			versionId.value !== undefined &&
			previousVersionId.value !== undefined &&
			versionId.value === previousVersionId.value,
	);

	const isDiffVisible = computed(
		() => !!sourceWorkflow.value && !!targetWorkflow.value && !diffError.value,
	);

	const ariaLabel = computed(() =>
		isDiffVisible.value
			? t('workflowDiff.ariaLabel.diff')
			: workflowUrl.value
				? t('workflowDiff.ariaLabel.ready')
				: t('workflowDiff.ariaLabel.updating'),
	);

	const diffRenderFailureReason = computed<WorkflowDiffRenderFailureReason | undefined>(() => {
		if (!workflowUrl.value || diffRendered.value || hasNoVisualChanges.value) return undefined;
		if (diffError.value) {
			return diffFailureReason.value ?? WORKFLOW_DIFF_RENDER_FAILURE_REASONS.VERSIONS_UNAVAILABLE;
		}

		return undefined;
	});

	watch(
		[workflowId, versionId, previousVersionId, app, diffRevision],
		([id, newVersion, previousVersion, mcpApp]) => {
			if (!id || !newVersion || !previousVersion || !mcpApp) return;
			if (newVersion === previousVersion) return;
			void loadDiffVersions(mcpApp, id, previousVersion, newVersion);
		},
		{ immediate: true },
	);

	watch(toolResult, (structuredContent) => {
		applyToolResult(structuredContent);
	});

	watch([diffRenderFailureReason, diffRevision], ([reason, revision]) => {
		if (!reason || trackedDiffFailureRevision === revision) return;

		trackedDiffFailureRevision = revision;
		telemetry.track(WORKFLOW_DIFF_TELEMETRY_EVENTS.DIFF_RENDER_FAILED, {
			...getDiffTelemetryPayload(),
			reason,
		});
	});

	watch(diffRendered, (rendered) => {
		if (!rendered) return;

		telemetry.track(
			WORKFLOW_DIFF_TELEMETRY_EVENTS.DIFF_RENDERED_SUCCESSFULLY,
			getDiffTelemetryPayload(),
		);
	});

	async function handleOpenWorkflow(
		source: WorkflowDiffOpenInN8nSource = WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES.FALLBACK_CARD,
	) {
		const mcpApp = app.value;
		const url = workflowUrl.value;
		if (!mcpApp || !url) return;

		if (!isAllowedWorkflowUrl(url)) {
			console.warn('[n8n MCP App] Refusing to open unexpected workflow URL', { url });
			return;
		}

		telemetry.track(WORKFLOW_DIFF_TELEMETRY_EVENTS.OPEN_IN_N8N_CLICKED, {
			...getDiffTelemetryPayload(),
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

	function getDiffTelemetryPayload() {
		const payload: Record<string, unknown> = {
			app: appSlug,
			...getMcpClientTelemetryProperties(hostVersion?.value),
			diff_status: getDiffStatus(),
		};

		if (workflowId.value) {
			payload.workflow_id = workflowId.value;
		}

		return payload;
	}

	function getDiffStatus() {
		if (diffError.value) return 'error';
		if (diffLoading.value) return 'loading';
		if (isDiffVisible.value) return 'visible';
		if (hasNoVisualChanges.value) return 'no_visual_changes';
		return 'fallback';
	}

	function trackDiffToolCallCompleted({
		outcome,
		requestId,
		startedAt,
	}: {
		outcome: WorkflowDiffToolCallOutcome;
		requestId: number;
		startedAt: number;
	}) {
		telemetry.track(WORKFLOW_DIFF_TELEMETRY_EVENTS.DIFF_TOOL_CALL_COMPLETED, {
			...getDiffTelemetryPayload(),
			duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
			load_request_id: requestId,
			outcome,
			tool_name: WORKFLOW_DIFF_TOOL_NAMES.GET_WORKFLOW_VERSION,
		});
	}

	function handleDiffCrash(message?: string) {
		telemetry.track(WORKFLOW_DIFF_TELEMETRY_EVENTS.DIFF_CRASHED, {
			...getDiffTelemetryPayload(),
			...(message ? { error_message: sanitizeTelemetryErrorMessage(message) } : {}),
			source: WORKFLOW_DIFF_CRASH_SOURCES.DIFF_CANVAS_ERROR,
		});
		setDiffError(
			t('workflowDiff.error.diffUnavailable'),
			WORKFLOW_DIFF_RENDER_FAILURE_REASONS.DIFF_CRASHED,
		);
	}

	function setDiffError(message: string, reason: WorkflowDiffRenderFailureReason) {
		diffError.value = message;
		diffFailureReason.value = reason;
	}

	async function fetchWorkflowVersion(
		mcpApp: App,
		id: string,
		version: string,
	): Promise<{ workflow: WorkflowVersionData; nodeTypes: WorkflowPreviewNodeType[] }> {
		const result = await mcpApp.callServerTool({
			name: WORKFLOW_DIFF_TOOL_NAMES.GET_WORKFLOW_VERSION,
			arguments: { workflowId: id, versionId: version, includeNodeTypes: true },
		});

		if (result.isError) {
			throw new ToolCallError(WORKFLOW_DIFF_TOOL_CALL_OUTCOMES.TOOL_ERROR);
		}

		const structuredContent = isRecord(result.structuredContent)
			? result.structuredContent
			: undefined;
		if (!isWorkflowVersionData(structuredContent)) {
			throw new ToolCallError(WORKFLOW_DIFF_TOOL_CALL_OUTCOMES.INVALID_VERSION);
		}

		return {
			workflow: structuredContent,
			nodeTypes: toWorkflowPreviewNodeTypes(structuredContent.nodeTypes),
		};
	}

	async function loadDiffVersions(
		mcpApp: App,
		id: string,
		previousVersion: string,
		newVersion: string,
	) {
		const requestId = ++latestDiffLoadRequestId;
		const startedAt = performance.now();

		diffLoading.value = true;
		diffError.value = undefined;
		telemetry.track(WORKFLOW_DIFF_TELEMETRY_EVENTS.DIFF_TOOL_CALL_REQUESTED, {
			...getDiffTelemetryPayload(),
			load_request_id: requestId,
			tool_name: WORKFLOW_DIFF_TOOL_NAMES.GET_WORKFLOW_VERSION,
		});

		try {
			const [previous, current] = await Promise.all([
				fetchWorkflowVersion(mcpApp, id, previousVersion),
				fetchWorkflowVersion(mcpApp, id, newVersion),
			]);

			if (!isLatestDiffLoadRequest(requestId)) {
				trackDiffToolCallCompleted({
					outcome: WORKFLOW_DIFF_TOOL_CALL_OUTCOMES.STALE,
					requestId,
					startedAt,
				});
				return;
			}

			// Merge node types from both versions so removed node types (present
			// only in the previous version) still render.
			const mergedNodeTypes = new Map<string, WorkflowPreviewNodeType>();
			for (const nodeType of [...previous.nodeTypes, ...current.nodeTypes]) {
				const key = `${nodeType.name}|${JSON.stringify(nodeType.version)}`;
				if (!mergedNodeTypes.has(key)) mergedNodeTypes.set(key, nodeType);
			}

			diffNodeTypes.value = [...mergedNodeTypes.values()];
			sourceWorkflow.value = previous.workflow;
			targetWorkflow.value = current.workflow;
			trackDiffToolCallCompleted({
				outcome: WORKFLOW_DIFF_TOOL_CALL_OUTCOMES.SUCCESS,
				requestId,
				startedAt,
			});
		} catch (error) {
			if (!isLatestDiffLoadRequest(requestId)) {
				trackDiffToolCallCompleted({
					outcome: WORKFLOW_DIFF_TOOL_CALL_OUTCOMES.STALE,
					requestId,
					startedAt,
				});
				return;
			}

			console.warn('[n8n MCP App] Failed to load workflow versions for diff', error);
			trackDiffToolCallCompleted({
				outcome:
					error instanceof ToolCallError
						? error.outcome
						: WORKFLOW_DIFF_TOOL_CALL_OUTCOMES.REQUEST_ERROR,
				requestId,
				startedAt,
			});
			setDiffError(
				t('workflowDiff.error.versionsUnavailable'),
				WORKFLOW_DIFF_RENDER_FAILURE_REASONS.VERSIONS_UNAVAILABLE,
			);
		} finally {
			if (isLatestDiffLoadRequest(requestId)) {
				diffLoading.value = false;
			}
		}
	}

	function isLatestDiffLoadRequest(requestId: number) {
		return requestId === latestDiffLoadRequestId;
	}

	function resetDiffState() {
		latestDiffLoadRequestId += 1;
		sourceWorkflow.value = undefined;
		targetWorkflow.value = undefined;
		diffNodeTypes.value = [];
		diffError.value = undefined;
		diffFailureReason.value = undefined;
		diffLoading.value = false;
		diffRendered.value = false;
	}

	function applyToolResult(structuredContent: unknown) {
		if (!isUpdateWorkflowResult(structuredContent)) return;

		resetDiffState();

		const candidateUrl = structuredContent.url;
		if (isAllowedWorkflowUrl(candidateUrl)) {
			workflowUrl.value = candidateUrl;
		} else {
			workflowUrl.value = undefined;

			if (candidateUrl !== undefined) {
				console.warn('[n8n MCP App] Ignoring unexpected workflow URL in tool result', {
					url: candidateUrl,
				});
			}
		}

		workflowId.value =
			typeof structuredContent.workflowId === 'string' ? structuredContent.workflowId : undefined;
		versionId.value =
			typeof structuredContent.versionId === 'string' ? structuredContent.versionId : undefined;
		previousVersionId.value =
			typeof structuredContent.previousVersionId === 'string'
				? structuredContent.previousVersionId
				: undefined;

		if (typeof structuredContent.name === 'string') {
			workflowName.value = structuredContent.name;
		}

		diffRevision.value += 1;
	}

	return {
		workflowUrl,
		workflowName,
		sourceWorkflow,
		targetWorkflow,
		diffNodeTypes,
		diffError,
		diffLoading,
		diffRendered,
		hasNoVisualChanges,
		isDiffVisible,
		ariaLabel,
		handleDiffCrash,
		handleOpenWorkflow,
	};
}

class ToolCallError extends Error {
	constructor(readonly outcome: WorkflowDiffToolCallOutcome) {
		super(`Workflow version tool call failed: ${outcome}`);
	}
}
