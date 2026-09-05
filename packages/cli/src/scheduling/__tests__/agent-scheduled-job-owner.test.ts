import type { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { AgentScheduledJobOwner } from '../agent-scheduled-job-owner';

const AGENT_ID = 'agent-1';
const TASK_ID = 'task-1';

describe('AgentScheduledJobOwner', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const agentRepository = mock<AgentRepository>();

	const makeOwner = () => new AgentScheduledJobOwner(moduleRegistry);

	beforeEach(() => {
		vi.clearAllMocks();
		moduleRegistry.isActive.mockReturnValue(true);
		Container.set(AgentRepository, agentRepository);
	});

	it('names a task as an owner member and the agent as an owner', () => {
		const owner = makeOwner();

		expect(owner.member(AGENT_ID, TASK_ID)).toEqual({
			ownerType: 'agent',
			ownerId: AGENT_ID,
			ownerMemberId: TASK_ID,
		});
		expect(owner.ref(AGENT_ID)).toEqual({ ownerType: 'agent', ownerId: AGENT_ID });
	});

	describe('findExisting', () => {
		it('reports only the agents that still have a published version', async () => {
			agentRepository.findPublishedIds.mockResolvedValue(new Set([AGENT_ID]));

			const existing = await makeOwner().findExisting([AGENT_ID, 'agent-unpublished']);

			expect(agentRepository.findPublishedIds).toHaveBeenCalledWith([
				AGENT_ID,
				'agent-unpublished',
			]);
			expect(existing).toEqual(new Set([AGENT_ID]));
		});

		it('throws when the agents module is inactive, so the sweep leaves agent jobs alone', async () => {
			moduleRegistry.isActive.mockReturnValue(false);

			await expect(makeOwner().findExisting([AGENT_ID])).rejects.toThrow(
				'agents module is not active',
			);
			expect(agentRepository.findPublishedIds).not.toHaveBeenCalled();
		});

		it('propagates a lookup failure instead of reporting the agents gone', async () => {
			agentRepository.findPublishedIds.mockRejectedValue(new Error('db down'));

			await expect(makeOwner().findExisting([AGENT_ID])).rejects.toThrow('db down');
		});
	});
});
