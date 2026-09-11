import { createIpRateLimit, Get, Param, Post, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { FlushableResponse } from './agent-sse-stream';
import { createCitationMarkerStripper } from './integrations/platforms/citation-markers';
import {
	OpenAiCompatibleChatService,
	type OpenAiChatMessage,
} from './integrations/platforms/openai-compatible-chat.service';

// Runtime shape validation for the request body. The route is externally
// exposed, so a malformed payload (e.g. `{ messages: [null] }`) must fail as a
// 400 here rather than crash deeper in `buildTranscript` as a 500. Each message
// is validated only as an object; the accepted role/content rules stay in
// `buildTranscript`, which keeps its specific error messages.
const openAiChatMessageSchema = z.object({
	role: z.string(),
	content: z.unknown(),
	tool_calls: z.unknown().optional(),
});
const chatCompletionsBodySchema = z.object({
	messages: z.array(openAiChatMessageSchema, {
		required_error: '"messages" is required and must be an array',
		invalid_type_error: '"messages" is required and must be an array',
	}),
	stream: z.boolean().optional(),
	user: z.string().optional(),
});
type ChatCompletionsBody = z.infer<typeof chatCompletionsBodySchema>;

// Map n8n's internal finish reasons (`FINISH_REASONS`) onto the values an
// OpenAI Chat Completions client understands. Anything unmapped (`error`,
// `other`) falls back to `stop`, the neutral terminal value.
const OPENAI_FINISH_REASONS: Record<string, string> = {
	stop: 'stop',
	length: 'length',
	'max-iterations': 'length',
	'content-filter': 'content_filter',
	'tool-calls': 'tool_calls',
};

function toOpenAiFinishReason(reason: string | null | undefined): string {
	if (!reason) return 'stop';
	return OPENAI_FINISH_REASONS[reason] ?? 'stop';
}

// A static bearer key has no per-request signature the way Slack/Telegram's
// webhook routes do, so this route gets its own IP rate limit rather than
// relying on nothing (see agent-connection-channels.md 5.7).
const OPENAI_COMPATIBLE_RATE_LIMIT = createIpRateLimit(60, 60_000);

function extractBearerToken(req: Request): string | undefined {
	const header = req.headers.authorization;
	if (!header?.startsWith('Bearer ')) return undefined;
	return header.slice('Bearer '.length);
}

/**
 * `POST /v1/chat/completions` and `GET /v1/models` for the OpenAI-compatible
 * agent channels (OpenWebUI, LibreChat). Not project-session authenticated
 * like every other `agents/v2` route: `skipAuth: true`, verified here
 * against the Bearer token, same pattern the existing platform webhook route
 * uses (agent-integrations.controller.ts). `allowBots: true` because the
 * global bot filter would otherwise 204 the server-side HTTP clients these
 * tools use to call this endpoint.
 */
@RestController('/projects/:projectId/agents/v2')
export class AgentOpenAiCompatibleChatController {
	constructor(private readonly chatService: OpenAiCompatibleChatService) {}

	@Get('/:agentId/openai/v1/models', {
		skipAuth: true,
		allowBots: true,
		ipRateLimit: OPENAI_COMPATIBLE_RATE_LIMIT,
	})
	async listModels(
		req: Request<{ projectId: string; agentId: string }>,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
	) {
		const token = extractBearerToken(req);
		if (!token) {
			res.status(401).json({ error: 'Missing bearer token' });
			return;
		}

		const channel = await this.chatService.authenticate(agentId, projectId, token);

		// `id` is the agent id: stable, unique, and what the client echoes back in
		// the chat/completions `model` field, so two agents with the same name stay
		// distinct. `name` is the readable label OpenWebUI shows (it falls back to
		// `id` when a client ignores `name`).
		res.json({
			object: 'list',
			data: [{ id: agentId, name: channel.agent.name, object: 'model', owned_by: 'n8n' }],
		});
	}

	@Post('/:agentId/openai/v1/chat/completions', {
		skipAuth: true,
		allowBots: true,
		ipRateLimit: OPENAI_COMPATIBLE_RATE_LIMIT,
	})
	async chatCompletions(
		req: Request<{ projectId: string; agentId: string }, unknown, ChatCompletionsBody>,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
	) {
		const token = extractBearerToken(req);
		if (!token) {
			res.status(401).json({ error: 'Missing bearer token' });
			return;
		}

		const channel = await this.chatService.authenticate(agentId, projectId, token);

		const parsed = chatCompletionsBodySchema.safeParse(req.body);
		if (!parsed.success) {
			throw new BadRequestError(parsed.error.issues[0]?.message ?? 'Invalid request body');
		}
		const { stream, user } = parsed.data;
		const messages: OpenAiChatMessage[] = parsed.data.messages.map((message) => ({
			role: message.role,
			content: message.content,
			tool_calls: message.tool_calls,
		}));

		const transcript = this.chatService.buildTranscript(messages);
		const sandboxPrincipalHash = this.chatService.buildSandboxPrincipalHash(channel, user);

		if (stream) {
			await this.streamCompletion(res, agentId, channel, transcript, sandboxPrincipalHash);
			return;
		}

		// Cancel the run if the client disconnects before the (buffered) response is
		// ready. The signal travels the same path as the streaming case, down to
		// `agentInstance.stream({ abortSignal })`.
		const abortController = new AbortController();
		res.on('close', () => abortController.abort());

		const result = await this.chatService.runNonStreaming(
			channel,
			transcript,
			sandboxPrincipalHash,
			abortController.signal,
		);

		res.json({
			id: `chatcmpl-${randomUUID()}`,
			object: 'chat.completion',
			created: Math.floor(Date.now() / 1000),
			model: agentId,
			choices: [
				{
					index: 0,
					message: { role: 'assistant', content: result.content },
					finish_reason: toOpenAiFinishReason(result.finishReason),
				},
			],
		});
	}

	/**
	 * Third sibling stream consumer alongside `AgentChatStreamConsumer` and
	 * `pumpChunks` (see agent-connection-channels.md 5.9): maps `text-delta`
	 * chunks from the same `AsyncGenerator<StreamChunk>` onto OpenAI's
	 * `chat.completion.chunk` delta format. Tool-call chunks are dropped, not
	 * forwarded; the client wouldn't act on them.
	 */
	private async streamCompletion(
		res: FlushableResponse,
		agentId: string,
		channel: Parameters<OpenAiCompatibleChatService['execute']>[0],
		transcript: string,
		sandboxPrincipalHash: Parameters<OpenAiCompatibleChatService['execute']>[2],
	): Promise<void> {
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		// The global `compression()` middleware buffers writes; without this header
		// and the per-frame `res.flush()` below, proxies and the compressor hold SSE
		// frames back instead of streaming them (same defeat as `initSseStream`).
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();
		res.flush?.();

		// Stop consuming the run when the client disconnects, and cancel the run
		// itself: the signal is threaded through `execute()` down to
		// `agentInstance.stream({ abortSignal })`, so the model/tool work aborts
		// instead of running to completion after the client is gone.
		const abortController = new AbortController();
		res.on('close', () => abortController.abort());

		// One id per completion, reused only across this response's frames. A shared
		// `chatcmpl-${agentId}` would collide between concurrent or repeated requests.
		const id = `chatcmpl-${randomUUID()}`;
		const created = Math.floor(Date.now() / 1000);
		const sendChunk = (delta: Record<string, unknown>, finishReason: string | null) => {
			res.write(
				`data: ${JSON.stringify({
					id,
					object: 'chat.completion.chunk',
					created,
					model: agentId,
					choices: [{ index: 0, delta, finish_reason: finishReason }],
				})}\n\n`,
			);
			res.flush?.();
		};
		const sendError = (message: string) => {
			res.write(`data: ${JSON.stringify({ error: { message, type: 'server_error' } })}\n\n`);
			res.flush?.();
		};

		// Citation markers can straddle two deltas, so strip statefully across the
		// stream rather than per chunk (see citation-markers.ts).
		const stripper = createCitationMarkerStripper();
		try {
			for await (const chunk of this.chatService.execute(
				channel,
				transcript,
				sandboxPrincipalHash,
				abortController.signal,
			)) {
				if (abortController.signal.aborted) break;
				if (chunk.type === 'text-delta') {
					const content = stripper.push(chunk.delta);
					if (content) sendChunk({ content }, null);
				} else if (chunk.type === 'finish') {
					const content = stripper.flush();
					if (content) sendChunk({ content }, null);
					sendChunk({}, toOpenAiFinishReason(chunk.finishReason));
				} else if (chunk.type === 'error') {
					// Surface the failure as an OpenAI-shaped error frame; `[DONE]`
					// alone would read as a clean end to the client.
					const message = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
					sendError(message);
					break;
				}
			}
		} finally {
			res.write('data: [DONE]\n\n');
			res.flush?.();
			res.end();
		}
	}
}
