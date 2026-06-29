import { computed, effectScope, onScopeDispose, shallowReactive, type ComputedRef } from 'vue';
import isEqual from 'lodash/isEqual';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import { useI18n } from '@n8n/i18n';
import type { INodeTypeDescription } from 'n8n-workflow';
import {
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNodeDirtiness } from '@/app/composables/useNodeDirtiness';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import { getNodeSubtitle, getTriggerNodeServiceName } from '@/app/utils/nodeTypesUtils';
import {
	CUSTOM_API_CALL_KEY,
	SIMULATE_NODE_TYPE,
	SIMULATE_TRIGGER_NODE_TYPE,
	STICKY_NODE_TYPE,
} from '@/app/constants';
import type { INodeUi } from '@/Interface';
import { checkOverlap } from '@/features/workflows/canvas/canvas.utils';
import type {
	BoundingBox,
	CanvasNode,
	CanvasNodeAddNodesRender,
	CanvasNodeChoicePromptRender,
	CanvasNodeData,
	CanvasNodeDefaultRender,
	CanvasNodeDirtinessType,
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
 *   validation errors) and `workflowExecutionState` (status / run data /
 *   output map / waiting / running / waiting-for-next / issues — each with
 *   active/displayed-execution fallback);
 * - per-node-id derivations from the workflow document
 *   (`nodeTypeDescriptionByNodeId`, `isTriggerByNodeId`, `subtitleByNodeId`,
 *   `simulatedNodeTypeDescriptionByNodeId`);
 * - **fusion projections** that combine state from both stores into the
 *   canvas-shaped outputs the renderer consumes: `tooltipByNodeId`,
 *   `hasIssuesByNodeId`, `additionalPropertiesByNodeId`,
 *   `renderTypeByNodeId`.
 *
 * Per-entry maps use a `shallowReactive<Map<id, ComputedRef<T>>>` pattern:
 * each entry runs in its own `effectScope` and `structuralComputed` gates
 * downstream propagation. Entry lifecycle is driven by the document store's
 * `onNodesChange` event, so add/remove are O(1) and updates re-evaluate
 * lazily.
 *
 * Lifecycle: this is side-effectful (subscribes to `onNodesChange`, creates
 * per-node scopes), so it must be invoked **once per document id inside an
 * `effectScope` the caller owns** — never inside a re-evaluating `computed`.
 * Stopping that scope runs the `onScopeDispose` teardown below. See
 * `WorkflowCanvas.vue` and `useWorkflowDiff.ts` for the call pattern.
 */
