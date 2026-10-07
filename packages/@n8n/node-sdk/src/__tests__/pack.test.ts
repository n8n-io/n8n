import { execFile } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { IHttpRequestOptions } from 'n8n-workflow';

import type { Action } from '../define';
import type { PermissionRefusal } from '../egress';
import { defineCredential, field } from '../entry/credentials';
import {
	credentialTypesOf,
	packAction,
	packPackage,
	GUEST_LACKS,
	type PackedAction,
} from '../pack';
import { npmDigestOf, npmPackageOf } from '../npm';
import {
	executorOf,
	hostRuntime,
	loadExecutor,
	nodeDescriptionOf,
	toNodeType,
	type ExecutorHost,
	type PackedVersion,
} from '../runtime';
import { storeFilesOfDir, storeReader } from '../store';
import { loadTriggerExecutor, toVersionedTriggerType } from '../triggers';

it('GUEST_LACKS are globals of Node, besides the CommonJS names', () => {
	expect(GUEST_LACKS.filter((name) => !(name in globalThis))).toEqual(['__dirname', '__filename']);
});

it('credentialTypesOf lists each credential type id once', () => {
	const token = () =>
		defineCredential({
			id: 'probe.token',
			displayName: 'Probe',
			fields: { token: field.secret('Token') },
			auth: (a) => a.apply({ headers: { Authorization: 'Bearer {token}' } }),
		});
	const contractWith = (type: ReturnType<typeof token>) =>
		({ node: { credential: { types: [type] } } }) as unknown as Action;
	expect(
		credentialTypesOf([contractWith(token()), contractWith(token())]).map(({ id }) => id),
	).toEqual(['probe.token']);
});

const probeSource = (value: string, header = '', spec = '') => `import { defineNode, t } from '@n8n/node-sdk';
const { obj, str } = t;
${header}
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
export const probeAction = probe.action('probe', {
	action: 'Probe',
	summary: 'Probe the pack check.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {},
	output: obj({ value: str() }),
	${spec}
	run: async () => ({ value: String(${value}) }),
} as any);
`;

