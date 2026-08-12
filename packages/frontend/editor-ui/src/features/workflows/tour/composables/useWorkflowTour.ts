import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import type { CanvasNodeData } from '@/features/workflows/canvas/canvas.types';
import type { CanvasNodeGroupView } from '@/features/workflows/canvas/composables/useCanvasNodeGroupView';
import type { Dimensions, GraphNode, ViewportTransform } from '@vue-flow/core';
import {
	getChildNodes,
	mapConnectionsByDestination,
	NodeConnectionTypes,
	type IConnections,
} from 'n8n-workflow';
import { computed, nextTick, onBeforeUnmount, watch } from 'vue';
import { useWorkflowTourStore } from '../workflowTour.store';
import { readWorkflowNodeDescriptions } from '../workflowTour.utils';
import type {
	WorkflowTourCardPlacement,
	WorkflowNodeDescription,
	WorkflowNodeDescriptions,
	WorkflowTourGroup,
	WorkflowTourNode,
	WorkflowTourStep,
} from '../workflowTour.types';

const CARD_WIDTH = 360;
const ESTIMATED_CARD_HEIGHT = 320;
const EDGE_MARGIN = 16;
const NODE_GAP = 16;
const MAX_PENDING_TOUR_CANVAS_SETTLE_FRAMES = 60;

interface BuildWorkflowTourStepsInput {
	nodes: WorkflowTourNode[];
	connections: IConnections;
	nodeDescriptions?: WorkflowNodeDescriptions;
	triggerNodeIds?: string[];
	groups?: WorkflowTourGroup[];
	nodeIdToGroupId?: ReadonlyMap<string, string>;
}

interface UseWorkflowTourDeps {
	findNode: (id: string) => GraphNode<CanvasNodeData> | undefined;
	getViewport: () => ViewportTransform;
	getDimensions: () => Dimensions;
	setViewport: (
		viewport: ViewportTransform,
		options?: { duration?: number; interpolate?: 'linear' | 'smooth' },
	) => Promise<unknown> | undefined;
	clearSelection: () => void;
	nodeGroupView: CanvasNodeGroupView | null;
}

function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(value, max));
}

function hasDescription(description: WorkflowNodeDescription | undefined) {
	return typeof description?.summary === 'string' && description.summary.trim().length > 0;
}

async function waitForAnimationFrame() {
	await new Promise<void>((resolve) => {
		if (typeof requestAnimationFrame !== 'function') {
			resolve();
			return;
		}
		requestAnimationFrame(() => resolve());
	});
}

async function waitForCanvasDimensions(getDimensions: () => Dimensions) {
	for (let frame = 0; frame < MAX_PENDING_TOUR_CANVAS_SETTLE_FRAMES; frame++) {
		const dimensions = getDimensions();
		if (dimensions.width > 0 && dimensions.height > 0) return true;

		await nextTick();
		await waitForAnimationFrame();
	}

	return false;
}

