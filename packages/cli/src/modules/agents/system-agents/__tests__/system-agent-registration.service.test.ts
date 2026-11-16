import { mock } from 'vitest-mock-extended';

import type { AgentServiceAccountService } from '../../agent-service-account.service';
import type { AgentRepository } from '../../repositories/agent.repository';
import { SystemAgentRegistrationService } from '../system-agent-registration.service';
import { SystemAgentRegistry } from '../system-agent-registry';
import type { SystemAgentProvider } from '../system-agent.types';

describe('SystemAgentRegistrationService', () => {
	function setup() {
		const registry = new SystemAgentRegistry();
		const agentRepository = mock<AgentRepository>();
		const agentServiceAccount = mock<AgentServiceAccountService>();
		const service = new SystemAgentRegistrationService(
			registry,
			agentRepository,
			agentServiceAccount,
		);
		const provider = {
			agentId: 'other-agent',
			name: 'Other Agent',
			authorize: vi.fn(async () => true),
			prepareTurn: vi.fn(),
		} satisfies SystemAgentProvider;
		return { service, registry, agentRepository, agentServiceAccount, provider };
	}

	it('seeds the instance agent row before it registers the provider', async () => {
		const { service, agentRepository, registry, provider } = setup();

		await service.register(provider);

		expect(agentRepository.ensureInstanceAgent).toHaveBeenCalledWith('other-agent', 'Other Agent');
		expect(registry.get('other-agent')).toBe(provider);
	});

	it('gives the instance agent an identity before it registers the provider', async () => {
		const { service, agentServiceAccount, registry, provider } = setup();
		const registerSpy = vi.spyOn(registry, 'register');

		await service.register(provider);

		expect(agentServiceAccount.assignToInstanceAgent).toHaveBeenCalledWith(
			'other-agent',
			'Other Agent',
		);
		expect(agentServiceAccount.assignToInstanceAgent.mock.invocationCallOrder[0]).toBeLessThan(
			registerSpy.mock.invocationCallOrder[0],
		);
		expect(registry.get('other-agent')).toBe(provider);
	});

	it('does not register a provider whose instance agent cannot get an identity', async () => {
		const { service, agentServiceAccount, registry, provider } = setup();
		agentServiceAccount.assignToInstanceAgent.mockRejectedValue(new Error('identity failed'));

		await expect(service.register(provider)).rejects.toThrow('identity failed');
		expect(registry.has('other-agent')).toBe(false);
	});

	it('does not register a provider whose agent row cannot be seeded', async () => {
		const { service, agentRepository, registry, provider } = setup();
		agentRepository.ensureInstanceAgent.mockRejectedValue(new Error('project agent'));

		await expect(service.register(provider)).rejects.toThrow('project agent');
		expect(registry.has('other-agent')).toBe(false);
	});
});