export function useWorkflowDocumentRenderData(workflowDocumentId: WorkflowDocumentId) {
	const workflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);
	const executionStateStore = useWorkflowExecutionStateStore(workflowDocumentId);
	const nodeTypesStore = useNodeTypesStore();
	const i18n = useI18n();
	const { dirtinessByName } = useNodeDirtiness(workflowDocumentId);

	// -------------------------------------------------------------------------
	// Per-entry maps reconciled off the document store's `onNodesChange`.
	// -------------------------------------------------------------------------

	const nodeTypeDescriptionByNodeId = shallowReactive(
		new Map<string, ComputedRef<INodeTypeDescription | null>>(),
	);
	const isTriggerByNodeId = shallowReactive(new Map<string, ComputedRef<boolean>>());
	const subtitleByNodeId = shallowReactive(new Map<string, ComputedRef<string>>());
	const simulatedNodeTypeDescriptionByNodeId = shallowReactive(
		new Map<string, ComputedRef<INodeTypeDescription | null>>(),
	);
	const tooltipByNodeId = shallowReactive(new Map<string, ComputedRef<string | undefined>>());
	const hasIssuesByNodeId = shallowReactive(new Map<string, ComputedRef<boolean>>());
	const dirtinessByNodeId = shallowReactive(
		new Map<string, ComputedRef<CanvasNodeDirtinessType | undefined>>(),
	);
	const renderTypeByNodeId = shallowReactive(
		new Map<string, ComputedRef<CanvasNodeData['render']>>(),
	);
	const entryScopes = new Map<string, () => void>();

	function getNode(nodeId: string): INodeUi | undefined {
		return workflowDocumentStore.nodesById.get(nodeId);
	}

	// --- nodeTypeDescriptionByNodeId / isTriggerByNodeId / subtitleByNodeId / simulated ---

	function computeNodeTypeDescription(nodeId: string): INodeTypeDescription | null {
		const node = getNode(nodeId);
		if (!node) return null;
		return (
			nodeTypesStore.getNodeType(node.type, node.typeVersion) ??
			nodeTypesStore.communityNodeType(node.type)?.nodeDescription ??
			null
		);
	}

	function computeIsTrigger(nodeId: string): boolean {
		const node = getNode(nodeId);
		if (!node) return false;
		return nodeTypesStore.isTriggerNode(node.type);
	}

	function computeSubtitle(nodeId: string): string {
		const node = getNode(nodeId);
		if (!node) return '';
		try {
			const nodeTypeDescription = computeNodeTypeDescription(nodeId);
			if (!nodeTypeDescription) return '';

			const subtitle = getNodeSubtitle(
				node,
				nodeTypeDescription,
				workflowDocumentStore.getWorkflowObjectAccessorSnapshot(),
			);
			if (subtitle === undefined) return '';
			// Subtitles that resolve to the "custom API call" placeholder are noise — hide them.
			if (subtitle.includes(CUSTOM_API_CALL_KEY)) return '';
			return subtitle;
		} catch {
			return '';
		}
	}

	function computeSimulatedNodeTypeDescription(nodeId: string): INodeTypeDescription | null {
		const node = getNode(nodeId);
		if (!node) return null;
		if (node.type !== SIMULATE_NODE_TYPE && node.type !== SIMULATE_TRIGGER_NODE_TYPE) return null;

		const icon = node.parameters?.icon as string;
		const iconValue = workflowDocumentStore
			.getExpressionHandler()
			.getSimpleParameterValue(node, icon, 'internal', {});
		if (iconValue && typeof iconValue === 'string') {
			return nodeTypesStore.getNodeType(iconValue) ?? null;
		}
		return null;
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

		const isTrigger = isTriggerByNodeId.get(nodeId)?.value ?? false;
		const nodeTypeDescription = nodeTypeDescriptionByNodeId.get(nodeId)?.value ?? null;
		if (!isTrigger || !nodeTypeDescription) return undefined;

		const triggerNodeName = executionStateStore.activeExecution?.triggerNode;
		// Count active (non-disabled) triggers; when ambiguous and the driving
		// trigger isn't named, suppress all tooltips.
		if (triggerNodeName === undefined) {
			let activeTriggerCount = 0;
			for (const [id] of isTriggerByNodeId) {
				const n = workflowDocumentStore.nodesById.get(id);
				if (!n) continue;
				if (isTriggerByNodeId.get(id)?.value && !n.disabled) {
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
		const pinned = getVisiblePinData(nodeId);
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
	// renders with the "has issues" affordance. Hard-error execution statuses
	// (crashed/error) win first — a pinned node that crashed still shows issues.
	// Otherwise pinned data clears issues (false), then validation errors, the
	// execution-issue map, and finally a last-task `.error` check.
	function computeHasIssues(nodeId: string): boolean {
		const node = getNode(nodeId);
		if (!node) return false;

		const status = executionStateStore.activeExecutionStatusByNodeId.get(nodeId)?.value ?? 'new';
		if (status === 'crashed' || status === 'error') return true;

		const pinned = getVisiblePinData(nodeId);
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

	function getVisiblePinData(nodeId: string) {
		const node = getNode(nodeId);
		if (!node) return undefined;
		if (executionStateStore.isExecutionDataDisplayed) {
			return executionStateStore.activeExecutionPinDataByNodeName[node.name];
		}
		return workflowDocumentStore.pinnedDataByNodeId.get(nodeId)?.value;
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
		const nodeType = nodeTypeDescriptionByNodeId.get(node.id)?.value ?? null;
		const simulated = simulatedNodeTypeDescriptionByNodeId.get(node.id)?.value ?? null;
		const iconSource = simulated ?? nodeType ?? node.type;
		const icon = getNodeIconSource(iconSource, node, workflowDocumentStore.getExpressionHandler());

		const isTrigger = isTriggerByNodeId.get(node.id)?.value ?? false;
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
				dirtiness: dirtinessByNodeId.get(node.id)?.value,
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

	function applyAddEntry(nodeId: string) {
		if (entryScopes.has(nodeId)) return;
		const scope = effectScope();
		scope.run(() => {
			nodeTypeDescriptionByNodeId.set(
				nodeId,
				structuralComputed(() => computeNodeTypeDescription(nodeId), isEqual),
			);
			isTriggerByNodeId.set(
				nodeId,
				structuralComputed(() => computeIsTrigger(nodeId)),
			);
			subtitleByNodeId.set(
				nodeId,
				structuralComputed(() => computeSubtitle(nodeId)),
			);
			simulatedNodeTypeDescriptionByNodeId.set(
				nodeId,
				structuralComputed(() => computeSimulatedNodeTypeDescription(nodeId), isEqual),
			);
			tooltipByNodeId.set(
				nodeId,
				structuralComputed(() => computeTooltip(nodeId)),
			);
			hasIssuesByNodeId.set(
				nodeId,
				structuralComputed(() => computeHasIssues(nodeId)),
			);
			// Per-node projection of `dirtinessByName` — one whole-workflow
			// computed that returns a fresh Record on every recompute (run data,
			// undo stack, parameter metadata). Reading it directly from the
			// render-type computeds would re-evaluate every entry on any of those
			// changes; this gate (default `Object.is` — values are enum-or-
			// undefined) confines that to entries whose node's value changed.
			// Registered before `renderTypeByNodeId`, which reads it.
			dirtinessByNodeId.set(
				nodeId,
				structuralComputed(() => {
					const node = getNode(nodeId);
					return node ? dirtinessByName.value[node.name] : undefined;
				}),
			);
			renderTypeByNodeId.set(
				nodeId,
				structuralComputed(() => computeRenderType(nodeId), isEqual),
			);
		});
		entryScopes.set(nodeId, () => scope.stop());
	}

	function applyRemoveEntry(nodeId: string) {
		entryScopes.get(nodeId)?.();
		entryScopes.delete(nodeId);
		nodeTypeDescriptionByNodeId.delete(nodeId);
		isTriggerByNodeId.delete(nodeId);
		subtitleByNodeId.delete(nodeId);
		simulatedNodeTypeDescriptionByNodeId.delete(nodeId);
		tooltipByNodeId.delete(nodeId);
		hasIssuesByNodeId.delete(nodeId);
		dirtinessByNodeId.delete(nodeId);
		renderTypeByNodeId.delete(nodeId);
	}

	function applyReconcileEntries(nodeIds: string[]) {
		const next = new Set(nodeIds);
		for (const old of entryScopes.keys()) {
			if (!next.has(old)) applyRemoveEntry(old);
		}
		for (const id of nodeIds) applyAddEntry(id);
	}

	let nodesChangeSubscription: { off: () => void } | undefined;
	if (typeof workflowDocumentStore.onNodesChange === 'function') {
		nodesChangeSubscription = workflowDocumentStore.onNodesChange((event: NodesChangeEvent) => {
			switch (event.action) {
				case CHANGE_ACTION.ADD: {
					const { node } = event.payload as NodeAddedPayload;
					applyAddEntry(node.id);
					break;
				}
				case CHANGE_ACTION.DELETE: {
					const payload = event.payload as NodeRemovedPayload;
					if (payload.id) applyRemoveEntry(payload.id);
					else applyReconcileEntries([]);
					break;
				}
				case CHANGE_ACTION.SET: {
					const { nodeIds } = event.payload as NodesSetPayload;
					applyReconcileEntries(nodeIds);
					break;
				}
			}
		});
	}

	const initialIds = workflowDocumentStore.nodesById;
	if (initialIds && typeof initialIds.keys === 'function') {
		applyReconcileEntries(Array.from(initialIds.keys()));
	}

	// Teardown. This composable is invoked once per document id inside a
	// caller-owned `effectScope` (see WorkflowCanvas.vue / useWorkflowDiff.ts).
	// When that scope stops — on document-id change or unmount — we remove the
	// `onNodesChange` subscription (otherwise the document store's event hook
	// keeps a closure referencing this instance's maps alive and keeps running
	// reconciliation) and stop every per-entry scope.
	onScopeDispose(() => {
		nodesChangeSubscription?.off();
		for (const stop of entryScopes.values()) stop();
		entryScopes.clear();
	});

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
		// All exposed as getters, mirroring the execution-state block below.
		// `pinnedDataByNodeName` requires it: pin mutations *replace* the
		// underlying ref's value (immutable-update pattern), and this setup
		// runs once per document id in an untracked scope — a direct capture
		// would be a permanently stale snapshot. The getter re-resolves through
		// the store on each access, so consumer computeds track the ref and
		// invalidate on pin/unpin. The by-id maps are stable containers today,
		// but getters keep the store passthroughs uniform and stay correct if
		// any later becomes resolver-backed.
		get nodeInputsByNodeId() {
			return workflowDocumentStore.nodeInputsByNodeId;
		},
		get nodeOutputsByNodeId() {
			return workflowDocumentStore.nodeOutputsByNodeId;
		},
		get pinnedDataByNodeName() {
			return workflowDocumentStore.pinnedDataByNodeName;
		},
		get pinnedDataByNodeId() {
			return workflowDocumentStore.pinnedDataByNodeId;
		},
		get validationErrorsByNodeId() {
			return workflowDocumentStore.validationErrorsByNodeId;
		},

		// --- node-type derivations (inlined) ---
		nodeTypeDescriptionByNodeId,
		isTriggerByNodeId,
		subtitleByNodeId,
		simulatedNodeTypeDescriptionByNodeId,

		// --- workflowExecutionState projections ---
		// All exposed as getters. Setup runs once per document id, but the
		// `active*` maps swap identity when the active/displayed execution
		// changes, so they must re-resolve on access to stay reactive. The
		// running / waiting-for-next maps are stable today, but keeping every
		// execution-state passthrough a getter is uniform and stays correct if
		// any later becomes resolver-backed — and a getter over a stable ref
		// behaves identically to capturing it. (Consumers read these inside
		// their own computeds and none destructure them.)
		get executionIssuesByNodeName() {
			return executionStateStore.activeExecutionIssuesByNodeName;
		},
		get executionPinDataByNodeName() {
			return executionStateStore.activeExecutionPinDataByNodeName;
		},
		get isExecutionDataDisplayed() {
			return executionStateStore.isExecutionDataDisplayed;
		},
		get executionStatusByNodeId() {
			return executionStateStore.activeExecutionStatusByNodeId;
		},
		get executionRunDataByNodeId() {
			return executionStateStore.activeExecutionRunDataByNodeId;
		},
		get executionRunDataOutputMapByNodeId() {
			return executionStateStore.activeExecutionRunDataOutputMapByNodeId;
		},
		get executionWaitingByNodeId() {
			return executionStateStore.activeExecutionWaitingByNodeId;
		},
		get executionRunningByNodeId() {
			return executionStateStore.executionRunningByNodeId;
		},
		get executionWaitingForNextByNodeId() {
			return executionStateStore.executionWaitingForNextByNodeId;
		},

		// --- multi-store fusion projections ---
		tooltipByNodeId,
		hasIssuesByNodeId,
		renderTypeByNodeId,
		additionalPropertiesByNodeId,
	};
}