export function buildWorkflowTourSteps({
	nodes,
	connections,
	nodeDescriptions = {},
	triggerNodeIds = [],
	groups = [],
	nodeIdToGroupId,
}: BuildWorkflowTourStepsInput): WorkflowTourStep[] {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const nodeByName = new Map(nodes.map((node) => [node.name, node]));
	const nodeOrder = new Map(nodes.map((node, index) => [node.name, index]));
	const groupById = new Map(groups.map((group) => [group.id, group]));
	const connectionsByDestination = mapConnectionsByDestination(connections);
	const emittedNodeIds = new Set<string>();
	const visitedMainNodeNames = new Set<string>();
	const steps: WorkflowTourStep[] = [];

	function getNodeOrder(name: string) {
		return nodeOrder.get(name) ?? Number.MAX_SAFE_INTEGER;
	}

	function hasIncomingMainConnection(nodeName: string) {
		return (
			connectionsByDestination[nodeName]?.[NodeConnectionTypes.Main]?.some(
				(connectionsByInput) => (connectionsByInput?.length ?? 0) > 0,
			) ?? false
		);
	}

	function hasOutgoingNonMainConnection(nodeName: string) {
		const nodeConnections = connections[nodeName];
		if (!nodeConnections) return false;

		return Object.keys(nodeConnections).some((type) => type !== NodeConnectionTypes.Main);
	}

	function getIncomingNonMainSourceNames(nodeName: string) {
		const incomingConnections = connectionsByDestination[nodeName];
		if (!incomingConnections) return [];

		const sourceNames = new Set<string>();
		for (const [type, connectionsByInput] of Object.entries(incomingConnections)) {
			if (type === NodeConnectionTypes.Main) continue;
			for (const connectionsAtIndex of connectionsByInput) {
				for (const connection of connectionsAtIndex ?? []) {
					sourceNames.add(connection.node);
				}
			}
		}

		return [...sourceNames].sort((a, b) => getNodeOrder(a) - getNodeOrder(b));
	}

	function emitStep(node: WorkflowTourNode) {
		if (emittedNodeIds.has(node.id)) return;

		const description = nodeDescriptions[node.id];
		if (!hasDescription(description)) return;

		const groupId = nodeIdToGroupId?.get(node.id);
		const group = groupId ? groupById.get(groupId) : undefined;

		steps.push({
			nodeId: node.id,
			nodeName: node.name,
			description,
			...(group ? { groupId: group.id, groupName: group.name } : {}),
		});
		emittedNodeIds.add(node.id);
	}

	function emitNodeAndIncomingSubNodes(node: WorkflowTourNode) {
		emitStep(node);

		for (const sourceName of getIncomingNonMainSourceNames(node.name)) {
			const subNode = nodeByName.get(sourceName);
			if (subNode) emitStep(subNode);
		}
	}

	function directMainChildren(nodeName: string) {
		return getChildNodes(connections, nodeName, NodeConnectionTypes.Main, 1)
			.reverse()
			.map((childName) => nodeByName.get(childName))
			.filter(isDefined);
	}

	const triggerNodes = triggerNodeIds.map((nodeId) => nodeById.get(nodeId)).filter(isDefined);
	const startNodes =
		triggerNodes.length > 0
			? triggerNodes
			: nodes.filter(
					(node) =>
						!hasIncomingMainConnection(node.name) && !hasOutgoingNonMainConnection(node.name),
				);

	const queue = [...startNodes];
	for (let index = 0; index < queue.length; index++) {
		const node = queue[index];
		if (visitedMainNodeNames.has(node.name)) continue;

		visitedMainNodeNames.add(node.name);
		emitNodeAndIncomingSubNodes(node);

		for (const child of directMainChildren(node.name)) {
			if (!visitedMainNodeNames.has(child.name)) {
				queue.push(child);
			}
		}
	}

	for (const node of nodes) {
		if (!hasOutgoingNonMainConnection(node.name)) {
			emitNodeAndIncomingSubNodes(node);
		}
	}

	for (const node of nodes) {
		emitStep(node);
	}

	return steps;
}

