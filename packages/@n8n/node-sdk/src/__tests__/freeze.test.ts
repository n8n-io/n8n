import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { setPermissionRefusalListener, type PermissionRefusal } from '../egress';
import { freezeAction, GUEST_LACKS, type FrozenAction } from '../freeze';
import {
	executorOf,
	loadExecutor,
	nodeDescriptionOf,
	toNodeType,
	type ExecutorHost,
	type FrozenVersion,
} from '../runtime';
import { loadTriggerExecutor } from '../triggers';

it('GUEST_LACKS are globals of Node, besides the CommonJS names', () => {
	expect(GUEST_LACKS.filter((name) => !(name in globalThis))).toEqual(['__dirname', '__filename']);
});

const probeSource = (value: string, header = '', spec = '') => `import { defineNode, t } from '@n8n/node-sdk';
const { obj, str } = t;
${header}
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
export const probeAction = probe.action('probe', {
	action: 'Probe',
	summary: 'Probe the freeze check.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {},
	output: obj({ value: str() }),
	${spec}
	run: async () => ({ value: String(${value}) }),
} as any);
`;

describe('freezeAction', () => {
	const dirs = { root: '' };
	const freeze = async (value: string, header?: string, spec?: string) => {
		const entry = path.join(dirs.root, `${Math.random().toString(36).slice(2)}.ts`);
		await writeFile(entry, probeSource(value, header, spec));
		return await freezeAction(entry, 'probeAction');
	};

	beforeAll(async () => {
		dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-freeze-'));
	});

	afterAll(async () => {
		await rm(dirs.root, { recursive: true, force: true });
	});

	it('writes the image of the action to the contract', async () => {
		const image = `node@sha256:${'a'.repeat(64)}`;
		const { manifest } = await freeze(
			"'x'",
			'',
			`runtime: { image: '${image}', childProcess: true },`,
		);
		expect(manifest.contract.runtime).toEqual({ image, childProcess: true });
		expect(manifest.nodeContract).toBe('2.7.0');
	});

	it('writes the ui block beside the contract, and refuses one that is not valid', async () => {
		const ui = { order: ['value'], fields: { value: { widget: 'textarea' } } };
		const { manifest } = await freeze("'x'", '', `ui: ${JSON.stringify(ui)},`);
		expect(manifest.ui).toEqual(ui);
		expect(manifest.contract).not.toHaveProperty('ui');
		await expect(freeze("'x'", '', "ui: { order: 'value' },")).rejects.toThrow(
			'has a ui block that is not valid',
		);
	});

	it('refuses an image without a digest', async () => {
		await expect(freeze("'x'", '', "runtime: { image: 'node:24-slim' },")).rejects.toThrow(
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
		await expect(freeze(value, header)).rejects.toThrow(`uses what a bundle may not use: ${gap}`);
	});

	it.each([
		['a global guarded with typeof', "typeof process === 'undefined' ? 'none' : process.env.HOME"],
		['fetch guarded with typeof', "typeof fetch === 'function' ? 'fetch' : 'none'"],
		['a local that shadows a global', '((process: string) => process)("local")'],
		['a property with the name of a global', '({ process: 1, Buffer: 2 }).process'],
		['a regex without \\p{}', "/[a-zé]+/u.test('é')"],
	])('freezes a bundle with %s', async (_what, value) => {
		await expect(freeze(value)).resolves.toMatchObject({ manifest: { id: 'probe.probe' } });
	});

	it('writes no node description: the host projects it from the contract', async () => {
		const { manifest, action } = await freeze('1');
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
		const { action } = await freeze(
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
	const state: { root: string; frozen?: FrozenAction } = { root: '' };
	const versionOf = (contract: Record<string, unknown> = {}): FrozenVersion => {
		if (!state.frozen) throw new Error('Not frozen');
		const { manifest, bundle } = state.frozen;
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
		state.frozen = await freezeAction(entry, 'getAction');
	});

	afterAll(async () => {
		await rm(state.root, { recursive: true, force: true });
	});

	it('holds the host of the node base URL with the declared hosts', () => {
		expect(state.frozen?.manifest.contract.egress).toEqual({
			hosts: ['api.probe.test', 'files.probe.test'],
		});
	});

	it('loads a bundle that grants what its manifest grants', async () => {
		await expect(loadExecutor(versionOf())).resolves.toBeTypeOf('function');
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
		await expect(loadExecutor(versionOf(contract))).rejects.toThrow(
			`The bundle of api.get@1.0.0 grants other permissions than its manifest. ${difference}`,
		);
	});

	it('reports a refused bundle with its version', async () => {
		const refusals: PermissionRefusal[] = [];
		setPermissionRefusalListener((refusal) => refusals.push(refusal));
		await expect(loadExecutor(versionOf({ imports: ['dataTables'] }))).rejects.toThrow();
		setPermissionRefusalListener(undefined);
		expect(refusals).toEqual([
			expect.objectContaining({ action: 'api.get', version: '1.0.0', permission: 'manifest' }),
		]);
	});
});

const triggerSource = `import { defineNode, t } from '@n8n/node-sdk';
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
`;

describe('the manifest of a trigger as the permission source', () => {
	const state: { root: string; frozen?: FrozenAction } = { root: '' };
	const versionOf = (contract: Record<string, unknown> = {}): FrozenVersion => {
		if (!state.frozen) throw new Error('Not frozen');
		const { manifest, bundle } = state.frozen;
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
		state.frozen = await freezeAction(entry, 'hookTrigger');
	});

	afterAll(async () => {
		await rm(state.root, { recursive: true, force: true });
	});

	it('holds the host of the node base URL and the webhook signature', () => {
		expect(state.frozen?.manifest.contract).toMatchObject({
			egress: { hosts: ['api.probe.test'] },
			verify: { algorithm: 'sha256', header: 'x-signature', secret: 'generated' },
		});
	});

	it('loads a trigger bundle that grants what its manifest grants', async () => {
		await expect(loadTriggerExecutor(versionOf())).resolves.toBeTypeOf('function');
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
		setPermissionRefusalListener((refusal) => refusals.push(refusal));
		await expect(loadTriggerExecutor(versionOf(contract))).rejects.toThrow(
			`The bundle of api.hooked@1.0.0 ${message}`,
		);
		setPermissionRefusalListener(undefined);
		expect(refusals).toEqual([
			expect.objectContaining({ action: 'api.hooked', version: '1.0.0', permission: 'manifest' }),
		]);
	});
});
