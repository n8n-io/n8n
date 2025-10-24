import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type {
	BreakingChangeMetadata,
	WorkflowDetectionResult,
	Recommendation,
	IBreakingChangeWorkflowRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class FileAccessRule implements IBreakingChangeWorkflowRule {
	private readonly FILE_NODES = ['n8n-nodes-base.readWriteFile', 'n8n-nodes-base.readBinaryFiles'];

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'file-access-restriction-v2',
			version: 'v2',
			title: 'File Access Restrictions',
			description: 'File access is now restricted to a default directory for security purposes',
			category: BreakingChangeCategory.workflow,
			severity: BreakingChangeSeverity.high,
		};
	}

	async getRecommendations(): Promise<Recommendation[]> {
		return [
			{
				action: 'Configure file access paths',
				description:
					'Set N8N_RESTRICT_FILE_ACCESS_TO to a semicolon-separated list of allowed paths if workflows need to access files outside the default directory',
				documentationUrl: this.getMetadata().documentationUrl,
			},
		];
	}

	async detectWorkflow(workflow: WorkflowEntity): Promise<WorkflowDetectionResult> {
		const fileNodes = workflow.nodes.filter((n) => this.FILE_NODES.includes(n.type));
		if (fileNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: fileNodes.map((node) => ({
				title: `File access node '${node.type}' with name '${node.name}' affected`,
				description: 'File access for this node is now restricted to configured directories.',
				level: IssueLevel.warning,
			})),
		};
	}
}
