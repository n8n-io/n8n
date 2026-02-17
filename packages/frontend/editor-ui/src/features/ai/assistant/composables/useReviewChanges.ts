import { computed, ref, watch } from 'vue';
import { compareWorkflowsNodes, NodeDiffStatus, NodeHelpers, type INode } from 'n8n-workflow';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useToast } from '@/app/composables/useToast';
import { AI_BUILDER_DIFF_MODAL_KEY, AI_BUILDER_REVIEW_CHANGES_EXPERIMENT } from '@/app/constants';

export function useReviewChanges() {
	const builderStore = useBuilderStore();
	const workflowsStore = useWorkflowsStore();
	const workflowHistoryStore = useWorkflowHistoryStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();
	const posthogStore = usePostHog();
	const i18n = useI18n();
	const toast = useToast();

	const isLoadingDiff = ref(false);
	const cachedVersionNodes = ref<INode[]>([]);
	const cachedVersionLoaded = ref(false);

	watch(
		() => builderStore.latestRevertVersion,
		async (version) => {
			if (!version) {
				cachedVersionNodes.value = [];
				cachedVersionLoaded.value = false;
				return;
			}
			cachedVersionLoaded.value = false;
			try {
				const v = await workflowHistoryStore.getWorkflowVersion(
					workflowsStore.workflowId,
					version.id,
				);
				cachedVersionNodes.value = v.nodes;
			} catch {
				cachedVersionNodes.value = [];
			}
			cachedVersionLoaded.value = true;
		},
		{ immediate: true },
	);

	/**
	 * Resolve node parameters with defaults so version nodes can be fairly compared
	 * against store nodes (which have defaults resolved by useWorkflowUpdate).
	 */
	function resolveNodeDefaults(nodes: INode[]): INode[] {
		return nodes.map((node) => {
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeType) return node;
			const resolved = NodeHelpers.getNodeParameters(
				nodeType.properties ?? [],
				node.parameters,
				true,
				false,
				node,
				nodeType,
			);
			return { ...node, parameters: resolved ?? {} };
		});
	}

	const editedNodesCount = computed(() => {
		if (!cachedVersionLoaded.value) return 0;
		const normalized = resolveNodeDefaults(cachedVersionNodes.value);
		const diff = compareWorkflowsNodes(normalized, workflowsStore.workflow.nodes);
		return [...diff.values()].filter((d) => d.status !== NodeDiffStatus.Eq).length;
	});

	const showReviewChanges = computed(() => {
		return (
			posthogStore.isFeatureEnabled(AI_BUILDER_REVIEW_CHANGES_EXPERIMENT.name) &&
			!builderStore.streaming &&
			builderStore.latestRevertVersion !== null &&
			editedNodesCount.value > 0
		);
	});

	async function openDiffView() {
		const revertVersion = builderStore.latestRevertVersion;
		if (!revertVersion) return;

		isLoadingDiff.value = true;
		try {
			const version = await workflowHistoryStore.getWorkflowVersion(
				workflowsStore.workflowId,
				revertVersion.id,
			);
			const sourceWorkflow = {
				...workflowsStore.workflow,
				nodes: version.nodes,
				connections: version.connections,
			};
			const targetWorkflow = workflowsStore.workflow;

			uiStore.openModalWithData({
				name: AI_BUILDER_DIFF_MODAL_KEY,
				data: {
					eventBus: createEventBus(),
					sourceWorkflow,
					targetWorkflow,
					sourceLabel: i18n.baseText('aiAssistant.builder.reviewChanges.previousVersion'),
					targetLabel: i18n.baseText('aiAssistant.builder.reviewChanges.currentVersion'),
				},
			});
		} catch {
			toast.showMessage({
				title: i18n.baseText('aiAssistant.builder.error.title'),
				message: i18n.baseText('aiAssistant.builder.reviewChanges.error' as BaseTextKey),
				type: 'error',
			});
		} finally {
			isLoadingDiff.value = false;
		}
	}

	return {
		showReviewChanges,
		editedNodesCount,
		isLoadingDiff,
		openDiffView,
	};
}
