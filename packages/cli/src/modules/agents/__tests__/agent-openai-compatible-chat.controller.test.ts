/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mock } from 'vitest-mock-extended';

import { AgentOpenAiCompatibleChatController } from '../agent-openai-compatible-chat.controller';
import type { OpenAiCompatibleChatService } from '../integrations/platforms/openai-compatible-chat.service';
import { getRoutesByHandlerName } from './test-utils/controller-route-metadata';

function makeController() {
	const chatService = mock<OpenAiCompatibleChatService>();
	return { controller: new AgentOpenAiCompatibleChatController(chatService), chatService };
}

function makeRes() {
	return mock<{
		status: (code: number) => unknown;
		json: (body: unknown) => unknown;
		setHeader: (name: string, value: string) => unknown;
		flushHeaders: () => unknown;
		write: (chunk: string) => unknown;
		end: () => unknown;
	}>({
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	});
}

describe('AgentOpenAiCompatibleChatController', () => {
	describe('route metadata', () => {
		it('skips project-session auth, allows bots, and rate limits both routes', () => {
			const routes = getRoutesByHandlerName(AgentOpenAiCompatibleChatController);

			for (const handlerName of ['listModels', 'chatCompletions']) {
				const route = routes.get(handlerName);
				expect(route?.skipAuth).toBe(true);
				expect(route?.allowBots).toBe(true);
				expect(route?.ipRateLimit).toEqual({ limit: 60, windowMs: 60_000 });
			}
		});
	});

	describe('listModels', () => {
		it('rejects a request with no bearer token', async () => {
			const { controller, chatService } = makeController();
			const res = makeRes();

			await controller.listModels({ headers: {} } as never, res as never, 'project-1', 'agent-1');

			expect(res.status).toHaveBeenCalledWith(401);
			expect(chatService.authenticate).not.toHaveBeenCalled();
		});

		it('returns the agent as a single-item model list once authenticated', async () => {
			const { controller, chatService } = makeController();
			chatService.authenticate.mockResolvedValue({
				agent: { name: 'Agent One' } as never,
				credentialId: 'credential-1',
				type: 'openwebui',
			});
			const res = makeRes();

			await controller.listModels(
				{ headers: { authorization: 'Bearer secret' } } as never,
				res as never,
				'project-1',
				'agent-1',
			);

			expect(chatService.authenticate).toHaveBeenCalledWith('agent-1', 'project-1', 'secret');
			expect(res.json).toHaveBeenCalledWith({
				object: 'list',
				data: [{ id: 'agent-1', name: 'Agent One', object: 'model', owned_by: 'n8n' }],
			});
		});
	});

	describe('chatCompletions, non-streaming', () => {
		it('rejects a request with no bearer token', async () => {
			const { controller, chatService } = makeController();
			const res = makeRes();

			await controller.chatCompletions(
				{ headers: {}, body: {} } as never,
				res as never,
				'project-1',
				'agent-1',
			);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(chatService.authenticate).not.toHaveBeenCalled();
		});

		it('rejects a body with no messages array', async () => {
			const { controller, chatService } = makeController();
			chatService.authenticate.mockResolvedValue({
				agent: {} as never,
				credentialId: 'credential-1',
				type: 'openwebui',
			});
			const res = makeRes();

			await expect(
				controller.chatCompletions(
					{ headers: { authorization: 'Bearer secret' }, body: {} } as never,
					res as never,
					'project-1',
					'agent-1',
				),
			).rejects.toThrow('"messages" is required');
		});

		it('returns an OpenAI-shaped chat.completion response', async () => {
			const { controller, chatService } = makeController();
			const channel = { agent: {} as never, credentialId: 'credential-1', type: 'openwebui' };
			chatService.authenticate.mockResolvedValue(channel);
			chatService.buildTranscript.mockReturnValue('user: Hi');
			chatService.buildSandboxPrincipalHash.mockReturnValue('hash' as never);
			chatService.runNonStreaming.mockResolvedValue({ content: 'Hello', finishReason: 'stop' });
			const res = makeRes();

			await controller.chatCompletions(
				{
					headers: { authorization: 'Bearer secret' },
					body: { messages: [{ role: 'user', content: 'Hi' }] },
				} as never,
				res as never,
				'project-1',
				'agent-1',
			);

			expect(chatService.runNonStreaming).toHaveBeenCalledWith(
				channel,
				'user: Hi',
				'hash',
				expect.any(AbortSignal),
			);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					object: 'chat.completion',
					model: 'agent-1',
					choices: [
						{
							index: 0,
							message: { role: 'assistant', content: 'Hello' },
							finish_reason: 'stop',
						},
					],
				}),
			);
		});
	});

	describe('chatCompletions, streaming', () => {
		it('writes OpenAI-shaped SSE chunks and a terminating [DONE]', async () => {
			const { controller, chatService } = makeController();
			const channel = { agent: {} as never, credentialId: 'credential-1', type: 'openwebui' };
			chatService.authenticate.mockResolvedValue(channel);
			chatService.buildTranscript.mockReturnValue('user: Hi');
			chatService.buildSandboxPrincipalHash.mockReturnValue('hash' as never);
			chatService.execute.mockImplementation(async function* () {
				yield { type: 'text-delta', id: '1', delta: 'Hi' } as never;
				yield { type: 'finish', finishReason: 'stop' } as never;
			});
			const res = makeRes();

			await controller.chatCompletions(
				{
					headers: { authorization: 'Bearer secret' },
					body: { messages: [{ role: 'user', content: 'Hi' }], stream: true },
				} as never,
				res as never,
				'project-1',
				'agent-1',
			);

			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Type',
				'text/event-stream; charset=UTF-8',
			);
			expect(res.flushHeaders).toHaveBeenCalled();

			const written = res.write.mock.calls.map(([chunk]: [string]) => chunk);
			expect(written[0]).toContain('"delta":{"content":"Hi"}');
			expect(written[1]).toContain('"finish_reason":"stop"');
			expect(written[2]).toBe('data: [DONE]\n\n');
			expect(res.end).toHaveBeenCalled();
		});

		it('still terminates the stream with [DONE] when the run errors mid-stream', async () => {
			const { controller, chatService } = makeController();
			const channel = { agent: {} as never, credentialId: 'credential-1', type: 'openwebui' };
			chatService.authenticate.mockResolvedValue(channel);
			chatService.buildTranscript.mockReturnValue('user: Hi');
			chatService.buildSandboxPrincipalHash.mockReturnValue('hash' as never);
			chatService.execute.mockImplementation(async function* () {
				yield { type: 'error', error: new Error('boom') } as never;
			});
			const res = makeRes();

			await controller.chatCompletions(
				{
					headers: { authorization: 'Bearer secret' },
					body: { messages: [{ role: 'user', content: 'Hi' }], stream: true },
				} as never,
				res as never,
				'project-1',
				'agent-1',
			);

			expect(res.write).toHaveBeenLastCalledWith('data: [DONE]\n\n');
			expect(res.end).toHaveBeenCalled();
		});
	});
});
