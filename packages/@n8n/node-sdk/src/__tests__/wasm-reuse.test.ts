import { existsSync } from 'node:fs';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { INode } from 'n8n-workflow';

import { freezeAction } from '../freeze';
import type { ExecutorHost } from '../runtime';
import { wasmReuseRuntime } from '../runtimes/wasm-reuse';
import { sandboxedVersionOf, type SandboxLimits } from '../sandbox';

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

const COUNTER = `import { defineNode, t } from '@n8n/node-sdk';
const counter = defineNode({ id: 'counter', displayName: 'Counter' });
const state = { runs: 0 };
const kept: unknown[] = [];
export const count = counter.action('count', {
	action: 'Count',
	summary: 'Count the runs of this guest.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: { mode: t.str() },
	output: t.obj({ runs: t.num() }),
	run: async ({ input }) => {
		if (input.mode === 'spin') for (;;) {}
		if (input.mode === 'grow') for (;;) kept.push(new Array(1_000_000).fill(kept.length));
		return { runs: ++state.runs };
	},
});
`;

describe.skipIf(!existsSync(SIDECAR) || !existsSync(path.join(GUESTS, 'action.wasm')))(
	'wasmReuseRuntime',
	() => {
		const dirs = { root: '' };
		const spawns = async () =>
			(await readFile(path.join(dirs.root, 'spawns'), 'utf8')).split('\n').filter(Boolean).length;

		beforeAll(async () => {
			dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-wasm-reuse-'));
			await writeFile(path.join(dirs.root, 'counter.ts'), COUNTER);
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

		const counterOf = async (
			runtime: ReturnType<typeof wasmReuseRuntime>,
			limits: Partial<SandboxLimits>,
		) => {
			const frozen = await freezeAction(path.join(dirs.root, 'counter.ts'), 'count');
			const { executor } = await sandboxedVersionOf(
				{ manifest: frozen.manifest, origin: 'private', readBundle: async () => frozen.bundle },
				{
					runtime,
					cacheDir: path.join(dirs.root, 'cache'),
					credentialType: () => undefined,
					limits,
				},
			);
			return async (mode: string) => {
				const host: ExecutorHost = {
					items: [{ json: {} }],
					node,
					parameter: (name) => (name === 'mode' ? mode : undefined),
					request: async () => ({}),
					continueOnFail: () => false,
				};
				const [[output] = []] = await executor(host);
				return output?.json;
			};
		};
		const reuseRuntime = () =>
			wasmReuseRuntime({ sidecar: path.join(dirs.root, 'sidecar'), guests: GUESTS });

		it('runs every execution in a fresh instance of one sidecar, also after a stopped run', async () => {
			const runtime = reuseRuntime();
			const run = await counterOf(runtime, { cpuMs: 1_000, memoryMb: 64, wallMs: 20_000 });
			const before = await spawns();
			try {
				expect(await run('count')).toEqual({ runs: 1 });
				expect(await run('count')).toEqual({ runs: 1 });
				await expect(run('spin')).rejects.toThrow(
					'The bundle used its CPU time of 1000 ms and was stopped',
				);
				expect(await run('count')).toEqual({ runs: 1 });
				await expect(run('grow')).rejects.toThrow(
					'The bundle reached its memory limit of 64 MB and was stopped',
				);
				expect(await run('count')).toEqual({ runs: 1 });
				expect(await spawns()).toBe(before);
			} finally {
				runtime.close();
			}
		}, 60_000);

		it('stops a session at its wall clock and starts a new sidecar for the next one', async () => {
			const runtime = reuseRuntime();
			const run = await counterOf(runtime, { cpuMs: 60_000, memoryMb: 64, wallMs: 2_000 });
			const before = await spawns();
			try {
				await expect(run('spin')).rejects.toThrow('count ran longer than 2000 ms and was stopped');
				expect(await run('count')).toEqual({ runs: 1 });
				expect(await spawns()).toBe(before + 1);
			} finally {
				runtime.close();
			}
		}, 60_000);
	},
);
