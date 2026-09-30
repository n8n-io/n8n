import type { AgentChannelRef } from '@/modules/agents/utils/agent-channel';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentChannelActivityRepository } from '@/modules/agents/repositories/agent-channel-activity.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentChannelActivityRepository', () => {
	let activityRepo: AgentChannelActivityRepository;
	let agentRepo: AgentRepository;
	let agent: Agent;
	let ref: AgentChannelRef;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		activityRepo = Container.get(AgentChannelActivityRepository);
		agentRepo = Container.get(AgentRepository);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		agent = await agentRepo.save(
			agentRepo.create({
				id: uuid(),
				name: 'Test Agent',
				projectId: project.id,
				integrations: [],
				tools: {},
				skills: {},
				versionId: 'version-1',
				activeVersionId: null,
			} as Partial<Agent>),
		);
		ref = { agentId: agent.id, integrationType: 'teams', credentialId: 'cred-1' };
	});

	afterEach(async () => {
		await activityRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('keeps one row per channel, holding the latest message time', async () => {
		await activityRepo.recordInbound(ref, new Date('2026-09-10T10:00:00.000Z'));
		await activityRepo.recordInbound(ref, new Date('2026-09-11T10:00:00.000Z'));

		const rows = await activityRepo.findByAgentId(agent.id);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject(ref);
		expect(rows[0].lastInboundAt.toISOString()).toBe('2026-09-11T10:00:00.000Z');
	});

	it('keeps channels of the same agent apart', async () => {
		await activityRepo.recordInbound(ref, new Date());
		await activityRepo.recordInbound({ ...ref, credentialId: 'cred-2' }, new Date());

		await expect(activityRepo.findByAgentId(agent.id)).resolves.toHaveLength(2);
	});

	it('is removed with its agent', async () => {
		await activityRepo.recordInbound(ref, new Date());

		await agentRepo.delete({ id: agent.id });

		await expect(activityRepo.findByAgentId(agent.id)).resolves.toHaveLength(0);
	});
});
