import { Service } from '@n8n/di';
import type { WorkflowEntity, DependencyType } from '@n8n/db';
import { EXECUTE_WORKFLOW_NODE_TYPE, INode, WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE } from 'n8n-workflow';

type DependencyInput = {
	workflowId: string;
	workflowVersionId: number;
	dependencyType: DependencyType;
	dependencyKey: string;
	dependencyInfo: string | null;
	indexVersionId: number;
};

@Service()
export class WorkflowIndexingService {
	/**
	 * Generate workflow dependency index entries from a workflow.
	 * Extracts credentials, node types, webhook paths, and sub-workflow calls.
	 */
	generateWorkflowIndexUpdates(workflow: WorkflowEntity): DependencyInput[] {
		const dependencies: DependencyInput[] = [];
		const { id: workflowId, versionCounter, nodes } = workflow;

		for (const node of nodes) {
			// Extract credential dependencies
			this.extractCredentialDependencies(node, workflowId, versionCounter, dependencies);

			// Extract node type dependencies
			dependencies.push({
				workflowId,
				workflowVersionId: versionCounter,
				dependencyType: 'nodeType',
				dependencyKey: node.type,
				dependencyInfo: node.id,
				indexVersionId: 1,
			});

			// Extract webhook path dependencies
			if (node.webhookId) {
				// For Wait nodes, only add webhook dependency if configured to resume on webhook/form
				if (node.type === 'wait') {
					const resume = node.parameters.resume;
					if (resume !== 'webhook' && resume !== 'form') {
						continue;
					}
				}

				dependencies.push({
					workflowId,
					workflowVersionId: versionCounter,
					dependencyType: 'webhookPath',
					dependencyKey: node.webhookId,
					dependencyInfo: node.webhookId,
					indexVersionId: 1,
				});
			}

			// Extract sub-workflow call dependencies
			if (
				node.type === EXECUTE_WORKFLOW_NODE_TYPE ||
				node.type === WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE
			) {
				const workflowIdParam = node.parameters.workflowId as string | undefined;
				if (workflowIdParam && typeof workflowIdParam === 'string') {
					dependencies.push({
						workflowId,
						workflowVersionId: versionCounter,
						dependencyType: 'workflowCall',
						dependencyKey: workflowIdParam,
						dependencyInfo: node.id,
						indexVersionId: 1,
					});
				}
			}
		}

		return dependencies;
	}
	extractCredentialDependencies(
		node: INode,
		workflowId: string,
		versionCounter: number,
		dependencies: DependencyInput[],
	) {
		if (!node.credentials) return;

		for (const [_, credentialValue] of Object.entries(node.credentials)) {
			if (!credentialValue) continue;

			const dependencyKey =
				typeof credentialValue === 'string'
					? credentialValue
					: (credentialValue.id ?? credentialValue.name ?? '');

			if (!dependencyKey) continue;

			dependencies.push({
				workflowId,
				workflowVersionId: versionCounter,
				dependencyType: 'credential',
				dependencyKey,
				dependencyInfo: node.id,
				indexVersionId: 1,
			});
		}
	}
}
