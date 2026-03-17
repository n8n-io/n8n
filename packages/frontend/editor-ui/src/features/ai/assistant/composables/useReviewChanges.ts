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

	// Cache for per-version node data: versionId → { nodes, connections }
	const versionDataCache = ref<Map<string, { nodes: INode[]; connections: IConnections }>>(
		new Map(),
	);
	// Tracks which version IDs we've already started fetching
	const fetchingVersionIds = ref<Set<string>>(new Set());

	/**
	 * Fetch version data for all version cards, skipping already-cached entries.
	 */
	watch(
		() => builderStore.versionCardMessages,
		async (cards) => {
			if (!cards?.length) return;
			const workflowId = workflowsStore.workflowId;
			for (const card of cards) {
				const vid = card.data.versionId;
				if (versionDataCache.value.has(vid) || fetchingVersionIds.value.has(vid)) continue;
				fetchingVersionIds.value.add(vid);
				try {
					const v = await workflowHistoryStore.getWorkflowVersion(workflowId, vid);
					versionDataCache.value.set(vid, { nodes: v.nodes, connections: v.connections });
				} catch (err) {
					versionDataCache.value.set(vid, { nodes: [], connections: {} });
				}
			}
		},
		{ immediate: true },
	);

	// Also clear cache when the latest version changes to null (e.g. new session)
	watch(
		() => builderStore.latestRevertVersion,
		(version) => {
			if (!version) {
				versionDataCache.value = new Map();
				fetchingVersionIds.value = new Set();
			}
		},
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

	/**
	 * Compute node changes between two sets of nodes (source → target).
	 */
	function computeNodeChanges(sourceNodes: INode[], targetNodes: INode[]): NodeChangeEntry[] {
		const normalized = resolveNodeDefaults(sourceNodes);
		const diff = compareWorkflowsNodes(normalized, targetNodes);
		const targetById = new Map(targetNodes.map((n) => [n.id, n]));
		return [...diff.values()]
			.filter((d) => d.status !== NodeDiffStatus.Eq)
			.map((d) => {
				const node =
					d.status === NodeDiffStatus.Deleted ? d.node : (targetById.get(d.node.id) ?? d.node);
				return {
					status: d.status,
					node,
					nodeType: nodeTypesStore.getNodeType(node.type, node.typeVersion),
				};
			});
	}

	/**
	 * Per-version node changes. For each version card, computes the diff
	 * between that version's nodes and the NEXT version's nodes
	 * (or the current workflow for the latest version card).
	 */
	const versionNodeChangesMap = computed<Map<string, NodeChangeEntry[]>>(() => {
		if (builderStore.streaming) return new Map();
		const cards = builderStore.versionCardMessages;
		const result = new Map<string, NodeChangeEntry[]>();

		for (let i = 0; i < cards.length; i++) {
			const vid = cards[i].data.versionId;
			const sourceData = versionDataCache.value.get(vid);
			if (!sourceData) continue;

			// Target: next version's nodes, or current workflow for the latest
			let targetNodes: INode[];
			if (i < cards.length - 1) {
				const nextVid = cards[i + 1].data.versionId;
				const nextData = versionDataCache.value.get(nextVid);
				if (!nextData) continue;
				targetNodes = nextData.nodes;
			} else {
				targetNodes = workflowsStore.workflow.nodes;
			}

			result.set(vid, computeNodeChanges(sourceData.nodes, targetNodes));
		}

		return result;
	});

	/** Node changes for the latest version (used for canvas highlights and backward compat) */
	const nodeChanges = computed<NodeChangeEntry[]>(() => {
		if (!builderStore.latestRevertVersion) return [];
		return versionNodeChangesMap.value.get(builderStore.latestRevertVersion.id) ?? [];
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
		const latest = builderStore.latestRevertVersion;
		if (!latest) return;
		const cached = versionDataCache.value.get(latest.id);
		if (!cached) return;

		const sourceWorkflow = {
			...workflowsStore.workflow,
			nodes: cached.nodes,
			connections: cached.connections,
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
		versionNodeChangesMap,
		isExpanded,
		toggleExpanded,
		isLoadingDiff,
		openDiffView,
	};
}
