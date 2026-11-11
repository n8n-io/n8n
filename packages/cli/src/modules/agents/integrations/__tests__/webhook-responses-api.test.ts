import { UnprocessableRequestError } from '@n8n/errors';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import {
	parseApprovalDecision,
	parseResponsesRequest,
	responsesApiFallback,
	toResponseBody,
	WebhookChannelError,
} from '../platforms/webhook/responses-api';

describe('parseResponsesRequest', () => {
	it.each([
		[{ input: 'Hi' }, { input: 'Hi', conversationId: undefined }],
		[
			{ input: 'Hi', conversation: 'c-1' },
			{ input: 'Hi', conversationId: 'c-1' },
		],
		[
			{ input: 'Hi', conversation: { id: 'c-1' } },
			{ input: 'Hi', conversationId: 'c-1' },
		],
		[
			{ input: 'Hi', model: 'gpt-5', previous_response_id: 'r-1', stream: false },
			{ input: 'Hi', conversationId: undefined },
		],
	])('reads %o', (body, expected) => {
		expect(parseResponsesRequest(body)).toEqual(expected);
	});

	it.each([
		['an array input', { input: [{ role: 'user', content: 'Hi' }] }, 'input'],
		['an empty input', { input: '' }, 'input'],
		['a missing input', {}, 'input'],
		['streaming', { input: 'Hi', stream: true }, 'stream'],
		['an empty conversation', { input: 'Hi', conversation: '' }, 'conversation'],
	])('rejects %s with a 400 on its parameter', (_, body, param) => {
		expect(() => parseResponsesRequest(body)).toThrow(
			expect.objectContaining({ status: 400, param }) as Error,
		);
	});
});

describe('parseApprovalDecision', () => {
	it.each([[{ approved: true }], [{ approved: true, scope: 'session' }], [{ approved: false }]])(
		'reads %o',
		(body) => {
			expect(parseApprovalDecision(body)).toEqual(body);
		},
	);

	it('drops unknown fields', () => {
		expect(parseApprovalDecision({ approved: true, extra: 1 })).toEqual({ approved: true });
	});

	it.each([
		['a missing decision', {}, 'approved'],
		['a scope that is not known', { approved: true, scope: 'forever' }, 'scope'],
	])('rejects %s with a 400 on its parameter', (_, body, param) => {
		expect(() => parseApprovalDecision(body)).toThrow(
			expect.objectContaining({ status: 400, code: 'invalid_request', param }) as Error,
		);
	});
});

describe('WebhookChannelError', () => {
	it('renders the OpenAI error shape, with the type of its status', () => {
		expect(new WebhookChannelError(404, 'conversation_not_found', 'Not found').toBody()).toEqual({
			error: {
				message: 'Not found',
				type: 'not_found_error',
				code: 'conversation_not_found',
				param: null,
			},
		});
	});
});

describe('toResponseBody', () => {
	it('renders one completed assistant message with the reply text', () => {
		const body = toResponseBody({
			conversationId: 'c-1',
			text: 'Hello',
			createdAt: new Date('2026-11-03T00:00:00Z'),
		});

		expect(body).toEqual({
			id: expect.stringMatching(/^resp_/),
			object: 'response',
			created_at: 1793664000,
			status: 'completed',
			model: 'n8n-agent',
			conversation: { id: 'c-1' },
			output: [
				{
					type: 'message',
					id: expect.stringMatching(/^msg_/),
					status: 'completed',
					role: 'assistant',
					content: [{ type: 'output_text', text: 'Hello', annotations: [] }],
				},
			],
		});
	});
});

describe('toResponseBody with approvals', () => {
	it('renders one approval request for each action after the message', () => {
		const body = toResponseBody({
			model: 'anthropic/claude-sonnet-4-5',
			conversationId: 'c-1',
			text: '',
			approvals: [
				{
					toolCallId: 'call-1',
					payload: {
						type: 'approval',
						toolName: 'send_email',
						displayName: 'Send email',
						supportsSessionApproval: true,
						args: { to: 'ana@example.com' },
					},
					url: 'https://n8n.example.com/agent-webhook/agent-1/approvals/c-1/run-1/call-1',
				},
				{
					toolCallId: 'call-2',
					payload: { type: 'approval', toolName: 'delete_file', args: { path: 'a.txt' } },
					url: 'https://n8n.example.com/agent-webhook/agent-1/approvals/c-1/run-1/call-2',
				},
			],
			createdAt: new Date('2026-11-03T00:00:00Z'),
		});

		expect(body.status).toBe('completed');
		expect(body.output).toEqual([
			expect.objectContaining({
				type: 'message',
				content: [expect.objectContaining({ text: '' })],
			}),
			{
				type: 'approval_request',
				id: 'call-1',
				name: 'send_email',
				display_name: 'Send email',
				arguments: '{"to":"ana@example.com"}',
				supports_session_approval: true,
				url: 'https://n8n.example.com/agent-webhook/agent-1/approvals/c-1/run-1/call-1',
			},
			{
				type: 'approval_request',
				id: 'call-2',
				name: 'delete_file',
				display_name: 'delete_file',
				arguments: '{"path":"a.txt"}',
				supports_session_approval: false,
				url: 'https://n8n.example.com/agent-webhook/agent-1/approvals/c-1/run-1/call-2',
			},
		]);
	});
});

describe('responsesApiFallback', () => {
	const [notFound, parseError] = responsesApiFallback;

	function mockResponse() {
		const res = mock<Response>();
		res.status.mockReturnValue(res);
		return res;
	}

	it('answers an unknown route with a 404 in the OpenAI error shape', async () => {
		const res = mockResponse();

		await notFound(mock<Request>({ method: 'GET', path: '/agent-1/responses' }), res, vi.fn());

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({
			error: {
				message: 'Unknown route GET /agent-1/responses',
				type: 'not_found_error',
				code: 'unknown_route',
				param: null,
			},
		});
	});

	it('answers a body that does not parse with a 400 in the OpenAI error shape', async () => {
		const res = mockResponse();
		const next = vi.fn();

		await parseError(
			new UnprocessableRequestError('Failed to parse request body'),
			mock(),
			res,
			next,
		);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: {
				message: 'The request body is not valid JSON',
				type: 'invalid_request_error',
				code: 'invalid_json',
				param: null,
			},
		});
		expect(next).not.toHaveBeenCalled();
	});

	it('passes other errors on', async () => {
		const error = new Error('boom');
		const next = vi.fn();

		await parseError(error, mock(), mockResponse(), next);

		expect(next).toHaveBeenCalledWith(error);
	});
});
