import { computed, type ComputedRef } from 'vue';
import type { INodeUi, WorkflowValidationIssue } from '@/Interface';
import type { INodeConnections } from 'n8n-workflow';

export type WorkflowDocumentNodesIssuesDeps = {
	allNodes: ComputedRef<INodeUi[]>;
	outgoingConnectionsByNodeName: (nodeName: string) => INodeConnections;
	incomingConnectionsByNodeName: (nodeName: string) => INodeConnections;
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

	return {
		nodesWithValidationIssues,
		nodesWithValidationIssuesCount,
		hasNodeValidationIssues,
		nodeValidationIssues,
		formatNodeIssueMessage,
	};
}
