import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class DisabledNodesRule implements IBreakingChangeWorkflowRule {
	private readonly DISABLED_NODES = [
		'n8n-nodes-base.executeCommand',
		'n8n-nodes-base.localFileTrigger',
	];

	id: string = 'disabled-nodes-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Disable ExecuteCommand and LocalFileTrigger nodes by default',
			description:
				'ExecuteCommand and LocalFileTrigger nodes are now disabled by default for security reasons',
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#disable-executecommand-and-localfiletrigger-nodes-by-default',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Enable nodes if required',
				description:
					'Set the appropriate environment variables or settings to enable these nodes if they are required for your workflows',
			},
			{
				action: 'Replace with alternatives',
				description:
					'Consider replacing these nodes with safer alternatives that achieve the same functionality',
			},
		];
	}

	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		if (process.env.NODES_EXCLUDE) {
			return { isAffected: false, issues: [] };
		}

		const disabledNodes = this.DISABLED_NODES.flatMap((type) => nodesGroupedByType.get(type) ?? []);
		if (disabledNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: disabledNodes.map((node) => ({
				title: `Node '${node.type}' with name '${node.name}' will be disabled`,
				description: `This node is disabled by default in v2. If you want to keep using ${node.type} node, you can configure NODES_EXCLUDE=[].`,
				level: 'error',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
