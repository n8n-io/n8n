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

	it('returns unconsumed settled rows of one thread, oldest settlement first', async () => {
		const olderId = uuid();
		const newerId = uuid();
		await insertJob({ id: newerId, parentThreadId: 'thread-1', settledAt: new Date() });
		await insertJob({
			id: olderId,
			parentThreadId: 'thread-1',
			settledAt: new Date(Date.now() - 60_000),
		});
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', notifiedAt: new Date() });
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', status: 'running', settledAt: null });
		await insertJob({ id: uuid(), parentThreadId: 'thread-2' });

		const pending = await repository.findWakeableUnconsumedSettled('thread-1');

		expect(pending.map((job) => job.id)).toEqual([olderId, newerId]);
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

		const foreignId = uuid();
		await insertJob({ id: foreignId, parentThreadId: 'thread-2' });

		await expect(repository.markMailConsumed('thread-1', [])).resolves.toBe(0);
		await expect(
			repository.markMailConsumed('thread-1', [selectedId, runningId, foreignId]),
		).resolves.toBe(1);

		const selected = await repository.findById(selectedId);
		const other = await repository.findById(otherId);
		const running = await repository.findById(runningId);
		const foreign = await repository.findById(foreignId);
		expect(selected?.notifiedAt).toBeInstanceOf(Date);
		expect(other?.notifiedAt).toBeNull();
		expect(running?.notifiedAt).toBeNull();
		expect(foreign?.notifiedAt).toBeNull();
	});

	it('returns each thread with unconsumed mail once and accepts a 255-character resource id', async () => {
		const resourceId = 'r'.repeat(255);
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-2', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'consumed-thread', notifiedAt: new Date() });

		const threadIds = await repository.findThreadsWithUnconsumedMail();
		expect(threadIds.sort()).toEqual(['thread-1', 'thread-2']);
		const [job] = await repository.findWakeableUnconsumedSettled('thread-1');
		expect(job?.parentResourceId).toHaveLength(255);
	});
});
