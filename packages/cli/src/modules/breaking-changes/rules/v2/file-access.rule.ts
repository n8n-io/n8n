import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import type { DetectionResult, BreakingChangeMetadata } from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';
import { AbstractBreakingChangeRule } from '../abstract-rule';

@Service()
export class FileAccessRule extends AbstractBreakingChangeRule {
	constructor(
		protected readonly workflowRepository: WorkflowRepository,
		protected readonly logger: Logger,
	) {
		super(logger);
	}

	private readonly FILE_NODES = ['n8n-nodes-base.readWriteFile', 'n8n-nodes-base.readBinaryFiles'];

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'file-access-restriction-v2',
			version: 'v2',
			title: 'File Access Restrictions',
			description: 'File access is now restricted to a default directory for security purposes',
			category: BreakingChangeCategory.WORKFLOW,
			severity: BreakingChangeSeverity.HIGH,
		};
	}

	async detect(): Promise<DetectionResult> {
		const result = this.createEmptyResult(this.getMetadata().id);

		try {
			const workflows = await this.workflowRepository.findWorkflowsWithNodeType(
				this.FILE_NODES,
				true,
			);

			for (const workflow of workflows) {
				const fileNodes = workflow.nodes!.filter((n) => this.FILE_NODES.includes(n.type));

				result.affectedWorkflows.push({
					id: workflow.id,
					name: workflow.name,
					active: workflow.active,
					issues: fileNodes.map((node) => ({
						title: `File access node '${node.type}' affected`,
						description: 'File access for this node is now restricted to configured directories.',
						level: IssueLevel.WARNING,
					})),
				});
			}

			if (result.affectedWorkflows.length > 0) {
				result.isAffected = true;
				result.recommendations.push({
					action: 'Configure file access paths',
					description:
						'Set N8N_RESTRICT_FILE_ACCESS_TO to a semicolon-separated list of allowed paths if workflows need to access files outside the default directory',
					documentationUrl: this.getMetadata().documentationUrl,
				});
			}
		} catch (error) {
			this.logger.error('Failed to detect file access restrictions', { error });
		}

		return result;
	}
}
