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
		const normalizedSource = resolveNodeDefaults(sourceNodes);
		const normalizedTarget = resolveNodeDefaults(targetNodes);
		const diff = compareWorkflowsNodes(normalizedSource, normalizedTarget);
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
	 * between the PREVIOUS version's nodes and this version's nodes.
	 * For the first version (no predecessor), all nodes are treated as additions.
	 *
	 * After a version restore, collapsed version cards are skipped when finding
	 * the predecessor for non-collapsed cards. This ensures a new generation
	 * after restore diffs against the restored version, not a collapsed one.
	 * Collapsed cards still get their own diffs (using sequential ordering)
	 * for when the user expands the collapsed group.
	 */
	const versionNodeChangesMap = computed<Map<string, NodeChangeEntry[]>>(() => {
		const cards = builderStore.versionCardMessages;
		const collapsed = builderStore.collapsedMessageIds;
		const result = new Map<string, NodeChangeEntry[]>();

		const isCardCollapsed = (id: string | undefined): boolean =>
			Boolean(id) && collapsed.has(id as string);

		for (let i = 0; i < cards.length; i++) {
			const vid = cards[i].data.versionId;
			const targetData = versionDataCache.value.get(vid);
			if (!targetData) continue;

			let sourceNodes: INode[];
			if (i === 0) {
				sourceNodes = [];
			} else if (isCardCollapsed(cards[i].id)) {
				// Collapsed cards diff against their immediate predecessor
				const prevData = versionDataCache.value.get(cards[i - 1].data.versionId);
				if (!prevData) continue;
				sourceNodes = prevData.nodes;
			} else {
				// Non-collapsed cards skip collapsed predecessors so that
				// new generations after restore diff against the restored version.
				let prevSourceNodes: INode[] | undefined;
				for (let j = i - 1; j >= 0; j--) {
					if (!isCardCollapsed(cards[j].id)) {
						const prevData = versionDataCache.value.get(cards[j].data.versionId);
						if (prevData) prevSourceNodes = prevData.nodes;
						break;
					}
				}
				sourceNodes = prevSourceNodes ?? [];
			}

			result.set(vid, computeNodeChanges(sourceNodes, targetData.nodes));
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
		const cards = builderStore.versionCardMessages;
		if (cards.length === 0) return;

		const latestCard = cards[cards.length - 1];
		const latestCached = versionDataCache.value.get(latestCard.data.versionId);
		if (!latestCached) return;

		// Source: previous version's data (or empty workflow for the first card)
		let sourceNodes: INode[] = [];
		let sourceConnections: IConnections = {};
		if (cards.length > 1) {
			const prevCard = cards[cards.length - 2];
			const prevCached = versionDataCache.value.get(prevCard.data.versionId);
			if (prevCached) {
				sourceNodes = prevCached.nodes;
				sourceConnections = prevCached.connections;
			}
		}

		const sourceWorkflow = {
			...workflowsStore.workflow,
			nodes: sourceNodes,
			connections: sourceConnections,
		};
		const targetWorkflow = {
			...workflowsStore.workflow,
			nodes: latestCached.nodes,
			connections: latestCached.connections,
		};

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
