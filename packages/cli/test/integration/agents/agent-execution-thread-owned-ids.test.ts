import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { createUser } from '@test-integration/db/users';

describe('AgentExecutionThreadRepository.findIdsOwnedByAgent', () => {
	let threads: AgentExecutionThreadRepository;
	let agents: AgentRepository;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threads = Container.get(AgentExecutionThreadRepository);
		agents = Container.get(AgentRepository);
	});
	afterAll(async () => await testDb.terminate());

	const createAgent = async (projectId: string) =>
		await agents.save(
			agents.create({
				id: randomUUID(),
				name: 'Agent',
				projectId,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);

	const createThread = async (agentId: string, projectId: string, ownerId: string | null) => {
		const id = randomUUID();
		await threads.save(
			threads.create({
				id,
				agentId,
				agentName: 'Agent',
				projectId,
				accessScope: ownerId ? 'user' : 'project',
				ownerId,
				parentThreadId: null,
			}),
		);
		return id;
	};

	it('returns only the listed sessions of the agent that the user owns', async () => {
		const project = await createTeamProject();
		const [me, teammate] = await Promise.all([createUser(), createUser()]);
		const agent = await createAgent(project.id);
		const otherAgent = await createAgent(project.id);
		const mine = await createThread(agent.id, project.id, me.id);
		const mineNotListed = await createThread(agent.id, project.id, me.id);
		const theirs = await createThread(agent.id, project.id, teammate.id);
		const mineWithOtherAgent = await createThread(otherAgent.id, project.id, me.id);
		const projectSession = await createThread(agent.id, project.id, null);

		const ids = await threads.findIdsOwnedByAgent(agent.id, me.id, [
			mine,
			theirs,
			mineWithOtherAgent,
			projectSession,
			randomUUID(),
		]);

		expect(ids).toEqual([mine]);
		expect(ids).not.toContain(mineNotListed);
	});

	it('returns every listed session that the user owns', async () => {
		const project = await createTeamProject();
		const me = await createUser();
		const agent = await createAgent(project.id);
		const first = await createThread(agent.id, project.id, me.id);
		const second = await createThread(agent.id, project.id, me.id);

		const ids = await threads.findIdsOwnedByAgent(agent.id, me.id, [first, second]);

		expect([...ids].sort()).toEqual([first, second].sort());
	});

	it('returns no ids for an empty list', async () => {
		const me = await createUser();

		await expect(threads.findIdsOwnedByAgent(randomUUID(), me.id, [])).resolves.toEqual([]);
	});
});
