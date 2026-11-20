import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import type { User, UserRepository } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import { EventEmitter } from 'node:events';
import { mock } from 'vitest-mock-extended';

import type { Publisher, Subscriber } from '@n8n/backend-services';

import { AgentChatResumeService } from '../agent-chat-resume.service';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import { AgentQueuedTestStreamService } from '../agent-queued-test-stream.service';
import type { FlushableResponse } from '../agent-sse-stream';
import type { AgentStreamChannel } from '../queue/agent-stream-channel.service';
import type { AgentTestRunService } from '../agent-test-run.service';
import { AgentRemoteTurnService } from '../queue/agent-remote-turn.service';
import type { AgentTurnGate } from '../queue/agent-turn-gate.service';
import { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue } from '../queue/agent-turn-queue.service';
import type {
	AgentChatResumeRequest,
	AgentTurnRequestPayload,
} from '../queue/agent-turn-request.types';
import type { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import type { AgentTurnRequestRepository } from '../repositories/agent-turn-request.repository';
import { testCluster } from './test-utils/cluster';

// The main polls a remote resume with `sleep`. A virtual clock lets the tests
// step through the fallback and the lost-worker timeouts without waiting.
let now = 0;
vi.mock('node:timers/promises', () => ({
	setTimeout: vi.fn(async (ms: number) => {
		now += ms;
		// Yield a full turn of the event loop, so that a simulated worker can run.
		await new Promise((resolve) => setImmediate(resolve));
	}),
}));

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
	let placement: AgentTurnPlacement;
	let turnQueue: ReturnType<typeof mock<AgentTurnQueue>>;
	let requests: ReturnType<typeof mock<AgentTurnRequestRepository>>;
	let userRepository: ReturnType<typeof mock<UserRepository>>;
	let testRuns: ReturnType<typeof mock<AgentTestRunService>>;
	let service: AgentChatResumeService;
	let remoteTurns: AgentRemoteTurnService;

	function setup({ workers }: { workers: boolean }) {
		placement = mock<AgentTurnPlacement>({
			dispatchEnabled: true,
			queueFull: async () => false,
			retryAfterSeconds: async () => 15,
			workersAvailable: async () => workers,
			mayFallBack: async (sentAt) => Date.now() - sentAt >= AgentTurnPlacement.FALLBACK_WAIT_MS,
		});
		turnQueue = mock<AgentTurnQueue>();
		requests = mock<AgentTurnRequestRepository>();
		requests.removeOlderThan.mockResolvedValue(0);
		requests.remove.mockResolvedValue();
		requests.findState.mockResolvedValue({ claimedBy: 'instance-a', result: null });
		userRepository = mock<UserRepository>();
		userRepository.findByIdWithRole.mockResolvedValue(user);
		testRuns = mock<AgentTestRunService>();
		testRuns.resumePreparedDraftRun.mockImplementation(async ({ onExecutionStarted }) => {
			onExecutionStarted?.('exec-1', 'thread-1', []);
			return { status: 'completed', executionId: 'exec-1' } as never;
		});
		// One process plays both the main and the worker: without relay across
		// processes, a sender delivers straight to the local listener.
		const streams = new AgentQueuedTestStreamService(
			mock<Publisher>(),
			testCluster(),
			mock<AgentMessageQueueRepository>(),
			mockLogger(),
			mock<Subscriber>(),
			mock<AgentStreamChannel>({ enabled: false }),
		);
		remoteTurns = new AgentRemoteTurnService(
			mockLogger(),
			mock<AgentsConfig>({ queueMaxWaitSeconds: 0 }),
			testCluster({ instanceKey: 'instance-a' }),
			placement,
			mock<AgentTurnGate>({ waitForRoom: async () => ({ admitted: true }) }),
			turnQueue,
			requests,
			streams,
		);
		service = new AgentChatResumeService(
			userRepository,
			testRuns,
			mock<AgentExecutionOrchestratorService>(),
			remoteTurns,
		);
	}

	beforeEach(() => {
		now = 1_000_000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('runs the resume in this process when no agent worker is up', async () => {
		setup({ workers: false });
		const writes: string[] = [];
		const res = makeSseResponse(writes);

		await service.relay(res, request, user);

		expect(requests.createPending).not.toHaveBeenCalled();
		expect(testRuns.resumePreparedDraftRun).toHaveBeenCalledOnce();
		expect(sentEvents(writes).map((event) => event.type)).toEqual(['execution-started', 'done']);
		expect(res.end).toHaveBeenCalled();
	});

	it('relays the events of a worker that claims the request', async () => {
		setup({ workers: true });
		const pending = new Map<string, AgentTurnRequestPayload>();
		requests.createPending.mockImplementation(async (id, payload) => {
			pending.set(id, payload);
		});
		requests.claim.mockImplementation(async (id) => {
			const payload = pending.get(id) ?? null;
			pending.delete(id);
			return payload;
		});
		requests.isPending.mockImplementation(async (id) => pending.has(id));
		turnQueue.enqueueRequest.mockImplementation(async (requestId) => {
			// The worker picks the job up after the main starts to wait.
			setImmediate(() => {
				remoteTurns.runRequest(requestId).catch(() => {});
			});
		});
		const writes: string[] = [];

		await service.relay(makeSseResponse(writes), request, user);

		expect(testRuns.resumePreparedDraftRun).toHaveBeenCalledOnce();
		expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-1');
		expect(sentEvents(writes).map((event) => event.type)).toEqual(['execution-started', 'done']);
		const requestId = requests.createPending.mock.calls[0][0];
		expect(requests.remove).toHaveBeenCalledWith(requestId);
	});

	it('claims and runs the resume itself when no worker claims it in time', async () => {
		setup({ workers: true });
		requests.isPending.mockResolvedValue(true);
		requests.claim.mockResolvedValue(request);
		const writes: string[] = [];

		await service.relay(makeSseResponse(writes), request, user);

		expect(turnQueue.enqueueRequest).toHaveBeenCalledOnce();
		expect(now - 1_000_000).toBeGreaterThanOrEqual(AgentTurnPlacement.FALLBACK_WAIT_MS);
		expect(requests.claim).toHaveBeenCalledWith(expect.any(String), 'instance-a');
		expect(testRuns.resumePreparedDraftRun).toHaveBeenCalledOnce();
		expect(sentEvents(writes).map((event) => event.type)).toEqual(['execution-started', 'done']);
	});

	it('runs the resume itself when the job cannot be sent', async () => {
		setup({ workers: true });
		turnQueue.enqueueRequest.mockRejectedValue(new Error('Redis unavailable'));
		requests.claim.mockResolvedValue(request);

		await service.relay(makeSseResponse([]), request, user);

		expect(testRuns.resumePreparedDraftRun).toHaveBeenCalledOnce();
	});

	it('reports a lost worker instead of running the resume twice', async () => {
		setup({ workers: true });
		// A worker claimed the request and then went silent.
		requests.isPending.mockResolvedValue(false);
		const writes: string[] = [];

		await service.relay(makeSseResponse(writes), request, user);

		expect(testRuns.resumePreparedDraftRun).not.toHaveBeenCalled();
		expect(requests.claim).not.toHaveBeenCalled();
		const events = sentEvents(writes);
		expect(events).toEqual([expect.objectContaining({ type: 'error' })]);
		expect(now - 1_000_000).toBeGreaterThanOrEqual(AgentRemoteTurnService.RELAY_TIMEOUT_MS);
	});

	describe('runRequest', () => {
		it('does nothing when another process claimed the request', async () => {
			setup({ workers: true });
			requests.claim.mockResolvedValue(null);

			await remoteTurns.runRequest('request-1');

			expect(testRuns.resumePreparedDraftRun).not.toHaveBeenCalled();
			expect(requests.remove).not.toHaveBeenCalled();
		});

		it('refuses a resume for a user who can no longer execute the agent', async () => {
			setup({ workers: true });
			requests.claim.mockResolvedValue(request);
			userRepository.findByIdWithRole.mockResolvedValue(null);

			await remoteTurns.runRequest('request-1');

			expect(testRuns.resumePreparedDraftRun).not.toHaveBeenCalled();
			expect(requests.remove).toHaveBeenCalledWith('request-1');
		});
	});
});
