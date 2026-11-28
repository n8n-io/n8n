import { SPLIT_IN_BATCHES_NODE_TYPE } from '@/app/constants';
import {
	AddConnectionCommand,
	AddNodeCommand,
	BulkCommand,
	EnableNodeToggleCommand,
	RemoveConnectionCommand,
	RemoveNodeCommand,
	type Undoable,
} from '@/app/models/history';
import { useHistoryStore } from '@/app/stores/history.store';
import {
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	CanvasNodeDirtiness,
	type CanvasNodeDirtinessType,
} from '@/features/workflows/canvas/canvas.types';
import type { INodeUi } from '@/Interface';
import type { INodeConnections, NodeConnectionType, NodeInputConnections } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

/**
 * Does the command make the given node dirty?
 */
function shouldCommandMarkDirty(
	command: Undoable,
	nodeName: string,
	siblingCommands: Undoable[],
	getIncomingConnections: (nodeName: string) => INodeConnections,
	getOutgoingConnectors: (nodeName: string) => INodeConnections,
): boolean {
	if (command instanceof BulkCommand) {
		return command.commands.some((cmd) =>
			shouldCommandMarkDirty(
				cmd,
				nodeName,
				command.commands,
				getIncomingConnections,
				getOutgoingConnectors,
			),
		);
	}

	if (command instanceof AddConnectionCommand) {
		return command.connectionData[1]?.node === nodeName;
	}

	if (command instanceof RemoveConnectionCommand) {
		const [from, to] = command.connectionData;

		if (to.node !== nodeName) {
			return false;
		}

		// the connection was removed along with its source node
		return siblingCommands.some(
			(sibling) => sibling instanceof RemoveNodeCommand && sibling.node.name === from.node,
		);
	}

	const incomingNodes = Object.values(getIncomingConnections(nodeName))
		.flat()
		.flat()
		.filter((connection) => connection !== null)
		.map((connection) => connection.node);

	if (command instanceof AddNodeCommand) {
		return incomingNodes.includes(command.node.name);
	}

	if (command instanceof EnableNodeToggleCommand) {
		return (
			incomingNodes.includes(command.nodeName) &&
			(command.newState ||
				Object.keys(getOutgoingConnectors(command.nodeName)).some(
					(type) => (type as NodeConnectionType) !== NodeConnectionTypes.Main,
				))
		);
	}

	return false;
}

function getSplitInBatchesDoneOutputIndex(node: INodeUi | undefined): number | undefined {
	if (node?.type !== SPLIT_IN_BATCHES_NODE_TYPE) {
		return undefined;
	}

	// Only v3+ exposes `done` at output 0. v1 has one output. For v2, `done` is at
	// output 1, so `findStartNodes` in core checks output 0, finds it empty on the
	// final run, and re-runs the loop.
	return node.typeVersion >= 3 ? 0 : undefined;
}

function getMainOutputGroups(connections: INodeConnections): NodeInputConnections {
	return connections[NodeConnectionTypes.Main] ?? [];
}

function getMainOutgoingTargets(connections: INodeConnections): string[] {
	const targets: string[] = [];

	for (const group of getMainOutputGroups(connections)) {
		for (const { node } of group ?? []) {
			targets.push(node);
		}
	}

	return targets;
}

/**
 * Returns every strongly connected component that contains a Main cycle (Tarjan's algorithm).
 */
function findCyclicStronglyConnectedComponents(
	nodeNames: string[],
	getOutgoingConnections: (nodeName: string) => INodeConnections,
): Array<Set<string>> {
	let nextIndex = 0;
	const indexByNode = new Map<string, number>();
	const onStack = new Set<string>();
	const stack: string[] = [];
	const cyclicComponents: Array<Set<string>> = [];

	function strongConnect(nodeName: string): number {
		const index = nextIndex++;
		let lowLink = index;
		indexByNode.set(nodeName, index);
		const stackIndex = stack.length;
		stack.push(nodeName);
		onStack.add(nodeName);

		let hasSelfLoop = false;

		for (const next of getMainOutgoingTargets(getOutgoingConnections(nodeName))) {
			if (next === nodeName) {
				hasSelfLoop = true;
			}

			const nextIndexValue = indexByNode.get(next);
			if (nextIndexValue === undefined) {
				lowLink = Math.min(lowLink, strongConnect(next));
			} else if (onStack.has(next)) {
				lowLink = Math.min(lowLink, nextIndexValue);
			}
		}

		if (lowLink === index) {
			const component = new Set<string>();
			for (const member of stack.splice(stackIndex)) {
				onStack.delete(member);
				component.add(member);
			}

			if (component.size > 1 || hasSelfLoop) {
				cyclicComponents.push(component);
			}
		}

		return lowLink;
	}

	for (const nodeName of nodeNames) {
		if (!indexByNode.has(nodeName)) {
			strongConnect(nodeName);
		}
	}

	return cyclicComponents;
}