describe('packAction', () => {
	const dirs = { root: '' };
	const pack = async (value: string, header?: string, spec?: string) => {
		const entry = path.join(dirs.root, `${Math.random().toString(36).slice(2)}.ts`);
		await writeFile(entry, probeSource(value, header, spec));
		return await packAction(entry, 'probeAction');
	};

	beforeAll(async () => {
		dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-pack-'));
	});

	afterAll(async () => {
		await rm(dirs.root, { recursive: true, force: true });
	});

	it('writes the image of the action to the contract', async () => {
		const image = `node@sha256:${'a'.repeat(64)}`;
		const { manifest } = await pack(
			"'x'",
			'',
			`runtime: { image: '${image}', childProcess: true },`,
		);
		expect(manifest.contract.runtime).toEqual({ image, childProcess: true });
		expect(manifest.nodeContract).toBe('2.7.0');
	});

	it('writes the ui block beside the contract, and refuses one that is not valid', async () => {
		const ui = { order: ['value'], fields: { value: { widget: 'textarea' } } };
		const { manifest } = await pack("'x'", '', `ui: ${JSON.stringify(ui)},`);
		expect(manifest.ui).toEqual(ui);
		expect(manifest.contract).not.toHaveProperty('ui');
		await expect(pack("'x'", '', "ui: { order: 'value' },")).rejects.toThrow(
			'has a ui block that is not valid',
		);
	});

	it('refuses an image without a digest', async () => {
		await expect(pack("'x'", '', "runtime: { image: 'node:24-slim' },")).rejects.toThrow(
			'Pin it by digest',
		);
	});

	it.each([
		['Buffer', "Buffer.from('x').toString('base64')", '', 'the global Buffer'],
		['process', 'process.env.HOME', '', 'the global process'],
		['globalThis.process', 'globalThis.process.env.HOME', '', 'the global process'],
		['setImmediate', 'setImmediate(() => undefined)', '', 'the global setImmediate'],
		['__dirname', '__dirname', '', 'the global __dirname'],
		['Intl', "new Intl.NumberFormat('de').format(1)", '', 'the global Intl'],
		[
			'Intl outside its typeof guard',
			"(typeof Intl === 'undefined' ? '' : 'intl') + new Intl.NumberFormat('de').format(1)",
			'',
			'the global Intl',
		],
		['fetch', "await fetch('https://example.com')", '', 'the global fetch'],
		['globalThis.fetch', "await globalThis.fetch('https://example.com')", '', 'the global fetch'],
		['setTimeout', 'setTimeout(() => undefined, 0)', '', 'the global setTimeout'],
		[
			'globalThis.setInterval',
			'globalThis.setInterval(() => undefined, 1)',
			'',
			'the global setInterval',
		],
		[
			'a Node module',
			"createHash('sha1')",
			"import { createHash } from 'node:crypto';",
			'the module node:crypto',
		],
		['a dynamic import', "await import('node:fs')", '', 'the module node:fs'],
		['a \\p{} regex literal', "/\\p{L}/u.test('é')", '', 'a Unicode property escape'],
		[
			'a \\p{} regex source',
			"new RegExp('\\\\p{Lu}', 'u').test('É')",
			'',
			'a Unicode property escape',
		],
	])('refuses a bundle that uses %s', async (_what, value, header, gap) => {
		await expect(pack(value, header)).rejects.toThrow(`uses what a bundle may not use: ${gap}`);
	});

	it.each([
		['a global guarded with typeof', "typeof process === 'undefined' ? 'none' : process.env.HOME"],
		['fetch guarded with typeof', "typeof fetch === 'function' ? 'fetch' : 'none'"],
		[
			'a global after a typeof guard that throws',
			"(() => { if (typeof process === 'undefined') throw new Error('no process'); return process.version; })()",
		],
		['a local that shadows a global', '((process: string) => process)("local")'],
		['a property with the name of a global', '({ process: 1, Buffer: 2 }).process'],
		['a regex without \\p{}', "/[a-zé]+/u.test('é')"],
	])('packs a bundle with %s', async (_what, value) => {
		await expect(pack(value)).resolves.toMatchObject({ manifest: { id: 'probe.probe' } });
	});

	it('resolves a package without exports, with its browser build first', async () => {
		const packageOf = async (name: string, manifest: object, files: Record<string, string>) => {
			const dir = path.join(dirs.root, 'node_modules', name);
			await mkdir(dir, { recursive: true });
			await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name, ...manifest }));
			for (const [file, code] of Object.entries(files)) await writeFile(path.join(dir, file), code);
		};
		await packageOf('main-only', { main: 'lib.js' }, { 'lib.js': "module.exports = 'from-main';" });
		await packageOf(
			'browser-first',
			{ main: 'node.js', browser: 'browser.js' },
			{
				'node.js': "module.exports = require('stream').name;",
				'browser.js': "module.exports = 'from-browser';",
			},
		);
		const { bundle } = await pack(
			'mainOnly + browserFirst',
			"import mainOnly from 'main-only';\nimport browserFirst from 'browser-first';",
		);
		expect(bundle).toContain('from-main');
		expect(bundle).toContain('from-browser');
	});

	it('refuses a bundle that carries ajv', async () => {
		const header = `import Ajv from ${JSON.stringify(require.resolve('ajv'))};`;
		await expect(pack("new Ajv().validate({ type: 'string' }, 'x')", header)).rejects.toThrow(
			'ajv (use validate of @n8n/node-sdk: the host gives it)',
		);
	});

	it('takes validate from the host module, which needs Node Contract 2.9.0', async () => {
		const { manifest, bundle, action } = await pack(
			'validate(1, t.str().json).join()',
			"import { validate } from '@n8n/node-sdk';",
		);
		expect(bundle).toContain('require("@n8n/node-sdk/validator")');
		expect(bundle).not.toContain('does not match any allowed shape');
		expect(manifest.nodeContract).toBe('2.9.0');
		const { run } = action as unknown as { run: () => Promise<{ value: string }> };
		await expect(run()).resolves.toEqual({ value: 'input: must be string, got 1' });
	});

	it('writes no node description: the host projects it from the contract', async () => {
		const { manifest, action } = await pack('1');
		expect(manifest).not.toHaveProperty('description');
		if ('kind' in action) throw new Error('The probe is an action');
		expect(nodeDescriptionOf(manifest)).toEqual(new (toNodeType(action))().description);
		expect(nodeDescriptionOf(manifest)).toMatchObject({
			displayName: 'Probe: Probe',
			name: 'probeProbe',
			version: 1,
			defaults: { name: 'Probe' },
		});
	});

	it.each([
		['UserError', 'configuration-invalid'],
		['OperationalError', 'temporarily-unavailable'],
	])('runs a bundle that throws the %s of the SDK root', async (kind, cause) => {
		const { action } = await pack(
			`(() => { throw new ${kind}('failed'); })()`,
			`import { ${kind} } from '@n8n/node-sdk';`,
		);
		const host: ExecutorHost = {
			items: [{ json: {} }],
			node: {
				id: '1',
				name: 'Probe',
				type: 'probe',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			parameter: () => undefined,
			request: async () => await Promise.resolve(undefined),
			continueOnFail: () => false,
		};
		if ('kind' in action) throw new Error('The probe is an action');
		await expect(executorOf(action)(host)).rejects.toMatchObject({
			message: 'failed',
			context: { itemIndex: 0 },
			failure: { cause },
		});
	});
});

