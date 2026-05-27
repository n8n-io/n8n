import type { Logger } from '@n8n/backend-common';
import express, { type Express, type Request, type Response } from 'express';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { type Server } from 'node:http';

import {
	buildOpenAiErrorEnvelope,
	extractRequestModel,
	forwardTranslateToChatCompletion,
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
		const subNode = this.resolveSubNode(rootName);

		if (!this.options.mockHandler) {
			const envelope = forwardTranslateToChatCompletion(
				{
					body: { content: '[eval wire server stub] — no mock handler attached' },
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				},
				model,
			);
			res.status(200).json(envelope);
			return;
		}

		let synthetic: ReturnType<typeof reverseTranslateOpenAiRequest>;
		let mockResponse: Awaited<ReturnType<typeof this.options.mockHandler>>;
		let envelope: Record<string, unknown>;
		try {
			synthetic = reverseTranslateOpenAiRequest(req.body);
			mockResponse = await this.options.mockHandler(synthetic, subNode);
			envelope = forwardTranslateToChatCompletion(mockResponse, model);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.options.logger?.error(`[EvalMock] Wire-server mock generation failed: ${message}`);
			res.status(500).json(buildOpenAiErrorEnvelope(`Mock generation failed: ${message}`));
			return;
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

		res.status(200).json(envelope);
	};

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
