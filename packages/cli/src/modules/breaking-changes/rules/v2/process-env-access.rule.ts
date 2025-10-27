import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { INode } from 'n8n-workflow';

import type {
	BreakingChangeMetadata,
	IBreakingChangeWorkflowRule,
	Recommendation,
	WorkflowDetectionResult,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class ProcessEnvAccessRule implements IBreakingChangeWorkflowRule {
	id: string = 'process-env-access-v2';
	getMetadata(): BreakingChangeMetadata {
		return {
			version: 'v2',
			title: 'Block process.env Access in Expressions and Code nodes',
			description: 'Direct access to process.env is blocked by default for security',
			category: BreakingChangeCategory.workflow,
			severity: BreakingChangeSeverity.high,
		};
	}

	async detectWorkflow(
		workflow: WorkflowEntity,
		_nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionResult> {
		// Match process.env with optional whitespace, newlines, comments between 'process' and '.env'
		// This covers: process.env, process  .env, process/* comment */.env, process\n.env, etc.
		// Also matches optional chaining: process?.env
		const processEnvPattern = /process\s*(?:\/\*[\s\S]*?\*\/)?\s*\??\.?\s*env\b/;

		const affectedNodes: string[] = [];

		workflow.nodes.forEach((node) => {
			// Check in Code nodes
			if (node.type === 'n8n-nodes-base.code') {
				const code = typeof node.parameters?.code === 'string' ? node.parameters.code : undefined;
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

		return {
			isAffected: affectedNodes.length > 0,
			issues:
				affectedNodes.length > 0
					? [
							{
								title: 'process.env access detected',
								description: `The following nodes contain process.env access: '${affectedNodes.join(', ')}'. This will be blocked by default in v2.0.0.`,
								level: IssueLevel.error,
							},
						]
					: [],
		};
	}

	async getRecommendations(): Promise<Recommendation[]> {
		return [
			{
				action: 'Remove process.env usage',
				description: 'Replace process.env with environment variables configured in n8n',
			},
			{
				action: 'Enable access if required',
				description: 'Set N8N_BLOCK_ENV_ACCESS_IN_NODE=false to allow access',
			},
		];
	}
}
