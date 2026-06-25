/**
 * Vitest setup file for integration tests.
 *
 * Wires up nockBack for per-test cassette recording / replay.
 *
 * Modes:
 *  - VCR_MODE=record  → record fresh cassettes (nockBack "update" mode)
 *  - CI=true          → replay cassettes, block real HTTP ("lockdown" mode)
 *  - otherwise        → pass all traffic through, cassettes unused ("wild")
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { brotliDecompressSync, gunzipSync } from 'zlib';

import nock, { back as nockBack } from 'nock';
import { afterEach, beforeEach } from 'vitest';

import { IS_RECORD_MODE, IS_REPLAY_MODE, cassetteName } from './src/__tests__/integration/vcr';

const CASSETTES_DIR = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'src/__tests__/integration/cassettes',
);

nockBack.fixtures = CASSETTES_DIR;

if (IS_RECORD_MODE) {
	nockBack.setMode('update');
} else if (IS_REPLAY_MODE) {
	nockBack.setMode('lockdown');
} else {
	nockBack.setMode('wild');
}

const URL_PASSTHROUGH = /localhost|127.0.0.1|0.0.0.0/i;

// remove all nock interceptors
nock.restore();
const originalFetch = globalThis.fetch;

// nock uses @mswjs/interceptors internally which calls request.clone() on every request,
// request.clone() is not stable and may break requests in some cases leading to hanging responses.
// This custom proxy fetch is a workaround to bypass the nock interceptors for local requests.
function applyCustomProxyFetch() {
	const originalProxyFetch = globalThis.fetch;
	if (originalFetch === originalProxyFetch) {
		throw new Error('Original fetch matches proxied fetch. This should not happen.');
	}
	Object.defineProperty(globalThis, 'fetch', {
		value: (input: RequestInfo | URL, init?: RequestInit) => {
			if (URL_PASSTHROUGH.test(input.toString())) {
				return originalFetch(input, init);
			}
			return originalProxyFetch(input, init);
		},
		enumerable: true,
		configurable: true,
	});
}

// Minimal models.dev fixture — avoids recording the ~200 KB api.json in each cassette.

const MODELS_DEV_FIXTURE = {
	anthropic: {
		id: 'anthropic',
		name: 'Anthropic',
		models: {
			'claude-haiku-4-5': {
				id: 'claude-haiku-4-5',
				name: 'Claude Haiku 4.5',
				reasoning: false,
				tool_call: true,
				cost: { input: 0.8, output: 4 },
				limit: { context: 200000, output: 8192 },
			},
			'claude-sonnet-4-5': {
				id: 'claude-sonnet-4-5',
				name: 'Claude Sonnet 4.5',
				reasoning: true,
				tool_call: true,
				cost: { input: 3, output: 15 },
				limit: { context: 200000, output: 64000 },
			},
			'claude-sonnet-4-6': {
				id: 'claude-sonnet-4-6',
				name: 'Claude Sonnet 4.6',
				reasoning: true,
				tool_call: true,
				cost: { input: 3, output: 15 },
				limit: { context: 200000, output: 64000 },
			},
		},
	},
	openai: {
		id: 'openai',
		name: 'OpenAI',
		models: {
			'gpt-4o-mini': {
				id: 'gpt-4o-mini',
				name: 'GPT-4o mini',
				reasoning: false,
				tool_call: true,
				cost: { input: 0.15, output: 0.6 },
				limit: { context: 128000, output: 16384 },
			},
			'gpt-4.1-mini': {
				id: 'gpt-4.1-mini',
				name: 'GPT-4.1 mini',
				reasoning: false,
				tool_call: true,
				cost: { input: 0.4, output: 1.6 },
				limit: { context: 1047576, output: 32768 },
			},
			'gpt-5-mini': {
				id: 'gpt-5-mini',
				name: 'GPT-5 mini',
				reasoning: true,
				tool_call: true,
				cost: { input: 0.25, output: 2 },
				limit: { context: 400000, output: 128000 },
			},
		},
	},
};

const SENSITIVE_RESPONSE_HEADERS = ['anthropic-organization-id'];
const ENCODING_RESPONSE_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding'];

function sanitizeCassette(defs: nock.Definition[]): nock.Definition[] {
	return defs
		.filter((def) => {
			const scope = def.scope as string;
			if (scope === 'https://models.dev:443') return false;
			if (/localhost|127\.0\.0\.1/.test(scope)) return false;
			return true;
		})
		.map((def) => {
			if (def.rawHeaders) {
				const raw = def.rawHeaders as Record<string, string>;
				decodeCompressedJsonResponse(def, raw);
				for (const header of SENSITIVE_RESPONSE_HEADERS) {
					delete raw[header];
				}
			}
			return def;
		});
}

function decodeCompressedJsonResponse(
	def: nock.Definition,
	rawHeaders: Record<string, string>,
): void {
	const contentType = rawHeaders['content-type'];
	if (!contentType?.includes('application/json')) return;

	const encoding = rawHeaders['content-encoding'];
	if (encoding !== 'br' && encoding !== 'gzip') return;

	if (!Array.isArray(def.response) || typeof def.response[0] !== 'string') return;

	const compressed = Buffer.from(def.response[0], 'hex');
	const decoded = encoding === 'br' ? brotliDecompressSync(compressed) : gunzipSync(compressed);
	def.response = decoded.toString('utf8');

	for (const header of ENCODING_RESPONSE_HEADERS) {
		delete rawHeaders[header];
	}
}

// Per-test nockBack hooks (only when recording or replaying)

if (IS_REPLAY_MODE) {
	process.env.OPENAI_API_KEY = 'sk-proj-1234567890';
	process.env.ANTHROPIC_API_KEY = 'sk-proj-1234567890';
}

if (IS_RECORD_MODE || IS_REPLAY_MODE) {
	const nockDoneMap = new Map<string, () => void>();

	beforeEach(async (ctx) => {
		const name = cassetteName(ctx);

		const subDir = path.join(CASSETTES_DIR, path.dirname(name));
		await fs.promises.mkdir(subDir, { recursive: true });

		if (!nock.isActive()) {
			nock.activate();
		}

		const { nockDone } = await nockBack(name, {
			afterRecord: sanitizeCassette,
		});
		// apply our patch
		applyCustomProxyFetch();

		nock.disableNetConnect();
		nock.enableNetConnect(/localhost|127\.0\.0\.1/);
		nock('https://models.dev').get('/api.json').reply(200, MODELS_DEV_FIXTURE).persist();

		nockDoneMap.set(ctx.task.id, nockDone);
	});

	afterEach((ctx) => {
		const nockDone = nockDoneMap.get(ctx.task.id);
		if (nockDone) {
			nockDone();
			nockDoneMap.delete(ctx.task.id);
		}
		nock.cleanAll();
		nock.restore();
	});
}
