import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import type { DetectionResult, BreakingChangeMetadata } from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';
import { AbstractBreakingChangeRule } from '../abstract-rule';

@Service()
export class ProcessEnvAccessRule extends AbstractBreakingChangeRule {
	constructor(
		protected readonly workflowRepository: WorkflowRepository,
		protected readonly logger: Logger,
	) {
		super(logger);
	}

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'process-env-access-v2',
			version: 'v2.0.0',
			title: 'Block process.env Access in Expressions',
			description: 'Direct access to process.env is blocked by default for security',
			category: BreakingChangeCategory.WORKFLOW,
			severity: BreakingChangeSeverity.HIGH,
		};
	}

	async detect(): Promise<DetectionResult> {
		const result = this.createEmptyResult(this.getMetadata().id);

		try {
			const workflows = await this.workflowRepository.find({
				select: ['id', 'name', 'active', 'nodes'],
			});

			const processEnvPattern = /process\.env/;

			for (const workflow of workflows) {
				const affectedNodes: string[] = [];

				workflow.nodes.forEach((node) => {
					// Check in Code nodes
					if (node.type === 'n8n-nodes-base.code') {
						const code = node.parameters?.code as string;
						if (code && processEnvPattern.test(code)) {
							affectedNodes.push(node.name);
						}
					} else {
						// Check in expressions
						const nodeJson = JSON.stringify(node.parameters);
						if (processEnvPattern.test(nodeJson) && !affectedNodes.includes(node.name)) {
							affectedNodes.push(node.name);
						}
					}
				});

				if (affectedNodes.length > 0) {
					result.affectedWorkflows.push({
						id: workflow.id,
						name: workflow.name,
						active: workflow.active,
						issues: [
							{
								title: 'process.env access detected',
								description: `The following nodes contain process.env access: ${affectedNodes.join(', ')}. This will be blocked in v2.0.0.`,
								level: IssueLevel.ERROR,
							},
						],
					});
				}
			}

			if (result.affectedWorkflows.length > 0) {
				result.isAffected = true;
				result.recommendations.push(
					{
						action: 'Remove process.env usage',
						description: 'Replace process.env with environment variables configured in n8n',
					},
					{
						action: 'Enable access if required',
						description: 'Set N8N_BLOCK_ENV_ACCESS_IN_NODE=false to allow access',
					},
				);
			}
		} catch (error) {
			this.logger.error('Failed to detect process.env access', { error });
		}

		return result;
	}
}
