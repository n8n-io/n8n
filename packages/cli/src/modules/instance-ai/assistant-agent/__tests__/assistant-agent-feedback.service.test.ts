import { AssistantAgentFeedbackRequestDto, ASSISTANT_TRACE_EVENT } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { submitLangsmithUserFeedback, type ServiceProxyConfig } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { SystemAgentTurnEventsService } from '@/modules/agents/system-agents/system-agent-turn-events.service';

import type { AssistantTurnEnvironmentFactory } from '../../turn-setup/assistant-turn-environment.factory';
import { AssistantAgentFeedbackService } from '../assistant-agent-feedback.service';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	submitLangsmithUserFeedback: vi.fn(async () => true),
}));

const THREAD_ID = 'thread-1';

describe('AssistantAgentFeedbackService', () => {
	const user = mock<User>({ id: 'user-1' });
	const turnEvents = mock<SystemAgentTurnEventsService>();
	const turnEnvironment = mock<AssistantTurnEnvironmentFactory>();
	const proxyConfig = mock<ServiceProxyConfig>();
	const log = mock<Logger>();
	log.scoped.mockReturnValue(log);
	const service = new AssistantAgentFeedbackService(log, turnEvents, turnEnvironment);

	const request = (rating: 'up' | 'down') =>
		new AssistantAgentFeedbackRequestDto({ executionId: 'exec-1', rating });

	beforeEach(() => {
		vi.clearAllMocks();
		turnEnvironment.createProxyRunConfig.mockResolvedValue({ tracingProxyConfig: proxyConfig });
	});

	it('reads the trace ids that the turn recorded and rates the root of the turn', async () => {
		turnEvents.readHostEvent.mockResolvedValue({
			traceId: 'otel-1',
			langsmithTraceId: 'ls-trace-1',
			langsmithRunId: 'root-1',
		});

		await service.submit(user, THREAD_ID, request('up'));

		expect(turnEvents.readHostEvent).toHaveBeenCalledWith(
			ASSISTANT_AGENT_ID,
			user,
			THREAD_ID,
			'exec-1',
			ASSISTANT_TRACE_EVENT,
			'turn',
		);
		expect(submitLangsmithUserFeedback).toHaveBeenCalledWith({
			langsmithRunId: 'root-1',
			langsmithTraceId: 'ls-trace-1',
			key: 'user_score',
			score: 1,
			value: 'up',
			feedbackId: expect.any(String),
			sourceInfo: {
				thread_id: THREAD_ID,
				execution_id: 'exec-1',
				user_id: 'user-1',
				rating: 'up',
				assistant_runtime: 'agents',
			},
			proxyConfig,
		});
	});

	it('rates the turn root of a resumed turn', async () => {
		turnEvents.readHostEvent.mockResolvedValue({
			langsmithTraceId: 'ls-trace-2',
			langsmithRunId: 'resume-root',
			turnLangsmithTraceId: 'ls-trace-1',
			turnLangsmithRunId: 'root-1',
		});

		await service.submit(user, THREAD_ID, request('down'));

		expect(submitLangsmithUserFeedback).toHaveBeenCalledWith(
			expect.objectContaining({
				langsmithRunId: 'root-1',
				langsmithTraceId: 'ls-trace-1',
				score: 0,
				value: 'down',
			}),
		);
	});

	it('gives each rating of a turn the same feedback id, so a new rating replaces the old one', async () => {
		turnEvents.readHostEvent.mockResolvedValue({
			langsmithTraceId: 'ls-trace-1',
			langsmithRunId: 'root-1',
		});

		await service.submit(user, THREAD_ID, request('up'));
		await service.submit(user, THREAD_ID, request('down'));

		const [first, second] = vi.mocked(submitLangsmithUserFeedback).mock.calls;
		expect(first[0].feedbackId).toBe(second[0].feedbackId);
	});

	it('skips a turn without a trace', async () => {
		turnEvents.readHostEvent.mockResolvedValue(undefined);

		await expect(service.submit(user, THREAD_ID, request('up'))).resolves.toBeUndefined();

		expect(submitLangsmithUserFeedback).not.toHaveBeenCalled();
	});

	it('rejects a thread that the user cannot use', async () => {
		turnEvents.readHostEvent.mockRejectedValue(new NotFoundError('Session not found'));

		await expect(service.submit(user, THREAD_ID, request('up'))).rejects.toThrow(NotFoundError);
		expect(submitLangsmithUserFeedback).not.toHaveBeenCalled();
	});

	it('logs a failed send and does not throw', async () => {
		turnEvents.readHostEvent.mockResolvedValue({
			langsmithTraceId: 'ls-trace-1',
			langsmithRunId: 'root-1',
		});
		vi.mocked(submitLangsmithUserFeedback).mockRejectedValueOnce(new Error('LangSmith is down'));

		await expect(service.submit(user, THREAD_ID, request('up'))).resolves.toBeUndefined();

		expect(log.warn).toHaveBeenCalledWith(
			'Failed to submit Assistant agent feedback to LangSmith',
			expect.objectContaining({ executionId: 'exec-1', error: 'LangSmith is down' }),
		);
	});
});
