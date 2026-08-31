import type {
	AgentSessionOrigin,
	AgentSessionQueryFilters,
	AgentSessionStatus,
} from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import type { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentExecutionRepository', () => {
	let repository: AgentExecutionRepository;
	let threadRepo: AgentExecutionThreadRepository;
	let agentRepo: AgentRepository;
	let projectId: string;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentExecutionRepository);
		threadRepo = Container.get(AgentExecutionThreadRepository);
		agentRepo = Container.get(AgentRepository);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		projectId = project.id;

		const agent = agentRepo.create({
			id: uuid(),
			name: 'Test Agent',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
		} as Partial<Agent>);
		await agentRepo.save(agent);
		agentId = agent.id;
	});

	afterEach(async () => {
		await repository.delete({});
		await threadRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const createThread = async (overrides: Partial<AgentExecutionThread> = {}) => {
		const thread = threadRepo.create({
			id: uuid(),
			agentId,
			agentName: 'Test Agent',
			projectId,
			sessionNumber: 1,
			...overrides,
		});
		return await threadRepo.save(thread);
	};

	const createExecution = async (overrides: Partial<AgentExecution>) => {
		const execution = repository.create({
			id: uuid(),
			status: 'success',
			userMessage: null,
			...overrides,
		} as Partial<AgentExecution>);
		return await repository.save(execution);
	};

	describe('findFirstUserMessageByThreadIds', () => {
		// The repository builds a raw SQL fragment referencing camelCase columns.
		// Postgres folds unquoted identifiers to lowercase, so this regression
		// fails on Postgres if the identifiers ever lose their double quotes.
		it('returns the earliest non-empty user message per thread', async () => {
			const threadA = await createThread({ sessionNumber: 1 });
			const threadB = await createThread({ id: uuid(), sessionNumber: 2 });

			await createExecution({
				threadId: threadA.id,
				userMessage: 'first A',
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: threadA.id,
				userMessage: 'second A',
				createdAt: new Date('2024-01-02T00:00:00Z'),
			});
			await createExecution({
				threadId: threadB.id,
				userMessage: 'only B',
				createdAt: new Date('2024-01-03T00:00:00Z'),
			});

			const result = await repository.findFirstUserMessageByThreadIds([threadA.id, threadB.id]);

			expect(result.get(threadA.id)).toBe('first A');
			expect(result.get(threadB.id)).toBe('only B');
			expect(result.size).toBe(2);
		});

		it('skips executions with null user messages when picking the earliest', async () => {
			const thread = await createThread();

			await createExecution({
				threadId: thread.id,
				userMessage: null,
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: thread.id,
				userMessage: 'real message',
				createdAt: new Date('2024-01-02T00:00:00Z'),
			});

			const result = await repository.findFirstUserMessageByThreadIds([thread.id]);

			expect(result.get(thread.id)).toBe('real message');
		});

		it('returns an empty map when no thread ids are provided', async () => {
			const result = await repository.findFirstUserMessageByThreadIds([]);

			expect(result.size).toBe(0);
		});

		it('omits threads that contain only null user messages', async () => {
			const thread = await createThread();

			await createExecution({
				threadId: thread.id,
				userMessage: null,
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});

			const result = await repository.findFirstUserMessageByThreadIds([thread.id]);

			expect(result.has(thread.id)).toBe(false);
		});
	});

	describe('findFirstSourceByThreadIds', () => {
		it('returns the earliest non-null source per thread', async () => {
			const threadA = await createThread({ sessionNumber: 1 });
			const threadB = await createThread({ id: uuid(), sessionNumber: 2 });

			await createExecution({
				threadId: threadA.id,
				source: 'slack',
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: threadA.id,
				source: 'telegram',
				createdAt: new Date('2024-01-02T00:00:00Z'),
			});
			await createExecution({
				threadId: threadB.id,
				source: 'telegram',
				createdAt: new Date('2024-01-03T00:00:00Z'),
			});

			const result = await repository.findFirstSourceByThreadIds([threadA.id, threadB.id]);

			expect(result.get(threadA.id)).toBe('slack');
			expect(result.get(threadB.id)).toBe('telegram');
			expect(result.size).toBe(2);
		});

		it('skips executions with null source when picking the earliest', async () => {
			const thread = await createThread();

			await createExecution({
				threadId: thread.id,
				source: null,
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: thread.id,
				source: 'slack',
				createdAt: new Date('2024-01-02T00:00:00Z'),
			});

			const result = await repository.findFirstSourceByThreadIds([thread.id]);

			expect(result.get(thread.id)).toBe('slack');
		});

		it('returns an empty map when no thread ids are provided', async () => {
			const result = await repository.findFirstSourceByThreadIds([]);

			expect(result.size).toBe(0);
		});

		it('omits threads that contain only null sources', async () => {
			const thread = await createThread();

			await createExecution({
				threadId: thread.id,
				source: null,
				createdAt: new Date('2024-01-01T00:00:00Z'),
			});

			const result = await repository.findFirstSourceByThreadIds([thread.id]);

			expect(result.has(thread.id)).toBe(false);
		});
	});

	describe('failure summaries', () => {
		it('aggregates counts and the latest failure per thread', async () => {
			const thread = await createThread();
			await createExecution({
				threadId: thread.id,
				failureSummary: {
					count: 1,
					latest: { kind: 'tool', name: 'Lookup', message: 'failed', occurredAt: 10 },
				},
			});
			const latest = await createExecution({
				threadId: thread.id,
				failureSummary: {
					count: 2,
					latest: { kind: 'execution', name: null, message: 'stopped', occurredAt: 20 },
				},
			});

			const result = await repository.findFailureSummariesByThreadIds([thread.id]);

			expect(result.get(thread.id)).toEqual({
				count: 3,
				latest: {
					kind: 'execution',
					name: null,
					message: 'stopped',
					occurredAt: 20,
					executionId: latest.id,
				},
			});
		});
	});

	describe('session filters', () => {
		it('filters all composite statuses using the latest execution and recovered failures', async () => {
			const running = await createThread({ sessionNumber: 1 });
			const succeeded = await createThread({ sessionNumber: 2 });
			const recovered = await createThread({ sessionNumber: 3 });
			const errored = await createThread({ sessionNumber: 4 });
			const olderFailure = {
				count: 1,
				latest: { kind: 'tool' as const, name: 'Lookup', message: 'failed', occurredAt: 10 },
			};

			await createExecution({
				threadId: running.id,
				status: 'error',
				failureSummary: olderFailure,
				createdAt: new Date('2026-01-01T00:00:00Z'),
			});
			await createExecution({
				threadId: running.id,
				status: 'running',
				failureSummary: null,
				createdAt: new Date('2026-01-02T00:00:00Z'),
			});
			await createExecution({ threadId: succeeded.id, status: 'success', failureSummary: null });
			await createExecution({
				threadId: recovered.id,
				status: 'success',
				failureSummary: olderFailure,
			});
			await createExecution({ threadId: errored.id, status: 'error', failureSummary: null });

			const idsFor = async (status: AgentSessionStatus) =>
				(
					await threadRepo.findByProjectIdPaginated(projectId, agentId, 20, undefined, {
						status,
					})
				).threads.map(({ id }) => id);

			expect(await idsFor('running')).toEqual([running.id]);
			expect(await idsFor('succeeded')).toEqual([succeeded.id]);
			expect(new Set(await idsFor('error'))).toEqual(new Set([recovered.id, errored.id]));

			const latestStatuses = await repository.findLatestStatusesByThreadIds([running.id]);
			expect(latestStatuses.get(running.id)).toBe('running');
		});

		it('mirrors the displayed origin precedence', async () => {
			const origins: Array<{
				sessionNumber: number;
				source: string | null;
				laterSource?: string;
				parentThreadId?: string;
				taskId?: string;
				expected: AgentSessionOrigin;
			}> = [
				{
					sessionNumber: 1,
					source: 'slack',
					parentThreadId: 'parent-1',
					taskId: 'task-1',
					expected: 'sub-agent',
				},
				{ sessionNumber: 2, source: 'subagent', expected: 'sub-agent' },
				{ sessionNumber: 3, source: 'slack', taskId: 'task-2', expected: 'schedule' },
				{ sessionNumber: 4, source: 'task', expected: 'schedule' },
				{ sessionNumber: 5, source: null, expected: 'preview' },
				{ sessionNumber: 6, source: 'chat', expected: 'preview' },
				{ sessionNumber: 7, source: 'slack', laterSource: 'workflow', expected: 'slack' },
			];
			const expectedIds = new Map<AgentSessionOrigin, string[]>();

			for (const origin of origins) {
				const thread = await createThread({
					sessionNumber: origin.sessionNumber,
					parentThreadId: origin.parentThreadId,
					taskId: origin.taskId,
				});
				await createExecution({
					threadId: thread.id,
					source: origin.source,
					createdAt: new Date('2026-01-01T00:00:00Z'),
				});
				if (origin.laterSource) {
					await createExecution({
						threadId: thread.id,
						source: origin.laterSource,
						createdAt: new Date('2026-01-02T00:00:00Z'),
					});
				}
				expectedIds.set(origin.expected, [...(expectedIds.get(origin.expected) ?? []), thread.id]);
			}

			for (const [origin, ids] of expectedIds) {
				const result = await threadRepo.findByProjectIdPaginated(
					projectId,
					agentId,
					20,
					undefined,
					{ origin },
				);
				expect(new Set(result.threads.map(({ id }) => id))).toEqual(new Set(ids));
			}
		});

		it('applies inclusive date and status filters before cursor pagination', async () => {
			const start = new Date('2026-01-01T00:00:00Z');
			const middle = new Date('2026-01-02T00:00:00Z');
			const end = new Date('2026-01-03T00:00:00Z');
			const oldest = await createThread({ sessionNumber: 1, updatedAt: start });
			const middleError = await createThread({ sessionNumber: 2, updatedAt: middle });
			const newest = await createThread({ sessionNumber: 3, updatedAt: end });
			await createExecution({ threadId: oldest.id, status: 'success', source: 'workflow' });
			await createExecution({ threadId: middleError.id, status: 'error', source: 'workflow' });
			await createExecution({ threadId: newest.id, status: 'success', source: 'workflow' });
			const filters: AgentSessionQueryFilters = {
				status: 'succeeded',
				origin: 'workflow',
				updatedAfter: start,
				updatedBefore: end,
			};

			const firstPage = await threadRepo.findByProjectIdPaginated(
				projectId,
				agentId,
				1,
				undefined,
				filters,
			);
			const secondPage = await threadRepo.findByProjectIdPaginated(
				projectId,
				agentId,
				1,
				firstPage.nextCursor ?? undefined,
				filters,
			);

			expect(firstPage.threads.map(({ id }) => id)).toEqual([newest.id]);
			expect(secondPage.threads.map(({ id }) => id)).toEqual([oldest.id]);
			expect(secondPage.nextCursor).toBeNull();
		});
	});
});
