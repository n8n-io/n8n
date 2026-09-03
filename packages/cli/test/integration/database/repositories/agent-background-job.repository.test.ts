import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { AgentBackgroundJob } from '@/modules/agents/entities/agent-background-job.entity';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentBackgroundJobRepository', () => {
	let repository: AgentBackgroundJobRepository;
	let agentRepository: AgentRepository;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentBackgroundJobRepository);
		agentRepository = Container.get(AgentRepository);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		const agent = agentRepository.create({
			id: uuid(),
			name: 'Test Agent',
			projectId: project.id,
			integrations: [],
			tools: {},
			skills: {},
		} as Partial<Agent>);
		await agentRepository.save(agent);
		agentId = agent.id;
	});

	afterEach(async () => {
		await repository.delete({});
		await agentRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertJob(
		overrides: Partial<AgentBackgroundJob> & { id: string; parentThreadId: string },
	) {
		await repository.insert({
			kind: 'subagent',
			status: 'completed',
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:user-1',
			parentPrincipalHash: 'principal-hash',
			title: 'Research',
			subAgentId: uuid(),
			childThreadId: uuid(),
			settledAt: new Date(),
			...overrides,
		});
	}

	it('returns all pending rows but wakes only rows with parent identity', async () => {
		await insertJob({ id: uuid(), parentThreadId: 'thread-1' });
		await insertJob({
			id: uuid(),
			parentThreadId: 'thread-1',
			parentResourceId: null,
			parentPrincipalHash: null,
		});

		const pending = await repository.count({ where: { parentThreadId: 'thread-1' } });
		const wakeable = await repository.findWakeableUnconsumedSettled('thread-1');

		expect(pending).toBe(2);
		expect(wakeable).toHaveLength(1);
		expect(wakeable[0]?.parentResourceId).toBe('draft-chat:user-1');
	});

	it('consumes only selected settled rows from the requested thread', async () => {
		const selectedId = uuid();
		const otherId = uuid();
		const runningId = uuid();
		await insertJob({ id: selectedId, parentThreadId: 'thread-1' });
		await insertJob({ id: otherId, parentThreadId: 'thread-1' });
		await insertJob({
			id: runningId,
			parentThreadId: 'thread-1',
			status: 'running',
			settledAt: null,
		});

		await expect(repository.markMailConsumed('thread-1', [selectedId, runningId])).resolves.toBe(1);

		const selected = await repository.findById(selectedId);
		const other = await repository.findById(otherId);
		const running = await repository.findById(runningId);
		expect(selected?.notifiedAt).toBeInstanceOf(Date);
		expect(other?.notifiedAt).toBeNull();
		expect(running?.notifiedAt).toBeNull();
	});

	it('returns each wakeable thread once and accepts a 255-character resource id', async () => {
		const resourceId = 'r'.repeat(255);
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-2', parentResourceId: resourceId });
		await insertJob({
			id: uuid(),
			parentThreadId: 'legacy-thread',
			parentResourceId: null,
			parentPrincipalHash: null,
		});

		const threadIds = await repository.findThreadsWithUnconsumedMail();
		expect(threadIds.sort()).toEqual(['thread-1', 'thread-2']);
		const [job] = await repository.findWakeableUnconsumedSettled('thread-1');
		expect(job?.parentResourceId).toHaveLength(255);
	});
});
