import { createIpRateLimit, Get, Param, Post, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import {
	OpenAiCompatibleChatService,
	type OpenAiChatMessage,
} from './integrations/platforms/openai-compatible-chat.service';

interface ChatCompletionsBody {
	messages?: OpenAiChatMessage[];
	stream?: boolean;
	user?: string;
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

		const messages = req.body.messages;
		if (!messages || !Array.isArray(messages)) {
			throw new BadRequestError('"messages" is required and must be an array');
		}
		const transcript = this.chatService.buildTranscript(messages);
		const sandboxPrincipalHash = this.chatService.buildSandboxPrincipalHash(channel, req.body.user);

		if (req.body.stream) {
			await this.streamCompletion(res, agentId, channel, transcript, sandboxPrincipalHash);
			return;
		}

		const result = await this.chatService.runNonStreaming(
			channel,
			transcript,
			sandboxPrincipalHash,
		);

		res.json({
			id: `chatcmpl-${agentId}`,
			object: 'chat.completion',
			created: Math.floor(Date.now() / 1000),
			model: agentId,
			choices: [
				{
					index: 0,
					message: { role: 'assistant', content: result.content },
					finish_reason: result.finishReason,
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
		res: Response,
		agentId: string,
		channel: Parameters<OpenAiCompatibleChatService['execute']>[0],
		transcript: string,
		sandboxPrincipalHash: Parameters<OpenAiCompatibleChatService['execute']>[2],
	): Promise<void> {
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders();

		const id = `chatcmpl-${agentId}`;
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
		};

		try {
			for await (const chunk of this.chatService.execute(
				channel,
				transcript,
				sandboxPrincipalHash,
			)) {
				if (chunk.type === 'text-delta') {
					sendChunk({ content: chunk.delta }, null);
				} else if (chunk.type === 'finish') {
					sendChunk({}, chunk.finishReason);
				} else if (chunk.type === 'error') {
					break;
				}
			}
		} finally {
			res.write('data: [DONE]\n\n');
			res.end();
		}
	}
}
