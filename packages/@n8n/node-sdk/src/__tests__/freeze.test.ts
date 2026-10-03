import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { freezeAction, GUEST_LACKS, type FrozenAction } from '../freeze';
import { executorOf, loadExecutor, type ExecutorHost, type FrozenVersion } from '../runtime';

it('GUEST_LACKS are globals of Node, besides the CommonJS names', () => {
	expect(GUEST_LACKS.filter((name) => !(name in globalThis))).toEqual(['__dirname', '__filename']);
});

const probeSource = (value: string, header = '') => `import { defineNode, t } from '@n8n/node-sdk';
const { obj, str } = t;
${header}
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
export const probeAction = probe.action('probe', {
	action: 'Probe',
	summary: 'Probe the freeze check.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {},
	output: obj({ value: str() }),
	run: async () => ({ value: String(${value}) }),
} as any);
`;

describe('freezeAction', () => {
	const dirs = { root: '' };
	const freeze = async (value: string, header?: string) => {
		const entry = path.join(dirs.root, `${Math.random().toString(36).slice(2)}.ts`);
		await writeFile(entry, probeSource(value, header));
		return await freezeAction(entry, 'probeAction');
	};

	beforeAll(async () => {
		dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-freeze-'));
	});

	afterAll(async () => {
		await rm(dirs.root, { recursive: true, force: true });
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
});
