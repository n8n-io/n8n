import type { StreamChunk } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { createIpRateLimit, Get, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { UserError } from 'n8n-workflow';

import {
	type FlushableResponse,
	initSseStream,
	pumpChunks,
} from '@/modules/agents/agent-sse-stream';
import { UrlService } from '@/services/url.service';

import { AppAgentRuntimeService, type AppAgentTurn } from './app-agent-runtime.service';
import { AppRuntimeError } from './app-runtime.error';
import { applyCors } from './cors';

const MAX_BODY_BYTES = 1024 * 1024;

// Visitors are anonymous, so only messages written for users leave the instance.
const VISITOR_ERROR_MESSAGE = 'The agent could not answer.';

const rateLimit = createIpRateLimit(
	Container.get(GlobalConfig).apps.runtimeRateLimit,
	Time.minutes.toMilliseconds,
);

type AgentRequest = Request<{ namespace: string; key: string }>;

/**
 * Chat with the agents bound to a served app: `/apps/<namespace>/api/agents/<key>/…`.
 * Same envelope as the other runtime routes (`skipAuth`, CORS check, IP rate limit, body
 * cap, one stable code per refusal). Chat and resume answer as SSE with the same
 * `data: <AgentSseEvent>` lines the editor reads, once every refusal has had its chance
 * to answer as JSON.
 */
@RootLevelController('/apps')
export class AppAgentRuntimeController {
	constructor(
		private readonly appAgentRuntimeService: AppAgentRuntimeService,
		private readonly errorReporter: ErrorReporter,
		private readonly urlService: UrlService,
	) {}

	@Post('/:namespace/api/agents/:key/chat', {
		skipAuth: true,
		ipRateLimit: rateLimit,
		usesTemplates: true,
	})
	async chat(req: AgentRequest, res: FlushableResponse) {
		await this.streamTurn(req, res, async () => {
			const { namespace, key } = req.params;
			return await this.appAgentRuntimeService.chat(namespace, key, req.body);
		});
	}

	@Post('/:namespace/api/agents/:key/chat/resume', {
		skipAuth: true,
		ipRateLimit: rateLimit,
		usesTemplates: true,
	})
	async resume(req: AgentRequest, res: FlushableResponse) {
		const abortController = new AbortController();
		res.once('close', () => abortController.abort());
		await this.streamTurn(req, res, async () => {
			const { namespace, key } = req.params;
			return await this.appAgentRuntimeService.resume(
				namespace,
				key,
				req.body,
				abortController.signal,
			);
		});
	}

	@Get('/:namespace/api/agents/:key/messages', { skipAuth: true, ipRateLimit: rateLimit })
	async messages(req: AgentRequest, res: Response) {
		const history = await this.guarded(req, res, async () => {
			const { namespace, key } = req.params;
			return await this.appAgentRuntimeService.messages(namespace, key, req.query);
		});
		if (history) res.status(200).json(history);
	}

	/** Refusals answer as JSON before the stream opens; the run's own failures become SSE `error` events. */
	private async streamTurn(
		req: Request,
		res: FlushableResponse,
		start: () => Promise<AppAgentTurn>,
	) {
		const turn = await this.guarded(req, res, start);
		if (!turn) return;

		const { send: write } = initSseStream(res);
		// The visitor may leave mid-turn; the run keeps going and its turn is still recorded.
		const send = (event: AgentSseEvent) => {
			if (!res.writableEnded && !res.destroyed) write(event);
		};
		try {
			const suspended = await pumpChunks(this.scrubErrors(turn.stream), send);
			if (!suspended) send({ type: 'done', sessionId: turn.sessionId });
		} catch (error) {
			send({ type: 'error', message: this.messageForVisitor(error) });
		} finally {
			res.end();
		}
	}

	private async *scrubErrors(stream: AsyncGenerator<StreamChunk>): AsyncGenerator<StreamChunk> {
		for await (const chunk of stream) {
			yield chunk.type === 'error'
				? { type: 'error', error: new Error(this.messageForVisitor(chunk.error)) }
				: chunk;
		}
	}

	private messageForVisitor(error: unknown): string {
		if (error instanceof UserError) return error.message;
		this.errorReporter.error(error);
		return VISITOR_ERROR_MESSAGE;
	}

	/** Runs `call` behind the CORS check and body cap. Returns null once a refusal has been written. */
	private async guarded<T>(req: Request, res: Response, call: () => Promise<T>): Promise<T | null> {
		if (!applyCors(req, res, this.urlService.getInstanceBaseUrl())) return null;

		// `rawBody` is unset when the body parser skipped the request (no body).
		if ((req.rawBody?.length ?? 0) > MAX_BODY_BYTES) {
			res.status(413).json({
				code: 'payload_too_large',
				message: `The request body must be at most ${MAX_BODY_BYTES} bytes.`,
			});
			return null;
		}

		try {
			return await call();
		} catch (error) {
			if (error instanceof AppRuntimeError) {
				const { status, code, message, issues } = error;
				res.status(status).json({ code, message, ...(issues !== undefined ? { issues } : {}) });
				return null;
			}
			// Anything else is ours, not the caller's; the browser gets one stable code for it.
			this.errorReporter.error(error);
			res.status(500).json({ code: 'execution_failed', message: 'The agent call failed.' });
			return null;
		}
	}
}
