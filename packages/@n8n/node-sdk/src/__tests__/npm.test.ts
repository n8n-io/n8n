import { generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { defineCredential, field } from '../entry/credentials';
import { packAction, packCredential } from '../pack';
import { defineNode, t } from '../index';
import {
	DEFAULT_NPM_SCOPE,
	npmNameOf,
	npmPackageOf,
	npmRegistryOf,
	npmTarballFile,
	npmVersionsOf,
} from '../npm';
import { publishAction, publishCredential, publishNative, publishPackage } from '../publish';
import { manifestTextOf, verifyStoreSignature, type StoreSignature } from '../store';
import { sha256, type ContractFixtures } from '../version';
import { fakeNpmRegistry, type FakeNpmRegistry } from './fake-npm-registry';

const keys = generateKeyPairSync('ed25519');
const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();

type Json = Record<string, unknown>;

const echoSource = (version: string, text: string, input = "text: t.str().title('Text')") => `
import { defineNode, t } from '@n8n/node-sdk';

export const echo = defineNode({ id: 'demo', displayName: 'Demo' }).action('echoText', {
	version: '${version}',
	action: 'Echo',
	summary: 'Echo the text.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { ${input} },
	output: t.obj({ text: t.str() }),
	async run({ input }) {
		return { text: ${text} };
	},
});
`;

const echoFixtures: ContractFixtures = {
	executions: [{ name: 'echo', params: { text: 'hi' }, output: [{ text: 'hi' }] }],
};

const tokenWith = (spec: { hosts?: string[]; displayName?: string; version?: '1.0.1' | '2.0.0' }) =>
	defineCredential({
		id: 'demo.token',
		legacyName: 'demoApi',
		displayName: spec.displayName ?? 'Demo API',
		version: spec.version,
		fields: { token: field.secret('Token') },
		auth: (a) => a.bearer('token'),
		baseUrl: 'https://a.example.com',
		hosts: spec.hosts,
	});

const hookWith = (summary: string, version = 2.2, semver: '1.0.0' | '1.0.1' = '1.0.0') =>
	defineNode({ id: 'demo', displayName: 'Demo' }).trigger('hook', {
		version: semver,
		trigger: 'On call',
		summary,
		input: { path: t.str().title('Path') },
		output: t.obj({ body: t.str() }),
		native: { type: 'n8n-nodes-base.webhook', version, on: 'webhook' },
	});

const dirs = { root: '', entry: '' };
const registry = { current: undefined as FakeNpmRegistry | undefined };

const fake = () => {
	if (!registry.current) throw new Error('no registry');
	return registry.current;
};

beforeAll(async () => {
	dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-npm-'));
	dirs.entry = path.join(dirs.root, 'echo.ts');
});

beforeEach(async () => {
	registry.current = await fakeNpmRegistry();
	// npm publish and npm deprecate need a token.
	vi.stubEnv('NPM_TOKEN', 'test-token');
});

afterEach(async () => {
	vi.unstubAllEnvs();
	await registry.current?.close();
});

afterAll(async () => {
	await rm(dirs.root, { recursive: true, force: true });
});

describe('npmNameOf', () => {
	it('gives the id in lower case, with a hyphen for each camelCase step', () => {
		expect(npmNameOf('httpRequest.get')).toBe('@n8n-nodes/http-request.get');
		expect(npmNameOf('notion.databasePage.getAll', '@acme')).toBe(
			'@acme/notion.database-page.get-all',
		);
		expect(DEFAULT_NPM_SCOPE).toBe('@n8n-nodes');
	});
});

describe('npmRegistryOf', () => {
	it('refuses the public npm registry', () => {
		expect(npmRegistryOf('http://localhost:4873')).toBe('http://localhost:4873/');
		expect(() => npmRegistryOf(undefined)).toThrow('Set N8N_NODE_CONTRACTS_NPM_REGISTRY');
		for (const url of ['https://registry.npmjs.org/', 'https://registry.npmjs.com']) {
			expect(() => npmRegistryOf(url)).toThrow('not published to registry.npmjs');
		}
	});
});

describe('npmPackageOf', () => {
	it('holds the exact manifest bytes, the bundle, the fixtures and a signature', async () => {
		await writeFile(dirs.entry, echoSource('1.2.3', 'input.text'));
		const { manifest, bundle } = await packAction(dirs.entry, 'echo');
		const files = npmPackageOf(
			{ manifest, bundle, fixtures: echoFixtures },
			{ privateKey, source: { license: 'MIT' } },
		);
		const manifestText = manifestTextOf(manifest);

		expect(Object.keys(files).sort()).toEqual([
			'bundle.cjs',
			'fixtures.json',
			'manifest.json',
			'package.json',
			'signatures.json',
		]);
		expect(files['manifest.json']).toBe(manifestText);
		expect(files['bundle.cjs']).toBe(bundle);
		expect(JSON.parse(files['package.json'] ?? '')).toEqual({
			name: '@n8n-nodes/demo.echo-text',
			version: '1.2.3',
			description: 'Echo the text.',
			license: 'MIT',
			dependencies: { '@n8n-nodes/sdk-runtime': expect.stringMatching(/^\d+\.\d+\.\d+$/) },
			n8n: {
				id: 'demo.echoText',
				kind: 'action',
				digest: `sha256:${sha256(manifestText)}`,
				manifest: 'manifest.json',
				bundle: 'bundle.cjs',
			},
		});
		const signatures = JSON.parse(files['signatures.json'] ?? '') as StoreSignature[];
		expect(verifyStoreSignature({ signatures }, manifestText, publicKey)).toBe(true);
	});
});

describe('publishAction', () => {
	it('publishes each version once, and refuses other bytes for a published version', async () => {
		const publish = async () =>
			await publishAction({
				entryFile: dirs.entry,
				exportName: 'echo',
				fixtures: echoFixtures,
				registry: fake().url,
				privateKey,
			});
		await writeFile(dirs.entry, echoSource('1.0.0', 'input.text'));
		const v100 = await publish();
		await writeFile(dirs.entry, echoSource('1.0.1', 'String(input.text)'));
		const v101 = await publish();
		expect(fake().state.writes).toBe(2);

		// Republish: a no-op.
		await expect(publish()).resolves.toEqual(v101);
		expect(fake().state.writes).toBe(2);

		await writeFile(dirs.entry, echoSource('1.0.1', 'input.text.trim()'));
		await expect(publish()).rejects.toThrow(
			'demo.echoText@1.0.1 is published with other bytes; bump the version in source',
		);
		// The gate reads 1.0.1 from its tarball: a new input field needs a minor.
		await writeFile(
			dirs.entry,
			echoSource('1.0.2', 'input.text', "text: t.str().title('Text'), b: t.str().title('B')"),
		);
		await expect(publish()).rejects.toThrow(
			'demo.echoText@1.0.2 is a patch bump from 1.0.1, but the change is major',
		);
		expect(fake().state.writes).toBe(2);

		const name = '@n8n-nodes/demo.echo-text';
		const published = await npmVersionsOf(fake().url, name);
		expect(published.map(({ version, digest }) => ({ version, digest }))).toEqual(
			[v100, v101].map((manifest) => ({
				version: manifest.semver,
				digest: `sha256:${sha256(manifestTextOf(manifest))}`,
			})),
		);
		const tarball = await fetch(published[1]?.tarball ?? '');
		expect(npmTarballFile(new Uint8Array(await tarball.arrayBuffer()), 'manifest.json')).toBe(
			manifestTextOf(v101),
		);
	}, 60_000);

	it('refuses a package that holds another id', async () => {
		fake().packuments.set('@n8n-nodes/demo.echo-text', {
			versions: { '1.0.0': { n8n: { id: 'demo.echo-text' } } },
		});
		await writeFile(dirs.entry, echoSource('1.0.0', 'input.text'));
		await expect(
			publishAction({
				entryFile: dirs.entry,
				exportName: 'echo',
				fixtures: echoFixtures,
				registry: fake().url,
				privateKey,
			}),
		).rejects.toThrow(
			'@n8n-nodes/demo.echo-text holds demo.echo-text, so it cannot hold demo.echoText',
		);
	});
});

describe('publishCredential', () => {
	it('gates a credential against the newest published version below it', async () => {
		const publish = async (type = tokenWith({})) =>
			await publishCredential({ type, registry: fake().url, privateKey });
		const v100 = await publish();
		await expect(publish()).resolves.toEqual(v100);
		await expect(publish(tokenWith({ displayName: 'Demo' }))).rejects.toThrow(
			'demo.token@1.0.0 is published with other bytes; bump the version in source',
		);
		await expect(
			publish(tokenWith({ hosts: ['b.example.com'], version: '1.0.1' })),
		).rejects.toThrow('demo.token@1.0.1 is a patch bump from 1.0.0, but the change is major');
		const v200 = await publish(tokenWith({ hosts: ['b.example.com'], version: '2.0.0' }));
		expect(v200).toEqual(packCredential(tokenWith({ hosts: ['b.example.com'], version: '2.0.0' })));
		const versions = await npmVersionsOf(fake().url, '@n8n-nodes/demo.token');
		expect(versions.map(({ version }) => version)).toEqual(['1.0.0', '2.0.0']);
	}, 60_000);
});

describe('publishNative', () => {
	it('publishes a manifest without a bundle, and refuses a patch with another legacy node', async () => {
		const publish = async (native = hookWith('Starts on a call.')) =>
			await publishNative({ native, registry: fake().url, privateKey });
		const v100 = await publish();
		expect(v100).not.toHaveProperty('bundleHash');
		await expect(publish()).resolves.toEqual(v100);
		await expect(publish(hookWith('Starts on a call.', 2.1, '1.0.1'))).rejects.toThrow(
			'demo.hook@1.0.1 is a patch, so it must keep the legacy node',
		);
		const [published] = await npmVersionsOf(fake().url, '@n8n-nodes/demo.hook');
		const tarball = new Uint8Array(await (await fetch(published?.tarball ?? '')).arrayBuffer());
		expect(npmTarballFile(tarball, 'bundle.cjs')).toBeUndefined();
		expect(npmTarballFile(tarball, 'manifest.json')).toBe(manifestTextOf(v100));
	}, 60_000);
});

describe('publishPackage', () => {
	const pass = `
import { defineNode, t } from '@n8n/node-sdk';

export const pass = defineNode({ id: 'demo', displayName: 'Demo' }).action('pass', {
	action: 'Pass',
	summary: 'Pass the item on.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {},
	output: t.passedItem(),
	run: ({ items }) => items.map((item) => ({ item })),
});
`;
	const fixtures: ContractFixtures = {
		executions: [{ name: 'pass', params: {}, items: [{ a: 1 }], output: [{ a: 1 }] }],
	};

	it('publishes each action of a package once, and deprecates a version', async () => {
		// Inside this package, so the action file resolves @n8n/node-sdk.
		const dir = await mkdtemp(path.join(__dirname, '..', '..', '.package-test-'));
		try {
			const entryFile = path.join(dir, 'src', 'nodes', 'demo', 'actions', 'pass.ts');
			const keyFile = path.join(dir, 'key.pem');
			await mkdir(path.dirname(entryFile), { recursive: true });
			await mkdir(path.join(dir, 'fixtures'));
			await writeFile(entryFile, pass);
			await writeFile(path.join(dir, 'fixtures', 'demo.pass.json'), JSON.stringify(fixtures));
			await writeFile(path.join(dir, 'package.json'), JSON.stringify({ license: 'MIT' }));
			// The package.json ends the self-reference of @n8n/node-sdk, so a link resolves it.
			await mkdir(path.join(dir, 'node_modules', '@n8n'), { recursive: true });
			await symlink(
				path.resolve(__dirname, '..', '..'),
				path.join(dir, 'node_modules', '@n8n', 'node-sdk'),
			);
			await writeFile(keyFile, privateKey);
			const pkg = { name: '@acme/nodes', dir };
			const log: string[] = [];
			const name = '@acme/demo.pass';
			vi.stubEnv('N8N_NODE_CONTRACTS_NPM_REGISTRY', 'https://registry.npmjs.org/');
			await expect(publishPackage(pkg)).rejects.toThrow('not published to registry.npmjs.org');
			vi.stubEnv('N8N_NODE_CONTRACTS_NPM_REGISTRY', fake().url);
			vi.stubEnv('N8N_NODE_CONTRACTS_NPM_SCOPE', '@acme');
			vi.stubEnv('N8N_NODE_CONTRACTS_SIGNING_KEY_FILE', keyFile);

			await publishPackage(pkg, [], (line) => log.push(line));
			await publishPackage(pkg, [], (line) => log.push(line));
			const sdk = expect.stringMatching(/^sdkRuntime@\d+\.\d+\.\d+$/);
			expect(log).toEqual([sdk, 'demo.pass@1.0.0', sdk, 'demo.pass@1.0.0']);
			expect(fake().state.writes).toBe(2);
			const versions = fake().packuments.get(name)?.versions as Json;
			expect(versions['1.0.0']).toMatchObject({
				license: 'MIT',
				dependencies: { '@acme/sdk-runtime': expect.any(String) },
				n8n: { id: 'demo.pass' },
			});
			expect(Object.values(fake().packuments.get('@acme/sdk-runtime')?.versions ?? {})).toEqual([
				expect.objectContaining({
					n8n: expect.objectContaining({ id: 'sdkRuntime', kind: 'sdk' }),
				}),
			]);

			await publishPackage(pkg, ['yank', 'demo.pass@1.0.0', 'broken'], (line) => log.push(line));
			expect(fake().packuments.get(name)?.versions).toMatchObject({
				'1.0.0': { deprecated: 'broken' },
			});
			await publishPackage(pkg, ['revoke', 'demo.pass@1.0.0', 'leaks'], (line) => log.push(line));
			expect(fake().packuments.get(name)?.versions).toMatchObject({
				'1.0.0': { deprecated: 'revoked: leaks' },
			});
			expect(log.slice(4)).toEqual([
				'@acme/demo.pass@1.0.0: broken',
				'@acme/demo.pass@1.0.0: revoked: leaks',
			]);
			await expect(publishPackage(pkg, ['yank', 'demo.pass'])).rejects.toThrow('Usage:');
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	}, 60_000);
});
