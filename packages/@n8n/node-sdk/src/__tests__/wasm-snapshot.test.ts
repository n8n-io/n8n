import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { INode } from 'n8n-workflow';

import {
	firstPartyCredentialType,
	firstPartyRuntime,
	firstPartyVersionsOf as versionsOf,
	fixturesFileOf,
} from './first-party';
import { packAction } from '../pack';
import { replayFixtures } from '../publish';
import type { ExecutorHost } from '../runtime';
import { childProcessSnapshotBuilder } from '../../scripts/snapshot-bundle';
import { wasmSnapshotRuntime } from '../runtimes/wasm-snapshot';
import { sandboxedVersionOf, type GuestRuntime, type GuestSession } from '../sandbox';
import { parseFixtures } from '../version';

const SANDBOX = path.resolve(__dirname, '..', '..', 'sandbox');
const SIDECAR =
	process.env.N8N_NODE_CONTRACT_SANDBOX_SIDECAR ??
	path.join(SANDBOX, 'sidecar', 'target', 'release', 'n8n-sandbox');
const GUESTS = path.join(SANDBOX, 'dist');

const node: INode = {
	id: '1',
	name: 'Counter',
	type: 'counter',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const counterSource = (topLevel: string) => `import { defineNode, t } from '@n8n/node-sdk';
const counter = defineNode({ id: 'counter', displayName: 'Counter' });
const state = { runs: 0 };
${topLevel}
export const count = counter.action('count', {
	action: 'Count',
	summary: 'Count the runs of this guest.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {},
	output: t.obj({ runs: t.num() }),
	run: async () => ({ runs: ++state.runs }),
});
`;

describe('the snapshot cache of wasmSnapshotRuntime', () => {
	const dirs = { root: '' };
	beforeEach(async () => {
		dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-snapshot-cache-'));
		await writeFile(path.join(dirs.root, 'action-snapshot.js'), 'template');
	});
	afterEach(async () => await rm(dirs.root, { recursive: true, force: true }));

	const cacheDir = () => path.join(dirs.root, 'cache');
	const TEMPLATE = createHash('sha256').update('template').digest('hex').slice(0, 16);
	const snapshotDir = (bundleHash: string) =>
		path.join(cacheDir(), 'snapshots', `${bundleHash}-${TEMPLATE}`);
	const digestOf = (bundleHash: string) =>
		createHash('sha256').update(Buffer.alloc(1_000, bundleHash)).digest('hex');
	const compiledOf = (bundleHash: string) =>
		path.join(cacheDir(), `${digestOf(bundleHash)}-engine.cwasm`);
	/** Writes a snapshot of 1064 bytes and, as the sidecar would, its `.cwasm` of 1000 bytes. */
	const writeSnapshot = async (bundleHash: string) => {
		await mkdir(snapshotDir(bundleHash), { recursive: true });
		await writeFile(
			path.join(snapshotDir(bundleHash), 'action.wasm'),
			Buffer.alloc(1_000, bundleHash),
		);
		await writeFile(path.join(snapshotDir(bundleHash), 'action.wasm.sha256'), digestOf(bundleHash));
		await writeFile(compiledOf(bundleHash), Buffer.alloc(1_000));
	};
	const sessionOf = (bundleHash: string) =>
		({
			kind: 'action',
			manifest: { id: `bundle.${bundleHash}`, bundleHash, nodeContract: '2.7.0' },
			bundleFile: path.join(dirs.root, `${bundleHash}.js`),
			grants: ['http'],
			limits: { memoryMb: 64, cpuMs: 1_000, wallMs: 20_000, maxMessageBytes: 1_000 },
			cacheDir: cacheDir(),
		}) as unknown as GuestSession;

	it('removes the snapshots used longest ago when a build makes the cache larger than its cap', async () => {
		await writeSnapshot('old');
		const runtime = wasmSnapshotRuntime({
			sidecar: '/usr/bin/false',
			guests: dirs.root,
			buildSnapshot: async ({ bundleSha256 }) => await writeSnapshot(bundleSha256),
			maxCacheBytes: 5_200,
		});
		try {
			for (const bundleHash of ['a', 'b', 'a', 'c'])
				(await runtime.start(sessionOf(bundleHash))).close();
			expect(existsSync(snapshotDir('old'))).toBe(false);
			expect(existsSync(compiledOf('old'))).toBe(false);
			expect([existsSync(snapshotDir('a')), existsSync(compiledOf('a'))]).toEqual([true, true]);
			expect([existsSync(snapshotDir('b')), existsSync(compiledOf('b'))]).toEqual([true, false]);
			expect([existsSync(snapshotDir('c')), existsSync(compiledOf('c'))]).toEqual([true, true]);
		} finally {
			runtime.close();
		}
	});

	it('removes old snapshots when a snapshot directory goes away during the eviction', async () => {
		await writeSnapshot('old');
		await symlink(path.join(dirs.root, 'gone'), path.join(cacheDir(), 'snapshots', 'gone'));
		const runtime = wasmSnapshotRuntime({
			sidecar: '/usr/bin/false',
			guests: dirs.root,
			buildSnapshot: async ({ bundleSha256 }) => await writeSnapshot(bundleSha256),
			maxCacheBytes: 3_000,
		});
		try {
			(await runtime.start(sessionOf('a'))).close();
			expect(existsSync(snapshotDir('old'))).toBe(false);
			expect(existsSync(snapshotDir('a'))).toBe(true);
		} finally {
			runtime.close();
		}
	});

	it('runs the new snapshot when the eviction cannot remove an old one', async () => {
		await writeSnapshot('old');
		const runtime = wasmSnapshotRuntime({
			sidecar: '/usr/bin/false',
			guests: dirs.root,
			buildSnapshot: async ({ bundleSha256 }) => {
				await writeSnapshot(bundleSha256);
				await chmod(snapshotDir('old'), 0o500);
			},
			maxCacheBytes: 3_000,
		});
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			(await runtime.start(sessionOf('a'))).close();
			(await runtime.start(sessionOf('a'))).close();
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('cannot remove old snapshots'));
		} finally {
			warn.mockRestore();
			runtime.close();
			await chmod(snapshotDir('old'), 0o700);
		}
	});
});

