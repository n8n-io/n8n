import { computed, effectScope, shallowReactive, type ComputedRef, type ShallowRef } from 'vue';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import isEqual from 'lodash/isEqual';
import type { INodeUi, WorkflowValidationIssue } from '@/Interface';
import type { IConnections, INodeConnections, INodeIssues, INode } from 'n8n-workflow';
import { getReachableNodeNames, onlySuppliesDisabledNodes } from 'n8n-workflow';
import { CHANGE_ACTION } from './types';
import type {
	NodeAddedPayload,
	NodeRemovedPayload,
	NodesChangeEvent,
	NodesSetPayload,
} from './useWorkflowDocumentNodes';

export type WorkflowDocumentNodesIssuesDeps = {
	allNodes: ComputedRef<INodeUi[]>;
	outgoingConnectionsByNodeName: (nodeName: string) => INodeConnections;
	incomingConnectionsByNodeName: (nodeName: string) => INodeConnections;
	connectionsBySourceNode: ComputedRef<IConnections>;
	connectionsByDestinationNode: ComputedRef<IConnections>;
	/** Whether this node starts a run. */
	isTriggerLike: (node: INodeUi) => boolean;
	/** Whether this node can produce a `main` output. Answers `true` when unsure. */
	canOutputMain: (node: INodeUi) => boolean;
	nodesById: ShallowRef<Map<string, INodeUi>>;
	onNodesChange: (cb: (event: NodesChangeEvent) => void) => void;
	nodeIssuesToString: (issues: INodeIssues, node?: INode) => string[];
};

/**
 * Whether anything is actually wired to this node.
 *
 * A connection type can outlive its links: deleting the last connection leaves
 * `{ ai_outputParser: [[]] }` behind, so counting the type keys reports a node
 * wired to nothing as connected. Count the endpoints instead.
 */
function hasAnyConnection(connections: INodeConnections): boolean {
	return Object.values(connections).some((outputs) =>
		(outputs ?? []).some((targets) => (targets ?? []).length > 0),
	);
}

export function useWorkflowDocumentNodesIssues(deps: WorkflowDocumentNodesIssuesDeps) {
	/**
	 * Nodes that stop the workflow being published, which is also what the
	 * blocked-publish message counts, so the button and its reason always agree.
	 *
	 * Mirrors the server (`workflow-validation.service.ts`): a node only blocks if
	 * a trigger can reach it, and an unmet input only blocks if something that
	 * runs will ask for it. A node no run can reach cannot break one, so it must
	 * not stop publishing. It keeps its own warning on the canvas either way,
	 * which is what tells the user it is still unfinished.
	 */
	const publishBlockingNodes = computed<INodeUi[]>(() => {
		const nodes = deps.allNodes.value;
		const reachable = getReachableNodeNames(
			nodes,
			deps.connectionsBySourceNode.value,
			deps.connectionsByDestinationNode.value,
			deps.isTriggerLike,
		);

		return nodes.filter((node) => {
			if (node.disabled) return false;

			// Execution issues are runtime errors, not configuration problems.
			const { execution: _, ...configIssues } = node.issues ?? {};
			const issueKinds = Object.keys(configIssues);
			if (issueKinds.length === 0) return false;

			if (!reachable.has(node.name)) return false;

			// An unmet input only matters once something asks for it. Credential and
			// parameter issues belong to the node itself, so those block as soon as a
			// run can reach it.
			if (
				issueKinds.every((kind) => kind === 'input') &&
				!deps.isTriggerLike(node) &&
				onlySuppliesDisabledNodes(
					node,
					deps.connectionsBySourceNode.value,
					nodes,
					deps.canOutputMain,
				)
			) {
				return false;
			}

			return true;
		});
	});

	const hasPublishBlockingIssues = computed(() => publishBlockingNodes.value.length > 0);

	const nodeValidationIssues = computed(() => {
		const issues: WorkflowValidationIssue[] = [];

		const isStringOrStringArray = (value: unknown): value is string | string[] =>
			typeof value === 'string' || Array.isArray(value);

		deps.allNodes.value.forEach((node) => {
			if (!node.issues || node.disabled) return;

			const isConnected =
				hasAnyConnection(deps.outgoingConnectionsByNodeName(node.name)) ||
				hasAnyConnection(deps.incomingConnectionsByNodeName(node.name));

			if (!isConnected) return;

			Object.entries(node.issues).forEach(([issueType, issueValue]) => {
				if (!issueValue) return;

				if (typeof issueValue === 'object' && !Array.isArray(issueValue)) {
					Object.entries(issueValue).forEach(([_key, value]) => {
						if (value) {
							issues.push({
								node: node.name,
								type: issueType,
								value,
							});
						}
					});
				} else {
					issues.push({
						node: node.name,
						type: issueType,
						value: isStringOrStringArray(issueValue) ? issueValue : String(issueValue),
					});
				}
			});
		});

		return issues;
	});

	function formatNodeIssueMessage(issue: string | string[]): string {
		if (Array.isArray(issue)) {
			return issue.join(', ').replace(/\.$/, '');
		}

		return String(issue);
	}

	// Per-node-id validation errors map. See useWorkflowDocumentRenderData
	// for an explanation of the shallowReactive + structuralComputed pattern.
	const validationErrorsByNodeId = shallowReactive(new Map<string, ComputedRef<string[]>>());
	const scopes = new Map<string, () => void>();

	function computeValidationErrors(nodeId: string): string[] {
		const node = deps.nodesById.value.get(nodeId);
		if (!node?.issues) return [];
		return deps.nodeIssuesToString(node.issues, node);
	}

	function applyAddEntry(nodeId: string) {
		if (scopes.has(nodeId)) return;
		const scope = effectScope();
		scope.run(() => {
			validationErrorsByNodeId.set(
				nodeId,
				structuralComputed(() => computeValidationErrors(nodeId), isEqual),
			);
		});
		scopes.set(nodeId, () => scope.stop());
	}

	function applyRemoveEntry(nodeId: string) {
		scopes.get(nodeId)?.();
		scopes.delete(nodeId);
		validationErrorsByNodeId.delete(nodeId);
	}

	function applyReconcileEntries(nodeIds: string[]) {
		const nextIds = new Set(nodeIds);
		for (const oldId of scopes.keys()) {
			if (!nextIds.has(oldId)) applyRemoveEntry(oldId);
		}
		for (const id of nodeIds) applyAddEntry(id);
	}

	deps.onNodesChange((event) => {
		switch (event.action) {
			case CHANGE_ACTION.ADD: {
				const { node } = event.payload as NodeAddedPayload;
				applyAddEntry(node.id);
				break;
			}
			case CHANGE_ACTION.DELETE: {
				const payload = event.payload as NodeRemovedPayload;
				if (payload.id) {
					applyRemoveEntry(payload.id);
				} else {
					applyReconcileEntries([]);
				}
				break;
			}
			case CHANGE_ACTION.SET: {
				const { nodeIds } = event.payload as NodesSetPayload;
				applyReconcileEntries(nodeIds);
				break;
			}
		}
	});

	applyReconcileEntries(Array.from(deps.nodesById.value.keys()));

	return {
		publishBlockingNodes,
		hasPublishBlockingIssues,
		nodeValidationIssues,
		validationErrorsByNodeId,
		formatNodeIssueMessage,
	};
}