const baseUrlSource = `import { defineNode, t } from '@n8n/node-sdk';
const api = defineNode({ id: 'api', displayName: 'API', baseUrl: 'https://api.probe.test/v1' });
export const getAction = api.action('get', {
	action: 'Get',
	summary: 'Get one record.',
	flow: { effect: 'read', cardinality: 'per-item' },
	egress: { hosts: ['files.probe.test'] },
	input: {},
	output: t.obj({ value: t.str() }),
	run: async () => ({ value: 'ok' }),
});
`;

describe('the manifest as the permission source', () => {
	const state: { root: string; packed?: PackedAction } = { root: '' };
	const versionOf = (contract: Record<string, unknown> = {}): PackedVersion => {
		if (!state.packed) throw new Error('Not packed');
		const { manifest, bundle } = state.packed;
		return {
			manifest: { ...manifest, contract: { ...manifest.contract, ...contract } },
			origin: 'first-party',
			readBundle: async () => bundle,
		};
	};

	beforeAll(async () => {
		state.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-manifest-'));
		const entry = path.join(state.root, 'api.ts');
		await writeFile(entry, baseUrlSource);
		state.packed = await packAction(entry, 'getAction');
	});

	afterAll(async () => {
		await rm(state.root, { recursive: true, force: true });
	});

	it('holds the host of the node base URL with the declared hosts', () => {
		expect(state.packed?.manifest.contract.egress).toEqual({
			hosts: ['api.probe.test', 'files.probe.test'],
		});
	});

	it('loads a bundle that grants what its manifest grants', async () => {
		await expect(loadExecutor(versionOf(), hostRuntime())).resolves.toBeTypeOf('function');
	});

	it.each([
		[
			'another host',
			{ egress: { hosts: ['files.probe.test'] } },
			'egress: the bundle grants {"hosts":["api.probe.test","files.probe.test"],"templates":[],"fromCredential":[]}, the manifest {"hosts":["files.probe.test"],"templates":[],"fromCredential":[]}',
		],
		['no egress', { egress: undefined }, 'egress: the bundle grants'],
		[
			'an import',
			{ imports: ['dataTables'] },
			'imports: the bundle grants [], the manifest ["dataTables"]',
		],
		[
			'a credential type',
			{ credentials: ['apiToken'] },
			'credentials: the bundle grants [], the manifest ["apiToken"]',
		],
		['a scope', { scopes: ['x'] }, 'scopes: the bundle grants undefined, the manifest ["x"]'],
	])('refuses a bundle whose manifest grants %s', async (_what, contract, difference) => {
		await expect(loadExecutor(versionOf(contract), hostRuntime())).rejects.toThrow(
			`The bundle of api.get@1.0.0 grants other permissions than its manifest. ${difference}`,
		);
	});

	it('reports a refused bundle with its version', async () => {
		const refusals: PermissionRefusal[] = [];
		const runtime = hostRuntime({ onPermissionRefused: (refusal) => refusals.push(refusal) });
		await expect(loadExecutor(versionOf({ imports: ['dataTables'] }), runtime)).rejects.toThrow();
		expect(refusals).toEqual([
			expect.objectContaining({ action: 'api.get', version: '1.0.0', permission: 'manifest' }),
		]);
	});
});

