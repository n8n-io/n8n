import type {
	AgentChatMessagesResponse,
	AgentThreadUsageResponse,
	InstanceAiConfirmRequest,
} from '@n8n/api-types';
import { vi } from 'vitest';

import {
	waitForAssistantAgentActivity,
	type AssistantAgentWaitConfig,
	type AssistantAgentWaitClient,
} from '../harness/assistant-agents';
import { RunTimeoutError } from '../harness/timeouts';
import type { CapturedEvent } from '../types';

const SENT_AT = Date.parse('2026-11-11T10:00:00.000Z');

const finishedTurn: AgentChatMessagesResponse['messages'][number] = {
	id: 'exec-1:assistant',
	role: 'assistant',
	executionId: 'exec-1',
	executionStatus: 'success',
	createdAt: new Date(SENT_AT + 1_000).toISOString(),
	content: [{ type: 'text', text: 'Done.' }],
};

function history(overrides: Partial<AgentChatMessagesResponse> = {}): AgentChatMessagesResponse {
	return { messages: [], openSuspensions: [], activeExecutionId: null, ...overrides };
}

const noUsage: AgentThreadUsageResponse = {
	executions: [],
	total: {
		promptTokens: null,
		completionTokens: null,
		totalTokens: null,
		cacheReadTokens: null,
		cacheWriteTokens: null,
		cost: null,
	},
};

/** Serves the given history snapshots in order, then repeats the last one. */
function scriptedClient(snapshots: AgentChatMessagesResponse[], usage = noUsage) {
	let call = 0;
	const client = {
		getHistory: vi.fn(async () => snapshots[Math.min(call++, snapshots.length - 1)]),
		resume: vi.fn(
			async (_runId: string, _toolCallId: string, _body: InstanceAiConfirmRequest) => {},
		),
		getUsage: vi.fn(async () => usage),
	} satisfies AssistantAgentWaitClient;
	return client;
}

/** A user message that an execution took, as the history shows it. */
const takenUserMessage: AgentChatMessagesResponse['messages'][number] = {
	id: 'user-1',
	role: 'user',
	executionId: 'exec-1',
	createdAt: new Date(SENT_AT + 100).toISOString(),
	content: [{ type: 'text', text: 'Build it' }],
};

/** Usage that lists one top-level execution with the given status. */
function usageWith(status: 'error' | 'success'): AgentThreadUsageResponse {
	return {
		...noUsage,
		executions: [
			{
				...noUsage.total,
				executionId: 'exec-1',
				threadId: 'thread-1',
				parentExecutionId: null,
				status,
				model: null,
				startedAt: new Date(SENT_AT + 100).toISOString(),
				stoppedAt: new Date(SENT_AT + 200).toISOString(),
				duration: 100,
				descendants: [],
				total: noUsage.total,
			},
		],
	};
}

function config(
	client: AssistantAgentWaitClient,
	overrides: Partial<AssistantAgentWaitConfig> = {},
): AssistantAgentWaitConfig {
	return {
		client,
		threadId: 'thread-1',
		events: [],
		approvedRequests: new Set<string>(),
		sentAt: SENT_AT,
		confirmationStrategy: () => ({ kind: 'approval', approved: true }),
		confirmationRetries: new Map<string, number>(),
		maxConfirmationRetries: 5,
		timeoutBreach: () => undefined,
		onTimeout: async (breach) => {
			throw new RunTimeoutError(breach);
		},
		log: () => {},
		quietPolls: 3,
		pollIntervalMs: 0,
		pause: async () => {},
		...overrides,
	};
}

