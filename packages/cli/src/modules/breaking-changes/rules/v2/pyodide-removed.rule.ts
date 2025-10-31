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
export class PyodideRemovedRule implements IBreakingChangeWorkflowRule {
	id: string = 'pyodide-removed-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Remove Pyodide based Python Code node',
			description:
				'The Pyodide-based Python Code node has been removed and replaced with a task runner-based implementation',
			category: BreakingChangeCategory.workflow,
			severity: 'critical',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Update Code nodes to use native Python',
				description:
					'Manually update affected Code nodes from the legacy python parameter to the new pythonNative parameter',
			},
			{
				action: 'Review and adjust Python scripts',
				description:
					'Review Code node scripts relying on Pyodide syntax and adjust for breaking changes. See: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/#python-native-beta',
			},
			{
				action: 'Set up Python task runner',
				description:
					'Ensure a Python task runner is available and configured. Native Python task runners are enabled by default in v2',
			},
		];
	}

	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		// The Pyodide-based Python Code node type
		const pyodideNodes = nodesGroupedByType.get('n8n-nodes-base.pythonCode') ?? [];

		// Filter for nodes that are using Pyodide mode (not task runner mode)
		const affectedNodes = pyodideNodes.filter((node) => {
			// If the node has a mode parameter, check if it's set to 'pyodide'
			// If no mode parameter exists, it's an old node using Pyodide by default
			const mode = node.parameters?.mode;
			return mode === undefined || mode === 'pyodide';
		});

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => ({
				title: `Python Code node '${node.name}' uses removed Pyodide implementation`,
				description:
					'The Pyodide-based Python Code node is no longer supported. This node must be migrated to use the task runner-based implementation.',
				level: 'error',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
