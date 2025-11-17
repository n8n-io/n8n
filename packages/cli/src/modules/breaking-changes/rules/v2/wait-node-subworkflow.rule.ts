import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class WaitNodeSubworkflowRule implements IBreakingChangeWorkflowRule {
	id: string = 'wait-node-subworkflow-v2';

	// Configuration for node types and their waiting conditions
	private readonly waitingNodeConfig: Array<{ nodeTypes: string[]; operation?: string }> = [
		{
			// Node types that always wait (no operation check needed)
			nodeTypes: [
				'n8n-nodes-base.wait',
				'n8n-nodes-base.form',
				'@n8n/n8n-nodes-langchain.chat',
				'n8n-nodes-base.respondToWebhook',
			],
		},
		{
			// Node types that only wait when using sendAndWait operation
			nodeTypes: [
				'n8n-nodes-base.slack',
				'n8n-nodes-base.telegram',
				'n8n-nodes-base.googleChat',
				'n8n-nodes-base.gmail',
				'n8n-nodes-base.emailSend',
				'n8n-nodes-base.whatsApp',
				'n8n-nodes-base.microsoftTeams',
				'n8n-nodes-base.microsoftOutlook',
				'n8n-nodes-base.discord',
			],
			operation: SEND_AND_WAIT_OPERATION,
		},
		{
			// Node types that wait when using dispatchAndWait operation
			nodeTypes: ['n8n-nodes-base.github'],
			operation: 'dispatchAndWait',
		},
	];

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Waiting node behavior change in sub-workflows',
			description:
				'Waiting nodes (Wait, Form, and HITL nodes) in sub-workflows now return data from the last node instead of the node before the waiting node',
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#return-expected-sub-workflow-data-when-it-contains-a-wait-node',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Review sub-workflow output handling',
				description:
					'Check workflows that use Execute Workflow node to call sub-workflows containing waiting nodes (Wait, Form, or HITL nodes). The output data structure may have changed.',
			},
			{
				action: 'Update downstream logic',
				description:
					'Adjust any logic in parent workflows that depends on the data returned from sub-workflows with waiting nodes, as it now returns the last node data instead of the node before the waiting node.',
			},
			{
				action: 'Test affected workflows',
				description:
					'Test all workflows with Execute Workflow nodes calling sub-workflows that contain waiting nodes to ensure the new behavior works as expected.',
			},
		];
	}

	private hasWaitingOperation(node: INode, requiredOperation: string): boolean {
		const operation = node.parameters.operation;
		return operation === requiredOperation;
	}

	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		// Check if the workflow contains any waiting nodes (Wait, Form, or HITL nodes)
		const foundWaitingNodes: Array<{ node: INode; nodeTypeName: string }> = [];

		// Check all configured node types
		for (const { nodeTypes, operation } of this.waitingNodeConfig) {
			for (const nodeType of nodeTypes) {
				const nodes = nodesGroupedByType.get(nodeType) ?? [];

				// If no operation is specified, all nodes of this type wait
				// Otherwise, filter for nodes with the specific operation
				const waitingNodes = operation
					? nodes.filter((node) => this.hasWaitingOperation(node, operation))
					: nodes;

				for (const node of waitingNodes) {
					const nodeTypeName = nodeType.split('.').pop() ?? nodeType;
					foundWaitingNodes.push({ node, nodeTypeName });
				}
			}
		}

		if (foundWaitingNodes.length === 0) {
			return { isAffected: false, issues: [] };
		}

		// Check if this workflow IS a subworkflow by looking for Execute Workflow Trigger
		const executeWorkflowTriggerNodes =
			nodesGroupedByType.get('n8n-nodes-base.executeWorkflowTrigger') ?? [];

		if (executeWorkflowTriggerNodes.length === 0) {
			return { isAffected: false, issues: [] };
		}

		// This workflow is a subworkflow (has Execute Workflow Trigger) and contains waiting nodes
		// The output behavior has changed
		// Create one issue per waiting node

		const issues = foundWaitingNodes.map(({ node, nodeTypeName }) => ({
			title: 'Sub-workflow with waiting node has changed output behavior',
			description: `This workflow is a sub-workflow (contains Execute Workflow Trigger) with a waiting node (${nodeTypeName}). The data returned to the parent workflow from sub-workflows containing waiting nodes has changed. Previously, the child workflow returned data from the node before the waiting node. Now they return data from the last node in the workflow.`,
			level: 'warning' as const,
			nodeId: node.id,
			nodeName: node.name,
		}));

		return {
			isAffected: true,
			issues,
		};
	}
}
