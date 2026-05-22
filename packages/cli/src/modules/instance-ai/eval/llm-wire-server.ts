import type { Logger } from '@n8n/backend-common';
import express, { type Express, type Request, type Response } from 'express';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { type Server } from 'node:http';

import {
	buildOpenAiErrorEnvelope,
	extractRequestModel,
	forwardTranslateToChatCompletion,
	forwardTranslateToSseChunks,
	isStreamRequested,
	reverseTranslateOpenAiRequest,
} from './openai-envelope';

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

export class LlmWireServer {
	private server: Server | undefined;
	private resolvedUrl: string | undefined;

	constructor(private readonly options: LlmWireServerOptions = {}) {}

	get url(): string {
		if (!this.resolvedUrl) {
			throw new Error('LlmWireServer.url accessed before start() resolved');
		}
		return this.resolvedUrl;
	}

	async start(): Promise<string> {
		if (this.server) return this.url;

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
		this.server = undefined;
		this.resolvedUrl = undefined;

		server.closeAllConnections();

		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	}

	private buildApp(): Express {
		const app = express();
		app.use(express.json({ limit: '4mb' }));
		app.post('/eval/:root/v1/chat/completions', this.handleChatCompletion);
		// Surfaces credential-rewrite misconfiguration loudly instead of 404'ing.
		app.post('/v1/chat/completions', this.handleUnroutedChatCompletion);
		return app;
	}

	private handleChatCompletion = async (req: Request, res: Response): Promise<void> => {
		// Express decodes route params; a second decode would mangle literal `%`.
		const rootName = req.params.root;
		const model = extractRequestModel(req.body);
		const stream = isStreamRequested(req.body);
		const subNode = this.resolveSubNode(rootName);

		if (!this.options.mockHandler) {
			this.respondWithStub(res, model, stream);
			return;
		}

		let synthetic: ReturnType<typeof reverseTranslateOpenAiRequest>;
		let mockResponse: Awaited<ReturnType<typeof this.options.mockHandler>>;
		try {
			synthetic = reverseTranslateOpenAiRequest(req.body);
			mockResponse = await this.options.mockHandler(synthetic, subNode);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.options.logger?.error(`[EvalMock] Wire-server mock generation failed: ${message}`);
			this.respondWithError(res, message);
			return;
		}

		try {
			if (stream) {
				this.writeSseEnvelope(res, mockResponse, model);
			} else {
				const envelope = forwardTranslateToChatCompletion(mockResponse, model);
				res.status(200).json(envelope);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.options.logger?.error(`[EvalMock] Wire-server response write failed: ${message}`);
			// At this point headers may be sent; fall through to ledger best-effort.
			if (!res.headersSent) {
				this.respondWithError(res, message);
			} else {
				res.end();
			}
		}

		// Best-effort ledger write — never let it taint the 200 the SDK sees.
		try {
			this.options.onIntercept?.({
				rootName,
				url: synthetic.url,
				method: synthetic.method ?? 'POST',
				nodeType: subNode.type,
				// Deep-clone so the ledger entry can't be mutated by later code.
				requestBody: this.cloneRequestBody(req.body),
				mockResponse: mockResponse?.body,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.options.logger?.warn(`[EvalMock] Wire-server ledger write failed: ${message}`);
		}
	};

	/** Stream the mock response as SSE chunks terminated with `data: [DONE]\n\n`. */
	private writeSseEnvelope(
		res: Response,
		mockResponse: Awaited<ReturnType<EvalLlmMockHandler>>,
		model: string,
	): void {
		res.status(200);
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		// Forces immediate flush in proxied setups (Nginx etc.) — harmless here.
		res.setHeader('X-Accel-Buffering', 'no');

		const chunks = forwardTranslateToSseChunks(mockResponse, model);
		for (const chunk of chunks) {
			res.write(`data: ${JSON.stringify(chunk)}\n\n`);
		}
		// Terminator per OpenAI SSE spec — SDKs stop reading on this sentinel.
		res.write('data: [DONE]\n\n');
		res.end();
	}

	private respondWithStub(res: Response, model: string, stream: boolean): void {
		const stubBody: Awaited<ReturnType<EvalLlmMockHandler>> = {
			body: { content: '[eval wire server stub] — no mock handler attached' },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		};
		if (stream) {
			this.writeSseEnvelope(res, stubBody, model);
			return;
		}
		const envelope = forwardTranslateToChatCompletion(stubBody, model);
		res.status(200).json(envelope);
	}

	private respondWithError(res: Response, message: string): void {
		// Streaming clients still parse a JSON error envelope (the SDK throws an
		// APIError before iterating chunks). Sending a 500 + JSON keeps both
		// streaming and non-streaming SDK paths happy — no SSE branch needed.
		res.status(500).json(buildOpenAiErrorEnvelope(`Mock generation failed: ${message}`));
	}

	private handleUnroutedChatCompletion = (_req: Request, res: Response): void => {
		res
			.status(500)
			.json(
				buildOpenAiErrorEnvelope(
					'Wire server received an OpenAI request without an /eval/<root>/ prefix. ' +
						'Credential rewrite is misconfigured — check EvalMockedCredentialsHelper.',
				),
			);
	};

	/** Deep-clone via `structuredClone`; logs and falls back to the original ref if it throws. */
	private cloneRequestBody(body: unknown): unknown {
		try {
			return structuredClone(body);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.options.logger?.warn(
				`[EvalMock] Wire-server ledger entry not isolated — clone failed: ${message}`,
			);
			return body;
		}
	}

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
