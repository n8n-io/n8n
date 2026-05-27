import express, { type Express, type Request, type Response } from 'express';
import { type Server } from 'node:http';
import { randomUUID } from 'node:crypto';

/** Loopback HTTP server that intercepts vendor SDK calls during eval. Binds to an OS-assigned port. */
export class LlmWireServer {
	private server: Server | undefined;
	private resolvedUrl: string | undefined;

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
		app.post('/v1/chat/completions', (req: Request, res: Response) => {
			res.status(200).json(buildOpenAiChatCompletionStub(req.body));
		});
		return app;
	}
}

function buildOpenAiChatCompletionStub(requestBody: unknown): Record<string, unknown> {
	const model =
		typeof requestBody === 'object' && requestBody !== null && 'model' in requestBody
			? String((requestBody as { model: unknown }).model)
			: 'gpt-4o-mini';

	return {
		id: `chatcmpl-${randomUUID()}`,
		object: 'chat.completion',
		created: Math.floor(Date.now() / 1000),
		model,
		choices: [
			{
				index: 0,
				message: {
					role: 'assistant',
					content: '[eval wire server stub] — mock-handler integration ships in TRUST-114.',
				},
				finish_reason: 'stop',
			},
		],
		usage: {
			prompt_tokens: 1,
			completion_tokens: 1,
			total_tokens: 2,
		},
	};
}
