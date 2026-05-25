import { computed, effectScope, shallowReactive, type ComputedRef } from 'vue';
import isEqual from 'lodash/isEqual';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import { useI18n } from '@n8n/i18n';
import {
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import {
	useWorkflowExecutionStateStore,
	createWorkflowExecutionStateId,
} from '@/app/stores/workflowExecutionState.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNodeDirtiness } from '@/app/composables/useNodeDirtiness';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import { getTriggerNodeServiceName } from '@/app/utils/nodeTypesUtils';
import { STICKY_NODE_TYPE } from '@/app/constants';
import type { INodeUi } from '@/Interface';
import { checkOverlap } from '@/features/workflows/canvas/canvas.utils';
import type {
	BoundingBox,
	CanvasNode,
	CanvasNodeAddNodesRender,
	CanvasNodeChoicePromptRender,
	CanvasNodeData,
	CanvasNodeDefaultRender,
	CanvasNodeStickyNoteRender,
} from '@/features/workflows/canvas/canvas.types';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import { CHANGE_ACTION } from './types';
import type {
	NodeAddedPayload,
	NodeRemovedPayload,
	NodesChangeEvent,
	NodesSetPayload,
} from './useWorkflowDocumentNodes';

/**
 * Canvas render data accessor for a workflow document.
 *
 * Provides a single object combining:
 * - by-node-id passthroughs from `workflowDocument` (port maps, pin data,
 *   node type info, validation errors) and `workflowExecutionState`
 *   (status / run data / output map / waiting / running / waiting-for-next /
 *   issues — each with active/displayed-execution fallback);
 * - **fusion projections** that combine state from both stores into the
 *   canvas-shaped outputs the renderer consumes: `tooltipByNodeId`,
 *   `hasIssuesByNodeId`, `additionalPropertiesByNodeId`,
 *   `renderTypeByNodeId`.
 *
 * The fusion projections use the same `shallowReactive<Map<id, ComputedRef<T>>>`
 * pattern as the upstream by-id maps: each entry runs in its own `effectScope`
 * and `structuralComputed` gates downstream propagation. Entry lifecycle is
 * driven by the document store's `onNodesChange` event, so add/remove are
 * O(1) and updates re-evaluate lazily.
 */
export function useWorkflowDocumentRenderData(workflowDocumentId: WorkflowDocumentId) {
	const workflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);
	const executionStateStore = useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(workflowDocumentStore.workflowId),
	);
	const nodeTypesStore = useNodeTypesStore();
	const i18n = useI18n();

	// `useNodeDirtiness` reads from Pinia stores; resolve lazily so the
	// renderData composable can be constructed in contexts where dirtiness
	// isn't needed (e.g. test setups that tear down Pinia between renders
	// of the workflow-diff watchEffect).
	let dirtinessAccessor: ReturnType<typeof useNodeDirtiness> | null = null;
	function getDirtinessByName(): Record<string, unknown> {
		if (!dirtinessAccessor) {
			try {
				dirtinessAccessor = useNodeDirtiness();
			} catch {
				return {};
			}
		}
		return dirtinessAccessor.dirtinessByName.value ?? {};
	}

	// -------------------------------------------------------------------------
	// Fusion projections — per-entry maps reconciled off document `onNodesChange`.
	// -------------------------------------------------------------------------

	const tooltipByNodeId = shallowReactive(new Map<string, ComputedRef<string | undefined>>());
	const hasIssuesByNodeId = shallowReactive(new Map<string, ComputedRef<boolean>>());
	const renderTypeByNodeId = shallowReactive(
		new Map<string, ComputedRef<CanvasNodeData['render']>>(),
	);
	const fusionScopes = new Map<string, () => void>();

	function getNode(nodeId: string): INodeUi | undefined {
		return workflowDocumentStore.nodesById.get(nodeId);
	}

	// --- tooltipByNodeId -----------------------------------------------------
	// Original: useCanvasMapping `nodeTooltipById`. Surfaces a "waiting for
	// trigger event" tooltip on the active trigger node while a workflow is
	// running. Hides itself when more than one trigger is active and the
	// driving trigger isn't identified yet, when the node is disabled, when
	// it has pinned data, or when it has already produced/errored output.
	function computeTooltip(nodeId: string): string | undefined {
		if (!executionStateStore.isWorkflowRunning) return undefined;
		const node = getNode(nodeId);
		if (!node) return undefined;

		const isTrigger = workflowDocumentStore.isTriggerByNodeId.get(nodeId)?.value ?? false;
		const nodeTypeDescription =
			workflowDocumentStore.nodeTypeDescriptionByNodeId.get(nodeId)?.value ?? null;
		if (!isTrigger || !nodeTypeDescription) return undefined;

		const triggerNodeName = executionStateStore.activeExecution?.triggerNode;
		// Count active (non-disabled) triggers; when ambiguous and the driving
		// trigger isn't named, suppress all tooltips.
		if (triggerNodeName === undefined) {
			let activeTriggerCount = 0;
			for (const [id] of workflowDocumentStore.isTriggerByNodeId) {
				const n = workflowDocumentStore.nodesById.get(id);
				if (!n) continue;
				if (workflowDocumentStore.isTriggerByNodeId.get(id)?.value && !n.disabled) {
					activeTriggerCount += 1;
				}
			}
			if (activeTriggerCount !== 1) return undefined;
		} else if (triggerNodeName !== node.name) {
			return undefined;
		}

		if (node.disabled) return undefined;
		const status = executionStateStore.activeExecutionStatusByNodeId.get(nodeId)?.value ?? 'new';
		if (!['new', 'unknown', 'waiting'].includes(status)) return undefined;
		const pinned = workflowDocumentStore.pinnedDataByNodeId.get(nodeId)?.value;
		if (pinned) return undefined;

		if (typeof nodeTypeDescription.eventTriggerDescription === 'string') {
			const nodeName = i18n.shortNodeType(nodeTypeDescription.name);
			return i18n
				.nodeText(nodeTypeDescription.name)
				.eventTriggerDescription(nodeName, nodeTypeDescription.eventTriggerDescription ?? '');
		}
		return i18n.baseText('node.waitingForYouToCreateAnEventIn', {
			interpolate: {
				nodeType: getTriggerNodeServiceName(nodeTypeDescription),
			},
		});
	}

	// --- hasIssuesByNodeId ---------------------------------------------------
	// Original: useCanvasMapping `nodeHasIssuesById`. Decides whether the node
	// renders with the "has issues" affordance. Pinned data wins (false). Then
	// hard-error execution statuses, validation errors, execution-issue map,
	// and finally a last-task `.error` check.
	function computeHasIssues(nodeId: string): boolean {
		const node = getNode(nodeId);
		if (!node) return false;

		const status = executionStateStore.activeExecutionStatusByNodeId.get(nodeId)?.value ?? 'new';
		if (status === 'crashed' || status === 'error') return true;

		const pinned = workflowDocumentStore.pinnedDataByNodeId.get(nodeId)?.value;
		if (pinned) return false;

		const validationErrors =
			workflowDocumentStore.validationErrorsByNodeId.get(nodeId)?.value ?? [];
		if (validationErrors.length > 0) return true;

		const executionIssues =
			executionStateStore.activeExecutionIssuesByNodeName.get(node.name)?.value ?? [];
		if (executionIssues.length > 0) return true;

		const tasks = executionStateStore.activeExecutionRunDataByNodeId.get(nodeId)?.value ?? null;
		return Boolean(tasks?.at(-1)?.error);
	}

	// --- renderTypeByNodeId --------------------------------------------------
	// Original: useCanvasMapping `renderTypeByNodeId` + create*RenderType
	// helpers. Returns the canvas render type/options the renderer reads.
	function createStickyNoteRenderType(node: INodeUi): CanvasNodeStickyNoteRender {
		return {
			type: CanvasNodeRenderType.StickyNote,
			options: {
				width: node.parameters.width as number,
				height: node.parameters.height as number,
				color: node.parameters.color as number,
				content: node.parameters.content as string,
			},
		};
	}

	function createAddNodesRenderType(): CanvasNodeAddNodesRender {
		return { type: CanvasNodeRenderType.AddNodes, options: {} };
	}

	function createChoicePromptRenderType(): CanvasNodeChoicePromptRender {
		return { type: CanvasNodeRenderType.ChoicePrompt, options: {} };
	}

	function createDefaultNodeRenderType(node: INodeUi): CanvasNodeDefaultRender {
		const nodeType = workflowDocumentStore.nodeTypeDescriptionByNodeId.get(node.id)?.value ?? null;
		const simulated =
			workflowDocumentStore.simulatedNodeTypeDescriptionByNodeId.get(node.id)?.value ?? null;
		const iconSource = simulated ?? nodeType ?? node.type;
		const icon = getNodeIconSource(iconSource, node, workflowDocumentStore.getExpressionHandler());

		const isTrigger = workflowDocumentStore.isTriggerByNodeId.get(node.id)?.value ?? false;
		const tooltip = tooltipByNodeId.get(node.id)?.value;

		// Snapshot the workflow object accessors per-call. Reads inside the
		// snapshot factory access the underlying stores' refs, so the
		// surrounding structuralComputed picks up dependencies and re-evaluates
		// when they change.
		const workflowAccessors = workflowDocumentStore.getWorkflowObjectAccessorSnapshot();

		return {
			type: CanvasNodeRenderType.Default,
			options: {
				trigger: isTrigger,
				configuration: nodeTypesStore.isConfigNode(workflowAccessors, node, node.type),
				configurable: nodeTypesStore.isConfigurableNode(
					workflowAccessors,
					node,
					node.type,
					node.typeVersion,
				),
				tooltip,
				dirtiness: getDirtinessByName()[
					node.name
				] as CanvasNodeDefaultRender['options']['dirtiness'],
				icon,
				placeholder: node.placeholder,
			},
		};
	}

	function computeRenderType(nodeId: string): CanvasNodeData['render'] {
		const node = getNode(nodeId);
		if (!node) return { type: CanvasNodeRenderType.Default, options: {} };
		switch (node.type) {
			case `${CanvasNodeRenderType.StickyNote}`:
				return createStickyNoteRenderType(node);
			case `${CanvasNodeRenderType.AddNodes}`:
				return createAddNodesRenderType();
			case `${CanvasNodeRenderType.ChoicePrompt}`:
				return createChoicePromptRenderType();
			default:
				return createDefaultNodeRenderType(node);
		}
	}

	function applyAddFusionEntry(nodeId: string) {
		if (fusionScopes.has(nodeId)) return;
		const scope = effectScope();
		scope.run(() => {
			tooltipByNodeId.set(
				nodeId,
				structuralComputed(() => computeTooltip(nodeId)),
			);
			hasIssuesByNodeId.set(
				nodeId,
				structuralComputed(() => computeHasIssues(nodeId)),
			);
			renderTypeByNodeId.set(
				nodeId,
				structuralComputed(() => computeRenderType(nodeId), isEqual),
			);
		});
		fusionScopes.set(nodeId, () => scope.stop());
	}

	function applyRemoveFusionEntry(nodeId: string) {
		fusionScopes.get(nodeId)?.();
		fusionScopes.delete(nodeId);
		tooltipByNodeId.delete(nodeId);
		hasIssuesByNodeId.delete(nodeId);
		renderTypeByNodeId.delete(nodeId);
	}

	function applyReconcileFusionEntries(nodeIds: string[]) {
		const next = new Set(nodeIds);
		for (const old of fusionScopes.keys()) {
			if (!next.has(old)) applyRemoveFusionEntry(old);
		}
		for (const id of nodeIds) applyAddFusionEntry(id);
	}

	if (typeof workflowDocumentStore.onNodesChange === 'function') {
		workflowDocumentStore.onNodesChange((event: NodesChangeEvent) => {
			switch (event.action) {
				case CHANGE_ACTION.ADD: {
					const { node } = event.payload as NodeAddedPayload;
					applyAddFusionEntry(node.id);
					break;
				}
				case CHANGE_ACTION.DELETE: {
					const payload = event.payload as NodeRemovedPayload;
					if (payload.id) applyRemoveFusionEntry(payload.id);
					else applyReconcileFusionEntries([]);
					break;
				}
				case CHANGE_ACTION.SET: {
					const { nodeIds } = event.payload as NodesSetPayload;
					applyReconcileFusionEntries(nodeIds);
					break;
				}
			}
		});
	}

	const initialIds = workflowDocumentStore.nodesById;
	if (initialIds && typeof initialIds.keys === 'function') {
		applyReconcileFusionEntries(Array.from(initialIds.keys()));
	}

	// -------------------------------------------------------------------------
	// `additionalPropertiesByNodeId` — sticky-note z-index overlap resolution.
	// Whole-list computation (changing one sticky can ripple to others via
	// overlap), so a single `computed` rather than per-entry maps. The result
	// is keyed by node id; consumers read individual slots.
	// -------------------------------------------------------------------------
	const additionalPropertiesByNodeId = computed(() => {
		type StickyBox = BoundingBox & { id: string; area: number; zIndex: number };
		const stickyZIndexBase = -100;

		const stickyBoxes: StickyBox[] = [];
		for (const node of workflowDocumentStore.allNodes) {
			if (node.type !== STICKY_NODE_TYPE) continue;
			const width = node.parameters.width as number;
			const height = node.parameters.height as number;
			stickyBoxes.push({
				id: node.id,
				x: node.position[0],
				y: node.position[1],
				width,
				height,
				area: width * height,
				zIndex: stickyZIndexBase,
			});
		}

		// Larger area first; assign baseline z-indexes in that order.
		stickyBoxes.sort((a, b) => b.area - a.area);
		stickyBoxes.forEach((box, idx) => {
			box.zIndex = stickyZIndexBase + idx;
		});

		// Bump smaller overlapping stickies above their larger neighbours so
		// they remain interactive when stacked.
		for (let i = 0; i < stickyBoxes.length; i++) {
			for (let j = i + 1; j < stickyBoxes.length; j++) {
				const a = stickyBoxes[i];
				const b = stickyBoxes[j];
				if (!checkOverlap(a, b)) continue;
				if (a.area < b.area && a.zIndex <= b.zIndex) a.zIndex = b.zIndex + 1;
				else if (b.area < a.area && b.zIndex <= a.zIndex) b.zIndex = a.zIndex + 1;
			}
		}

		const result: Record<string, Partial<CanvasNode>> = {};
		for (const box of stickyBoxes) {
			result[box.id] = { style: { zIndex: box.zIndex } };
		}
		return result;
	});

	return {
		// --- workflowDocument projections ---
		nodeInputsByNodeId: workflowDocumentStore.nodeInputsByNodeId,
		nodeOutputsByNodeId: workflowDocumentStore.nodeOutputsByNodeId,
		pinnedDataByNodeName: workflowDocumentStore.pinnedDataByNodeName,
		pinnedDataByNodeId: workflowDocumentStore.pinnedDataByNodeId,
		nodeTypeDescriptionByNodeId: workflowDocumentStore.nodeTypeDescriptionByNodeId,
		isTriggerByNodeId: workflowDocumentStore.isTriggerByNodeId,
		subtitleByNodeId: workflowDocumentStore.subtitleByNodeId,
		simulatedNodeTypeDescriptionByNodeId:
			workflowDocumentStore.simulatedNodeTypeDescriptionByNodeId,
		validationErrorsByNodeId: workflowDocumentStore.validationErrorsByNodeId,

		// --- workflowExecutionState projections (active/displayed fallback) ---
		executionIssuesByNodeName: executionStateStore.activeExecutionIssuesByNodeName,
		executionStatusByNodeId: executionStateStore.activeExecutionStatusByNodeId,
		executionRunDataByNodeId: executionStateStore.activeExecutionRunDataByNodeId,
		executionRunDataOutputMapByNodeId: executionStateStore.activeExecutionRunDataOutputMapByNodeId,
		executionWaitingByNodeId: executionStateStore.activeExecutionWaitingByNodeId,
		executionRunningByNodeId: executionStateStore.executionRunningByNodeId,
		executionWaitingForNextByNodeId: executionStateStore.executionWaitingForNextByNodeId,

		// --- multi-store fusion projections ---
		tooltipByNodeId,
		hasIssuesByNodeId,
		renderTypeByNodeId,
		additionalPropertiesByNodeId,
	};
}
