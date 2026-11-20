import type { OperationContext, ServiceAccount, TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ServiceAccountService } from '@/services/service-account.service';

import type { AgentServiceAccountService } from '../../agent-service-account.service';
import type { AgentRepository } from '../../repositories/agent.repository';
import { SystemAgentRegistrationService } from '../system-agent-registration.service';
import { SystemAgentRegistry } from '../system-agent-registry';
import type { SystemAgentProvider } from '../system-agent.types';

describe('SystemAgentRegistrationService', () => {
	function setup() {
		const registry = new SystemAgentRegistry();
		const agentRepository = mock<AgentRepository>();
		const serviceAccountService = mock<ServiceAccountService>();
		const transactionRunner = mock<TransactionRunner>();
		const agentServiceAccount = mock<AgentServiceAccountService>();
		const txCtx: OperationContext = {};
		transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(txCtx));
		serviceAccountService.create.mockResolvedValue({
			serviceAccount: mock<ServiceAccount>({ id: 'sa-1' }),
			project: mock(),
		});
		const service = new SystemAgentRegistrationService(
			registry,
			agentRepository,
			serviceAccountService,
			transactionRunner,
			agentServiceAccount,
		);
		const provider = {
			agentId: 'other-agent',
			name: 'Other Agent',
			authorize: vi.fn(async () => true),
			prepareTurn: vi.fn(),
		} satisfies SystemAgentProvider;
		return {
			service,
			registry,
			agentRepository,
			serviceAccountService,
			agentServiceAccount,
			txCtx,
			provider,
		};
	}

	describe('register', () => {
		it('makes sure the instance agent row exists before it registers the provider', async () => {
			const { service, agentRepository, registry, provider } = setup();
			agentRepository.renameInstanceAgentIfExists.mockResolvedValue(true);

			await service.register(provider);

			expect(agentRepository.renameInstanceAgentIfExists).toHaveBeenCalledWith(
				'other-agent',
				'Other Agent',
			);
			expect(registry.get('other-agent')).toBe(provider);
		});

		it('does not register a provider whose agent row cannot be seeded', async () => {
			const { service, agentRepository, registry, provider } = setup();
			agentRepository.renameInstanceAgentIfExists.mockRejectedValue(new Error('project agent'));

			await expect(service.register(provider)).rejects.toThrow('project agent');
			expect(registry.has('other-agent')).toBe(false);
		});
	});

	describe('ensureInstanceAgent', () => {
		it('only renames an agent that exists', async () => {
			const { service, agentRepository, serviceAccountService } = setup();
			agentRepository.renameInstanceAgentIfExists.mockResolvedValue(true);

			await service.ensureInstanceAgent('other-agent', 'Other Agent');

			expect(serviceAccountService.create).not.toHaveBeenCalled();
			expect(agentRepository.insertInstanceAgent).not.toHaveBeenCalled();
		});

		it('inserts a new agent with a new service account in one transaction', async () => {
			const { service, agentRepository, serviceAccountService, agentServiceAccount, txCtx } =
				setup();
			agentRepository.renameInstanceAgentIfExists.mockResolvedValue(false);
			agentRepository.insertInstanceAgent.mockResolvedValue(true);

			await service.ensureInstanceAgent('other-agent', 'Other Agent');

			expect(serviceAccountService.create).toHaveBeenCalledWith('Other Agent', txCtx);
			expect(agentRepository.insertInstanceAgent).toHaveBeenCalledWith(
				'other-agent',
				'Other Agent',
				'sa-1',
				txCtx,
			);
			expect(agentRepository.renameInstanceAgentIfExists).toHaveBeenCalledTimes(1);
			expect(agentServiceAccount.reportCreated).toHaveBeenCalledWith(
				{ id: 'other-agent', identityId: 'sa-1', projectId: null },
				{ kind: 'system', reason: 'startup' },
			);
		});

		it('rolls back, renames and reports nothing when another main inserted the agent first', async () => {
			const { service, agentRepository, agentServiceAccount } = setup();
			agentRepository.renameInstanceAgentIfExists.mockResolvedValue(false);
			agentRepository.insertInstanceAgent.mockResolvedValue(false);

			await expect(
				service.ensureInstanceAgent('other-agent', 'Other Agent'),
			).resolves.toBeUndefined();

			expect(agentRepository.renameInstanceAgentIfExists).toHaveBeenCalledTimes(2);
			expect(agentServiceAccount.reportCreated).not.toHaveBeenCalled();
		});

		it('throws other errors', async () => {
			const { service, agentRepository } = setup();
			agentRepository.renameInstanceAgentIfExists.mockResolvedValue(false);
			agentRepository.insertInstanceAgent.mockRejectedValue(new Error('db down'));

			await expect(service.ensureInstanceAgent('other-agent', 'Other Agent')).rejects.toThrow(
				'db down',
			);
			expect(agentRepository.renameInstanceAgentIfExists).toHaveBeenCalledTimes(1);
		});
	});
});
