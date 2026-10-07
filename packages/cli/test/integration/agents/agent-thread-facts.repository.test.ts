import type { SerializableAgentState } from '@n8n/agents';
import type { AgentExecutionStatus } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import {
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_NAME,
} from '@/modules/instance-ai/assistant-turn-options';
import { ThreadFactsService } from '@/modules/instance-ai/thread-overview/thread-facts.service';

const OTHER_AGENT_ID = 'thread-facts-other-agent';

const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 9, minute));

function checkpointState(
	threadId: string,
	overrides: Partial<SerializableAgentState> = {},
	persistence: Record<string, unknown> = {},
): string {
	const state: SerializableAgentState = {
		status: 'suspended',
		persistence: { threadId, resourceId: 'resource-1', ...persistence },
		messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
		pendingToolCalls: {},
		...overrides,
	};
	return JSON.stringify(state);
}

describe('Thread list facts (batch reads)', () => {
	let threads: AgentExecutionThreadRepository;
	let executions: AgentExecutionRepository;
	let checkpoints: AgentCheckpointRepository;
	let projectId: string;
	let ttlMs: number;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threads = Container.get(AgentExecutionThreadRepository);
		executions = Container.get(AgentExecutionRepository);
		checkpoints = Container.get(AgentCheckpointRepository);
		const agents = Container.get(AgentRepository);
		await agents.ensureInstanceAgent(ASSISTANT_AGENT_ID, ASSISTANT_AGENT_NAME);
		await agents.ensureInstanceAgent(OTHER_AGENT_ID, 'Other agent');
		projectId = (await createTeamProject()).id;
		ttlMs = Container.get(AgentsConfig).checkpointTtlSeconds * Time.seconds.toMilliseconds;
	});

	afterEach(async () => {
		await checkpoints.delete({});
		await executions.delete({});
		await threads.delete({});
	});

	afterAll(async () => await testDb.terminate());

	async function createThread(updatedAt = at(0)): Promise<AgentExecutionThread> {
		const id = randomUUID();
		await threads.insert({
			id,
			agentId: ASSISTANT_AGENT_ID,
			agentName: ASSISTANT_AGENT_NAME,
			projectId,
			accessScope: 'project',
			ownerId: null,
			parentThreadId: null,
			updatedAt,
		});
		return await threads.findOneByOrFail({ id });
	}

	async function addExecution(
		threadId: string,
		status: AgentExecutionStatus,
		createdAt: Date,
		times: { startedAt?: Date | null; stoppedAt?: Date | null; id?: string } = {},
	): Promise<string> {
		const id = times.id ?? randomUUID();
		await executions.insert({
			id,
			threadId,
			status,
			createdAt,
			startedAt: times.startedAt === undefined ? createdAt : times.startedAt,
			stoppedAt: times.stoppedAt === undefined ? null : times.stoppedAt,
		});
		return id;
	}

	async function addCheckpoint(
		threadId: string | null,
		state: string | null,
		options: { agentId?: string; expired?: boolean; updatedAt?: Date } = {},
	): Promise<string> {
		const runId = randomUUID();
		const updatedAt = options.updatedAt ?? new Date();
		await checkpoints.insert({
			runId,
			agentId: options.agentId ?? ASSISTANT_AGENT_ID,
			threadId,
			state,
			expired: options.expired ?? false,
			createdAt: updatedAt,
			updatedAt,
		});
		return runId;
	}

	describe('AgentExecutionRepository.findRunSummariesByThreadIds', () => {
		it('returns the newest execution of each listed thread with its times as dates', async () => {
			const thread = await createThread();
			await addExecution(thread.id, 'success', at(1), { stoppedAt: at(2) });
			await addExecution(thread.id, 'error', at(3), { startedAt: at(4), stoppedAt: at(5) });

			const summaries = await executions.findRunSummariesByThreadIds([thread.id]);

			expect(summaries.get(thread.id)).toEqual({
				latest: { status: 'error', createdAt: at(3), startedAt: at(4), stoppedAt: at(5) },
				running: false,
			});
			expect(summaries.get(thread.id)?.latest.createdAt).toBeInstanceOf(Date);
		});

		it('reports running when an older execution of the thread still runs', async () => {
			const thread = await createThread();
			await addExecution(thread.id, 'running', at(1));
			await addExecution(thread.id, 'success', at(2), { stoppedAt: at(3) });

			const summaries = await executions.findRunSummariesByThreadIds([thread.id]);

			expect(summaries.get(thread.id)).toMatchObject({
				latest: { status: 'success', stoppedAt: at(3) },
				running: true,
			});
		});

		it('reports running for a running newest execution without a stop time', async () => {
			const thread = await createThread();
			await addExecution(thread.id, 'cancelled', at(1), { stoppedAt: at(2) });
			await addExecution(thread.id, 'running', at(3));

			const summaries = await executions.findRunSummariesByThreadIds([thread.id]);

			expect(summaries.get(thread.id)).toEqual({
				latest: { status: 'running', createdAt: at(3), startedAt: at(3), stoppedAt: null },
				running: true,
			});
		});

		it('breaks a tie on the creation time with the higher id, as the newest-row rule does', async () => {
			const thread = await createThread();
			await addExecution(thread.id, 'error', at(1), { id: 'execution-a' });
			await addExecution(thread.id, 'success', at(1), { id: 'execution-b' });

			const summaries = await executions.findRunSummariesByThreadIds([thread.id]);
			const statuses = await executions.findLatestStatusesByThreadIds([thread.id]);

			expect(summaries.get(thread.id)?.latest.status).toBe('success');
			expect(statuses.get(thread.id)).toBe('success');
		});

		it('leaves out threads without executions and threads that are not listed', async () => {
			const [listed, empty, unlisted] = await Promise.all([
				createThread(),
				createThread(),
				createThread(),
			]);
			await addExecution(listed.id, 'success', at(1));
			await addExecution(unlisted.id, 'running', at(1));

			const summaries = await executions.findRunSummariesByThreadIds([listed.id, empty.id]);

			expect([...summaries.keys()]).toEqual([listed.id]);
		});

		it('returns an empty map for an empty list', async () => {
			await expect(executions.findRunSummariesByThreadIds([])).resolves.toEqual(new Map());
		});
	});

	describe('AgentCheckpointRepository.findActiveForThreads', () => {
		it('returns only open, fresh checkpoints of the agent for the listed threads', async () => {
			const [open, expired, stale, otherAgent, unlisted] = ['a', 'b', 'c', 'd', 'e'].map(
				(name) => `thread-${name}-${randomUUID()}`,
			);
			const openRunId = await addCheckpoint(open, checkpointState(open));
			await addCheckpoint(expired, checkpointState(expired), { expired: true });
			await addCheckpoint(stale, checkpointState(stale), {
				updatedAt: new Date(Date.now() - ttlMs - Time.hours.toMilliseconds),
			});
			await addCheckpoint(otherAgent, checkpointState(otherAgent), { agentId: OTHER_AGENT_ID });
			await addCheckpoint(unlisted, checkpointState(unlisted));

			const rows = await checkpoints.findActiveForThreads(
				ASSISTANT_AGENT_ID,
				[open, expired, stale, otherAgent],
				new Date(Date.now() - ttlMs),
			);

			expect(rows).toEqual([{ runId: openRunId, threadId: open, state: checkpointState(open) }]);
		});

		it('returns no rows for an empty list', async () => {
			await expect(
				checkpoints.findActiveForThreads(ASSISTANT_AGENT_ID, [], new Date(0)),
			).resolves.toEqual([]);
		});
	});

	describe('N8NCheckpointStorage.findSuspendedThreadIds', () => {
		it('returns the threads whose own run waits for the user', async () => {
			const [waiting, delegated, running, foreign] = ['a', 'b', 'c', 'd'].map(
				(name) => `thread-${name}-${randomUUID()}`,
			);
			await addCheckpoint(waiting, checkpointState(waiting));
			await addCheckpoint(delegated, checkpointState(delegated, {}, { delegated: true }));
			await addCheckpoint(running, checkpointState(running, { status: 'running' }));
			await addCheckpoint(foreign, checkpointState('another-thread'));

			const suspended = await Container.get(N8NCheckpointStorage).findSuspendedThreadIds(
				ASSISTANT_AGENT_ID,
				[waiting, delegated, running, foreign],
			);

			expect([...suspended]).toEqual([waiting]);
		});
	});

	describe('ThreadFactsService.getFacts', () => {
		it('reads the facts of a page of Assistant threads from the database', async () => {
			const [waiting, working, failed, fresh] = await Promise.all([
				createThread(),
				createThread(),
				createThread(),
				createThread(at(30)),
			]);
			await addExecution(waiting.id, 'success', at(1), { stoppedAt: at(2) });
			await addCheckpoint(waiting.id, checkpointState(waiting.id));
			await addExecution(working.id, 'running', at(3));
			await addExecution(failed.id, 'interrupted', at(4), { stoppedAt: at(5) });

			const facts = await Container.get(ThreadFactsService).getFacts([
				waiting,
				working,
				failed,
				fresh,
			]);

			expect(Object.fromEntries(facts)).toEqual({
				[waiting.id]: {
					needsInput: true,
					running: false,
					lastRunFailed: false,
					lastActivityAt: at(2),
				},
				[working.id]: {
					needsInput: false,
					running: true,
					lastRunFailed: false,
					lastActivityAt: at(3),
				},
				[failed.id]: {
					needsInput: false,
					running: false,
					lastRunFailed: true,
					lastActivityAt: at(5),
				},
				[fresh.id]: {
					needsInput: false,
					running: false,
					lastRunFailed: false,
					lastActivityAt: at(30),
				},
			});
		});
	});
});
