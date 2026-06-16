/**
 * Vitest setup file for integration tests.
 *
 * Wires up nockBack for per-test cassette recording / replay.
 * Nock v14 uses @mswjs/interceptors internally, so it intercepts native
 * fetch (undici) without any patching.
 *
 * Modes:
 *  - VCR_MODE=record  → record fresh cassettes (nockBack "update" mode)
 *  - CI=true          → replay cassettes, block real HTTP ("lockdown" mode)
 *  - otherwise        → pass all traffic through, cassettes unused ("wild")
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import nock, { back as nockBack } from 'nock';
import { afterEach, beforeEach } from 'vitest';

import { IS_RECORD_MODE, IS_REPLAY_MODE, cassetteName } from './src/__tests__/integration/vcr';

// ---------------------------------------------------------------------------
// Configure nockBack
// ---------------------------------------------------------------------------

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
// request.clone() is not stable and may break requests in some cases leading to hanging requests.
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

// ---------------------------------------------------------------------------
// Minimal models.dev fixture — avoids recording the ~200 KB api.json
// response and nock lockdown failures. Covers the models used in tests.
// ---------------------------------------------------------------------------

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
		},
	},
};

const SENSITIVE_RESPONSE_HEADERS = ['anthropic-organization-id'];

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
				for (const header of SENSITIVE_RESPONSE_HEADERS) {
					delete raw[header];
				}
			}
			return def;
		});
}

// ---------------------------------------------------------------------------
// Per-test nockBack hooks (only when recording or replaying)
// ---------------------------------------------------------------------------
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
