import { AGENT_CHAT_ERROR_CODES } from '@n8n/api-types';
import type { AgentsConfig } from '@n8n/config';
import type { User, UserRepository } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import { EventEmitter } from 'node:events';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentChatResumeService } from '../agent-chat-resume.service';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { FlushableResponse } from '../agent-sse-stream';
import type { AgentTestRunService } from '../agent-test-run.service';
import type { AgentTurnGate } from '../queue/agent-turn-gate.service';
import type { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue } from '../queue/agent-turn-queue.service';
import type { AgentChatResumeRequest } from '../queue/agent-turn-request.types';
import { QueuedTurnRunner } from '../queue/queued-turn-runner';
import { fakeStreamChannel } from './test-utils/stream-channel';
import { fakeRequests, testTurns } from './test-utils/turns';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

function makeSseResponse(writes: string[]) {
	const emitter = new EventEmitter();
	const res = Object.assign(emitter, {
		socket: { setTimeout: vi.fn(), setNoDelay: vi.fn(), setKeepAlive: vi.fn() },
		setHeader: vi.fn(),
		flushHeaders: vi.fn(),
		write: vi.fn((chunk: string) => {
			writes.push(String(chunk));
			return true;
		}),
		flush: vi.fn(),
		end: vi.fn(),
		writableEnded: false,
		destroyed: false,
	});
	res.end.mockImplementation(() => {
		res.writableEnded = true;
		emitter.emit('finish');
	});
	return res as unknown as FlushableResponse & { end: ReturnType<typeof vi.fn> };
}

function sentEvents(writes: string[]): Array<{ type: string } & Record<string, unknown>> {
	return writes
		.filter((write) => write.startsWith('data: '))
		.map((write) => jsonParse<{ type: string } & Record<string, unknown>>(write.slice(6)));
}

const request: AgentChatResumeRequest = {
	kind: 'chat-resume',
	surface: 'preview',
	agentId: 'agent-1',
	projectId: 'project-1',
	userId: 'user-1',
	runId: 'run-1',
	toolCallId: 'tool-1',
	resumeData: { approved: true },
};

