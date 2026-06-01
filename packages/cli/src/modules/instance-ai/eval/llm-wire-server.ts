import type { Logger } from '@n8n/backend-common';
import express, { type Express, type Request, type Response } from 'express';
import type { EvalLlmMockHandler, EvalMockHttpResponse } from 'n8n-core';
import type { IHttpRequestOptions, INode } from 'n8n-workflow';
import { type Server } from 'node:http';

import {
	buildOpenAiErrorEnvelope,
	extractRequestModel,
	forwardTranslateToChatCompletion,
	forwardTranslateToSseChunks,
	isStreamRequested,
	reverseTranslateOpenAiRequest,
} from './openai-envelope';
import {
	buildResponsesErrorEnvelope,
	extractResponsesRequestModel,
	forwardTranslateToResponsesEnvelope,
	forwardTranslateToResponsesSseEvents,
	isResponsesStreamRequested,
	reverseTranslateOpenAiResponsesRequest,
} from './openai-responses-envelope';

/** Loopback HTTP server that intercepts vendor SDK calls during eval. Binds to an OS-assigned port. */
export interface InterceptedTurn {
	/** AI root node name parsed from the URL path. Used as ledger attribution key. */
	rootName: string;
	url: string;
	method: string;
	nodeType: string;
	requestBody: unknown;
	mockResponse: unknown;
}

export interface LlmWireServerOptions {
	mockHandler?: EvalLlmMockHandler;
	/** Root name → vendor LLM sub-node `INode`, built by `buildVendorLlmRouting`. */
	rootToSubNode?: ReadonlyMap<string, INode>;
	/** Pushed to `nodeResults[rootName].interceptedRequests` by the caller. */
	onIntercept?: (turn: InterceptedTurn) => void;
	logger?: Logger;
}

/** Per-protocol translator + formatter — adding a new vendor envelope is a new adapter, not a new handler. */
interface ProtocolAdapter {
	name: string;
	extractModel(body: unknown): string;
	isStreamRequested(body: unknown): boolean;
	reverseTranslate(body: unknown): IHttpRequestOptions;
	forwardObject(response: EvalMockHttpResponse | undefined, model: string): Record<string, unknown>;
	/** Pre-formatted SSE frames (`data: ...\n\n` or `event: ...\ndata: ...\n\n`), incl. any terminator. */
	buildSseFrames(response: EvalMockHttpResponse | undefined, model: string): string[];
	buildErrorEnvelope(message: string): Record<string, unknown>;
	stubResponse(): EvalMockHttpResponse;
}

