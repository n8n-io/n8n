import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { INode } from 'n8n-workflow';

import { actions } from '../../../nodes-base-next/dist/index.js';
import { versionsOf } from '../../../nodes-base-next/dist/registry.js';
import { freezeAction } from '../freeze';
import { replayFixtures } from '../publish';
import type { ExecutorHost } from '../runtime';
import { childProcessSnapshotBuilder } from '../../scripts/snapshot-bundle';
import { wasmSnapshotRuntime } from '../runtimes/wasm-snapshot';
import { sandboxedVersionOf, type GuestRuntime } from '../sandbox';
import { parseFixtures } from '../version';

const SANDBOX = path.resolve(__dirname, '..', '..', 'sandbox');
const SIDECAR =
	process.env.N8N_NODE_CONTRACT_SANDBOX_SIDECAR ??
	path.join(SANDBOX, 'sidecar', 'target', 'release', 'n8n-sandbox');
const GUESTS = path.join(SANDBOX, 'dist');
const FIXTURES = path.resolve(__dirname, '..', '..', '..', 'nodes-base-next', 'fixtures');

const credentialTypes = new Map(
	actions.flatMap(({ node }) => node.credential?.types ?? []).map((type) => [type.name, type]),
);

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
			const frozen = await freezeAction(path.join(dirs.root, file), 'count');
			const { executor } = await sandboxedVersionOf(
				{ manifest: frozen.manifest, origin: 'private', readBundle: async () => frozen.bundle },
				{ runtime, cacheDir: cacheDir(), credentialType: () => undefined },
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
					const loaded = await sandboxedVersionOf(head, {
						runtime,
						cacheDir: cacheDir(),
						credentialType: (name) => credentialTypes.get(name),
					});
					const fixtures = parseFixtures(readFileSync(path.join(FIXTURES, `${id}.json`), 'utf8'));
					expect(
						await replayFixtures(
							{ manifest: head.manifest, bundle: await head.readBundle() },
							{ ...fixtures, migrations: [] },
							{ contract: loaded.action, executor: loaded.executor },
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
