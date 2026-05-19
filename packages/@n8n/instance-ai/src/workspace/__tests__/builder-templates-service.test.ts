import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
	BuilderTemplatesService,
	type BuilderTemplatesServiceOptions,
	builderTemplatesOptionsFromEnv,
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

function sha256Hex(buf: Buffer): string {
	return createHash('sha256').update(buf).digest('hex');
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
	/** When `null`, sidecar returns 404; when a string, that body is served; default = correct sha. */
	sha256Override?: string | null;
	/** Force the first N zip requests to return 503; subsequent requests behave normally. */
	transientFailuresBeforeSuccess?: number;
	/** When true, the zip 200 response omits its ETag header (forces persist() to unlink etag.txt). */
	omitEtagHeader?: boolean;
	calls: { fetch: number; zipFetches: number; lastIfNoneMatch: string | null };
}

function installMockFetch(state: MockState): jest.Mock {
	const mock = jest.fn((input: string | URL | Request, init?: RequestInit) => {
		state.calls.fetch++;
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const headers = new Headers((init?.headers ?? {}) as Record<string, string>);

		if (url.endsWith('/templates.zip.sha256')) {
			if (state.sha256Override === null) return new Response('', { status: 404 });
			const body = state.sha256Override ?? sha256Hex(state.zip);
			return new Response(body, {
				status: 200,
				headers: { 'content-type': 'text/plain' },
			});
		}

		if (!url.endsWith('/templates.zip')) {
			return new Response('unhandled', { status: 500 });
		}

		state.calls.zipFetches++;
		state.calls.lastIfNoneMatch = headers.get('if-none-match');

		if (state.respondNotModified) {
			return new Response(null, { status: 304 });
		}

		if (state.transientFailuresBeforeSuccess && state.transientFailuresBeforeSuccess > 0) {
			state.transientFailuresBeforeSuccess--;
			return new Response('temporarily unavailable', { status: 503 });
		}

		const status = state.zipStatus ?? 200;
		if (status >= 400) return new Response('error', { status });
		const etag = state.omitEtagHeader ? null : state.etag;
		return zipResponse(state.zip, etag, status);
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
		// Keep retry tests fast; production default is much higher.
		retryBackoffBaseMs: 1,
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
		calls: { fetch: 0, zipFetches: 0, lastIfNoneMatch: null },
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
			() => new Response('', { status: 500 }),
		) as unknown as typeof globalThis.fetch;

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 60_000 }));
		const bundle = await svc.getBundle();

		expect(bundle.version).toBe('"pre-existing"');
		expect(bundle.files.map((f) => f.filename)).toEqual(['gamma.ts']);
		// getVersion() strips the quotes for telemetry use; raw etag stays on bundle.version.
		expect(svc.getVersion()).toBe('pre-existing');
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

	it('does not send If-None-Match on initial fetch when only an orphan etag exists on disk', async () => {
		// Simulate a previously-cached etag without a matching zip — e.g. the zip
		// was deleted or never finished writing. A 304 here would leave the service
		// permanently empty for the process, so the initial request must be
		// unconditional.
		const cacheDir = await makeTempDir();
		await fsp.mkdir(cacheDir, { recursive: true });
		await fsp.writeFile(path.join(cacheDir, 'etag.txt'), '"orphan"');

		const state = await makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(state.calls.lastIfNoneMatch).toBeNull();
		expect(bundle.version).toBe('"sha-1"');
		expect(bundle.files.map((f) => f.filename)).toEqual(['alpha.ts', 'beta.ts']);
	});

	it('unlinks etag.txt when refresh returns 200 without an ETag header', async () => {
		const cacheDir = await makeTempDir();
		await fsp.mkdir(cacheDir, { recursive: true });
		await fsp.writeFile(path.join(cacheDir, 'etag.txt'), '"stale"');

		const state = await makeState();
		state.omitEtagHeader = true;
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.version).toBeNull();
		await expect(fsp.stat(path.join(cacheDir, 'etag.txt'))).rejects.toMatchObject({
			code: 'ENOENT',
		});
	});

	it('persists etag.txt before templates.zip (crash-safety)', async () => {
		// Pre-create templates.zip as a non-empty directory so the atomic
		// rename for the zip step fails. With etag-first ordering, etag.txt
		// should already be on disk when the zip write blows up.
		const cacheDir = await makeTempDir();
		const blockedZipPath = path.join(cacheDir, 'templates.zip');
		await fsp.mkdir(blockedZipPath);
		await fsp.writeFile(path.join(blockedZipPath, 'block'), '');

		const state = await makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		await svc.getBundle();

		const etagOnDisk = await fsp.readFile(path.join(cacheDir, 'etag.txt'), 'utf-8');
		expect(etagOnDisk).toBe('"sha-1"');
		// The pre-existing directory is untouched — rename never succeeded.
		expect((await fsp.stat(blockedZipPath)).isDirectory()).toBe(true);
	});

	it('retries on transient 5xx during cold-start hydrate', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		state.transientFailuresBeforeSuccess = 2;
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { maxAttempts: 3 }));
		const bundle = await svc.getBundle();

		expect(bundle.files.map((f) => f.filename)).toEqual(['alpha.ts', 'beta.ts']);
		expect(state.calls.zipFetches).toBe(3);
	});

	it('does not retry on 4xx', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		state.zipStatus = 403;
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { maxAttempts: 3 }));
		const bundle = await svc.getBundle();

		expect(bundle.files).toEqual([]);
		expect(state.calls.zipFetches).toBe(1);
	});

	it('rejects the downloaded bundle when sha256 sidecar mismatches', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		state.sha256Override = 'deadbeef'.repeat(8); // 64 hex chars, but wrong
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.files).toEqual([]);
		expect(bundle.version).toBeNull();
		// Cache must not be written on integrity failure
		await expect(fsp.stat(path.join(cacheDir, 'templates.zip'))).rejects.toMatchObject({
			code: 'ENOENT',
		});
	});

	it('accepts the bundle when sha256 sidecar matches', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		// sha256Override undefined → mock serves the correct digest
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.files.map((f) => f.filename)).toEqual(['alpha.ts', 'beta.ts']);
		expect(bundle.version).toBe('"sha-1"');
	});

	it('accepts the bundle when the sha256 sidecar 404s (defence-in-depth, not required)', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		state.sha256Override = null; // sidecar 404
		const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() };
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { logger }));
		const bundle = await svc.getBundle();

		expect(bundle.files.map((f) => f.filename)).toEqual(['alpha.ts', 'beta.ts']);
		expect(bundle.version).toBe('"sha-1"');
	});

	it('drops the disk cache when a persisted sha256 does not match the on-disk zip', async () => {
		const cacheDir = await makeTempDir();
		await fsp.mkdir(cacheDir, { recursive: true });
		const zip = await buildZip({
			indexTxt: 'gamma.ts | Gamma',
			files: { 'gamma.ts': '// gamma' },
		});
		await fsp.writeFile(path.join(cacheDir, 'templates.zip'), zip);
		await fsp.writeFile(path.join(cacheDir, 'etag.txt'), '"stale"');
		// Sha that does NOT match the zip on disk
		await fsp.writeFile(path.join(cacheDir, 'templates.zip.sha256'), 'deadbeef'.repeat(8));

		// Live CDN serves a different bundle → service should refetch on mismatch
		const state = await makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		// Came from the network, not the corrupt disk cache
		expect(bundle.version).toBe('"sha-1"');
		expect(bundle.files.map((f) => f.filename)).toEqual(['alpha.ts', 'beta.ts']);
		// Initial network fetch must not echo the disk's stale etag
		expect(state.calls.lastIfNoneMatch).toBeNull();
	});

	it('getVersion strips the W/ prefix and surrounding quotes for telemetry', async () => {
		const cacheDir = await makeTempDir();
		const state = await makeState();
		state.etag = 'W/"abc-123"';
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		await svc.getBundle();
		expect(svc.getVersion()).toBe('abc-123');
	});
});

