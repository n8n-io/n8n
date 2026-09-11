/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { effectScope } from 'vue';
import {
	APPROVAL_TOOL_NAME,
	N8N_CHAT_ACTION_TOOL_NAME,
	type AgentWebChatSseEvent,
} from '@n8n/api-types';
import { post } from '@n8n/rest-api-client';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		baseUrl: 'http://localhost:5678/rest/',
	}),
}));

vi.mock('@n8n/constants', () => ({
	getBrowserId: () => 'browser-1',
}));

vi.mock('@n8n/rest-api-client', () => ({
	get: vi.fn(),
	post: vi.fn(),
	ResponseError: class ResponseError extends Error {
		httpStatusCode = 401;
	},
}));

import { useAgentWebChat } from '../composables/useAgentWebChat';
import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '../constants';

function makeSseResponse(events: AgentWebChatSseEvent[]): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const event of events) {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
			}
			controller.close();
		},
	});
	return new Response(stream, {
		status: 200,
		headers: { 'Content-Type': 'text/event-stream' },
	});
}

describe('useAgentWebChat', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(post).mockResolvedValue({
			data: {
				token: 'tok',
				sessionId: '22222222-2222-2222-2222-222222222222',
				config: { title: 'Bot', accessMode: 'public' },
			},
		});
		vi.stubGlobal('fetch', vi.fn());
	});

	function withHook() {
		const scope = effectScope();
		const hook = scope.run(() => useAgentWebChat('int-1'));
		if (!hook) throw new Error('hook');
		return { hook, scope };
	}

	it('renders an approval HITL card from a suspended tool call', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			makeSseResponse([
				{
					type: 'tool-call-suspended',
					payload: {
						toolCallId: 'tc-1',
						runId: 'run-1',
						toolName: APPROVAL_TOOL_NAME,
						input: {
							type: 'approval',
							toolName: 'delete_record',
							args: { id: '1' },
						},
					},
				},
			]),
		);

		const { hook, scope } = withHook();
		expect(await hook.openSession()).toBe(true);
		await hook.send('hello');

		const assistant = hook.messages.value.find((message) => message.role === 'assistant');
		expect(assistant?.status).toBe(CHAT_MESSAGE_STATUS.AWAITING_USER);
		expect(assistant?.interactive).toMatchObject({
			toolCallId: 'tc-1',
			runId: 'run-1',
			toolName: APPROVAL_TOOL_NAME,
		});
		expect(assistant?.toolCalls?.[0]).toMatchObject({
			toolCallId: 'tc-1',
			state: TOOL_CALL_STATE.SUSPENDED,
			runId: 'run-1',
		});
		scope.stop();
	});

	it('renders a display-only chat_action card from tool-call plus tool-result', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			makeSseResponse([
				{
					type: 'tool-call',
					toolCallId: 'tc-card',
					toolName: N8N_CHAT_ACTION_TOOL_NAME,
					input: {
						action: 'respond',
						input: {
							message: {
								card: { title: 'Status', components: [{ type: 'section', text: 'Done' }] },
							},
						},
					},
				},
				{
					type: 'tool-result',
					toolCallId: 'tc-card',
					toolName: N8N_CHAT_ACTION_TOOL_NAME,
					output: { ok: true },
				},
				{ type: 'done' },
			]),
		);

		const { hook, scope } = withHook();
		expect(await hook.openSession()).toBe(true);
		await hook.send('hello');

		const assistant = hook.messages.value.find((message) => message.role === 'assistant');
		expect(assistant?.interactive).toMatchObject({
			toolCallId: 'tc-card',
			toolName: N8N_CHAT_ACTION_TOOL_NAME,
			resolvedAt: expect.any(Number),
		});
		scope.stop();
	});
});
