import { Service } from '@n8n/di';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	GUARDRAILS_NODE_TYPE,
	NodeConnectionTypes,
	getParentNodes,
} from 'n8n-workflow';

import { WORKFLOW_AUTHORING_CHECK_IDS } from '../workflow-authoring-checks.constants';
import type {
	WorkflowAuthoringCheckSeverity,
	WorkflowCheck,
	WorkflowCheckContext,
	WorkflowCheckViolation,
} from '../workflow-authoring-checks.types';

@Service()
export class AiAgentRequiresGuardrailCheck implements WorkflowCheck {
	readonly id = WORKFLOW_AUTHORING_CHECK_IDS.AiAgentRequiresGuardrail;

	readonly defaultSeverity: WorkflowAuthoringCheckSeverity = 'warning';

	readonly title = 'AI Agent must have a Guardrails node as direct input';

	readonly description =
		'Every AI Agent node must have a Guardrails node connected directly to its main input to screen untrusted input before it reaches the agent.';

	async evaluate(ctx: WorkflowCheckContext): Promise<WorkflowCheckViolation[]> {
		const violations: WorkflowCheckViolation[] = [];

		const nodesByName = new Map(ctx.nodes.map((n) => [n.name, n]));

		const agents = ctx.nodes.filter((n) => n.type === AGENT_LANGCHAIN_NODE_TYPE && !n.disabled);

		for (const agent of agents) {
			const directParents = getParentNodes(
				ctx.connectionsByDestination,
				agent.name,
				NodeConnectionTypes.Main,
				1,
			);

			const hasGuardrail = directParents.some((name) => {
				const parent = nodesByName.get(name);
				return parent?.type === GUARDRAILS_NODE_TYPE && !parent.disabled;
			});

			if (!hasGuardrail) {
				violations.push({
					message: `AI Agent "${agent.name}" has no Guardrails node as its direct input. Connect a Guardrails node directly to this Agent's main input.`,
					nodeIds: [agent.id],
					data: {
						agentNodeName: agent.name,
						agentNodeType: AGENT_LANGCHAIN_NODE_TYPE,
					},
				});
			}
		}

		return violations;
	}
}
