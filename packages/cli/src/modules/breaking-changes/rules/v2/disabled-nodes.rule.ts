import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import type {
	BreakingChangeMetadata,
	WorkflowDetectionResult,
	Recommendation,
	IBreakingChangeWorkflowRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class DisabledNodesRule implements IBreakingChangeWorkflowRule {
	private readonly DISABLED_NODES = [
		'n8n-nodes-base.executeCommand',
		'n8n-nodes-base.localFileTrigger',
	];

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'disabled-nodes-v2',
			version: 'v2',
			title: 'Disable ExecuteCommand and LocalFileTrigger nodes by default',
			description:
				'ExecuteCommand and LocalFileTrigger nodes are now disabled by default for security reasons',
			category: BreakingChangeCategory.workflow,
			severity: BreakingChangeSeverity.critical,
		};
	}

	async getRecommendations(): Promise<Recommendation[]> {
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
	): Promise<WorkflowDetectionResult> {
		const disabledNodes = this.DISABLED_NODES.flatMap((type) => nodesGroupedByType.get(type) ?? []);
		if (disabledNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: disabledNodes.map((node) => ({
				title: `Node '${node.type}' with name '${node.name}' will be disabled`,
				description:
					'This node is disabled by default in v2 and will not execute unless explicitly enabled through settings or environment variables.',
				level: IssueLevel.error,
			})),
		};
	}
}
