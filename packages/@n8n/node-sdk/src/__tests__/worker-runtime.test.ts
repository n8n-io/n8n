import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { actions } from '../../../nodes-integrations/dist/index.js';
import { packageOf, versionsOf } from '../../../nodes-integrations/dist/registry.js';
import { freezeAction } from '../freeze';
import { replayFixtures } from '../publish';
import { t } from '../schema';
import type { ExecutorHost } from '../runtime';
import { WORKER_GUEST, workerRuntime } from '../runtimes/worker';
import { sandboxedVersionOf, type SandboxOptions } from '../sandbox';
import { parseFixtures } from '../version';

const SANDBOX = path.resolve(__dirname, '..', '..', 'sandbox');
const SIDECAR = path.join(SANDBOX, 'sidecar', 'target', 'release', 'n8n-sandbox');

const credentialTypes = new Map(
	actions.flatMap(({ node }) => node.credential?.types ?? []).map((type) => [type.name, type]),
);

const cacheDir = mkdtempSync(path.join(tmpdir(), 'worker-runtime-'));
afterAll(() => rmSync(cacheDir, { recursive: true, force: true }));

const options = (
	runtime?: SandboxOptions['runtime'],
	limits?: SandboxOptions['limits'],
): SandboxOptions => ({
	runtime,
	sidecar: SIDECAR,
	guests: path.join(SANDBOX, 'dist'),
	cacheDir,
	credentialType: (name) => credentialTypes.get(name),
	limits,
});

async function replay(id: string, sandbox: SandboxOptions): Promise<string[]> {
	const [head] = versionsOf(id);
	if (!head) return [`${id} has no bundled HEAD`];
	const loaded = await sandboxedVersionOf(head, sandbox).catch((error: Error) => error);
	if (loaded instanceof Error) return [`${id} refused: ${loaded.message}`];
	const fixtures = parseFixtures(
		readFileSync(path.join(packageOf(id).dir, 'fixtures', `${id}.json`), 'utf8'),
	);
	return await replayFixtures(
		{ manifest: head.manifest, bundle: await head.readBundle() },
		fixtures,
		{ contract: loaded.action, executor: loaded.executor, migrate: loaded.migrate },
	);
}

const PROBES = `import { defineNode, t, validate } from '@n8n/node-sdk';
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
const spec = (run: (context: any) => Promise<unknown>) =>
	probe.action('probe', {
		action: 'Probe',
		summary: 'Probe the sandbox.',
		flow: { effect: 'read', cardinality: 'per-item' },
		input: {},
		output: t.obj({ value: t.str() }),
		run,
	} as any);
export const undeclaredProbe = spec(async (context) => ({
	value: String(await context.dataTables.open({ name: 'x' })),
}));
export const loopProbe = spec(async () => {
	for (;;) {}
});
export const memoryProbe = spec(async () => {
	const kept: unknown[] = [];
	for (;;) kept.push(new Array(1_000_000).fill(kept.length));
});
export const validateProbe = spec(async () => ({
	value: validate(
		{ id: 1, tags: ['a', 2], extra: true },
		t.obj({ id: t.str(), tags: t.arr(t.str()) }).json,
		{ path: 'page' },
	).join('; '),
}));
export const slowPatternProbe = spec(async () => ({
	value: validate('a', t.str().with({ pattern: '(a+)+$' }).json).join('; '),
}));
// A name built at run time passes the freeze check.
export const exitProbe = spec(async () => {
	(globalThis as any)[['pro', 'cess'].join('')].exit(3);
	return { value: 'exited' };
});
`;

const host: ExecutorHost = {
	items: [{ json: {} }],
	node: { id: '1', name: 'Probe', type: 'probe', typeVersion: 1, position: [0, 0], parameters: {} },
	parameter: () => undefined,
	request: async () => await Promise.reject(new Error('no request')),
	continueOnFail: () => false,
};

const CASES = ['items.set', 'slack.message.send', 'gmail.message.send', 'dataTable.row.upsert'];

it('refuses a community contract schema that a guest could not send', async () => {
	const [head] = versionsOf('items.set');
	const output = t.obj({ id: t.str().with({ pattern: '(a+)+$' }) }).json;
	const manifest = { ...head!.manifest, contract: { ...head!.manifest.contract, output } };
	await expect(
		sandboxedVersionOf({ ...head!, manifest, origin: 'community' }, options()),
	).rejects.toThrow(
		`The contract of items.set@${manifest.semver}: output: the schema pattern "(a+)+$" can take more than linear time`,
	);
});

describe.skipIf(!existsSync(WORKER_GUEST))('worker runtime', () => {
	const runtime = workerRuntime();
	const file = path.join(cacheDir, 'probes.ts');
	beforeAll(() => writeFileSync(file, PROBES));

	const runProbe = async (name: string, limits?: SandboxOptions['limits']) => {
		const { manifest, bundle } = await freezeAction(file, name);
		const { executor } = await sandboxedVersionOf(
			{ manifest, origin: 'private', readBundle: async () => bundle },
			options(runtime, limits),
		);
		return await executor(host);
	};

	it.each(CASES)('replays the fixtures of %s', async (id) => {
		expect(await replay(id, options(runtime))).toEqual([]);
	});

	it.skipIf(!existsSync(SIDECAR)).each(CASES)(
		'gives the same replay as the wasm sidecar for %s',
		async (id) => {
			expect(await replay(id, options(runtime))).toEqual(await replay(id, options()));
		},
	);

	it('gives the issues of validate in the host process and in the guest', async () => {
		const { action } = await freezeAction(file, 'validateProbe');
		const { run } = action as unknown as { run: () => Promise<{ value: string }> };
		const inProcess = await run();
		expect(inProcess.value).toBe(
			'page.id: must be string, got 1; page.tags[1]: must be string, got 2; page: unknown field(s) extra. Allowed: id, tags',
		);
		expect((await runProbe('validateProbe'))[0]?.[0]?.json).toEqual(inProcess);
	});

	it('refuses a schema pattern of the guest that can take more than linear time', async () => {
		expect((await runProbe('slowPatternProbe'))[0]?.[0]?.json).toEqual({
			value: 'input: the schema pattern "(a+)+$" can take more than linear time',
		});
	});

	it('refuses an import that the manifest does not grant, before the host sees it', async () => {
		await expect(runProbe('undeclaredProbe')).rejects.toThrow(
			'The bundle called data-tables.open, which its manifest does not grant',
		);
	});

	it('stops an endless loop at the wall clock', async () => {
		const started = Date.now();
		await expect(runProbe('loopProbe', { wallMs: 1_000 })).rejects.toThrow(
			'ran longer than 1000 ms and was stopped',
		);
		expect(Date.now() - started).toBeLessThan(10_000);
	});

	it('stops only the worker at a memory blow-up', async () => {
		await expect(runProbe('memoryProbe', { memoryMb: 64 })).rejects.toThrow(
			'The bundle reached its memory limit of 64 MB and was stopped',
		);
		expect(await replay('items.set', options(runtime))).toEqual([]);
	});

	it('stops only the worker when the guest exits', async () => {
		await expect(runProbe('exitProbe')).rejects.toThrow('The sandbox stopped (exit 3)');
		expect(await replay('items.set', options(runtime))).toEqual([]);
	});

	it('replays the fixtures of every action', async () => {
		const issues: string[] = [];
		for (const { id } of actions) issues.push(...(await replay(id, options(runtime))));
		expect(issues).toEqual([]);
	}, 300_000);
});