describe('AgentChatResumeService', () => {
	const user = mock<User>({ id: 'user-1', disabled: false });
	let userRepository: ReturnType<typeof mock<UserRepository>>;
	let testRuns: ReturnType<typeof mock<AgentTestRunService>>;
	let service: AgentChatResumeService;

	function setup({
		workers,
		turnQueue,
		queueMaxWaitSeconds = 0,
	}: {
		workers: boolean;
		turnQueue?: AgentTurnQueue;
		queueMaxWaitSeconds?: number;
	}) {
		const placement = mock<AgentTurnPlacement>({
			dispatchEnabled: true,
			mayRunHere: () => true,
			queueFull: async () => false,
			retryAfterSeconds: async () => 15,
			workersAvailable: async () => workers,
		});
		const { requests, rows } = fakeRequests();
		const { channel, published } = fakeStreamChannel();
		userRepository = mock<UserRepository>();
		userRepository.findByIdWithRole.mockResolvedValue(user);
		vi.mocked(userHasScopes).mockResolvedValue(true);
		testRuns = mock<AgentTestRunService>();
		testRuns.resumePreparedDraftRun.mockImplementation(async ({ onExecutionStarted }) => {
			onExecutionStarted?.('exec-1', 'thread-1', []);
			return { status: 'completed', executionId: 'exec-1' } as never;
		});
		const turns = testTurns({
			placement,
			gate: mock<AgentTurnGate>({
				waitForRoom: async () => ({ admitted: true }),
				rejected: vi.fn(),
			}),
			agentsConfig: mock<AgentsConfig>({ queueMaxWaitSeconds }),
			turnQueue,
			requests,
			channel,
		});
		service = new AgentChatResumeService(
			userRepository,
			testRuns,
			mock<AgentExecutionOrchestratorService>(),
			turns.dispatcher,
			turns.handlers,
		);
		return { ...turns, requests, rows, published };
	}

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	const useFakeTimers = () =>
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

	it('runs the resume in this process when no agent worker is up', async () => {
		const { requests } = setup({ workers: false });
		const writes: string[] = [];
		const res = makeSseResponse(writes);

		await service.relay(res, request);

		expect(requests.createPendingIfAbsent).not.toHaveBeenCalled();
		expect(testRuns.resumePreparedDraftRun).toHaveBeenCalledOnce();
		expect(sentEvents(writes).map((event) => event.type)).toEqual(['execution-started', 'done']);
		expect(res.end).toHaveBeenCalled();
	});

	it('relays the events of a worker that claims the request', async () => {
		const { requests, rows, queued } = setup({ workers: true });
		const writes: string[] = [];

		await service.relay(makeSseResponse(writes), request);
		await queued.whenIdle();

		expect(testRuns.resumePreparedDraftRun).toHaveBeenCalledOnce();
		expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-1');
		expect(sentEvents(writes).map((event) => event.type)).toEqual(['execution-started', 'done']);
		const requestId = requests.createPendingIfAbsent.mock.calls[0][0];
		expect(requests.remove).toHaveBeenCalledWith(requestId);
		expect(rows.size).toBe(0);
	});

	it('rejects the resume as busy when no worker claims it in time, and never runs it', async () => {
		useFakeTimers();
		// No worker takes the job.
		const turnQueue = mock<AgentTurnQueue>({ enqueueRequest: async () => {} });
		const { requests, rows } = setup({ workers: true, turnQueue, queueMaxWaitSeconds: 10 });
		const writes: string[] = [];

		const relayed = service.relay(makeSseResponse(writes), request);
		await vi.advanceTimersByTimeAsync(10_000);
		await relayed;

		expect(testRuns.resumePreparedDraftRun).not.toHaveBeenCalled();
		// The main claimed the row, so a worker that comes later does not run it.
		expect(requests.claim).toHaveBeenCalledWith(expect.any(String), 'instance-a');
		expect(rows.size).toBe(0);
		expect(sentEvents(writes)).toEqual([
			expect.objectContaining({
				type: 'error',
				errorCode: AGENT_CHAT_ERROR_CODES.mainBusy,
				retryAfterSeconds: 15,
			}),
		]);
	});

	it('rejects the resume as busy when the job cannot be sent', async () => {
		const turnQueue = mock<AgentTurnQueue>();
		turnQueue.enqueueRequest.mockRejectedValue(new Error('Redis unavailable'));
		const { rows } = setup({ workers: true, turnQueue });
		const writes: string[] = [];

		await service.relay(makeSseResponse(writes), request);

		expect(testRuns.resumePreparedDraftRun).not.toHaveBeenCalled();
		expect(rows.size).toBe(0);
		// The queue is down, not full.
		expect(sentEvents(writes)).toEqual([
			expect.objectContaining({ type: 'error', errorCode: AGENT_CHAT_ERROR_CODES.mainBusy }),
		]);
	});

	it('reports a lost worker instead of running the resume twice', async () => {
		useFakeTimers();
		// A worker claims the request and then goes silent.
		const worker: { turns?: ReturnType<typeof setup> } = {};
		const turnQueue = mock<AgentTurnQueue>({
			enqueueRequest: async (turnId) => {
				await worker.turns?.requests.claim(turnId, 'worker-1');
				await worker.turns?.channel.publishTo(
					`turn:${turnId}`,
					JSON.stringify({ type: 'claimed' }),
				);
			},
		});
		worker.turns = setup({ workers: true, turnQueue });
		const writes: string[] = [];

		const relayed = service.relay(makeSseResponse(writes), request);
		await vi.advanceTimersByTimeAsync(QueuedTurnRunner.LOST_AFTER_MS);
		await relayed;

		expect(testRuns.resumePreparedDraftRun).not.toHaveBeenCalled();
		expect(sentEvents(writes)).toEqual([expect.objectContaining({ type: 'error' })]);
	});

	describe('worker side', () => {
		it('does nothing when another process claimed the request', async () => {
			const { worker, requests, rows } = setup({ workers: true });
			await requests.createPending('request-1', request);
			await requests.claim('request-1', 'main');

			await worker.runJob('request-1');

			expect(testRuns.resumePreparedDraftRun).not.toHaveBeenCalled();
			expect(rows.has('request-1')).toBe(true);
		});

		it('refuses a resume for a user who can no longer execute the agent', async () => {
			const { worker, requests, rows, published } = setup({ workers: true });
			await requests.createPending('request-1', request);
			userRepository.findByIdWithRole.mockResolvedValue(null);

			await worker.runJob('request-1');

			expect(testRuns.resumePreparedDraftRun).not.toHaveBeenCalled();
			expect(rows.size).toBe(0);
			const sent = published.map(({ message }) => message).join('\n');
			expect(sent).toContain('You can no longer execute this agent');
		});

		it('refuses a resume for a user who lost the execute scope in the project', async () => {
			const { worker, requests, published } = setup({ workers: true });
			await requests.createPending('request-1', request);
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await worker.runJob('request-1');

			expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:execute'], false, {
				projectId: 'project-1',
			});
			expect(testRuns.resumePreparedDraftRun).not.toHaveBeenCalled();
			const sent = published.map(({ message }) => message).join('\n');
			expect(sent).toContain('You can no longer execute this agent');
		});
	});
});