describe('builderTemplatesOptionsFromEnv', () => {
	const ORIGINAL_ENV = { ...process.env };

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	function clearEnv() {
		delete process.env.N8N_INSTANCE_AI_TEMPLATES_URL;
		delete process.env.N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS;
		delete process.env.N8N_INSTANCE_AI_TEMPLATES_DISABLED;
	}

	it('parses a valid refresh hours value', () => {
		clearEnv();
		process.env.N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS = '6';
		const opts = builderTemplatesOptionsFromEnv();
		expect(opts.refreshIntervalMs).toBe(6 * 60 * 60 * 1000);
	});

	it('omits refreshIntervalMs and warns when refresh hours is not a number', () => {
		clearEnv();
		process.env.N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS = 'banana';
		const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() };
		const opts = builderTemplatesOptionsFromEnv({ logger });
		expect(opts.refreshIntervalMs).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS'),
			expect.objectContaining({ value: 'banana' }),
		);
	});

	it('omits refreshIntervalMs when refresh hours is zero or negative', () => {
		clearEnv();
		process.env.N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS = '0';
		expect(builderTemplatesOptionsFromEnv().refreshIntervalMs).toBeUndefined();

		process.env.N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS = '-4';
		expect(builderTemplatesOptionsFromEnv().refreshIntervalMs).toBeUndefined();
	});

	it('honours the disabled flag and base URL', () => {
		clearEnv();
		process.env.N8N_INSTANCE_AI_TEMPLATES_DISABLED = 'true';
		process.env.N8N_INSTANCE_AI_TEMPLATES_URL = 'https://example.com/v2';
		const opts = builderTemplatesOptionsFromEnv();
		expect(opts.disabled).toBe(true);
		expect(opts.cdnBaseUrl).toBe('https://example.com/v2');
	});
});
