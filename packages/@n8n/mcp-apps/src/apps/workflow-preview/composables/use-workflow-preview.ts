import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { computed, ref, shallowRef, type Ref, type ShallowRef, watch } from 'vue';

import { useI18n } from '@mcp-apps/i18n';
import { isRecord } from '@mcp-apps/utils/guards';

import { isWorkflowPreviewData, isWorkflowResult } from '../type-guards';
import type { WorkflowPreviewData } from '../types';
import { applyWorkflowDemoTheme, isAllowedWorkflowUrl, resolveWorkflowDemoUrl } from '../utils/url';

type UseWorkflowPreviewOptions = {
	app: Readonly<ShallowRef<App | undefined>>;
	hostContext: Readonly<Ref<McpUiHostContext | undefined>>;
	toolResult: Readonly<ShallowRef<unknown>>;
};

export function useWorkflowPreview({ app, hostContext, toolResult }: UseWorkflowPreviewOptions) {
	const { t } = useI18n();

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
		[workflowId, app],
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

		try {
			const result = await mcpApp.openLink({ url });
			if (result.isError) {
				console.warn('[n8n MCP App] Host denied open-link request', { url });
			}
		} catch (error) {
			console.error('[n8n MCP App] Failed to open workflow link', error);
		}
	}

	async function loadPreviewWorkflow(mcpApp: App, id: string) {
		if (previewLoading.value) return;

		previewLoading.value = true;
		previewError.value = undefined;

		try {
			const result = await mcpApp.callServerTool({
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

	function applyToolResult(structuredContent: unknown) {
		if (!isWorkflowResult(structuredContent)) return;

		const candidateUrl = structuredContent.url;
		if (isAllowedWorkflowUrl(candidateUrl)) {
			workflowUrl.value = candidateUrl;
			previewBaseUrl.value = resolveWorkflowDemoUrl({
				workflowUrl: candidateUrl,
				previewUrl: structuredContent.previewUrl,
			});
			previewUrl.value = buildPreviewUrl();
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

	function buildPreviewUrl() {
		return applyWorkflowDemoTheme({
			previewUrl: previewBaseUrl.value,
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
