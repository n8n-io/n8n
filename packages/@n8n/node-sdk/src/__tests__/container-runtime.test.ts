import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
	firstPartyActionIds,
	firstPartyCredentialType,
	firstPartyRuntime,
	firstPartyVersionsOf as versionsOf,
	fixturesFileOf,
} from './first-party';
import { packAction } from '../pack';
import { replayFixtures } from '../publish';
import type { ExecutorHost } from '../runtime';
import { CONTAINER_GUEST, containerRuntime } from '../runtimes/container';
import { sandboxedVersionOf, type SandboxOptions } from '../sandbox';
import { parseFixtures } from '../version';

const SANDBOX = path.resolve(__dirname, '..', '..', 'sandbox');
const SIDECAR = path.join(SANDBOX, 'sidecar', 'target', 'release', 'n8n-sandbox');
// Next to the guest, so docker shares it whenever it shares the guest. Colima shares no tmpdir.
const CACHE_ROOT = path.resolve(__dirname, '..', '..', 'node_modules', '.cache');

const runtime = (() => {
	try {
		return existsSync(CONTAINER_GUEST) ? containerRuntime() : undefined;
	} catch (error) {
		console.warn(`Skipping the container runtime tests: ${String(error)}`);
		return undefined;
	}
})();

mkdirSync(CACHE_ROOT, { recursive: true });
const cacheDir = mkdtempSync(path.join(CACHE_ROOT, 'container-runtime-'));
afterAll(() => rmSync(cacheDir, { recursive: true, force: true }));

const options = (
	withRuntime?: SandboxOptions['runtime'],
	limits?: SandboxOptions['limits'],
): SandboxOptions => ({
	runtime: withRuntime,
	sidecar: SIDECAR,
	guests: path.join(SANDBOX, 'dist'),
	cacheDir,
	credentialType: firstPartyCredentialType,
	limits,
});

async function replay(id: string, sandbox: SandboxOptions): Promise<string[]> {
	const [head] = versionsOf(id);
	if (!head) return [`${id} has no bundled HEAD`];
	const loaded = await sandboxedVersionOf(head, sandbox, firstPartyRuntime()).catch(
		(error: Error) => error,
	);
	if (loaded instanceof Error) return [`${id} refused: ${loaded.message}`];
	const fixtures = parseFixtures(readFileSync(fixturesFileOf(id), 'utf8'));
	return await replayFixtures(
		{ manifest: head.manifest, bundle: await head.readBundle() },
		fixtures,
		{ contract: loaded.action, executor: loaded.executor, migrate: loaded.migrate },
	);
}

const PROBES = `import { defineNode, t } from '@n8n/node-sdk';
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
const spec = (run: any) =>
	probe.action('probe', {
		action: 'Probe',
		summary: 'Probe the sandbox.',
		flow: { effect: 'read', cardinality: 'per-item' },
		input: {},
		output: t.obj({ value: t.str() }),
		run,
	});
export const undeclared = spec(async (context: any) => ({
	value: String(await context.dataTables.open({ name: 'x' })),
}));
export const loop = spec(async () => {
	for (;;) {}
});
export const grow = spec(async () => {
	const kept: unknown[] = [];
	for (;;) kept.push(new Array(1_000_000).fill(kept.length));
});
`;

const host: ExecutorHost = {
	items: [{ json: {} }],
	node: { id: '1', name: 'Probe', type: 'probe', typeVersion: 1, position: [0, 0], parameters: {} },
	parameter: () => undefined,
	request: async () => await Promise.reject(new Error('no request')),
	continueOnFail: () => false,
};

const probe = async (name: string, limits?: SandboxOptions['limits']) => {
	const file = path.join(cacheDir, 'probes.ts');
	writeFileSync(file, PROBES);
	const { manifest, bundle } = await packAction(file, name);
	const { executor } = await sandboxedVersionOf(
		{ manifest, origin: 'private', readBundle: async () => bundle },
		options(runtime, limits),
		firstPartyRuntime(),
	);
	return { manifest, run: async () => await executor(host) };
};

const runningCommands = () =>
	execFileSync('docker', ['ps', '--no-trunc', '--format', '{{.Command}}'], { encoding: 'utf8' });

const CASES = ['items.set', 'slack.message.send', 'gmail.message.send', 'dataTable.row.upsert'];

describe.skipIf(!runtime)('container runtime', () => {
	it.each(CASES)(
		'replays the fixtures of %s',
		async (id) => {
			expect(await replay(id, options(runtime))).toEqual([]);
		},
		60_000,
	);

	it.skipIf(!existsSync(SIDECAR)).each(CASES)(
		'gives the same replay as the wasm sidecar for %s',
		async (id) => {
			expect(await replay(id, options(runtime))).toEqual(await replay(id, options()));
		},
		60_000,
	);

	it('starts a manifest with runtime in its own image', async () => {
		const [head] = versionsOf('items.set');
		const image = `node@sha256:${'0'.repeat(64)}`;
		const manifest = {
			...head!.manifest,
			contract: { ...head!.manifest.contract, runtime: { image } },
		};
		await expect(
			sandboxedVersionOf({ ...head!, manifest }, options(runtime), firstPartyRuntime()),
		).rejects.toThrow(`The container runtime needs the image ${image}`);
	}, 60_000);

	it('passes the OCI runtime to docker', async () => {
		expect(await replay('items.set', options(containerRuntime({ ociRuntime: 'runc' })))).toEqual(
			[],
		);
		// Docker here has no gVisor, so only a runtime that reaches docker fails.
		expect(
			await replay('items.set', options(containerRuntime({ ociRuntime: 'runsc' }))),
		).not.toEqual([]);
	}, 60_000);

	it('refuses an import that the manifest does not grant, before the host sees it', async () => {
		const { run } = await probe('undeclared');
		await expect(run()).rejects.toThrow(
			'The bundle called data-tables.open, which its manifest does not grant',
		);
	}, 60_000);

	it('removes the container of an endless loop at the wall clock', async () => {
		const { manifest, run } = await probe('loop', { wallMs: 8_000 });
		await expect(run()).rejects.toThrow('ran longer than 8000 ms and was stopped');
		await vi.waitFor(() => expect(runningCommands()).not.toContain(manifest.bundleHash), {
			timeout: 15_000,
			interval: 500,
		});
	}, 60_000);

	it('names the memory limit when the container stops at it', async () => {
		const { run } = await probe('grow', { memoryMb: 64 });
		await expect(run()).rejects.toThrow('most likely at its memory limit of 64 MB');
	}, 60_000);

	it('tells to build or load an image that docker cannot pull', () => {
		expect(() => containerRuntime({ image: `sha256:${'0'.repeat(64)}` })).toThrow(
			`The container runtime needs the image sha256:${'0'.repeat(64)}. Build or load it on this host`,
		);
	});

	it('tells to pull, build or load an image tag', () => {
		expect(() => containerRuntime({ image: 'n8n-node-sdk-missing:none' })).toThrow(
			'Run: docker pull n8n-node-sdk-missing:none, or build or load it on this host',
		);
	});

	it('replays the fixtures of every action', async () => {
		const issues: string[] = [];
		for (const id of firstPartyActionIds) issues.push(...(await replay(id, options(runtime))));
		expect(issues).toEqual([]);
	}, 900_000);
});
