import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
	compareWorkflowsNodes,
	NodeDiffStatus,
	NodeHelpers,
	type IConnections,
	type INode,
} from 'n8n-workflow';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { AI_BUILDER_DIFF_MODAL_KEY, AI_BUILDER_REVIEW_CHANGES_EXPERIMENT } from '@/app/constants';
import { useChatPanelStateStore } from '@/features/ai/assistant/chatPanelState.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import type { SimplifiedNodeType } from '@/Interface';

const AI_DIFF_CLASS_MAP: Partial<Record<NodeDiffStatus, string>> = {
	[NodeDiffStatus.Added]: 'ai-diff-added',
	[NodeDiffStatus.Modified]: 'ai-diff-modified',
};

export interface NodeChangeEntry {
	status: NodeDiffStatus;
	node: INode;
	nodeType: SimplifiedNodeType | null;
}

export function useReviewChanges() {
	const builderStore = useBuilderStore();
	const workflowsStore = useWorkflowsStore();
	const workflowHistoryStore = useWorkflowHistoryStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();
	const chatPanelStateStore = useChatPanelStateStore();
	const posthogStore = usePostHog();
	const i18n = useI18n();
	const isLoadingDiff = ref(false);
	const cachedVersionNodes = ref<INode[]>([]);
	const cachedVersionConnections = ref<IConnections>({});
	const cachedVersionLoaded = ref(false);

	watch(
		() => builderStore.latestRevertVersion,
		async (version) => {
			if (!version) {
				cachedVersionNodes.value = [];
				cachedVersionConnections.value = {};
				cachedVersionLoaded.value = false;
				return;
			}
			const versionId = version.id;
			cachedVersionLoaded.value = false;
			try {
				const v = await workflowHistoryStore.getWorkflowVersion(
					workflowsStore.workflowId,
					versionId,
				);
				if (builderStore.latestRevertVersion?.id !== versionId) return;
				cachedVersionNodes.value = v.nodes;
				cachedVersionConnections.value = v.connections;
			} catch {
				if (builderStore.latestRevertVersion?.id !== versionId) return;
				cachedVersionNodes.value = [];
				cachedVersionConnections.value = {};
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

	const nodeChanges = computed<NodeChangeEntry[]>(() => {
		if (!cachedVersionLoaded.value || builderStore.streaming) return [];
		const normalized = resolveNodeDefaults(cachedVersionNodes.value);
		const currentNodes: INode[] = workflowsStore.workflow.nodes;
		const diff = compareWorkflowsNodes(normalized, currentNodes);
		const currentNodesById = new Map(currentNodes.map((n) => [n.id, n]));
		return [...diff.values()]
			.filter((d) => d.status !== NodeDiffStatus.Eq)
			.map((d) => {
				// For Added/Modified nodes, use the current version; for Deleted, use the cached version
				const node =
					d.status === NodeDiffStatus.Deleted
						? d.node
						: (currentNodesById.get(d.node.id) ?? d.node);
				return {
					status: d.status,
					node,
					nodeType: nodeTypesStore.getNodeType(node.type, node.typeVersion),
				};
			});
	});

	const editedNodesCount = computed(() => nodeChanges.value.length);

	const isExpanded = ref(false);

	function toggleExpanded() {
		isExpanded.value = !isExpanded.value;
		builderStore.trackWorkflowBuilderJourney(
			isExpanded.value ? 'user_expanded_review_changes' : 'user_collapsed_review_changes',
		);
	}

	// Track which node IDs currently have highlight classes applied
	const highlightedNodeIds = ref<string[]>([]);

	function applyCanvasHighlights() {
		clearCanvasHighlights();
		for (const change of nodeChanges.value) {
			const className = AI_DIFF_CLASS_MAP[change.status];
			if (!className) continue;
			canvasEventBus.emit('nodes:action', {
				ids: [change.node.id],
				action: 'update:node:class',
				payload: { className, add: true },
			});
			highlightedNodeIds.value.push(change.node.id);
		}
	}

	function clearCanvasHighlights() {
		for (const nodeId of highlightedNodeIds.value) {
			for (const className of Object.values(AI_DIFF_CLASS_MAP)) {
				canvasEventBus.emit('nodes:action', {
					ids: [nodeId],
					action: 'update:node:class',
					payload: { className, add: false },
				});
			}
		}
		highlightedNodeIds.value = [];
	}

	// Toggle canvas highlights with expand/collapse
	watch(isExpanded, (expanded) => {
		if (expanded) {
			applyCanvasHighlights();
		} else {
			clearCanvasHighlights();
		}
	});

	// Auto-collapse and clear highlights when streaming starts or version changes
	watch(
		() => builderStore.streaming,
		(streaming) => {
			if (streaming && isExpanded.value) {
				isExpanded.value = false;
				clearCanvasHighlights();
			}
		},
	);

	watch(
		() => builderStore.latestRevertVersion,
		() => {
			if (isExpanded.value) {
				isExpanded.value = false;
				clearCanvasHighlights();
			}
		},
	);

	// Clear highlights when the builder panel is closed
	watch(
		() => chatPanelStateStore.isOpen,
		(isOpen) => {
			if (!isOpen) {
				isExpanded.value = false;
				clearCanvasHighlights();
			}
		},
	);

	onBeforeUnmount(() => {
		clearCanvasHighlights();
	});

	const showReviewChanges = computed(() => {
		return (
			posthogStore.isFeatureEnabled(AI_BUILDER_REVIEW_CHANGES_EXPERIMENT.name) &&
			!builderStore.streaming &&
			builderStore.latestRevertVersion !== null &&
			editedNodesCount.value > 0
		);
	});

	function openDiffView() {
		if (!builderStore.latestRevertVersion || !cachedVersionLoaded.value) return;

		const sourceWorkflow = {
			...workflowsStore.workflow,
			nodes: cachedVersionNodes.value,
			connections: cachedVersionConnections.value,
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
	}

	return {
		showReviewChanges,
		editedNodesCount,
		nodeChanges,
		isExpanded,
		toggleExpanded,
		isLoadingDiff,
		openDiffView,
	};
}
