import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentRunnableStateService } from '../agent-runnable-state.service';
import type { AgentPublishService } from '../agent-publish.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { Agent } from '../entities/agent.entity';

const projectId = 'project-1';
const user = { id: 'user-1' } as User;

function makeService() {
	const credentialsService = mock<CredentialsService>();
	const agentValidationService = mock<AgentValidationService>();
	const agentPublishService = mock<AgentPublishService>();

	return {
		service: new AgentRunnableStateService(
			credentialsService,
			agentValidationService,
			agentPublishService,
		),
		agentValidationService,
		agentPublishService,
	};
}

describe('AgentRunnableStateService', () => {
	it('marks the agent runnable when structured validation reports it valid', async () => {
		const { service, agentValidationService, agentPublishService } = makeService();
		agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
			status: 'valid',
			issues: [],
		});
		agentPublishService.hasPublishHistory.mockResolvedValue(true);

		const result = await service.addRunnableState({ id: 'agent-1' } as Agent, projectId, user);

		expect(result.isRunnable).toBe(true);
		expect(result.hasPublishHistory).toBe(true);
	});

	it('marks the agent not runnable when structured validation reports it invalid', async () => {
		const { service, agentValidationService, agentPublishService } = makeService();
		agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [{ code: 'missing_credential', path: 'credential', capability: { kind: 'agent' } }],
		});
		agentPublishService.hasPublishHistory.mockResolvedValue(false);

		const result = await service.addRunnableState({ id: 'agent-1' } as Agent, projectId, user);

		expect(result.isRunnable).toBe(false);
		expect(result.hasPublishHistory).toBe(false);
	});

	it('derives isRunnable from supplied draft validation without revalidating', async () => {
		const { service, agentValidationService, agentPublishService } = makeService();
		agentPublishService.hasPublishHistory.mockResolvedValue(true);

		const result = await service.addRunnableState({ id: 'agent-1' } as Agent, projectId, user, {
			status: 'valid',
			issues: [],
		});

		expect(result.isRunnable).toBe(true);
		expect(result.hasPublishHistory).toBe(true);
		expect(agentValidationService.validateAgentConfiguration).not.toHaveBeenCalled();
	});

	it('uses runtime-scoped loaded-agent validation for runnable state', async () => {
		const agent = { id: 'agent-1' } as Agent;
		const { service, agentValidationService, agentPublishService } = makeService();
		agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
			status: 'valid',
			issues: [],
		});
		agentPublishService.hasPublishHistory.mockResolvedValue(false);

		await service.addRunnableState(agent, projectId, user);

		expect(agentValidationService.validateLoadedAgentConfiguration).toHaveBeenCalledWith(
			agent,
			projectId,
			expect.anything(),
			'runtime',
		);
	});
});
