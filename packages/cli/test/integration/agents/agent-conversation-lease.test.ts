import { GlobalConfig } from '@n8n/config';
import type { AgentDbMessage, SerializableAgentState } from '@n8n/agents';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { DataSource } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';
import { AgentMessageQueueRepository } from '@/modules/agents/repositories/agent-message-queue.repository';
import { AgentConversationLease } from '@/modules/agents/entities/agent-conversation-lease.entity';
import { retryUntil } from '../shared/retry-until';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentConversationLeaseService } from '@/modules/agents/agent-conversation-lease.service';
import {
	AgentConversationLeaseLostError,
	AgentConversationLeaseTimeoutError,
} from '@/modules/agents/agent-conversation-lease.types';
import { AgentConversationLeaseRepository } from '@/modules/agents/repositories/agent-conversation-lease.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('agent conversation ownership', () => {
	let repository: AgentConversationLeaseRepository;
	let leases: AgentConversationLeaseService;
	let agentId: string;
	let projectId: string;

	beforeAll(async () => {
		// These races require independent database connections.
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentConversationLeaseRepository);
		leases = Container.get(AgentConversationLeaseService);
	});

	beforeEach(async () => {
		const agents = Container.get(AgentRepository);
		await agents.delete({});
		const project = await createTeamProject();
		projectId = project.id;
		agentId = randomUUID();
		await agents.save(
			agents.create({ id: agentId, name: 'Agent', projectId: project.id, versionId: randomUUID() }),
		);
	});

	afterAll(async () => await testDb.terminate());

	it('grants one owner before history exists and permits independent conversations', async () => {
		const claims = await Promise.all([
			repository.acquire(agentId, 'first'),
			repository.acquire(agentId, 'first'),
		]);
		expect(claims.filter(Boolean)).toHaveLength(1);
		expect(await repository.acquire(agentId, 'second')).not.toBeNull();
		expect(await repository.count()).toBe(2);
	});

	it.each(['abort', 'timeout'])(
		'stops waiting on %s without changing the current owner',
		async (mode) => {
			await leases.withLease(agentId, 'busy', async () => {
				const owner = leases.requireOwner('busy');
				const controller = new AbortController();
				const attempted = createDeferredPromise();
				const acquire = repository.acquire.bind(repository);
				const acquisition = vi
					.spyOn(repository, 'acquire')
					.mockImplementationOnce(async (...args) => {
						const handle = await acquire(...args);
						attempted.resolve();
						return handle;
					});
				const run = vi.fn(async () => undefined);
				try {
					const waiting = leases.withLease(agentId, 'busy', run, {
						signal: controller.signal,
						waitTimeoutMs: mode === 'timeout' ? 0 : undefined,
					});
					const rejected =
						mode === 'timeout'
							? expect(waiting).rejects.toBeInstanceOf(AgentConversationLeaseTimeoutError)
							: expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
					await attempted.promise;
					if (mode === 'abort') controller.abort();
					await rejected;
					expect(run).not.toHaveBeenCalled();
					expect(await leases.write(owner, async () => true)).toBe(true);
				} finally {
					controller.abort();
					acquisition.mockRestore();
				}
			});
		},
	);

	it('rejects expired renewal and release without changing a successor', async () => {
		const former = await repository.acquire(agentId, 'conversation');
		if (!former) throw new Error('Missing first owner');
		await repository.update({ threadId: 'conversation' }, { expiresAt: new Date(0) });
		expect(await repository.renew(former)).toBe(false);
		expect(await repository.release(former)).toBe(false);
		const successor = await repository.acquire(agentId, 'conversation');
		expect(successor).not.toBeNull();
		expect(successor?.ownerToken).not.toBe(former.ownerToken);
		expect(await repository.renew(former)).toBe(false);
		expect(await repository.release(former)).toBe(false);
		expect(await repository.findOneByOrFail({ threadId: 'conversation' })).toMatchObject(
			successor!,
		);
	});

	it('rejects late writes even if the former runner ignores cancellation', async () => {
		await leases.withLease(agentId, 'conversation', async () => {
			const owner = leases.requireOwner('conversation');
			await repository.update({ threadId: 'conversation' }, { expiresAt: new Date(0) });
			const successor = await repository.acquire(agentId, 'conversation');
			await expect(
				leases.write(owner, async () => {
					throw new Error('The former owner reached its protected write');
				}),
			).rejects.toBeInstanceOf(AgentConversationLeaseLostError);
			expect(owner.signal.aborted).toBe(true);
			expect(await repository.findOneByOrFail({ threadId: 'conversation' })).toMatchObject(
				successor!,
			);
		});
		expect(await repository.isHeld('conversation')).toBe(true);
	});

	it('keeps a captured owner invalid after release and acquisition by the same main', async () => {
		const former = await leases.withLease(agentId, 'conversation', async () =>
			leases.requireOwner('conversation'),
		);
		await leases.withLease(agentId, 'conversation', async () => {
			const current = leases.requireOwner('conversation');
			expect(current.lease.ownerToken).not.toBe(former.lease.ownerToken);
			await expect(leases.write(former, async () => true)).rejects.toBeInstanceOf(
				AgentConversationLeaseLostError,
			);
			expect(await leases.write(current, async () => true)).toBe(true);
		});
		expect(await repository.count()).toBe(0);
	});
	it('rejects former-owner execution, checkpoint, and saved-message mutations', async () => {
		const memory = Container.get(N8nMemory).getImplementation(agentId);
		const checkpoints = Container.get(N8NCheckpointStorage);
		const executionRepository = Container.get(AgentExecutionRepository);
		const executions = new AgentExecutionService(
			mock(),
			executionRepository,
			Container.get(AgentExecutionThreadRepository),
			Container.get(N8nMemory),
			mock(),
			mock(),
			mock(),
			mock({ modeTag: 'db' }),
			mock(),
			mock(),
			Container.get(AgentMessageQueueRepository),
			leases,
		);
		const params = {
			agentId,
			projectId,
			threadId: 'protected',
			agentName: 'Agent',
			userMessage: 'Start',
		};
		const message: AgentDbMessage = {
			id: randomUUID(),
			role: 'user',
			content: [{ type: 'text', text: 'Original' }],
			createdAt: new Date(),
		};
		const state: SerializableAgentState = {
			status: 'suspended',
			persistence: { threadId: 'protected', resourceId: 'user' },
			messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
			pendingToolCalls: {},
		};
		await leases.withLease(agentId, 'protected', async () => {
			await memory.saveThread({ id: 'protected', resourceId: 'user' });
			await memory.saveMessages({ threadId: 'protected', resourceId: 'user', messages: [message] });
			await checkpoints.save('run', state, agentId);
			const executionId = await executions.startExecutionRecording(params, new Date());
			await repository.update({ threadId: 'protected' }, { expiresAt: new Date(0) });
			expect(await repository.acquire(agentId, 'protected')).not.toBeNull();

			executions.recordTimelineSnapshot({
				executionId,
				agentId,
				projectId,
				threadId: 'protected',
				timeline: [{ type: 'text', content: 'Late snapshot', timestamp: 1 }],
			});
			await Promise.all([...executions['timelineSnapshotWrites'].values()]);
			const writes = [
				async () => await executions.startExecutionRecording(params, new Date()),
				async () =>
					await executions.finalizeExecution(executionId, {
						...params,
						record: {
							assistantResponse: 'Late',
							model: null,
							finishReason: 'stop',
							usage: null,
							totalCost: null,
							timeline: [],
							startTime: Date.now(),
							duration: 1,
							error: null,
						},
					}),
				async () => await checkpoints.save('run', { ...state, status: 'running' }, agentId),
				async () => await checkpoints.claimForResume('run', state, agentId),
				async () => await checkpoints.cancelSuspended('run', state, agentId),
				async () => await checkpoints.delete('run', agentId),
				async () =>
					await memory.saveMessages({
						threadId: 'protected',
						resourceId: 'user',
						messages: [{ ...message, content: [{ type: 'text', text: 'Late replacement' }] }],
					}),
				async () => await memory.deleteMessages([message.id]),
				async () => await memory.deleteMessagesByThread('protected'),
				async () => await memory.deleteThread('protected'),
			];
			for (const write of writes)
				await expect(write()).rejects.toBeInstanceOf(AgentConversationLeaseLostError);
			expect(await executionRepository.findOneByOrFail({ id: executionId })).toMatchObject({
				status: 'running',
				timeline: null,
			});
			expect(await executionRepository.countBy({ threadId: 'protected' })).toBe(1);
			expect(await checkpoints.getStatus('run', agentId)).toEqual({
				status: 'active',
				checkpoint: state,
			});
			expect((await memory.getMessages('protected'))[0]).toMatchObject({
				content: message.content,
			});
		});
	});

	it('keeps stream creation, later chunks, and delayed callbacks in their creating context', async () => {
		const memory = Container.get(N8nMemory).getImplementation(agentId);
		const streams = ['one', 'two'].map((threadId) =>
			leases.stream(agentId, threadId, async function* () {
				const owner = leases.requireOwner(threadId);
				await memory.saveThread({ id: threadId, resourceId: 'user' });
				yield owner.lease.ownerToken;
				await Promise.resolve();
				expect(leases.requireOwner(threadId)).toBe(owner);
				await memory.saveMessages({
					threadId,
					resourceId: 'user',
					messages: [
						{
							id: randomUUID(),
							role: 'user',
							content: [{ type: 'text', text: threadId }],
							createdAt: new Date(),
						},
					],
				});
			}),
		);
		const first = await Promise.all(streams.map(async (stream) => await stream.next()));
		expect(first[0].value).not.toBe(first[1].value);
		expect(leases.currentOwner()).toBeUndefined();
		await Promise.all(streams.map(async (stream) => await stream.next()));
		expect(await Container.get(AgentMessageRepository).count()).toBeGreaterThanOrEqual(2);

		const releaseCallback = createDeferredPromise();
		let delayed: Promise<void> | undefined;
		const oldStream = await leases.withLease(agentId, 'one', async () => {
			delayed = releaseCallback.promise.then(
				async () => await memory.deleteMessagesByThread('one'),
			);
			return leases.stream(
				agentId,
				async () => 'one',
				async function* () {
					yield 'Must not run';
				},
			);
		});
		await leases.withLease(agentId, 'one', async () => {
			releaseCallback.resolve();
			await expect(delayed).rejects.toBeInstanceOf(AgentConversationLeaseLostError);
			await expect(oldStream.next()).rejects.toBeInstanceOf(AgentConversationLeaseLostError);
			expect(await memory.getMessages('one')).toHaveLength(1);
		});
	});

	it.each([false, true])('closes a stream in its owner context; borrowed=%s', async (borrowed) => {
		let closed = false;
		const consume = async () => {
			const parent = leases.currentOwner();
			const stream = leases.stream(agentId, 'closing', async function* () {
				const owner = leases.requireOwner('closing');
				try {
					yield 'first';
					yield 'second';
				} finally {
					expect(leases.requireOwner('closing')).toBe(owner);
					await leases.write(owner, async () => {
						closed = true;
					});
				}
			});
			await expect(stream.next()).resolves.toMatchObject({ value: 'first', done: false });
			await stream.return(undefined);
			expect(closed).toBe(true);
			expect(await repository.isHeld('closing')).toBe(borrowed);
			if (parent) expect(await leases.write(parent, async () => true)).toBe(true);
		};
		if (borrowed) await leases.withLease(agentId, 'closing', consume);
		else await consume();
		expect(await repository.isHeld('closing')).toBe(false);
	});

	it('lets a detached child finish after parent ownership ends', async () => {
		const started = createDeferredPromise();
		const finish = createDeferredPromise();
		let child: Promise<void> | undefined;
		await leases.withLease(agentId, 'parent', async () => {
			const parent = leases.requireOwner('parent');
			child = leases.outsideConversation(async () => {
				expect(leases.currentOwner()).toBeUndefined();
				await leases.withLease(agentId, 'child', async (signal) => {
					const owner = leases.requireOwner('child');
					started.resolve();
					await finish.promise;
					expect(parent.signal.aborted).toBe(true);
					expect(signal.aborted).toBe(false);
					expect(await leases.write(owner, async () => 'saved')).toBe('saved');
				});
			});
			await started.promise;
		});
		finish.resolve();
		await child;
	});

	it('stops renewal and later writes after a renewal failure', async () => {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
		const renewal = vi
			.spyOn(repository, 'renew')
			.mockRejectedValueOnce(new Error('Database unavailable'));
		try {
			await leases.withLease(agentId, 'renewal', async (signal) => {
				await vi.advanceTimersByTimeAsync(30_000);
				expect(signal.aborted).toBe(true);
				await expect(
					leases.write(leases.requireOwner('renewal'), async () => true),
				).rejects.toBeInstanceOf(AgentConversationLeaseLostError);
				await vi.advanceTimersByTimeAsync(30_000);
				expect(renewal).toHaveBeenCalledOnce();
			});
			expect(await repository.isHeld('renewal')).toBe(true);
		} finally {
			renewal.mockRestore();
			vi.useRealTimers();
		}
	});

	it('uses the database clock when process clocks differ', async () => {
		const clock = vi.spyOn(Date, 'now').mockReturnValue(0);
		try {
			const owner = await repository.acquire(agentId, 'clock');
			if (!owner) throw new Error('Missing owner');
			clock.mockReturnValue(9_000_000_000_000);
			expect(await repository.renew(owner)).toBe(true);
			expect(await repository.isHeld('clock')).toBe(true);
			expect(await repository.acquire(agentId, 'clock')).toBeNull();
		} finally {
			clock.mockRestore();
		}
	});

	async function waitForLeaseLock(dataSource: DataSource) {
		await retryUntil(async () => {
			const [row] = await dataSource.query<Array<{ waiting: boolean }>>(
				`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database()
				 AND wait_event_type = 'Lock' AND query LIKE '%agent_conversation_lease%') AS waiting`,
			);
			expect(row.waiting).toBe(true);
		});
	}

	it.runIf(process.env.DB_TYPE === 'postgresdb')(
		'checks expiry after waiting for the ownership row',
		async () => {
			const dataSource = Container.get(DataSource);
			const blocker = dataSource.createQueryRunner();
			try {
				await leases.withLease(agentId, 'blocked', async () => {
					const owner = leases.requireOwner('blocked');
					await blocker.startTransaction();
					try {
						await blocker.manager.update(AgentConversationLease, owner.lease, {
							ownerToken: owner.lease.ownerToken,
						});
						const mutation = vi.fn(async () => undefined);
						const write = leases.write(owner, mutation).catch((error: unknown) => error);
						await waitForLeaseLock(dataSource);
						// This timestamp is later than the waiting transaction's start time.
						await blocker.manager.update(AgentConversationLease, owner.lease, {
							expiresAt: () => 'clock_timestamp()',
						});
						await blocker.commitTransaction();
						expect(await write).toBeInstanceOf(AgentConversationLeaseLostError);
						expect(mutation).not.toHaveBeenCalled();
					} finally {
						if (blocker.isTransactionActive) await blocker.rollbackTransaction();
					}
				});
			} finally {
				await blocker.release();
			}
		},
	);

	it.runIf(process.env.DB_TYPE === 'postgresdb')(
		'holds ownership until the protected mutation commits',
		async () => {
			const entered = createDeferredPromise();
			const finish = createDeferredPromise();
			const queue = Container.get(AgentMessageQueueRepository);
			const entry = await queue.enqueue({
				agentId,
				threadId: 'atomic',
				payload: {
					source: 'preview',
					kind: 'message',
					projectId,
					userId: 'user',
					resourceId: 'user',
					message: 'Start',
				},
			});
			const writing = leases.withLease(agentId, 'atomic', async () => {
				await leases.write(leases.requireOwner('atomic'), async (ctx) => {
					entered.resolve();
					await finish.promise;
					expect(await queue.markProcessing(entry.id, ctx)).toBe(true);
				});
			});
			await entered.promise;
			const expiring = repository.update({ threadId: 'atomic' }, { expiresAt: new Date(0) });
			try {
				await waitForLeaseLock(Container.get(DataSource));
			} finally {
				finish.resolve();
				await Promise.all([writing, expiring]);
			}
			const successor = await repository.acquire(agentId, 'atomic');
			expect(successor).not.toBeNull();
			expect(await queue.findOneByOrFail({ id: entry.id })).toMatchObject({ status: 'processing' });
		},
	);
});
