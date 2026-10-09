import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { packAction } from '../pack';
import { checkPublish, checkSandboxedPublish } from '../publish';
import { CONTAINER_GUEST, CONTAINER_IMAGE, containerRuntime } from '../runtimes/container';
import { defaultSandbox, type SandboxOptions } from '../sandbox';
import { contractHash, type ContractFixtures } from '../version';

// Next to the guest, so docker shares it whenever it shares the guest. Colima shares no tmpdir.
const CACHE_ROOT = path.resolve(__dirname, '..', '..', 'node_modules', '.cache');
mkdirSync(CACHE_ROOT, { recursive: true });
const dir = mkdtempSync(path.join(CACHE_ROOT, 'publish-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const containerReady = (() => {
	try {
		containerRuntime();
		return existsSync(CONTAINER_GUEST);
	} catch {
		return false;
	}
})();

const packUid = async (image: string) => {
	const file = path.join(dir, 'uid.ts');
	writeFileSync(
		file,
		`import { defineNode, t } from '@n8n/node-sdk';
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
export const uid = probe.action('uid', {
	action: 'Get the user id',
	summary: 'Give the user id of the process that runs the action.',
	flow: { effect: 'read', cardinality: 'per-item' },
	runtime: { image: '${image}' },
	input: {},
	output: t.obj({ uid: t.int() }),
	run: async () => ({ uid: typeof process === 'undefined' ? -1 : process.getuid() }),
});`,
	);
	return await packAction(file, 'uid');
};

const fixtures: ContractFixtures = {
	executions: [{ name: 'runs as the container user', params: {}, output: [{ uid: 10001 }] }],
};

describe('checkPublish of an action with an image', () => {
	it.skipIf(!containerReady)(
		'replays the fixtures in the container of the image',
		async () => {
			const packed = await packUid(CONTAINER_IMAGE);
			await expect(checkPublish(undefined, packed, fixtures)).resolves.toBeUndefined();
		},
		60_000,
	);

	it('fails when the container cannot start', async () => {
		const packed = await packUid(`node@sha256:${'0'.repeat(64)}`);
		await expect(checkPublish(undefined, packed, fixtures)).rejects.toThrow(
			'probe.uid@1.0.0 fails its fixtures: probe.uid@1.0.0: The container runtime',
		);
	}, 60_000);
});

const wasm = defaultSandbox();
const wasmReady = existsSync(wasm.sidecar) && existsSync(path.join(wasm.guests, 'action.wasm'));

// The bundle counts each evaluation and each run in the global object of its runtime.
const packEcho = async () => {
	const file = path.join(dir, 'echo.ts');
	writeFileSync(
		file,
		`import { defineNode, path, t } from '@n8n/node-sdk';
Reflect.set(globalThis, 'echoEvaluations', Number(Reflect.get(globalThis, 'echoEvaluations') ?? 0) + 1);
const demo = defineNode({ id: 'demo', displayName: 'Demo', baseUrl: 'https://demo.test' });
export const echo = demo.action('echo', {
	action: 'Echo',
	summary: 'Echo the text.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { text: t.str().title('Text') },
	output: t.obj({ text: t.str().title('Text') }),
	async run({ input, http }) {
		Reflect.set(globalThis, 'echoRuns', Number(Reflect.get(globalThis, 'echoRuns') ?? 0) + 1);
		const suffix = await http.request({ path: path\`/suffix\` });
		return { text: input.text.toUpperCase() + String(suffix) };
	},
});`,
	);
	return await packAction(file, 'echo');
};

const echoFixturesOf = (text: string): ContractFixtures => ({
	executions: [
		{
			name: 'echo',
			params: { text: 'hello' },
			routes: [{ path: '/suffix', reply: { json: '!' } }],
			output: [{ text }],
		},
	],
});
const echoFixtures = echoFixturesOf('HELLO!');

describe.skipIf(!wasmReady)('checkSandboxedPublish of a private JS action', () => {
	const sandbox = (): SandboxOptions => ({
		...wasm,
		cacheDir: path.join(dir, 'sandbox-cache'),
		credentialType: () => undefined,
	});

	it('replays the fixtures in the wasm sandbox, never in this process', async () => {
		const { manifest, bundle, sdk } = await packEcho();
		const evaluations = Reflect.get(globalThis, 'echoEvaluations');
		await expect(
			checkSandboxedPublish(undefined, { manifest, bundle, sdk }, echoFixtures, sandbox()),
		).resolves.toBeUndefined();
		await expect(
			checkSandboxedPublish(
				undefined,
				{ manifest, bundle, sdk },
				echoFixturesOf('HELLO?'),
				sandbox(),
			),
		).rejects.toThrow('demo.echo@1.0.0 fails its fixtures');
		expect(Reflect.get(globalThis, 'echoEvaluations')).toBe(evaluations);
		expect(Reflect.get(globalThis, 'echoRuns')).toBeUndefined();
	}, 60_000);

	it('refuses a manifest that the bundle does not describe', async () => {
		const { manifest, bundle, sdk } = await packEcho();
		const contract = { ...manifest.contract, egress: { hosts: ['demo.test', 'evil.test'] } };
		const forged = { ...manifest, contract, contractHash: contractHash(contract) };
		await expect(
			checkSandboxedPublish(undefined, { manifest: forged, bundle, sdk }, echoFixtures, sandbox()),
		).rejects.toThrow('The bundle of demo.echo@1.0.0 describes another contract than its manifest');
		await expect(
			checkSandboxedPublish(
				undefined,
				{ manifest: { ...manifest, contract }, bundle, sdk },
				echoFixtures,
				sandbox(),
			),
		).rejects.toThrow('The contract hash of demo.echo@1.0.0 does not match its contract');
		await expect(
			checkSandboxedPublish(
				undefined,
				{ manifest, bundle: `${bundle}\n`, sdk },
				echoFixtures,
				sandbox(),
			),
		).rejects.toThrow('The bundle of demo.echo@1.0.0 does not match');
	}, 60_000);
});
