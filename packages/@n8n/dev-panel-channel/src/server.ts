#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const PORT = Number(process.env.N8N_DEV_PANEL_CHANNEL_PORT ?? 8788);
const HOST = '127.0.0.1';
const EXPECTED_SENDER = 'n8n-dev-panel';
const MAX_BODY_BYTES = 64 * 1024;

type PromptBody = {
	prompt: string;
	file?: string;
	line?: number;
	col?: number;
	testid?: string;
	component?: string;
	selector?: string;
	classes?: string[];
	outerHtmlSnippet?: string;
};

function log(message: string): void {
	process.stderr.write(`[dev-panel-channel] ${message}\n`);
}

function isPromptBody(value: unknown): value is PromptBody {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return typeof v.prompt === 'string' && v.prompt.length > 0;
}

function buildContent(body: PromptBody): string {
	const contextLines: string[] = [];
	if (body.selector) contextLines.push(`- CSS selector: ${body.selector}`);
	if (body.classes?.length) contextLines.push(`- CSS classes: ${body.classes.join(' ')}`);
	if (body.outerHtmlSnippet) {
		const snippet = body.outerHtmlSnippet.slice(0, 500);
		contextLines.push(`- HTML snippet: ${snippet}`);
	}

	if (contextLines.length === 0) return body.prompt;

	return `${body.prompt}\n\nContext:\n${contextLines.join('\n')}`;
}

function buildMeta(body: PromptBody): Record<string, string> {
	const meta: Record<string, string> = {};
	if (body.file) meta.file = body.file;
	if (typeof body.line === 'number') meta.line = String(body.line);
	if (typeof body.col === 'number') meta.col = String(body.col);
	if (body.testid) meta.testid = body.testid;
	if (body.component) meta.component = body.component;
	if (body.selector) meta.selector = body.selector;
	return meta;
}

async function readBody(req: IncomingMessage): Promise<string> {
	return await new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let total = 0;
		req.on('data', (chunk: Buffer) => {
			total += chunk.length;
			if (total > MAX_BODY_BYTES) {
				req.destroy();
				reject(new Error('payload too large'));
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
	/* eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name */
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(payload));
}

async function main(): Promise<void> {
	const mcp = new Server(
		{ name: 'n8n-dev-panel', version: '0.1.0' },
		{
			capabilities: {
				/* eslint-disable-next-line @typescript-eslint/naming-convention -- Claude Code channel capability key */
				experimental: { 'claude/channel': {} },
			},
			instructions:
				'Prompts arrive as <channel source="n8n-dev-panel"> tags from the n8n editor-ui dev panel. ' +
				'The `file`, `line`, and `col` attributes point at the Vue or TypeScript source location ' +
				'that rendered the selected DOM element (injected by vite-plugin-vue-inspector). ' +
				'Edit that file to fulfill the user request. ' +
				'Use `testid`, `component`, and `selector` as grep fallbacks when `file` is missing. ' +
				'This channel is one-way: read the event and act, do not reply.',
		},
	);

	await mcp.connect(new StdioServerTransport());
	log('MCP stdio transport connected');

	const httpServer = createServer((req, res) => {
		void handleRequest(req, res, mcp);
	});

	httpServer.on('error', (error) => {
		log(`HTTP server error: ${error.message}`);
	});

	httpServer.listen(PORT, HOST, () => {
		log(`listening on http://${HOST}:${PORT}`);
	});
}

async function handleRequest(
	req: IncomingMessage,
	res: ServerResponse,
	mcp: Server,
): Promise<void> {
	const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);

	if (req.method === 'GET' && url.pathname === '/health') {
		sendJson(res, 200, { ok: true, server: 'n8n-dev-panel' });
		return;
	}

	if (req.method === 'POST' && url.pathname === '/prompt') {
		const sender = req.headers['x-sender'];
		if (sender !== EXPECTED_SENDER) {
			sendJson(res, 403, { ok: false, error: 'forbidden' });
			return;
		}

		let raw: string;
		try {
			raw = await readBody(req);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'read failed';
			sendJson(res, 413, { ok: false, error: message });
			return;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			sendJson(res, 400, { ok: false, error: 'invalid JSON' });
			return;
		}

		if (!isPromptBody(parsed)) {
			sendJson(res, 400, { ok: false, error: 'missing prompt' });
			return;
		}

		try {
			await mcp.notification({
				method: 'notifications/claude/channel',
				params: {
					content: buildContent(parsed),
					meta: buildMeta(parsed),
				},
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'notification failed';
			log(`failed to emit notification: ${message}`);
			sendJson(res, 500, { ok: false, error: message });
			return;
		}

		sendJson(res, 200, { ok: true });
		return;
	}

	sendJson(res, 404, { ok: false, error: 'not found' });
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	log(`fatal: ${message}`);
	process.exit(1);
});
