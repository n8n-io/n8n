import type {
	BreakingChangeAffectedWorkflow,
	BreakingChangeRecommendation,
	BreakingChangeWorkflowIssue,
} from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode, INodeParameters } from 'n8n-workflow';
import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import type {
	BatchWorkflowDetectionReport,
	BreakingChangeRuleMetadata,
	IBreakingChangeBatchWorkflowRule,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

interface ParentWorkflowInfo {
	parentWorkflowId: string;
	executeWorkflowNode: INode;
	calledWorkflowId?: string;
}

@Service()
export class WaitNodeSubworkflowRule implements IBreakingChangeBatchWorkflowRule {
	id: string = 'wait-node-subworkflow-v2';

	// Internal state for batch processing
	private subWorkflowsWithWaitingNodes: Map<string, string> = new Map(); // workflowId -> workflowName
	private parentWorkflowsCalling: ParentWorkflowInfo[] = [];

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
			title: 'Sub-workflow waiting node output behavior change',
			description:
				'Parent workflows calling sub-workflows with waiting nodes (Wait, Form, HITL) now receive correct data. Previously, incorrect results were returned when the sub-workflow entered a waiting state.',
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#return-expected-sub-workflow-data-when-the-sub-workflow-resumes-from-waiting-waiting-for-webhook-forms-hitl-etc',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Review Execute Workflow node outputs',
				description:
					'Check the Execute Workflow nodes flagged above. If your workflow logic depends on the specific data returned from sub-workflows containing waiting nodes, verify the data structure is correct.',
			},
			{
				action: 'Test affected parent workflows',
				description:
					'Run the affected parent workflows to verify the data returned from sub-workflows with waiting nodes is now correct and matches your expectations.',
			},
		];
	}

	reset(): void {
		this.subWorkflowsWithWaitingNodes.clear();
		this.parentWorkflowsCalling = [];
	}

	async collectWorkflowData(
		workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<void> {
		// Check if this workflow IS a sub-workflow with waiting nodes
		const hasExecuteWorkflowTrigger =
			(nodesGroupedByType.get('n8n-nodes-base.executeWorkflowTrigger')?.length ?? 0) > 0;
		const hasWaitingNodes = this.findWaitingNodes(nodesGroupedByType).length > 0;

		if (hasExecuteWorkflowTrigger && hasWaitingNodes) {
			this.subWorkflowsWithWaitingNodes.set(workflow.id, workflow.name);
		}

		// Check if this workflow CALLS sub-workflows with waitForSubWorkflow enabled
		const executeWorkflowNodes = nodesGroupedByType.get('n8n-nodes-base.executeWorkflow') ?? [];
		for (const node of executeWorkflowNodes) {
			// Check if waitForSubWorkflow is enabled (default is true)
			const options = node.parameters.options as INodeParameters | undefined;
			const waitForSubWorkflowValue = options?.waitForSubWorkflow;
			// If waitForSubWorkflow is explicitly false, skip. Otherwise treat as true (default).
			// Expressions (strings starting with =) are treated as true to avoid false negatives.
			const isExplicitlyFalse = waitForSubWorkflowValue === false;
			if (isExplicitlyFalse) {
				continue; // Skip if not waiting for sub-workflow completion
			}

			const calledWorkflowId = this.extractCalledWorkflowId(node, workflow.id);

			this.parentWorkflowsCalling.push({
				parentWorkflowId: workflow.id,
				executeWorkflowNode: node,
				calledWorkflowId,
			});
		}
	}

	async produceReport(): Promise<BatchWorkflowDetectionReport> {
		// Group issues by parent workflow ID (a parent may call multiple affected sub-workflows)
		const issuesByParentWorkflow = new Map<string, BreakingChangeWorkflowIssue[]>();

		// For each parent workflow calling a sub-workflow, check if it calls an affected sub-workflow
		for (const parent of this.parentWorkflowsCalling) {
			const isUnknownWorkflow = parent.calledWorkflowId === undefined;
			const subWorkflowName =
				parent.calledWorkflowId !== undefined
					? this.subWorkflowsWithWaitingNodes.get(parent.calledWorkflowId)
					: undefined;
			const isKnownAffectedWorkflow = subWorkflowName !== undefined;

			if (!isUnknownWorkflow && !isKnownAffectedWorkflow) {
				continue;
			}

			const issue: BreakingChangeWorkflowIssue = {
				title: isUnknownWorkflow
					? 'Execute Workflow node may call sub-workflow with changed output behavior'
					: 'Execute Workflow node calls sub-workflow with changed output behavior',
				description: isUnknownWorkflow
					? `The "${parent.executeWorkflowNode.name}" node calls a sub-workflow dynamically (via expression or parameter). If the called sub-workflow contains waiting nodes (Wait, Form, Human-in-the-loop), the data returned has changed in v2 - it now returns the correct data instead of the previously incorrect results.`
					: `The "${parent.executeWorkflowNode.name}" node calls sub-workflow "${subWorkflowName}" (ID: ${parent.calledWorkflowId}) which contains waiting nodes. The data returned from this sub-workflow has changed in v2 - it now returns the correct data instead of the previously incorrect results.`,
				level: 'warning',
				nodeId: parent.executeWorkflowNode.id,
				nodeName: parent.executeWorkflowNode.name,
			};

			const existingIssues = issuesByParentWorkflow.get(parent.parentWorkflowId);
			if (existingIssues) {
				existingIssues.push(issue);
			} else {
				issuesByParentWorkflow.set(parent.parentWorkflowId, [issue]);
			}
		}

		// Convert to the expected format
		const affectedWorkflows: BatchWorkflowDetectionReport['affectedWorkflows'] = [];
		for (const [workflowId, issues] of issuesByParentWorkflow) {
			affectedWorkflows.push({ workflowId, issues });
		}

		return { affectedWorkflows };
	}

	private findWaitingNodes(nodesGroupedByType: Map<string, INode[]>): INode[] {
		const waitingNodes: INode[] = [];

		for (const { nodeTypes, operation } of this.waitingNodeConfig) {
			for (const nodeType of nodeTypes) {
				const nodes = nodesGroupedByType.get(nodeType) ?? [];

				// If no operation is specified, all nodes of this type wait
				// Otherwise, filter for nodes with the specific operation
				const matchingNodes = operation
					? nodes.filter((node) => node.parameters.operation === operation)
					: nodes;

				waitingNodes.push(...matchingNodes);
			}
		}

		return waitingNodes;
	}

	protected extractCalledWorkflowId(node: INode, callerWorkflowId: string): string | undefined {
		const source = node.parameters.source as string | undefined;

		// Only handle database source - for other sources we can't determine the workflow ID statically
		if (source !== 'database' && source !== undefined) {
			return undefined;
		}

		// Default source is 'database', so also handle when source is undefined
		const workflowId = node.parameters.workflowId;

		if (typeof workflowId === 'string') {
			// Check if it's an expression (starts with =)
			if (workflowId.startsWith('=')) {
				// Can't evaluate expressions statically
				return this.isWorkflowItselfExpression(workflowId) ? callerWorkflowId : undefined;
			}
			return workflowId;
		}

		if (typeof workflowId === 'object' && workflowId !== null && 'value' in workflowId) {
			const value = workflowId.value;
			if (typeof value === 'string') {
				// Check if it's an expression (starts with =)
				if (value.startsWith('=')) {
					// Can't evaluate expressions statically
					return this.isWorkflowItselfExpression(value) ? callerWorkflowId : undefined;
				}
				return value;
			}
		}

		return undefined;
	}

	private isWorkflowItselfExpression(workflowIdExpression: string): boolean {
		return workflowIdExpression.replace('{{ ', '{{').replace(' }}', '}}') === '={{$workflow.id}}';
	}
}
