import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';

// The agents, agent-evals and data-table modules can be inactive, and they start after
// this module. A static import of their services builds a service graph that is not ready.

/** The Agents services that agent improvements use, or `null` when Agents are off. */
export async function getAgentServices() {
	const { isAgentsAccessEnabled } = await import('../../agents-access.js');
	if (!isAgentsAccessEnabled()) return null;

	const { AgentProposalService } = await import('@/modules/agents/agent-proposal.service.js');
	const { AgentContextService } = await import('@/modules/agents/agent-context.service.js');
	return {
		proposals: Container.get(AgentProposalService),
		context: Container.get(AgentContextService),
	};
}

export type SelfHealingAgentServices = NonNullable<Awaited<ReturnType<typeof getAgentServices>>>;

/** The service that tests and saves eval cases, or `null` when one of its modules is inactive. */
export async function getAgentEvalProposals() {
	const modules = Container.get(ModuleRegistry);
	if (!modules.isActive('agent-evals') || !modules.isActive('data-table')) return null;
	const { isAgentsAccessEnabled } = await import('../../agents-access.js');
	if (!isAgentsAccessEnabled(modules)) return null;

	const { AgentEvalProposalService } = await import(
		'@/modules/agent-evals/agent-eval-proposal.service.js'
	);
	return Container.get(AgentEvalProposalService);
}
