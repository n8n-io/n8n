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
			title: 'Remove Pyodide-based Python in Code node',
			description:
				'The Pyodide-based Python implementation in the Code node has been removed and replaced with a native Python task runner implementation',
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#remove-pyodide-based-python-code-node',
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
		// Get all Code nodes (the Code node supports both JavaScript and Python)
		const codeNodes = nodesGroupedByType.get('n8n-nodes-base.code') ?? [];
		const codeToolNodes = nodesGroupedByType.get('@n8n/n8n-nodes-langchain.toolCode') ?? [];

		// Filter for Code nodes using the Pyodide-based Python implementation
		// The 'language' parameter determines which language/implementation is used:
		// - 'python' = Pyodide (being removed)
		// - 'pythonNative' = Task runner (new implementation)
		// - 'javaScript' = JavaScript (not affected)
		const affectedNodes = codeNodes.concat(codeToolNodes).filter((node) => {
			const language = node.parameters?.language;
			// Nodes with language='python' use Pyodide and are affected
			return language === 'python';
		});

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => ({
				title: `Code node '${node.name}' uses removed Pyodide Python implementation`,
				description:
					'The Pyodide-based Python implementation (language="python") is no longer supported. This node must be migrated to use the task runner-based implementation (language="pythonNative").',
				level: 'error',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
