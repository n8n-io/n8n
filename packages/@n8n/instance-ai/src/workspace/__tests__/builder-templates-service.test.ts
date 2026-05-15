import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import type { ManifestEntry, ManifestFile } from '@n8n/workflow-sdk/examples-loader';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	BuilderTemplatesService,
	type BuilderTemplatesServiceOptions,
} from '../builder-templates-service';

const ORIGINAL_FETCH = globalThis.fetch;

const SAMPLE_WORKFLOW: WorkflowJSON = {
	name: 'wf',
	nodes: [
		{
			id: '1',
			name: 'Manual',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
} as unknown as WorkflowJSON;

function entry(slug: string, overrides: Partial<ManifestEntry> = {}): ManifestEntry {
	return {
		id: 1,
		slug,
		name: slug,
		description: '',
		nodes: ['n8n-nodes-base.cron'],
		tags: ['demo'],
		triggerType: 'manual',
		hasAI: false,
		score: 50,
		source: 'n8n.io',
		author: 'test',
		success: true,
		...overrides,
	};
}

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
}

interface MockState {
	manifest: ManifestFile;
	workflows: Record<string, WorkflowJSON>;
	manifestStatus?: number;
	missingWorkflows?: Set<string>;
	calls: { manifest: number; workflows: Map<string, number> };
}

function installMockFetch(state: MockState): jest.Mock {
	const mock = jest.fn(async (input: RequestInfo | URL) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (url.endsWith('/manifest.json')) {
			state.calls.manifest++;
			const status = state.manifestStatus ?? 200;
			if (status >= 400) return new Response('error', { status });
			return jsonResponse(state.manifest);
		}
		const wfMatch = url.match(/\/workflows\/([^/]+)\.json$/);
		if (wfMatch) {
			const slug = wfMatch[1];
			state.calls.workflows.set(slug, (state.calls.workflows.get(slug) ?? 0) + 1);
			if (state.missingWorkflows?.has(slug)) return new Response('not found', { status: 404 });
			const wf = state.workflows[slug];
			if (!wf) return new Response('no fixture', { status: 500 });
			return jsonResponse(wf);
		}
		return new Response('unhandled', { status: 500 });
	});
	globalThis.fetch = mock as unknown as typeof globalThis.fetch;
	return mock;
}

function makeState(overrides: Partial<MockState> = {}): MockState {
	return {
		manifest: {
			generatedAt: '2026-05-15T00:00:00Z',
			version: 'sha-1',
			workflows: [entry('alpha'), entry('beta', { id: 2 })],
		},
		workflows: { alpha: SAMPLE_WORKFLOW, beta: SAMPLE_WORKFLOW },
		calls: { manifest: 0, workflows: new Map() },
		...overrides,
	};
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

describe('BuilderTemplatesService', () => {
	afterEach(() => {
		globalThis.fetch = ORIGINAL_FETCH;
	});

	it('fetches manifest + workflows on first call and populates disk cache', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.files.map((f) => f.filename)).toEqual(['alpha.ts', 'beta.ts']);
		expect(bundle.version).toBe('sha-1');

		const cachedManifest = JSON.parse(
			await fsp.readFile(path.join(cacheDir, 'manifest.json'), 'utf-8'),
		);
		expect(cachedManifest.version).toBe('sha-1');
		const cachedAlpha = await fsp.readFile(path.join(cacheDir, 'workflows', 'alpha.json'), 'utf-8');
		expect(JSON.parse(cachedAlpha)).toEqual(SAMPLE_WORKFLOW);
	});

	it('returns an empty bundle when the manifest fetch fails and there is no disk cache', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState({ manifestStatus: 500 });
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.files).toEqual([]);
		expect(bundle.version).toBeNull();
	});

	it('skips entries whose workflow returns 404', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState({ missingWorkflows: new Set(['beta']) });
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir));
		const bundle = await svc.getBundle();

		expect(bundle.files.map((f) => f.filename)).toEqual(['alpha.ts']);
	});

	it('memoises subsequent calls and does not refetch when cache is fresh', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 60_000 }));
		await svc.getBundle();
		const callsAfterFirst = state.calls.manifest;
		await svc.getBundle();
		expect(state.calls.manifest).toBe(callsAfterFirst);
	});

	it('skips workflow fetches when the manifest version matches the disk cache', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		installMockFetch(state);

		// Seed the cache with the same version on disk.
		const seedSvc = new BuilderTemplatesService(makeOptions(cacheDir));
		await seedSvc.getBundle();
		state.calls.workflows.clear();

		// Backdate cache so the TTL window expires immediately, then make sure
		// no workflow fetches happen on refresh.
		await fsp.utimes(path.join(cacheDir, 'manifest.json'), 0, 0);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 1 }));
		await svc.getBundle();
		// Background refresh is fire-and-forget; let it run.
		await new Promise((r) => setTimeout(r, 20));
		expect(state.calls.workflows.size).toBe(0);
	});

	it('short-circuits to an empty bundle when disabled', async () => {
		const cacheDir = await makeTempDir();
		const state = makeState();
		const fetchMock = installMockFetch(state);

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { disabled: true }));
		const bundle = await svc.getBundle();

		expect(bundle.files).toEqual([]);
		expect(bundle.version).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('hydrates from disk and reports the cached version', async () => {
		const cacheDir = await makeTempDir();
		await fsp.mkdir(path.join(cacheDir, 'workflows'), { recursive: true });
		const manifest: ManifestFile = {
			version: 'pre-existing',
			workflows: [entry('gamma')],
		};
		await fsp.writeFile(path.join(cacheDir, 'manifest.json'), JSON.stringify(manifest));
		await fsp.writeFile(
			path.join(cacheDir, 'workflows', 'gamma.json'),
			JSON.stringify(SAMPLE_WORKFLOW),
		);

		// Block any network call so we know hydration came from disk.
		globalThis.fetch = jest.fn(
			async () => new Response('', { status: 500 }),
		) as unknown as typeof globalThis.fetch;

		const svc = new BuilderTemplatesService(makeOptions(cacheDir, { refreshIntervalMs: 60_000 }));
		const bundle = await svc.getBundle();

		expect(bundle.version).toBe('pre-existing');
		expect(bundle.files.map((f) => f.filename)).toEqual(['gamma.ts']);
		expect(svc.getVersion()).toBe('pre-existing');
	});
});