const triggerSource = `import { defineNode, path, t } from '@n8n/node-sdk';
const api = defineNode({ id: 'api', displayName: 'API', baseUrl: 'https://api.probe.test/v1' });
export const hookTrigger = api.trigger('hooked', {
	trigger: 'On hook',
	summary: 'Starts on a hook.',
	input: {},
	output: t.obj({ value: t.str() }),
	webhook: {
		verify: { algorithm: 'sha256', header: 'x-signature', secret: 'generated' },
		emit: () => [{ value: 'ok' }],
	},
});
export const labelTrigger = api.trigger('labelled', {
	trigger: 'On label',
	summary: 'Starts on a label.',
	input: { label: t.str().optional() },
	output: t.obj({ id: t.str() }),
	ui: { advanced: ['label'] },
	poll: {
		request: ({ input, since }) => ({ path: path\`/labels\`, query: { since, label: input.label } }),
		response: t.arr(t.obj({ id: t.str() })),
		items: (page) => page,
		cursor: { id: (item) => Number(item.id) },
		firstRun: 'emit',
	},
});
`;

describe('the manifest of a trigger as the permission source', () => {
	const state: { root: string; packed?: PackedAction } = { root: '' };
	const versionOf = (contract: Record<string, unknown> = {}): PackedVersion => {
		if (!state.packed) throw new Error('Not packed');
		const { manifest, bundle } = state.packed;
		return {
			manifest: { ...manifest, contract: { ...manifest.contract, ...contract } },
			origin: 'first-party',
			readBundle: async () => bundle,
		};
	};

	beforeAll(async () => {
		state.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-trigger-manifest-'));
		const entry = path.join(state.root, 'hook.ts');
		await writeFile(entry, triggerSource);
		state.packed = await packAction(entry, 'hookTrigger');
	});

	afterAll(async () => {
		await rm(state.root, { recursive: true, force: true });
	});

	it('holds the host of the node base URL and the webhook signature', () => {
		expect(state.packed?.manifest.contract).toMatchObject({
			egress: { hosts: ['api.probe.test'] },
			verify: { algorithm: 'sha256', header: 'x-signature', secret: 'generated' },
		});
	});

	it('shows the advanced fields of a packed trigger in Options, and reads them from there', async () => {
		const { manifest, bundle } = await packAction(path.join(state.root, 'hook.ts'), 'labelTrigger');
		const version: PackedVersion = {
			manifest,
			origin: 'first-party',
			readBundle: async () => bundle,
		};
		const type = new (toVersionedTriggerType([version], hostRuntime()))().getNodeType(1);
		expect(type.description.properties.map(({ name, type: kind }) => [name, kind])).toEqual([
			['options', 'collection'],
		]);
		const sent: IHttpRequestOptions[] = [];
		const context = {
			getNode: () => ({ name: 'Labels', credentials: {} }),
			getNodeParameter: (name: string) => (name === 'options.label' ? 'urgent' : undefined),
			getWorkflowStaticData: () => ({}),
			getMode: () => 'trigger',
			logger: { warn: () => undefined },
			helpers: {
				httpRequest: async (request: IHttpRequestOptions) => {
					sent.push(request);
					return await Promise.resolve([{ id: '1' }]);
				},
			},
		};
		await type.poll?.call(context as never);
		expect(sent.map(({ qs }) => qs)).toEqual([{ label: 'urgent' }]);
	});

	it('loads a trigger bundle that grants what its manifest grants', async () => {
		await expect(loadTriggerExecutor(versionOf(), hostRuntime())).resolves.toBeTypeOf('function');
	});

	it.each([
		[
			'another host',
			{ egress: { hosts: ['evil.test'] } },
			'grants other permissions than its manifest. egress: the bundle grants {"hosts":["api.probe.test"]',
		],
		['no signature', { verify: undefined }, 'checks another webhook signature than its manifest'],
	])('refuses a trigger bundle whose manifest has %s', async (_what, contract, message) => {
		const refusals: PermissionRefusal[] = [];
		const runtime = hostRuntime({ onPermissionRefused: (refusal) => refusals.push(refusal) });
		await expect(loadTriggerExecutor(versionOf(contract), runtime)).rejects.toThrow(
			`The bundle of api.hooked@1.0.0 ${message}`,
		);
		expect(refusals).toEqual([
			expect.objectContaining({ action: 'api.hooked', version: '1.0.0', permission: 'manifest' }),
		]);
	});
});

