import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type {
	INode,
	INodeOutputConfiguration,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers, Workflow } from 'n8n-workflow';

import { NodeTypesProxy } from '@n8n/backend-services';

import { withExpressionIsolate } from '@/utils';

import { reportAffectedNodes } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

type ExpressionOutputCandidate = { node: INode; description: INodeTypeDescription };

@BreakingChangeRule({ version: 'v3' })
export class AlwaysOutputDataMultiOutputRule implements IBreakingChangeWorkflowRule {
	id = 'always-output-data-multi-output-v3';

	constructor(private readonly nodeTypes: NodeTypesProxy) {}

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: '"Always Output Data" behavior fix on nodes with multiple outputs',
			description:
				'On nodes with multiple outputs, "Always Output Data" currently adds an empty item to the first output even when another output produced data, which misroutes items. n8n 3.0 fixes this: it adds the empty item only when every output is empty. Workflows relying on the current behavior produce different output after the update.',
			category: BreakingChangeCategory.workflow,
			impact: 'behaviorChanges',
			assistant: 'review',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Review nodes using "Always Output Data" with multiple outputs',
				description:
					'After the update to n8n 3.0, these nodes no longer add an empty item to the first output when another output has data. Update any downstream logic that relies on that empty first-output item (for example a branch off the first output that runs on the empty case). The finding stays while the node keeps "Always Output Data" on: after your review, set it to Won\'t fix.',
			},
		];
	}

	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes: INode[] = [];
		const nodesWithExpressionOutputs: ExpressionOutputCandidate[] = [];
		for (const nodes of nodesGroupedByType.values()) {
			for (const node of nodes) {
				if (node.alwaysOutputData !== true) continue;

				// An error output occupies an additional main output slot at runtime
				if (node.onError === 'continueErrorOutput') {
					affectedNodes.push(node);
					continue;
				}

				const description = this.getDescription(node);
				if (!description) continue;

				if (Array.isArray(description.outputs)) {
					if (countMainOutputs(description.outputs) > 1) affectedNodes.push(node);
				} else {
					nodesWithExpressionOutputs.push({ node, description });
				}
			}
		}

		if (nodesWithExpressionOutputs.length > 0) {
			affectedNodes.push(...(await this.findMultiOutputNodes(nodesWithExpressionOutputs)));
		}

		return reportAffectedNodes(affectedNodes, (node) => ({
			title: `Node '${node.name}' uses "Always Output Data" and has multiple outputs`,
			description:
				'"Always Output Data" currently adds an empty item to this node\'s first output even when another output has data. n8n 3.0 fixes this: it adds the empty item only when every output is empty, so this node\'s output changes. Review any logic downstream of its first output.',
			level: 'warning',
		}));
	}

	private getDescription(node: INode): INodeTypeDescription | undefined {
		try {
			return this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
		} catch {
			// Node type not installed (e.g. removed community package), cannot assess
			return undefined;
		}
	}

	private async findMultiOutputNodes(candidates: ExpressionOutputCandidate[]): Promise<INode[]> {
		const workflow = new Workflow({
			nodes: candidates.map(({ node }) => ({ ...node })),
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});

		return await withExpressionIsolate(workflow, async () =>
			candidates
				.filter(({ node, description }) => {
					const outputs = NodeHelpers.getNodeOutputs(
						workflow,
						workflow.nodes[node.name],
						description,
					);
					return outputs.length === 0 || countMainOutputs(outputs) > 1;
				})
				.map(({ node }) => node),
		);
	}
}

function countMainOutputs(outputs: Array<NodeConnectionType | INodeOutputConfiguration>): number {
	return NodeHelpers.getConnectionTypes(outputs).filter((type) => type === NodeConnectionTypes.Main)
		.length;
}
