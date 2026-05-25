import { computed, effectScope, shallowReactive, type ComputedRef, type ShallowRef } from 'vue';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import isEqual from 'lodash/isEqual';
import type { INodeUi, WorkflowValidationIssue } from '@/Interface';
import type { INodeConnections, INodeIssues, INode } from 'n8n-workflow';
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
	nodesById: ShallowRef<Map<string, INodeUi>>;
	onNodesChange: (cb: (event: NodesChangeEvent) => void) => void;
	nodeIssuesToString: (issues: INodeIssues, node?: INode) => string[];
};

export function useWorkflowDocumentNodesIssues(deps: WorkflowDocumentNodesIssuesDeps) {
	const nodesWithValidationIssues = computed<INodeUi[]>(() =>
		deps.allNodes.value.filter((node) => {
			const nodeHasIssues = Object.keys(node.issues ?? {}).length > 0;
			const isConnected =
				Object.keys(deps.outgoingConnectionsByNodeName(node.name)).length > 0 ||
				Object.keys(deps.incomingConnectionsByNodeName(node.name)).length > 0;

			return !node.disabled && isConnected && nodeHasIssues;
		}),
	);

	const nodesWithValidationIssuesCount = computed(() => nodesWithValidationIssues.value.length);

	const hasNodeValidationIssues = computed(() => nodesWithValidationIssuesCount.value > 0);

	/** Whether any connected node has issues that should block publishing.
	 *  Execution issues are excluded — they are runtime errors, not configuration problems. */
	const hasPublishBlockingIssues = computed(() =>
		deps.allNodes.value.some((node) => {
			const { execution: _, ...configIssues } = node.issues ?? {};
			if (Object.keys(configIssues).length === 0) return false;

			const isConnected =
				Object.keys(deps.outgoingConnectionsByNodeName(node.name)).length > 0 ||
				Object.keys(deps.incomingConnectionsByNodeName(node.name)).length > 0;

			return !node.disabled && isConnected;
		}),
	);

	const nodeValidationIssues = computed(() => {
		const issues: WorkflowValidationIssue[] = [];

		const isStringOrStringArray = (value: unknown): value is string | string[] =>
			typeof value === 'string' || Array.isArray(value);

		deps.allNodes.value.forEach((node) => {
			if (!node.issues || node.disabled) return;

			const isConnected =
				Object.keys(deps.outgoingConnectionsByNodeName(node.name)).length > 0 ||
				Object.keys(deps.incomingConnectionsByNodeName(node.name)).length > 0;

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

	// Per-node-id validation errors map. See useWorkflowDocumentNodeTypeInfo
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
		nodesWithValidationIssues,
		nodesWithValidationIssuesCount,
		hasNodeValidationIssues,
		hasPublishBlockingIssues,
		nodeValidationIssues,
		validationErrorsByNodeId,
		formatNodeIssueMessage,
	};
}