/**
 * Returns every node that executes inside `component` or on a branch that leaves
 * `component` through anything other than an exiting SplitInBatches `done` output.
 *
 * Dead-end branches inside a loop body run once per iteration, so editing them must
 * still mark the loop entry node dirty. Only branches reached exclusively through a
 * completed SplitInBatches `done` output stay outside the loop scope.
 */
function getLoopScope(
	component: Set<string>,
	nodesByName: Map<string, INodeUi>,
	getOutgoingConnections: (nodeName: string) => INodeConnections,
): Set<string> {
	const scope = new Set<string>(component);
	const stack: string[] = [];

	for (const nodeName of component) {
		const mainOutputs = getMainOutputGroups(getOutgoingConnections(nodeName));
		const doneOutputIndex = getSplitInBatchesDoneOutputIndex(nodesByName.get(nodeName));

		for (let outputIndex = 0; outputIndex < mainOutputs.length; outputIndex++) {
			const group = mainOutputs[outputIndex];
			if (!group) {
				continue;
			}

			// Ignore a SplitInBatches `done` output only when none of its targets feed back
			// into the same cycle (an inner loop's `done` output continues the outer loop).
			if (outputIndex === doneOutputIndex && group.every(({ node }) => !component.has(node))) {
				continue;
			}

			for (const { node } of group) {
				if (!scope.has(node)) {
					scope.add(node);
					stack.push(node);
				}
			}
		}
	}

	for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
		for (const next of getMainOutgoingTargets(getOutgoingConnections(current))) {
			if (!scope.has(next)) {
				scope.add(next);
				stack.push(next);
			}
		}
	}

	return scope;
}

/**
 * Determines the subgraph that is affected by changes made after the last (partial) execution.
 *
 * Takes the workflow document id (a value, ref, or getter) explicitly so it
 * can resolve the document store directly via `useWorkflowDocumentStore(id)`
 * instead of relying on `inject()`, which only resolves inside the
 * `WorkflowLayout` tree. This makes the composable safe to call from
 * off-layout contexts (e.g. the workflow-diff modal's `watchEffect`) without
 * the try/catch fallback `useWorkflowDocumentRenderData` previously needed.
 *
 * Passing a reactive id lets callers bound to a swappable injected document
 * store (e.g. push handlers that replace the current document while the host
 * component stays mounted) re-resolve the store reactively. The internal
 * computeds are built once and recompute against the active document, so the
 * dirtiness tracks the live document without callers having to recreate the
 * composable inside their own `computed`.
 */
