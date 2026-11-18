import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import type { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';
import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import {
	AgentExecutionRepository,
	type AgentProductionTraceFilter,
} from '@/modules/agents/repositories/agent-execution.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { PRODUCTION_TRACE_SOURCES } from '@/modules/agents/utils/agent-thread-access';

import { createMember } from '../shared/db/users';

describe('AgentExecutionRepository production sessions', () => {
	let threadRepo: AgentExecutionThreadRepository;
	let agentRepo: AgentRepository;
	let executionRepo: AgentExecutionRepository;
	let projectId: string;
	let agentId: string;
	let readerId: string;
	let otherUserId: string;
	let minute = 0;

	const after = new Date('2026-09-01T00:00:00.000Z');
	const until = new Date('2026-09-02T00:00:00.000Z');
	const insideWindow = () => new Date(after.getTime() + ++minute * 60_000);

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threadRepo = Container.get(AgentExecutionThreadRepository);
		agentRepo = Container.get(AgentRepository);
		executionRepo = Container.get(AgentExecutionRepository);
		readerId = (await createMember()).id;
		otherUserId = (await createMember()).id;
	});

	beforeEach(async () => {
		minute = 0;
		projectId = (await createTeamProject()).id;
		agentId = await createAgent(projectId);
	});

	afterEach(async () => {
		await executionRepo.delete({});
		await threadRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createAgent(inProjectId: string): Promise<string> {
		const agent = await agentRepo.save(
			agentRepo.create({
				id: randomUUID(),
				name: 'Agent',
				projectId: inProjectId,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);
		return agent.id;
	}

	async function createThread(
		overrides: Partial<AgentExecutionThread> = {},
	): Promise<AgentExecutionThread> {
		return await threadRepo.save(
			threadRepo.create({
				id: randomUUID(),
				agentId,
				agentName: 'Agent',
				projectId,
				accessScope: 'project',
				ownerId: null,
				...overrides,
			}),
		);
	}

	async function createExecution(
		thread: AgentExecutionThread,
		overrides: Partial<AgentExecution> = {},
	): Promise<string> {
		const { createdAt = insideWindow(), ...values } = overrides;
		const execution = await executionRepo.save(
			executionRepo.create({
				id: randomUUID(),
				threadId: thread.id,
				status: 'success',
				source: 'slack',
				...values,
			}),
		);
		await executionRepo.update({ id: execution.id }, { createdAt });
		return execution.id;
	}

	const filter = (overrides: Partial<AgentProductionTraceFilter> = {}) => ({
		projectId,
		agentId,
		readerId,
		after,
		until,
		...overrides,
	});

	/**
	 * The ids of the turns that are production traces. The session count, the
	 * session list and the turns of the sessions must agree.
	 */
	async function matches(
		candidateIds: string[],
		traceFilter: AgentProductionTraceFilter = filter(),
	): Promise<string[]> {
		const sessions = await executionRepo.findProductionTraceSessions(traceFilter, 100, 0);
		expect(await executionRepo.countProductionTraceSessions(traceFilter)).toBe(sessions.length);
		const turns = await executionRepo.findProductionTracesInThreads(
			traceFilter,
			sessions.map(({ threadId }) => threadId),
		);
		expect(sessions.reduce((sum, { turnCount }) => sum + turnCount, 0)).toBe(turns.length);

		const candidates = await executionRepo.findBy({ id: In(candidateIds) });
		for (const candidate of candidates) {
			const inThread = await executionRepo.findProductionTracesInThreads(traceFilter, [
				candidate.threadId,
			]);
			expect(inThread.some(({ id }) => id === candidate.id)).toBe(
				turns.some(({ id }) => id === candidate.id),
			);
		}
		return turns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(({ id }) => id);
	}

	describe('sessions', () => {
		const sessionsIn = async (traceFilter: AgentProductionTraceFilter) =>
			await executionRepo.findProductionTraceSessions(traceFilter, 100, 0);

		it('counts two turns of one session in a window once', async () => {
			const thread = await createThread();
			await createExecution(thread);
			const newest = insideWindow();
			await createExecution(thread, { createdAt: newest });

			expect(await executionRepo.countProductionTraceSessions(filter())).toBe(1);
			expect(await sessionsIn(filter())).toEqual([
				{ threadId: thread.id, turnCount: 2, lastActivityAt: newest },
			]);
		});

		it('counts a session with turns in two windows in each window', async () => {
			const thread = await createThread();
			const inFirst = await createExecution(thread);
			const inSecond = await createExecution(thread, {
				createdAt: new Date(until.getTime() + 60_000),
			});
			const secondWindow = filter({
				after: until,
				until: new Date(until.getTime() + 3_600_000),
			});

			expect(await executionRepo.countProductionTraceSessions(filter())).toBe(1);
			expect(await executionRepo.countProductionTraceSessions(secondWindow)).toBe(1);
			const turnIds = async (traceFilter: AgentProductionTraceFilter) =>
				(await executionRepo.findProductionTracesInThreads(traceFilter, [thread.id])).map(
					({ id }) => id,
				);
			expect(await turnIds(filter())).toEqual([inFirst]);
			expect(await turnIds(secondWindow)).toEqual([inSecond]);
		});

		it('does not find a session that has no matching turn in the window', async () => {
			const onlyBefore = await createThread();
			await createExecution(onlyBefore, { createdAt: new Date(after.getTime() - 1000) });
			const onlyPreview = await createThread();
			await createExecution(onlyPreview, { source: 'chat' });

			expect(await executionRepo.countProductionTraceSessions(filter())).toBe(0);
			expect(await sessionsIn(filter())).toEqual([]);
			expect(
				await executionRepo.findProductionTracesInThreads(filter(), [
					onlyBefore.id,
					onlyPreview.id,
				]),
			).toEqual([]);
		});

		it('returns only the matching turns of a session, oldest first', async () => {
			const thread = await createThread();
			await createExecution(thread, { createdAt: new Date(after.getTime() - 1000) });
			const first = await createExecution(thread);
			await createExecution(thread, { source: 'chat' });
			const second = await createExecution(thread);

			const turns = await executionRepo.findProductionTracesInThreads(filter(), [thread.id]);

			expect(turns.map(({ id }) => id)).toEqual([first, second]);
			expect(await sessionsIn(filter())).toMatchObject([{ threadId: thread.id, turnCount: 2 }]);
		});

		it('lists sessions by newest activity and pages with limit and offset', async () => {
			const oldest = await createThread();
			const middle = await createThread();
			const newest = await createThread();
			await createExecution(newest);
			await createExecution(oldest);
			await createExecution(middle);
			await createExecution(newest);

			const page = async (limit: number, offset: number) =>
				(await executionRepo.findProductionTraceSessions(filter(), limit, offset)).map(
					({ threadId }) => threadId,
				);

			expect(await page(2, 0)).toEqual([newest.id, middle.id]);
			expect(await page(2, 2)).toEqual([oldest.id]);
		});
	});

	describe('window bounds', () => {
		it('excludes the lower bound and includes the upper bound', async () => {
			const thread = await createThread();
			const beforeWindow = await createExecution(thread, {
				createdAt: new Date(after.getTime() - 1000),
			});
			const atAfter = await createExecution(thread, { createdAt: after });
			const justAfter = await createExecution(thread, {
				createdAt: new Date(after.getTime() + 1000),
			});
			const atUntil = await createExecution(thread, { createdAt: until });
			const afterUntil = await createExecution(thread, {
				createdAt: new Date(until.getTime() + 1000),
			});

			expect(await matches([beforeWindow, atAfter, justAfter, atUntil, afterUntil])).toEqual([
				atUntil,
				justAfter,
			]);
		});

		it('has no lower bound when `after` is null', async () => {
			const thread = await createThread();
			const old = await createExecution(thread, { createdAt: new Date('2020-01-01T00:00:00Z') });
			const afterUntil = await createExecution(thread, {
				createdAt: new Date(until.getTime() + 1000),
			});

			expect(await matches([old, afterUntil], filter({ after: null }))).toEqual([old]);
		});
	});

	describe('source allow-list', () => {
		it.each([...PRODUCTION_TRACE_SOURCES])('counts the production source %s', async (source) => {
			const thread = await createThread();
			const id = await createExecution(thread, { source });

			expect(await matches([id])).toEqual([id]);
		});

		it.each(['chat', 'n8n_chat', '', 'workflow', 'mcp', 'instance-ai', 'subagent', 'system_chat'])(
			'does not count the source "%s"',
			async (source) => {
				const thread = await createThread();
				const id = await createExecution(thread, { source });

				expect(await matches([id])).toEqual([]);
			},
		);

		it('does not count an execution without a source', async () => {
			const thread = await createThread();
			const id = await createExecution(thread, { source: null });

			expect(await matches([id])).toEqual([]);
		});
	});

	describe('task source', () => {
		it('counts a task run only when the thread has a published task version', async () => {
			const versionId = randomUUID();
			await Container.get(AgentHistoryRepository).saveVersion(
				{
					versionId,
					agentId,
					schema: { name: 'Agent', model: 'openai:gpt-4o-mini', instructions: 'Help' },
					tools: {},
					publishedBy: 'test',
				},
				{},
			);
			const publishedTask = await createThread({ taskId: 'task-1', taskVersionId: versionId });
			const manualTask = await createThread({ taskId: 'task-1', taskVersionId: null });
			const published = await createExecution(publishedTask, { source: 'task' });
			const manual = await createExecution(manualTask, { source: 'task' });

			expect(await matches([published, manual])).toEqual([published]);
		});
	});

	describe('execution state', () => {
		it('counts a settled execution of each status and skips a running execution', async () => {
			const thread = await createThread();
			const running = await createExecution(thread, { status: 'running' });
			const failed = await createExecution(thread, { status: 'error' });
			const awaiting = await createExecution(thread, { status: 'awaiting' });

			expect(await matches([running, failed, awaiting])).toEqual([awaiting, failed]);
		});

		it('counts a suspended execution once and skips the resumed execution', async () => {
			const thread = await createThread();
			const suspended = await createExecution(thread, { hitlStatus: 'suspended' });
			const resumed = await createExecution(thread, { hitlStatus: 'resumed' });

			expect(await matches([suspended, resumed])).toEqual([suspended]);
		});

		it('skips the executions of a sub-agent', async () => {
			const parentThread = await createThread();
			const parent = await createExecution(parentThread);
			const childThread = await createThread({ parentThreadId: parentThread.id });
			const delegated = await createExecution(childThread, { parentExecutionId: parent });
			// A resumed child keeps the thread link when the parent execution is deleted.
			const childWithoutParent = await createExecution(childThread);
			const linkedInTopLevelThread = await createExecution(parentThread, {
				parentExecutionId: parent,
			});

			expect(
				await matches([parent, delegated, childWithoutParent, linkedInTopLevelThread]),
			).toEqual([parent]);
		});
	});

	describe('access scope', () => {
		it('counts a project thread and the private thread of the reader only', async () => {
			const shared = await createExecution(await createThread());
			const own = await createExecution(
				await createThread({ accessScope: 'user', ownerId: readerId }),
				{ source: 'n8n_chat_production' },
			);
			const foreign = await createExecution(
				await createThread({ accessScope: 'user', ownerId: otherUserId }),
				{ source: 'n8n_chat_production' },
			);
			const ownerless = await createExecution(
				await createThread({ accessScope: 'user', ownerId: null }),
				{ source: 'n8n_chat_production' },
			);

			expect(await matches([shared, own, foreign, ownerless])).toEqual([own, shared]);
			expect(await matches([foreign], filter({ readerId: otherUserId }))).toEqual([
				foreign,
				shared,
			]);
		});

		it('does not count the traces of another agent or another project', async () => {
			const otherAgentId = await createAgent(projectId);
			const otherProjectId = (await createTeamProject()).id;
			const agentInOtherProject = await createAgent(otherProjectId);
			const own = await createExecution(await createThread());
			const otherAgent = await createExecution(await createThread({ agentId: otherAgentId }));
			const otherProject = await createExecution(
				await createThread({ agentId: agentInOtherProject, projectId: otherProjectId }),
			);

			expect(await matches([own, otherAgent, otherProject])).toEqual([own]);
			expect(await matches([own], filter({ projectId: otherProjectId }))).toEqual([]);
		});
	});
});
