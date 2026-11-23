import { Container } from '@n8n/di';

import { Agent, type ProjectAgent } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import { ServiceAccountService } from '@/services/service-account.service';

/**
 * Creates a service account with a personal project and returns its id. Every
 * agent needs one in `identityId`. Prefer `createAgent`. Use this only when a
 * test must build the agent row itself.
 */
export async function createAgentIdentity(name = 'Agent'): Promise<string> {
	const { serviceAccount } = await Container.get(ServiceAccountService).create(name);
	return serviceAccount.id;
}

/**
 * Saves a project agent. Pass only the fields the test cares about. Without
 * `identityId`, the agent gets its own new identity.
 */
export async function createAgent(
	overrides: Partial<Agent> & { projectId: string },
): Promise<ProjectAgent> {
	const name = overrides.name ?? 'Test agent';
	// A blank agent name is valid here, but a service account needs one.
	const identityId = overrides.identityId ?? (await createAgentIdentity(name.trim() || 'Agent'));
	return await Container.get(AgentRepository).save(
		Object.assign(new Agent(), { name, ...overrides, identityId }),
	);
}

/** Creates or renames a code-defined instance agent, as on start. */
export async function ensureInstanceAgent(id: string, name: string): Promise<void> {
	await Container.get(SystemAgentRegistrationService).ensureInstanceAgent(id, name);
}