export function useNodeDirtiness(workflowDocumentId: MaybeRefOrGetter<WorkflowDocumentId>) {
	const historyStore = useHistoryStore();

	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(toValue(workflowDocumentId)),
	);
	const executionStateStore = computed(() =>
		useWorkflowExecutionStateStore(toValue(workflowDocumentId)),
	);

	function getIncomingConnections(nodeName: string): INodeConnections {
		return workflowDocumentStore.value.incomingConnectionsByNodeName(nodeName);
	}

	function getOutgoingConnections(nodeName: string): INodeConnections {
		return workflowDocumentStore.value.outgoingConnectionsByNodeName(nodeName);
	}

	function getParentSubNodes(nodeName: string) {
		return Object.entries(getIncomingConnections(nodeName))
			.filter(([type]) => (type as NodeConnectionType) !== NodeConnectionTypes.Main)
			.flatMap(([, typeConnections]) => typeConnections.flat().filter((conn) => conn !== null));
	}

	function getDirtinessByParametersUpdate(
		nodeName: string,
		after: number,
	): CanvasNodeDirtinessType | undefined {
		if ((workflowDocumentStore.value.getParametersLastUpdate(nodeName) ?? 0) > after) {
			return CanvasNodeDirtiness.PARAMETERS_UPDATED;
		}

		for (const connection of getParentSubNodes(nodeName)) {
			if (getDirtinessByParametersUpdate(connection.node, after) !== undefined) {
				return CanvasNodeDirtiness.UPSTREAM_DIRTY;
			}
		}

		return undefined;
	}

	function getDirtinessByConnectionsUpdate(
		nodeName: string,
		after: number,
	): CanvasNodeDirtinessType | undefined {
		for (let i = historyStore.undoStack.length - 1; i >= 0; i--) {
			const command = historyStore.undoStack[i];

			if (command.getTimestamp() < after) {
				break;
			}

			if (
				shouldCommandMarkDirty(
					command,
					nodeName,
					[],
					getIncomingConnections,
					getOutgoingConnections,
				)
			) {
				return CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED;
			}
		}

		for (const connection of getParentSubNodes(nodeName)) {
			if (getDirtinessByConnectionsUpdate(connection.node, after) !== undefined) {
				return CanvasNodeDirtiness.UPSTREAM_DIRTY;
			}
		}

		return undefined;
	}

	/**
	 * Depth of node is defined as the minimum distance (number of connections) from the trigger node
	 */
	const depthByName = computed(() => {
		const depth = new Map<string, number>();
		let frontier: string[] = [];

		for (const node of workflowDocumentStore.value.allNodes) {
			if (Object.keys(getIncomingConnections(node.name)).length === 0 && !depth.has(node.name)) {
				depth.set(node.name, 0);
				frontier.push(node.name);
			}
		}

		for (let current = 1; frontier.length > 0; current++) {
			const next: string[] = [];

			for (const nodeName of frontier) {
				for (const node of getMainOutgoingTargets(getOutgoingConnections(nodeName))) {
					if (!depth.has(node)) {
						depth.set(node, current);
						next.push(node);
					}
				}
			}

			frontier = next;
		}

		return depth;
	});

	const loopEntryNodesByNodeName = computed(() => {
		const allNodes = workflowDocumentStore.value.allNodes;
		const cyclicComponents = findCyclicStronglyConnectedComponents(
			allNodes.map((node) => node.name),
			getOutgoingConnections,
		);

		if (cyclicComponents.length === 0) {
			return new Map<string, string[]>();
		}

		const nodesByName = new Map(allNodes.map((node) => [node.name, node]));
		const depth = depthByName.value;
		const loopScopes: Array<{ entryNodeName: string; nodes: Set<string> }> = [];

		for (const component of cyclicComponents) {
			let entryNodeName: string | undefined;
			let minDepth = Number.MAX_SAFE_INTEGER;

			for (const member of component) {
				const memberDepth = depth.get(member);
				if (memberDepth && memberDepth < minDepth) {
					minDepth = memberDepth;
					entryNodeName = member;
				}
			}

			if (!entryNodeName) {
				continue;
			}

			loopScopes.push({
				entryNodeName,
				nodes: getLoopScope(component, nodesByName, getOutgoingConnections),
			});
		}

		const entriesByNode = new Map<string, string[]>();

		for (const scope of loopScopes) {
			// Skip loops whose entry node is inside an outer loop scope, since marking the outer
			// loop entry already invalidates the nested loop.
			const isCoveredByOuterLoop = loopScopes.some(
				(other) => other !== scope && other.nodes.has(scope.entryNodeName),
			);

			if (isCoveredByOuterLoop) {
				continue;
			}

			for (const nodeName of scope.nodes) {
				const entries = entriesByNode.get(nodeName);
				if (entries) {
					entries.push(scope.entryNodeName);
				} else {
					entriesByNode.set(nodeName, [scope.entryNodeName]);
				}
			}
		}

		return entriesByNode;
	});

	const dirtinessByName = computed(() => {
		const dirtiness: Record<string, CanvasNodeDirtinessType | undefined> = {};
		const runDataByNode = executionStateStore.value.activeExecutionRunData ?? {};

		function setDirtiness(nodeName: string, value: CanvasNodeDirtinessType) {
			dirtiness[nodeName] = dirtiness[nodeName] ?? value;

			for (const loopEntryNodeName of loopEntryNodesByNodeName.value.get(nodeName) ?? []) {
				// If a node in a loop becomes dirty, the first node in the loop should also be dirty
				dirtiness[loopEntryNodeName] =
					dirtiness[loopEntryNodeName] ?? CanvasNodeDirtiness.UPSTREAM_DIRTY;
			}
		}

		for (const [nodeName, runData] of Object.entries(runDataByNode)) {
			const runAt = runData[0]?.startTime ?? 0;

			if (!runAt) {
				continue;
			}

			const parameterUpdate = getDirtinessByParametersUpdate(nodeName, runAt);

			if (parameterUpdate) {
				setDirtiness(nodeName, parameterUpdate);
				continue;
			}

			const connectionUpdate = getDirtinessByConnectionsUpdate(nodeName, runAt);

			if (connectionUpdate) {
				setDirtiness(nodeName, connectionUpdate);
				continue;
			}

			const hasInputPinnedDataChanged = Object.values(getIncomingConnections(nodeName))
				.flat()
				.flat()
				.filter((connection) => connection !== null)
				.some((connection) => {
					const pinnedDataLastUpdatedAt =
						workflowDocumentStore.value.getPinnedDataLastUpdate(connection.node) ?? 0;

					return pinnedDataLastUpdatedAt > runAt;
				});

			if (hasInputPinnedDataChanged) {
				setDirtiness(nodeName, CanvasNodeDirtiness.PINNED_DATA_UPDATED);
				continue;
			}

			const pinnedDataLastRemovedAt =
				workflowDocumentStore.value.getPinnedDataLastRemovedAt(nodeName) ?? 0;

			if (pinnedDataLastRemovedAt > runAt) {
				setDirtiness(nodeName, CanvasNodeDirtiness.PINNED_DATA_UPDATED);
				continue;
			}
		}

		return dirtiness;
	});

	return { dirtinessByName };
}