const chatCompletionsAdapter: ProtocolAdapter = {
	name: 'chat-completions',
	extractModel: extractRequestModel,
	isStreamRequested,
	reverseTranslate: reverseTranslateOpenAiRequest,
	forwardObject: forwardTranslateToChatCompletion,
	buildSseFrames: (response, model) => {
		const chunks = forwardTranslateToSseChunks(response, model);
		const frames = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`);
		// Terminator per OpenAI SSE spec — SDKs stop reading on this sentinel.
		frames.push('data: [DONE]\n\n');
		return frames;
	},
	buildErrorEnvelope: buildOpenAiErrorEnvelope,
	stubResponse: () => ({
		body: { content: '[eval wire server stub] — no mock handler attached' },
		headers: { 'content-type': 'application/json' },
		statusCode: 200,
	}),
};

const responsesAdapter: ProtocolAdapter = {
	name: 'responses',
	extractModel: extractResponsesRequestModel,
	isStreamRequested: isResponsesStreamRequested,
	reverseTranslate: reverseTranslateOpenAiResponsesRequest,
	forwardObject: forwardTranslateToResponsesEnvelope,
	buildSseFrames: (response, model) => {
		// Responses API uses `event: <name>\ndata: <JSON>\n\n` frames and emits
		// `response.completed` as its terminal sentinel (no `[DONE]` line).
		const events = forwardTranslateToResponsesSseEvents(response, model);
		return events.map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	},
	buildErrorEnvelope: buildResponsesErrorEnvelope,
	stubResponse: () => ({
		body: { output_text: '[eval wire server stub] — no mock handler attached' },
		headers: { 'content-type': 'application/json' },
		statusCode: 200,
	}),
};

export class LlmWireServer {
	private server: Server | undefined;
	private resolvedUrl: string | undefined;
	/** In-flight handler promises — `stop()` awaits these before resolving. */
	private readonly inFlight = new Set<Promise<void>>();
	/** Set by `stop()` so any request that beats the close-callback gets a 503 instead of starting a fresh handler that would race the teardown. */
	private stopping = false;

	constructor(private readonly options: LlmWireServerOptions = {}) {}

	get url(): string {
		if (!this.resolvedUrl) {
			throw new Error('LlmWireServer.url accessed before start() resolved');
		}
		return this.resolvedUrl;
	}

	async start(): Promise<string> {
		if (this.server) return this.url;

		// Reset the shutdown latch in case this instance is restarted after stop().
		this.stopping = false;

		const app = this.buildApp();

		this.server = await new Promise<Server>((resolve, reject) => {
			const s = app.listen(0, '127.0.0.1', () => resolve(s));
			s.once('error', reject);
		});

		const address = this.server.address();
		if (!address || typeof address === 'string') {
			throw new Error('LlmWireServer failed to bind a TCP port');
		}
		this.resolvedUrl = `http://127.0.0.1:${address.port}`;
		return this.resolvedUrl;
	}

	async stop(): Promise<void> {
		const server = this.server;
		if (!server) return;
		// Flip stopping FIRST so new requests 503 instead of racing the teardown.
		this.stopping = true;
		this.server = undefined;
		this.resolvedUrl = undefined;

		// Drain in-flight handlers so the mock-handler resolve can't write to a
		// torn-down socket and `onIntercept` can't fire after stop().
		await Promise.allSettled(Array.from(this.inFlight));

		server.closeAllConnections();

		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	}

	private buildApp(): Express {
		const app = express();
		app.use(express.json({ limit: '4mb' }));
		app.post('/eval/:root/v1/chat/completions', this.routeFor(chatCompletionsAdapter));
		// `@langchain/openai` v1.3+ auto-routes Agent v3.1+ calls to /v1/responses.
		app.post('/eval/:root/v1/responses', this.routeFor(responsesAdapter));
		// Surfaces credential-rewrite misconfiguration loudly instead of 404'ing.
		app.post('/v1/chat/completions', this.handleUnrouted);
		app.post('/v1/responses', this.handleUnrouted);
		return app;
	}

	/** Wraps each route in the in-flight tracker so `stop()` can drain. */
	private routeFor(adapter: ProtocolAdapter) {
		return async (req: Request, res: Response): Promise<void> => {
			if (this.stopping) {
				res.status(503).json(adapter.buildErrorEnvelope('Wire server is shutting down'));
				return;
			}
			const promise = this.handleProtocol(adapter, req, res);
			this.inFlight.add(promise);
			try {
				await promise;
			} finally {
				this.inFlight.delete(promise);
			}
		};
	}

	private async handleProtocol(
		adapter: ProtocolAdapter,
		req: Request,
		res: Response,
	): Promise<void> {
		// Express decodes route params; a second decode would mangle literal `%`.
		const rootName = req.params.root;
		const model = adapter.extractModel(req.body);
		const stream = adapter.isStreamRequested(req.body);
		const subNode = this.resolveSubNode(rootName);

		if (!this.options.mockHandler) {
			this.respondWithStub(adapter, req, res, model, stream);
			return;
		}

		let synthetic: IHttpRequestOptions;
		let mockResponse: Awaited<ReturnType<EvalLlmMockHandler>>;
		try {
			synthetic = adapter.reverseTranslate(req.body);
			mockResponse = await this.options.mockHandler(synthetic, subNode);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.options.logger?.error(`[EvalMock] Wire-server mock generation failed: ${message}`);
			this.respondWithError(adapter, res, message);
			return;
		}

		// Ledger write BEFORE the response so consumers see the entry deterministically
		// after `await fetch(...)`. `requestBody` is stored by reference (express.json
		// never re-touches it); callers must not mutate. A thrown `onIntercept` never
		// blocks the response the SDK gets.
		try {
			this.options.onIntercept?.({
				rootName,
				url: synthetic.url,
				method: synthetic.method ?? 'POST',
				nodeType: subNode.type,
				requestBody: req.body,
				mockResponse: mockResponse?.body,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.options.logger?.warn(`[EvalMock] Wire-server ledger write failed: ${message}`);
		}

		try {
			if (stream) {
				this.writeSseResponse(adapter, req, res, mockResponse, model);
			} else {
				res.status(200).json(adapter.forwardObject(mockResponse, model));
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.options.logger?.error(`[EvalMock] Wire-server response write failed: ${message}`);
			// Headers not yet flushed → send a typed error envelope; otherwise close.
			if (!res.headersSent) {
				this.respondWithError(adapter, res, message);
			} else if (!res.writableEnded) {
				res.end();
			}
		}
	}

	/** Stream the mock response as SSE frames, short-circuiting if the client disconnects. */
	private writeSseResponse(
		adapter: ProtocolAdapter,
		req: Request,
		res: Response,
		mockResponse: Awaited<ReturnType<EvalLlmMockHandler>>,
		model: string,
	): void {
		// Build frames BEFORE setting headers so a translator throw surfaces as a
		// 500 envelope via `handleProtocol`'s outer catch, not a 200 + empty body.
		const frames = adapter.buildSseFrames(mockResponse, model);

		res.status(200);
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		// Forces immediate flush in proxied setups (Nginx etc.).
		res.setHeader('X-Accel-Buffering', 'no');

		// Short-circuit on SDK abort (timeout / AbortController) — otherwise the
		// loop keeps writing to a destroyed socket.
		let aborted = false;
		const onClose = () => {
			aborted = true;
		};
		req.once('close', onClose);

		try {
			for (const frame of frames) {
				if (aborted || res.writableEnded || res.destroyed) break;
				res.write(frame);
			}
		} finally {
			req.off('close', onClose);
			if (!res.writableEnded) res.end();
		}
	}

	private respondWithStub(
		adapter: ProtocolAdapter,
		req: Request,
		res: Response,
		model: string,
		stream: boolean,
	): void {
		const stubBody = adapter.stubResponse();
		if (stream) {
			this.writeSseResponse(adapter, req, res, stubBody, model);
			return;
		}
		res.status(200).json(adapter.forwardObject(stubBody, model));
	}

	private respondWithError(adapter: ProtocolAdapter, res: Response, message: string): void {
		// Streaming clients still parse a JSON error envelope (the SDK throws an
		// APIError before iterating chunks). Sending a 500 + JSON keeps both
		// streaming and non-streaming SDK paths happy — no SSE branch needed.
		res.status(500).json(adapter.buildErrorEnvelope(`Mock generation failed: ${message}`));
	}

	private handleUnrouted = (_req: Request, res: Response): void => {
		res
			.status(500)
			.json(
				buildOpenAiErrorEnvelope(
					'Wire server received an OpenAI request without an /eval/<root>/ prefix. ' +
						'Credential rewrite is misconfigured — check EvalMockedCredentialsHelper.',
				),
			);
	};

	private resolveSubNode(rootName: string): INode {
		const subNode = this.options.rootToSubNode?.get(rootName);
		if (subNode) return subNode;
		// Defensive fallback — can't crash on a missing mapping mid-eval.
		this.options.logger?.warn(
			`[EvalMock] Wire server has no sub-node mapping for root "${rootName}" — using synthetic identity`,
		);
		return {
			id: `eval-wire-server:${rootName}`,
			name: rootName,
			type: '@n8n/eval-wire-server.unknown-vendor-llm',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
	}
}