describe('packPackage with a registry', () => {
	const passSource = (run: string, input = '{}') => `
import { defineNode, t } from '@n8n/node-sdk';

export const pass = defineNode({ id: 'demo', displayName: 'Demo' }).action('pass', {
	action: 'Pass',
	summary: 'Pass the item on.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: ${input},
	output: t.passedItem(),
	run: ${run},
});
`;
	const registry = 'http://registry.test/';
	const { privateKey } = generateKeyPairSync('ed25519');
	const dirs = { pkg: '', entry: '' };

	beforeEach(async () => {
		// Inside this package, so the action file resolves @n8n/node-sdk.
		dirs.pkg = await mkdtemp(path.join(__dirname, '..', '..', '.package-test-'));
		dirs.entry = path.join(dirs.pkg, 'src', 'nodes', 'demo', 'actions', 'pass.ts');
		await mkdir(path.dirname(dirs.entry), { recursive: true });
	});

	afterEach(async () => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		await rm(dirs.pkg, { recursive: true, force: true });
	});

	/** Packs the npm package of the action in `dirs.entry` with `npm pack`, and serves it at `registry`. */
	async function publish() {
		const packed = await packAction(dirs.entry, 'pass');
		const files = npmPackageOf(
			{ ...packed, fixtures: { executions: [] } },
			{ privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() },
		);
		const packDir = path.join(dirs.pkg, 'pack');
		await mkdir(packDir);
		await Promise.all(
			Object.entries(files).map(
				async ([file, text]) => await writeFile(path.join(packDir, file), text),
			),
		);
		const { stdout } = await promisify(execFile)('npm', ['pack', '--json'], { cwd: packDir });
		const [{ filename }] = JSON.parse(stdout) as Array<{ filename: string }>;
		const tgz = await readFile(path.join(packDir, filename));
		const tarball = `${registry}-/pass.tgz`;
		const packument = {
			versions: {
				'1.0.0': {
					n8n: { id: 'demo.pass', digest: npmDigestOf(packed.manifest) },
					dist: { tarball },
				},
			},
		};
		vi.stubGlobal('fetch', async (url: string) =>
			url === tarball
				? new Response(tgz)
				: url === `${registry}@n8n-nodes%2fdemo.pass`
					? Response.json(packument)
					: new Response('{}', { status: 404 }),
		);
		return packed;
	}

	const headOf = async () => {
		const reader = storeReader(storeFilesOfDir(path.join(dirs.pkg, 'dist', 'store')));
		return (await reader.records('demo.pass'))[0];
	};

	it('ships the published bytes of a version, and packs locally without a registry', async () => {
		await writeFile(dirs.entry, passSource('({ items }) => items.map((item) => ({ item }))'));
		const published = await publish();
		const pkg = { name: '@acme/nodes', dir: dirs.pkg };
		const log: string[] = [];
		vi.stubEnv('N8N_NODE_CONTRACTS_NPM_REGISTRY', registry);
		await packPackage(pkg, undefined, (line) => log.push(line));
		expect(log).toEqual([]);

		// Other bundle bytes, same contract.
		await writeFile(dirs.entry, passSource('({ items }) => items.map((one) => ({ item: one }))'));
		const { manifests } = await packPackage(pkg, undefined, (line) => log.push(line));
		expect(manifests).toEqual([published.manifest]);
		expect(await headOf()).toMatchObject({
			manifest: npmDigestOf(published.manifest),
			fixtures: expect.any(String),
		});
		expect(log).toEqual(['demo.pass@1.0.0 has unpublished changes; bump the version to ship them']);

		vi.stubEnv('N8N_NODE_CONTRACTS_NPM_REGISTRY', '');
		const local = await packPackage(pkg);
		expect(local.manifests[0]?.bundleHash).not.toBe(published.manifest.bundleHash);
		expect((await headOf())?.manifest).toBe(npmDigestOf(local.manifests[0] ?? published.manifest));

		vi.stubEnv('N8N_NODE_CONTRACTS_NPM_REGISTRY', registry);
		await writeFile(
			dirs.entry,
			passSource(
				'({ items }) => items.map((item) => ({ item }))',
				"{ note: t.str().title('Note') }",
			),
		);
		await expect(packPackage(pkg)).rejects.toThrow(
			'demo.pass@1.0.0 is published with another contract; bump the version in source',
		);
	}, 60_000);
});
