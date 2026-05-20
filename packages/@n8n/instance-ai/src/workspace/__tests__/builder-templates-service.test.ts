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

function sha256Hex(buf: Buffer): string {
	return createHash('sha256').update(buf).digest('hex');
}

function archiveResponse(buffer: Buffer, etag: string | null, status = 200): Response {
	const headers: Record<string, string> = { 'content-type': 'application/gzip' };
	if (etag) headers.etag = etag;
	return new Response(new Uint8Array(buffer), { status, headers });
}

interface MockState {
	/** Opaque archive bytes — the service treats these as a black box, no extraction. */
	archive: Buffer;
	etag: string | null;
	archiveStatus?: number;
	respondNotModified?: boolean;
	/** When `null`, sidecar returns 404; when a string, that body is served; default = correct sha. */
	sha256Override?: string | null;
	/** Force the first N archive requests to return 503; subsequent requests behave normally. */
	transientFailuresBeforeSuccess?: number;
	/** When true, the archive 200 response omits its ETag header. */
	omitEtagHeader?: boolean;
	calls: { fetch: number; archiveFetches: number; lastIfNoneMatch: string | null };
}

function installMockFetch(state: MockState): jest.Mock {
	const mock = jest.fn((input: string | URL | Request, init?: RequestInit) => {
		state.calls.fetch++;
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const headers = new Headers((init?.headers ?? {}) as Record<string, string>);

		if (url.endsWith('/templates.tar.gz.sha256')) {
			if (state.sha256Override === null) return new Response('', { status: 404 });
			const body = state.sha256Override ?? sha256Hex(state.archive);
			return new Response(body, {
				status: 200,
				headers: { 'content-type': 'text/plain' },
			});
		}

		if (!url.endsWith('/templates.tar.gz')) {
			return new Response('unhandled', { status: 500 });
		}

		state.calls.archiveFetches++;
		state.calls.lastIfNoneMatch = headers.get('if-none-match');

		if (state.respondNotModified) {
			return new Response(null, { status: 304 });
		}

		if (state.transientFailuresBeforeSuccess && state.transientFailuresBeforeSuccess > 0) {
			state.transientFailuresBeforeSuccess--;
			return new Response('temporarily unavailable', { status: 503 });
		}

		const status = state.archiveStatus ?? 200;
		if (status >= 400) return new Response('error', { status });
		const etag = state.omitEtagHeader ? null : state.etag;
		return archiveResponse(state.archive, etag, status);
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

function makeState(): MockState {
	return {
		archive: Buffer.from('opaque-archive-bytes-v1'),
		etag: '"sha-1"',
		calls: { fetch: 0, archiveFetches: 0, lastIfNoneMatch: null },
	};
}

describe('BuilderTemplatesService', () => {
	afterEach(() => {
		globalThis.fetch = ORIGINAL_FETCH;
	});

	it('fetches templates.tar.gz on first call and populates disk cache', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.archive?.equals(state.archive)).toBe(true);
		expect(bundle.version).toBe('"sha-1"');

		const cachedArchive = await fsp.readFile(path.join(cacheDir, 'templates.tar.gz'));
		expect(cachedArchive.equals(state.archive)).toBe(true);
		const cachedEtag = await fsp.readFile(path.join(cacheDir, 'etag.txt'), 'utf-8');
		expect(cachedEtag).toBe('"sha-1"');
		const cachedSha = await fsp.readFile(path.join(cacheDir, 'templates.tar.gz.sha256'), 'utf-8');
		expect(cachedSha).toBe(sha256Hex(state.archive));
	});

	it('returns an empty bundle when the fetch fails and there is no disk cache', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		state.archiveStatus = 500;
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.archive).toBeNull();
		expect(bundle.version).toBeNull();
	});

	it('memoises subsequent calls and does not refetch when cache is fresh', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 60_000 }));
		await svc.getBundle();
		const callsAfterFirst = state.calls.fetch;
		await svc.getBundle();
		expect(state.calls.fetch).toBe(callsAfterFirst);
	});

	it('sends If-None-Match on refresh and short-circuits on 304', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		installMockFetch(state);

		const seedSvc = new BuilderTemplatesService(makeOptions(cacheDir));
		await seedSvc.getBundle();

		// Backdate the cache so the TTL window expires immediately.
		await fsp.utimes(path.join(cacheDir, 'templates.tar.gz'), 0, 0);
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
		const state = makeState();
		const fetchMock = installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { disabled: true }));
		const bundle = await svc.getBundle();

		expect(bundle.archive).toBeNull();
		expect(bundle.version).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('hydrates from disk and reports the cached version', async () => {
		const cacheDir = await makeTempDir();
		await fsp.mkdir(cacheDir, { recursive: true });
		const archive = Buffer.from('opaque-archive-bytes-pre-existing');
		await fsp.writeFile(path.join(cacheDir, 'templates.tar.gz'), archive);
		await fsp.writeFile(path.join(cacheDir, 'etag.txt'), '"pre-existing"');

		// Block any network call so we know hydration came from disk.
		globalThis.fetch = jest.fn(
			() => new Response('', { status: 500 }),
		) as unknown as typeof globalThis.fetch;

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 60_000 }));
		const bundle = await svc.getBundle();

		expect(bundle.version).toBe('"pre-existing"');
		expect(bundle.archive?.equals(archive)).toBe(true);
		// getVersion() strips the quotes for telemetry use; raw etag stays on bundle.version.
		expect(svc.getVersion()).toBe('pre-existing');
	});

	it('keeps the existing bundle when the refresh fetch errors', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		installMockFetch(state);

		const seedSvc = new BuilderTemplatesService(makeOptions(cacheDir));
		await seedSvc.getBundle();

		state.archiveStatus = 503;
		await fsp.utimes(path.join(cacheDir, 'templates.tar.gz'), 0, 0);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 1 }));
		const bundle = await svc.getBundle();
		await new Promise((r) => setTimeout(r, 20));

		expect(bundle.version).toBe('"sha-1"');
		expect(bundle.archive?.equals(state.archive)).toBe(true);
	});

	it('does not send If-None-Match on initial fetch when only an orphan etag exists on disk', async () => {
		// Simulate a previously-cached etag without a matching archive — e.g. the
		// archive was deleted or never finished writing. A 304 here would leave the
		// service permanently empty for the process, so the initial request must
		// be unconditional.
		const cacheDir = await makeTempDir();
		await fsp.mkdir(cacheDir, { recursive: true });
		await fsp.writeFile(path.join(cacheDir, 'etag.txt'), '"orphan"');

		const state = makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(state.calls.lastIfNoneMatch).toBeNull();
		expect(bundle.version).toBe('"sha-1"');
		expect(bundle.archive?.equals(state.archive)).toBe(true);
	});

	it('unlinks etag.txt when refresh returns 200 without an ETag header', async () => {
		const cacheDir = await makeTempDir();
		await fsp.mkdir(cacheDir, { recursive: true });
		await fsp.writeFile(path.join(cacheDir, 'etag.txt'), '"stale"');

		const state = makeState();
		state.omitEtagHeader = true;
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.version).toBeNull();
		await expect(fsp.stat(path.join(cacheDir, 'etag.txt'))).rejects.toMatchObject({
			code: 'ENOENT',
		});
	});

	it('persists etag.txt before templates.tar.gz (crash-safety)', async () => {
		// Pre-create templates.tar.gz as a non-empty directory so the atomic
		// rename for the archive step fails. With etag-first ordering, etag.txt
		// should already be on disk when the archive write blows up.
		const cacheDir = await makeTempDir();
		const blockedArchivePath = path.join(cacheDir, 'templates.tar.gz');
		await fsp.mkdir(blockedArchivePath);
		await fsp.writeFile(path.join(blockedArchivePath, 'block'), '');

		const state = makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		await svc.getBundle();

		const etagOnDisk = await fsp.readFile(path.join(cacheDir, 'etag.txt'), 'utf-8');
		expect(etagOnDisk).toBe('"sha-1"');
		// The pre-existing directory is untouched — rename never succeeded.
		expect((await fsp.stat(blockedArchivePath)).isDirectory()).toBe(true);
	});

	it('retries on transient 5xx during cold-start hydrate', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		state.transientFailuresBeforeSuccess = 2;
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { maxAttempts: 3 }));
		const bundle = await svc.getBundle();

		expect(bundle.archive?.equals(state.archive)).toBe(true);
		expect(state.calls.archiveFetches).toBe(3);
	});

	it('does not retry on 4xx', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		state.archiveStatus = 403;
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { maxAttempts: 3 }));
		const bundle = await svc.getBundle();

		expect(bundle.archive).toBeNull();
		expect(state.calls.archiveFetches).toBe(1);
	});

	it('rejects the downloaded bundle when sha256 sidecar mismatches', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		state.sha256Override = 'deadbeef'.repeat(8); // 64 hex chars, but wrong
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.archive).toBeNull();
		expect(bundle.version).toBeNull();
		// Cache must not be written on integrity failure
		await expect(fsp.stat(path.join(cacheDir, 'templates.tar.gz'))).rejects.toMatchObject({
			code: 'ENOENT',
		});
	});

	it('accepts the bundle when sha256 sidecar matches', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		// sha256Override undefined → mock serves the correct digest
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.archive?.equals(state.archive)).toBe(true);
		expect(bundle.version).toBe('"sha-1"');
	});

	it('accepts the bundle when the sha256 sidecar 404s (defence-in-depth, not required)', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		state.sha256Override = null; // sidecar 404
		const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() };
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { logger }));
		const bundle = await svc.getBundle();

		expect(bundle.archive?.equals(state.archive)).toBe(true);
		expect(bundle.version).toBe('"sha-1"');
	});

	it('drops the disk cache when a persisted sha256 does not match the on-disk archive', async () => {
		const cacheDir = await makeTempDir();
		await fsp.mkdir(cacheDir, { recursive: true });
		const corruptArchive = Buffer.from('this-is-the-corrupt-archive-on-disk');
		await fsp.writeFile(path.join(cacheDir, 'templates.tar.gz'), corruptArchive);
		await fsp.writeFile(path.join(cacheDir, 'etag.txt'), '"stale"');
		// Sha that does NOT match the archive on disk
		await fsp.writeFile(path.join(cacheDir, 'templates.tar.gz.sha256'), 'deadbeef'.repeat(8));

		// Live CDN serves a different bundle → service should refetch on mismatch
		const state = makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		// Came from the network, not the corrupt disk cache
		expect(bundle.version).toBe('"sha-1"');
		expect(bundle.archive?.equals(state.archive)).toBe(true);
		// Initial network fetch must not echo the disk's stale etag
		expect(state.calls.lastIfNoneMatch).toBeNull();
	});

	it('getVersion strips the W/ prefix and surrounding quotes for telemetry', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
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
