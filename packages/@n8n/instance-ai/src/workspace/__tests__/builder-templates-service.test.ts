import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import JSZip from 'jszip';

import {
	BuilderTemplatesService,
	type BuilderTemplatesServiceOptions,
} from '../builder-templates-service';

const ORIGINAL_FETCH = globalThis.fetch;

interface ZipContent {
	indexTxt?: string;
	files?: Record<string, string>;
}

async function buildZip(content: ZipContent): Promise<Buffer> {
	const zip = new JSZip();
	if (content.indexTxt !== undefined) zip.file('index.txt', content.indexTxt);
	for (const [name, body] of Object.entries(content.files ?? {})) {
		zip.file(name, body);
	}
	return await zip.generateAsync({ type: 'nodebuffer' });
}

function zipResponse(buffer: Buffer, etag: string | null, status = 200): Response {
	const headers: Record<string, string> = { 'content-type': 'application/zip' };
	if (etag) headers.etag = etag;
	return new Response(new Uint8Array(buffer), { status, headers });
}

interface MockState {
	zip: Buffer;
	etag: string | null;
	zipStatus?: number;
	respondNotModified?: boolean;
	calls: { fetch: number; lastIfNoneMatch: string | null };
}

function installMockFetch(state: MockState): jest.Mock {
	const mock = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
		state.calls.fetch++;
		const headers = new Headers((init?.headers ?? {}) as Record<string, string>);
		state.calls.lastIfNoneMatch = headers.get('if-none-match');

		if (state.respondNotModified) {
			return new Response(null, { status: 304 });
		}

		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (!url.endsWith('/templates.zip')) {
			return new Response('unhandled', { status: 500 });
		}

		const status = state.zipStatus ?? 200;
		if (status >= 400) return new Response('error', { status });
		return zipResponse(state.zip, state.etag, status);
	});
	globalThis.fetch = mock as unknown as typeof globalThis.fetch;
	return mock;
}

async function makeTempDir(): Promise<string> {
	return await fsp.mkdtemp(path.join(os.tmpdir(), 'builder-templates-svc-'));
}

function makeOptions(
	cacheDir: string,
	overrides: Partial<BuilderTemplatesServiceOptions> = {},
): BuilderTemplatesServiceOptions {
	return {
		cdnBaseUrl: 'https://cdn.example/n8n-sdk-templates/v1',
		cacheDir,
		refreshIntervalMs: 60_000,
		fetchTimeoutMs: 1_000,
		...overrides,
	};
}

async function makeState(): Promise<MockState> {
	const zip = await buildZip({
		indexTxt: 'alpha.ts | Alpha Workflow\nbeta.ts | Beta Workflow',
		files: {
			'alpha.ts': '// alpha example',
			'beta.ts': '// beta example',
		},
	});
	return {
		zip,
		etag: '"sha-1"',
		calls: { fetch: 0, lastIfNoneMatch: null },
	};
}

describe('BuilderTemplatesService', () => {
	afterEach(() => {
		globalThis.fetch = ORIGINAL_FETCH;
	});

	it('fetches templates.zip on first call and populates disk cache', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.files.map((f) => f.filename)).toEqual(['alpha.ts', 'beta.ts']);
		expect(bundle.indexTxt).toContain('Alpha Workflow');
		expect(bundle.version).toBe('"sha-1"');

		const cachedZip = await fsp.readFile(path.join(cacheDir, 'templates.zip'));
		expect(cachedZip.length).toBeGreaterThan(0);
		const cachedEtag = await fsp.readFile(path.join(cacheDir, 'etag.txt'), 'utf-8');
		expect(cachedEtag).toBe('"sha-1"');
	});

	it('returns an empty bundle when the fetch fails and there is no disk cache', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		state.zipStatus = 500;
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.files).toEqual([]);
		expect(bundle.version).toBeNull();
	});

	it('memoises subsequent calls and does not refetch when cache is fresh', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 60_000 }));
		await svc.getBundle();
		const callsAfterFirst = state.calls.fetch;
		await svc.getBundle();
		expect(state.calls.fetch).toBe(callsAfterFirst);
	});

	it('sends If-None-Match on refresh and short-circuits on 304', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		installMockFetch(state);

		const seedSvc = new BuilderTemplatesService(makeOptions(cacheDir));
		await seedSvc.getBundle();

		// Backdate the cache so the TTL window expires immediately.
		await fsp.utimes(path.join(cacheDir, 'templates.zip'), 0, 0);
		state.respondNotModified = true;

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 1 }));
		const bundle = await svc.getBundle();
		// Background refresh is fire-and-forget; let it run.
		await new Promise((r) => setTimeout(r, 20));

		expect(bundle.version).toBe('"sha-1"');
		expect(state.calls.lastIfNoneMatch).toBe('"sha-1"');
	});

	it('short-circuits to an empty bundle when disabled', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		const fetchMock = installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { disabled: true }));
		const bundle = await svc.getBundle();

		expect(bundle.files).toEqual([]);
		expect(bundle.version).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('hydrates from disk and reports the cached version', async () => {
		const cacheDir = await makeTempDir();
		await fsp.mkdir(cacheDir, { recursive: true });
		const zip = await buildZip({
			indexTxt: 'gamma.ts | Gamma',
			files: { 'gamma.ts': '// gamma' },
		});
		await fsp.writeFile(path.join(cacheDir, 'templates.zip'), zip);
		await fsp.writeFile(path.join(cacheDir, 'etag.txt'), '"pre-existing"');

		// Block any network call so we know hydration came from disk.
		globalThis.fetch = jest.fn(
			async () => new Response('', { status: 500 }),
		) as unknown as typeof globalThis.fetch;

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 60_000 }));
		const bundle = await svc.getBundle();

		expect(bundle.version).toBe('"pre-existing"');
		expect(bundle.files.map((f) => f.filename)).toEqual(['gamma.ts']);
		expect(svc.getVersion()).toBe('"pre-existing"');
	});

	it('keeps the existing bundle when the refresh fetch errors', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		installMockFetch(state);

		const seedSvc = new BuilderTemplatesService(makeOptions(cacheDir));
		await seedSvc.getBundle();

		state.zipStatus = 503;
		await fsp.utimes(path.join(cacheDir, 'templates.zip'), 0, 0);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 1 }));
		const bundle = await svc.getBundle();
		await new Promise((r) => setTimeout(r, 20));

		expect(bundle.version).toBe('"sha-1"');
		expect(bundle.files.map((f) => f.filename)).toEqual(['alpha.ts', 'beta.ts']);
	});
});