describe.skipIf(!existsSync(SIDECAR) || !existsSync(path.join(GUESTS, 'action-snapshot.js')))(
	'wasmSnapshotRuntime',
	() => {
		const dirs = { root: '' };
		const cacheDir = () => path.join(dirs.root, 'cache');
		const spawns = async () =>
			(await readFile(path.join(dirs.root, 'spawns'), 'utf8')).split('\n').filter(Boolean).length;

		beforeAll(async () => {
			dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-wasm-snapshot-'));
			await writeFile(path.join(dirs.root, 'counter.ts'), counterSource(''));
			await writeFile(path.join(dirs.root, 'random.ts'), counterSource('Math.random();'));
			// Counts the sidecar processes.
			await writeFile(
				path.join(dirs.root, 'sidecar'),
				`#!/bin/sh\necho spawn >> '${path.join(dirs.root, 'spawns')}'\nexec '${SIDECAR}' "$@"\n`,
			);
			await chmod(path.join(dirs.root, 'sidecar'), 0o755);
		});

		afterAll(async () => {
			await rm(dirs.root, { recursive: true, force: true });
		});

		const snapshotRuntime = () =>
			wasmSnapshotRuntime({
				sidecar: path.join(dirs.root, 'sidecar'),
				guests: GUESTS,
				buildSnapshot: childProcessSnapshotBuilder(),
			});

		const snapshotDirs = () => readdirSync(path.join(cacheDir(), 'snapshots'));

		const counterOf = async (runtime: GuestRuntime, file = 'counter.ts') => {
			const packed = await packAction(path.join(dirs.root, file), 'count');
			const { executor } = await sandboxedVersionOf(
				{
					manifest: packed.manifest,
					origin: 'private',
					readBundle: async () => packed.bundle,
					readSdk: async () => packed.sdk ?? '',
				},
				{ runtime, cacheDir: cacheDir(), credentialType: () => undefined },
				firstPartyRuntime(),
			);
			const host: ExecutorHost = {
				items: [{ json: {} }],
				node,
				parameter: () => undefined,
				request: async () => ({}),
				continueOnFail: () => false,
			};
			return async () => (await executor(host))[0]?.[0]?.json;
		};

		it('runs each execution in a fresh instance of the snapshot, on one sidecar', async () => {
			const runtime = snapshotRuntime();
			try {
				const run = await counterOf(runtime);
				const before = await spawns();
				expect(await run()).toEqual({ runs: 1 });
				expect(await run()).toEqual({ runs: 1 });
				expect(await spawns()).toBe(before);
				expect(snapshotDirs()).toHaveLength(1);
			} finally {
				runtime.close();
			}
		}, 120_000);

		it('refuses a snapshot that does not match its recorded digest', async () => {
			const [snapshot = ''] = snapshotDirs();
			const recorded = path.join(cacheDir(), 'snapshots', snapshot, 'action.wasm.sha256');
			const digest = readFileSync(recorded, 'utf8');
			await writeFile(recorded, '0'.repeat(64));
			const runtime = snapshotRuntime();
			try {
				await expect(counterOf(runtime)).rejects.toThrow(
					'The snapshot of counter.count does not match its digest',
				);
			} finally {
				runtime.close();
				await writeFile(recorded, digest);
			}
		}, 60_000);

		it('runs a bundle that calls an import at its top level in the generic guest', async () => {
			const runtime = snapshotRuntime();
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			try {
				const run = await counterOf(runtime, 'random.ts');
				expect(await run()).toEqual({ runs: 1 });
				expect(runtime.snapshotStatus()).toEqual([
					expect.objectContaining({
						id: 'counter.count',
						fellBack: expect.stringContaining('wasi:random'),
					}),
				]);
				expect(warn).toHaveBeenCalledTimes(1);
				expect(warn).toHaveBeenCalledWith(
					expect.stringContaining('counter.count runs in the generic guest'),
				);
			} finally {
				warn.mockRestore();
				runtime.close();
			}
		}, 120_000);

		it.each(['items.set', 'notion.databasePage.getAll'])(
			'replays the fixtures of %s',
			async (id) => {
				const [head] = versionsOf(id);
				if (!head) throw new Error(`${id} has no bundled HEAD`);
				const runtime = snapshotRuntime();
				try {
					const loaded = await sandboxedVersionOf(
						head,
						{
							runtime,
							cacheDir: cacheDir(),
							credentialType: firstPartyCredentialType,
						},
						firstPartyRuntime(),
					);
					const fixtures = parseFixtures(readFileSync(fixturesFileOf(id), 'utf8'));
					expect(
						await replayFixtures(
							{ manifest: head.manifest, bundle: await head.readBundle() },
							fixtures,
							{ contract: loaded.action, executor: loaded.executor, migrate: loaded.migrate },
						),
					).toEqual([]);
					expect(snapshotDirs().some((dir) => dir.startsWith(head.manifest.bundleHash))).toBe(true);
				} finally {
					runtime.close();
				}
			},
			120_000,
		);
	},
);