export function useWorkflowTour(deps: UseWorkflowTourDeps) {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const setupPanelStore = useSetupPanelStore();
	const tourStore = useWorkflowTourStore();

	let groupSnapshot: string[] | null = null;
	let stepToken = 0;
	let pendingTourToken = 0;

	const steps = computed(() =>
		buildWorkflowTourSteps({
			nodes: workflowDocumentStore.value.allNodes,
			connections: workflowDocumentStore.value.connectionsBySourceNode,
			nodeDescriptions: readWorkflowNodeDescriptions(
				workflowDocumentStore.value.meta,
				workflowDocumentStore.value.allNodes.map((node) => node.id),
			),
			triggerNodeIds: workflowDocumentStore.value.workflowTriggerNodes.map((node) => node.id),
			groups: workflowDocumentStore.value.allGroups,
			nodeIdToGroupId: workflowDocumentStore.value.nodeIdToGroupId,
		}),
	);

	const totalSteps = computed(() => steps.value.length);
	const currentStep = computed(() => steps.value[tourStore.currentStepIndex]);
	const canStart = computed(() => totalSteps.value > 0 && !tourStore.isActive);
	const isLastStep = computed(() => tourStore.currentStepIndex >= totalSteps.value - 1);

	function centerNode(node: GraphNode<CanvasNodeData>) {
		const viewport = deps.getViewport();
		const dimensions = deps.getDimensions();
		const width = node.dimensions?.width ?? 0;
		const height = node.dimensions?.height ?? 0;

		void deps.setViewport(
			{
				x: dimensions.width / 2 - (node.position.x + width / 2) * viewport.zoom,
				y: dimensions.height / 2 - (node.position.y + height / 2) * viewport.zoom,
				zoom: viewport.zoom,
			},
			{ duration: 200, interpolate: 'linear' },
		);
	}

	async function enterStep(step: WorkflowTourStep | undefined) {
		const token = ++stepToken;
		if (!step) return;

		const groupId = step.groupId;
		if (deps.nodeGroupView) {
			for (const expandedGroupId of deps.nodeGroupView.getExpandedOrder()) {
				if (expandedGroupId !== groupId) {
					deps.nodeGroupView.setGroupExpanded(expandedGroupId, false);
				}
			}
			if (groupId) {
				deps.nodeGroupView.setGroupExpanded(groupId, true);
			}
		}

		setupPanelStore.setHighlightedNodes([step.nodeId]);

		await nextTick();
		await waitForAnimationFrame();
		if (token !== stepToken || !tourStore.isActive) return;

		const node = deps.findNode(step.nodeId);
		if (node) centerNode(node);
	}

	function start() {
		if (totalSteps.value === 0) return;
		groupSnapshot = deps.nodeGroupView?.getExpandedOrder() ?? null;
		deps.clearSelection();
		tourStore.start();
	}

	function exit() {
		stepToken++;
		setupPanelStore.clearHighlightedNodes();
		if (groupSnapshot && deps.nodeGroupView) {
			deps.nodeGroupView.restoreExpandedOrder(groupSnapshot);
		}
		groupSnapshot = null;
		tourStore.exit();
	}

	function next() {
		if (isLastStep.value) {
			exit();
			return;
		}
		tourStore.setCurrentStepIndex(tourStore.currentStepIndex + 1);
	}

	function prev() {
		if (tourStore.currentStepIndex === 0) return;
		tourStore.setCurrentStepIndex(tourStore.currentStepIndex - 1);
	}

	/** Jump directly to the step for a node, e.g. when it is clicked mid-tour. */
	function goToNode(nodeId: string) {
		if (!tourStore.isActive) return false;
		const index = steps.value.findIndex((step) => step.nodeId === nodeId);
		if (index === -1) return false;
		tourStore.setCurrentStepIndex(index);
		return true;
	}

	const cardPlacement = computed<WorkflowTourCardPlacement | null>(() => {
		const step = currentStep.value;
		if (!tourStore.isActive || !step) return null;

		const node = deps.findNode(step.nodeId);
		if (!node) return null;

		const viewport = deps.getViewport();
		const dimensions = deps.getDimensions();
		const nodeWidth = node.dimensions?.width ?? 0;
		const nodeHeight = node.dimensions?.height ?? 0;
		const nodeScreenX = node.position.x * viewport.zoom + viewport.x;
		const nodeScreenY = node.position.y * viewport.zoom + viewport.y;
		const nodeScreenWidth = nodeWidth * viewport.zoom;
		const nodeScreenHeight = nodeHeight * viewport.zoom;
		const nodeCenterY = nodeScreenY + nodeScreenHeight / 2;
		const maxTop = Math.max(EDGE_MARGIN, dimensions.height - ESTIMATED_CARD_HEIGHT - EDGE_MARGIN);

		const rightLeft = nodeScreenX + nodeScreenWidth + NODE_GAP;
		const leftLeft = nodeScreenX - CARD_WIDTH - NODE_GAP;
		const hasRightSpace = rightLeft + CARD_WIDTH <= dimensions.width - EDGE_MARGIN;
		const hasLeftSpace = leftLeft >= EDGE_MARGIN;
		const side = hasRightSpace || !hasLeftSpace ? 'right' : 'left';
		const unclampedLeft = side === 'right' ? rightLeft : leftLeft;
		const left = clamp(unclampedLeft, EDGE_MARGIN, dimensions.width - CARD_WIDTH - EDGE_MARGIN);
		const top = clamp(nodeCenterY - ESTIMATED_CARD_HEIGHT / 2, EDGE_MARGIN, maxTop);

		return {
			left,
			top,
			maxHeight: Math.max(220, dimensions.height - EDGE_MARGIN * 2),
			arrowTop: clamp(nodeCenterY - top, 24, ESTIMATED_CARD_HEIGHT - 24),
			side,
		};
	});

	watch(
		() => [tourStore.isActive, currentStep.value] as const,
		([isActive, step]) => {
			if (!isActive) return;
			if (!step) {
				exit();
				return;
			}
			void enterStep(step);
		},
		{ immediate: true },
	);

	watch(totalSteps, (count) => {
		if (!tourStore.isActive) return;
		if (count === 0) {
			exit();
			return;
		}
		if (tourStore.currentStepIndex >= count) {
			tourStore.setCurrentStepIndex(count - 1);
		}
	});

	watch(
		() =>
			[
				tourStore.pendingWorkflowId,
				workflowDocumentStore.value.workflowId,
				totalSteps.value,
			] as const,
		async ([pendingWorkflowId, workflowId, count]) => {
			if (
				!pendingWorkflowId ||
				pendingWorkflowId !== workflowId ||
				count === 0 ||
				tourStore.isActive
			) {
				return;
			}

			const token = ++pendingTourToken;
			await nextTick();
			const canvasReady = await waitForCanvasDimensions(deps.getDimensions);
			if (!canvasReady || token !== pendingTourToken) return;
			if (
				tourStore.pendingWorkflowId !== pendingWorkflowId ||
				workflowDocumentStore.value.workflowId !== pendingWorkflowId ||
				totalSteps.value === 0 ||
				tourStore.isActive
			) {
				return;
			}

			const consumedWorkflowId = tourStore.consumePendingTour();
			if (consumedWorkflowId !== pendingWorkflowId) return;

			start();
		},
		{ immediate: true, flush: 'post' },
	);

	onBeforeUnmount(() => {
		pendingTourToken++;
		if (tourStore.isActive) {
			exit();
		}
	});

	return {
		steps,
		currentStep,
		totalSteps,
		canStart,
		isLastStep,
		cardPlacement,
		start,
		next,
		prev,
		goToNode,
		exit,
	};
}
