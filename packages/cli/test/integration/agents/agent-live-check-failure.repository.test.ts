import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentLiveCheckFailureRepository } from '@/modules/agents/repositories/agent-live-check-failure.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentLiveCheckFailureRepository', () => {
	let failures: AgentLiveCheckFailureRepository;
	let agents: AgentRepository;
	let histories: AgentHistoryRepository;
	let threads: AgentExecutionThreadRepository;
	let executions: AgentExecutionRepository;
	let project: Project;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		failures = Container.get(AgentLiveCheckFailureRepository);
		agents = Container.get(AgentRepository);
		histories = Container.get(AgentHistoryRepository);
		threads = Container.get(AgentExecutionThreadRepository);
		executions = Container.get(AgentExecutionRepository);
		project = await createTeamProject('Team');
	});

	afterEach(async () => {
		// Agent rows cascade to their history; threads cascade to executions and failures.
		await threads.delete({});
		await agents.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createAgent() {
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name: 'Order desk',
				projectId: project.id,
				integrations: [],
				tools: {},
				versionId: randomUUID(),
			}),
		);
		const version = async () => {
			const versionId = randomUUID();
			await histories.save(histories.create({ versionId, agentId: agent.id, author: 'Test' }));
			return versionId;
		};
		return { agent, v1: await version(), v2: await version() };
	}

	async function liveRun(agentId: string, threadId: string, versionId: string | null) {
		const existing = await threads.findOneBy({ id: threadId });
		if (!existing) {
			await threads.save(
				threads.create({ id: threadId, agentId, agentName: 'Order desk', projectId: project.id }),
			);
		}
		const execution = await executions.save(
			executions.create({ threadId, status: 'success', storedAt: 'db' }),
		);
		if (versionId) await failures.stampVersion(execution.id, versionId);
		return execution.id;
	}

	it('counts the sessions each version ran, and only the stamped runs', async () => {
		const { agent, v1, v2 } = await createAgent();
		await liveRun(agent.id, 'thread-a', v1);
		await liveRun(agent.id, 'thread-a', v1);
		await liveRun(agent.id, 'thread-b', v2);
		await liveRun(agent.id, 'thread-c', null);

		const versions = await failures.sessionsPerVersion(agent.id, new Date(0));

		expect(
			versions
				.map(({ versionId, sessions }) => ({ versionId, sessions }))
				.sort((a, b) => a.versionId.localeCompare(b.versionId)),
		).toEqual(
			[
				{ versionId: v1, sessions: 1 },
				{ versionId: v2, sessions: 1 },
			].sort((a, b) => a.versionId.localeCompare(b.versionId)),
		);
		expect(versions[0].firstAt).toBeInstanceOf(Date);
	});

	it('counts a session once per check, however many of its runs failed it', async () => {
		const { agent, v1, v2 } = await createAgent();
		const first = await liveRun(agent.id, 'thread-a', v2);
		const second = await liveRun(agent.id, 'thread-a', v2);
		const other = await liveRun(agent.id, 'thread-b', v1);
		const row = (executionId: string, agentVersionId: string, checkId = 'tool:tool_failed') => ({
			executionId,
			checkId,
			agentId: agent.id,
			agentVersionId,
			reason: 'lookup_order failed.',
		});
		await failures.saveFailures([row(first, v2), row(second, v2), row(other, v1)]);
		// Saving the same failure again changes nothing.
		await failures.saveFailures([row(first, v2)]);

		const counts = await failures.failedSessions(agent.id, [v2, v1], new Date(0));

		expect(counts).toEqual(
			expect.arrayContaining([
				{ versionId: v2, checkId: 'tool:tool_failed', sessions: 1 },
				{ versionId: v1, checkId: 'tool:tool_failed', sessions: 1 },
			]),
		);
		expect(counts).toHaveLength(2);
		expect((await failures.forExecutions([first])).map((f) => f.checkId)).toEqual([
			'tool:tool_failed',
		]);
	});

	it('leaves out failures older than the window', async () => {
		const { agent, v2 } = await createAgent();
		const executionId = await liveRun(agent.id, 'thread-a', v2);
		await failures.saveFailures([
			{
				executionId,
				checkId: 'tool:empty_reply',
				agentId: agent.id,
				agentVersionId: v2,
				reason: 'No reply.',
			},
		]);

		const future = new Date(Date.now() + 60_000);

		await expect(failures.failedSessions(agent.id, [v2], future)).resolves.toEqual([]);
		await expect(failures.sessionsPerVersion(agent.id, future)).resolves.toEqual([]);
	});
});