describe('waitForAssistantAgentActivity', () => {
	it('waits through a busy thread and returns after the quiet polls', async () => {
		const client = scriptedClient([
			history({ activeExecutionId: 'exec-1' }),
			history({ activeExecutionId: 'exec-1' }),
			history({ messages: [finishedTurn] }),
		]);
		const events: CapturedEvent[] = [];

		await waitForAssistantAgentActivity(config(client, { events }));

		// Two busy polls, then three quiet ones.
		expect(client.getHistory).toHaveBeenCalledTimes(5);
		expect(events.map((event) => event.type)).toEqual(['run-start', 'text-delta', 'run-finish']);
	});

	it('does not count quiet polls before the turn shows any sign of life', async () => {
		const client = scriptedClient([
			history(),
			history(),
			history({ activeExecutionId: 'exec-1' }),
			history({ messages: [finishedTurn] }),
		]);

		await waitForAssistantAgentActivity(config(client));

		// Two idle polls before the turn starts do not count toward the three quiet ones.
		expect(client.getHistory).toHaveBeenCalledTimes(6);
	});

	it('returns for a turn that finished before the first poll', async () => {
		const client = scriptedClient([history({ messages: [finishedTurn] })]);

		await waitForAssistantAgentActivity(config(client));

		expect(client.getHistory).toHaveBeenCalledTimes(3);
	});

	it('fails a turn that ended in error before it wrote any output', async () => {
		const failedTurn: AgentChatMessagesResponse['messages'][number] = {
			...finishedTurn,
			executionStatus: 'error',
			executionError: 'Something went wrong',
			content: [{ type: 'host-event', name: 'preferences-applied', key: 'turn', payload: {} }],
		};
		const client = scriptedClient([history({ messages: [failedTurn] })]);

		await expect(waitForAssistantAgentActivity(config(client))).rejects.toThrow(
			'Assistant agent turn failed: Something went wrong',
		);
	});

	it('returns for a turn that failed after it wrote output, so the output is graded', async () => {
		const partialTurn: AgentChatMessagesResponse['messages'][number] = {
			...finishedTurn,
			executionStatus: 'error',
			executionError: 'Provider overloaded',
		};
		const client = scriptedClient([history({ messages: [partialTurn] })]);

		await expect(waitForAssistantAgentActivity(config(client))).resolves.toBeUndefined();
	});

	it('returns for a turn that wrote output before a card when the resumed execution fails without output', async () => {
		const beforeCard: AgentChatMessagesResponse['messages'][number] = {
			...finishedTurn,
			content: [
				{ type: 'text', text: 'I will delete it.' },
				{
					type: 'tool-call',
					toolCallId: 'call-approve',
					toolName: 'workflows_delete',
					suspendPayload: { message: 'Delete?' },
					output: { success: true },
				},
			],
		};
		const failedResume: AgentChatMessagesResponse['messages'][number] = {
			id: 'exec-2:assistant',
			role: 'assistant',
			executionId: 'exec-2',
			executionStatus: 'error',
			executionError: 'Provider overloaded',
			createdAt: new Date(SENT_AT + 5_000).toISOString(),
			content: [],
		};
		const client = scriptedClient([history({ messages: [beforeCard, failedResume] })]);

		await expect(waitForAssistantAgentActivity(config(client))).resolves.toBeUndefined();
	});

	it('fails a turn that was interrupted before it wrote any output', async () => {
		const interrupted: AgentChatMessagesResponse['messages'][number] = {
			...finishedTurn,
			executionStatus: 'interrupted',
			executionError: 'The execution stopped when n8n restarted',
			content: [],
		};
		const client = scriptedClient([history({ messages: [interrupted] })]);

		await expect(waitForAssistantAgentActivity(config(client))).rejects.toThrow(
			'Assistant agent turn failed: The execution stopped when n8n restarted',
		);
	});

	it('fails a turn that the history leaves out because it failed without output or message', async () => {
		const client = scriptedClient([history({ messages: [takenUserMessage] })], usageWith('error'));

		await expect(waitForAssistantAgentActivity(config(client))).rejects.toThrow(
			'Assistant agent turn failed: the execution ended with status "error" and no error message',
		);
		expect(client.getUsage).toHaveBeenCalledWith('thread-1');
	});

	it('returns for a turn that ended without a reply and did not fail', async () => {
		const client = scriptedClient(
			[history({ messages: [takenUserMessage] })],
			usageWith('success'),
		);

		await expect(waitForAssistantAgentActivity(config(client))).resolves.toBeUndefined();
	});

	it('reads no usage when the turn has a reply', async () => {
		const client = scriptedClient([history({ messages: [takenUserMessage, finishedTurn] })]);

		await waitForAssistantAgentActivity(config(client));

		expect(client.getUsage).not.toHaveBeenCalled();
	});

	it('answers an open card through resume with the confirmation strategy', async () => {
		const suspension = {
			toolCallId: 'call-ask',
			runId: 'run-1',
			suspendPayload: { requestId: 'req-1', inputType: 'questions', questions: [] },
		};
		const client = scriptedClient([
			history({ openSuspensions: [suspension] }),
			// The server can still list the card for a moment after the answer.
			history({ openSuspensions: [suspension], activeExecutionId: 'exec-1' }),
			history({ messages: [finishedTurn] }),
		]);
		const answer: InstanceAiConfirmRequest = { kind: 'questions', answers: [] };
		const strategy = vi.fn((_event: CapturedEvent) => answer);
		const approvedRequests = new Set<string>();
		const proxyResponses = new Map<string, InstanceAiConfirmRequest>();

		await waitForAssistantAgentActivity(
			config(client, { confirmationStrategy: strategy, approvedRequests, proxyResponses }),
		);

		expect(client.resume).toHaveBeenCalledTimes(1);
		expect(client.resume).toHaveBeenCalledWith('run-1', 'call-ask', answer);
		expect(strategy.mock.calls[0][0].data).toMatchObject({
			type: 'confirmation-request',
			runId: 'run-1',
			payload: { requestId: 'req-1', inputType: 'questions', toolCallId: 'call-ask' },
		});
		expect(approvedRequests).toEqual(new Set(['req-1']));
		expect(proxyResponses.get('req-1')).toEqual(answer);
	});

	it('stops retrying a card at the cap and keeps the thread busy until a budget fires', async () => {
		const suspension = { toolCallId: 'call-approve', runId: 'run-1', suspendPayload: {} };
		const client = scriptedClient([history({ openSuspensions: [suspension] })]);
		client.resume.mockRejectedValue(new Error('409 conflict'));
		const retries = new Map<string, number>();
		let polls = 0;
		const breach = { kind: 'inactivity' as const, turn: 1, elapsedMs: 240_001 };

		await expect(
			waitForAssistantAgentActivity(
				config(client, {
					confirmationRetries: retries,
					maxConfirmationRetries: 2,
					timeoutBreach: () => (++polls > 6 ? breach : undefined),
				}),
			),
		).rejects.toBeInstanceOf(RunTimeoutError);

		expect(client.resume).toHaveBeenCalledTimes(2);
		// A card without a request id is keyed by its tool call id.
		expect(retries.get('call-approve')).toBe(2);
		expect(client.getHistory).toHaveBeenCalledTimes(6);
	});

	it('hands a budget breach to the timeout handler before it polls', async () => {
		const client = scriptedClient([history({ activeExecutionId: 'exec-1' })]);
		const breach = { kind: 'turn' as const, turn: 1, elapsedMs: 900_001 };
		const onTimeout = vi.fn(async () => {
			throw new RunTimeoutError(breach);
		});

		await expect(
			waitForAssistantAgentActivity(config(client, { timeoutBreach: () => breach, onTimeout })),
		).rejects.toBeInstanceOf(RunTimeoutError);

		expect(onTimeout).toHaveBeenCalledWith(breach);
		expect(client.getHistory).not.toHaveBeenCalled();
	});
});
