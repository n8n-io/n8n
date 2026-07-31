import { Service } from '@n8n/di';
import { getNonWorkflowAdditionalKeys } from 'n8n-core';
import type { ExecuteAgentExpressionResolver, INode, NodeParameterValueType } from 'n8n-workflow';
import { createEmptyRunExecutionData, Workflow } from 'n8n-workflow';
import { deepFreeze, withExpressionIsolate } from 'n8n-workflow/expression-sandboxing';

import { NodeTypes } from '@/node-types';
import { getBase } from '@/workflow-execute-additional-data';

import { AgentExpressionContext } from './agent-expression-context';

const EXPRESSION_NODE: INode = {
	id: 'agent-expression-context',
	name: 'Agent Expression Context',
	type: 'n8n-nodes-base.noOp',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

@Service()
export class AgentExpressionContextService {
	constructor(private readonly nodeTypes: NodeTypes) {}

	async createForProject(projectId: string): Promise<AgentExpressionContext> {
		const additionalData = await getBase({ projectId });
		const variables = structuredClone(additionalData.variables ?? {});
		deepFreeze(variables);
		const workflow = new Workflow({
			nodes: [structuredClone(EXPRESSION_NODE)],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});
		const additionalKeys = {
			...getNonWorkflowAdditionalKeys(additionalData, { secretsEnabled: false }),
			$vars: variables,
			$secrets: undefined,
		};
		const runExecutionData = createEmptyRunExecutionData();
		const resolveParameterValue = async (
			value: NodeParameterValueType,
		): Promise<NodeParameterValueType> =>
			await withExpressionIsolate(workflow, async () =>
				workflow.expression.getParameterValue(
					value,
					runExecutionData,
					0,
					0,
					EXPRESSION_NODE.name,
					[],
					'manual',
					additionalKeys,
				),
			);

		return new AgentExpressionContext(variables, resolveParameterValue);
	}

	createForWorkflow(resolver: ExecuteAgentExpressionResolver): AgentExpressionContext {
		return new AgentExpressionContext(
			resolver.variables,
			resolver.resolveParameterValue.bind(resolver),
		);
	}
}
