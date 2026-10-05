import { generateKeyPairSync } from 'node:crypto';
import { appendFile, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { freezeAction, freezeCredential, freezeNative, type FrozenAction } from '../freeze';
import { credential, defineCredential, field } from '../entry/credentials';
import { defineNode, t } from '../index';
import {
	credentialChangeOf,
	lastPublishedIn,
	publishAction,
	publishCredential,
	publishNative,
	publishStatus,
} from '../publish';
import {
	addStatusToStore,
	addToStore,
	manifestTextOf,
	signStoreManifest,
	signStoreStatus,
	storeStatusTextOf,
	storeBlobFileOf,
	storeFilesOfDir,
	storeFilesOfUrl,
	storeIndexFileOf,
	storeReader,
	unresolvedCredentialPinsOf,
	verifyStoreSignature,
	type StoreRecord,
	type StoreStatusRecord,
} from '../store';

const echoSource = (minor: number, text: string) => `
import { defineNode, t } from '@n8n/node-sdk';

export const echo = defineNode({ id: 'demo', displayName: 'Demo' }).action('echo', {
	version: 1,
	minor: ${minor},
	action: 'Echo',
	summary: 'Echo the text.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { text: t.str()${minor > 0 ? ', suffix: t.str().optional()' : ''} },
	output: t.obj({ text: t.str() }),
	egress: { hosts: ['b.example.com', 'a.example.com'] },
	async run({ input }) {
		return { text: ${text} };
	},
});
`;

const token = defineCredential({
	id: 'demo.token',
	legacyName: 'demoApi',
	displayName: 'Demo API',
	fields: { token: field.secret('Token') },
	auth: (a) => a.bearer('token'),
	baseUrl: 'https://a.example.com',
});

const tokenWith = (spec: { displayName?: string; hosts?: string[]; version?: number }) =>
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

const hookWith = (summary: string, version = 2.2) =>
	defineNode({ id: 'demo', displayName: 'Demo' }).trigger('hook', {
		trigger: 'On call',
		summary,
		input: { path: t.str() },
		output: t.obj({ body: t.str() }),
		native: { type: 'n8n-nodes-base.webhook', version, on: 'webhook' },
	});

const keys = generateKeyPairSync('ed25519');
const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const otherKey = generateKeyPairSync('ed25519')
	.publicKey.export({ type: 'spki', format: 'pem' })
	.toString();

const dirs = { root: '', entry: '' };

const freeze = async (minor = 0, text = 'input.text') => {
	await writeFile(dirs.entry, echoSource(minor, text));
	return await freezeAction(dirs.entry, 'echo');
};

const storeVersionOf = ({ manifest, bundle }: FrozenAction) => ({
	manifestText: manifestTextOf(manifest),
	bundle,
});

const newDir = async (name: string) => await mkdtemp(path.join(dirs.root, `${name}-`));

/** Each file of a directory tree with its bytes, by relative path. */
const treeOf = async (dir: string) =>
	Object.fromEntries(
		await Promise.all(
			(await readdir(dir, { recursive: true, withFileTypes: true }))
				.filter((entry) => entry.isFile())
				.map(async (entry) => {
					const file = path.join(entry.parentPath, entry.name);
					return [path.relative(dir, file), (await readFile(file)).toString('base64')] as const;
				}),
		),
	);

beforeAll(async () => {
	dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-store-'));
	dirs.entry = path.join(dirs.root, 'echo.ts');
});

afterAll(async () => {
	await rm(dirs.root, { recursive: true, force: true });
});

describe('the store layout', () => {
	it('gives back the frozen manifest and bundle bytes', async () => {
		const frozen = await freeze();
		const credential = await freezeCredential(token);
		if (!credential) throw new Error('demo.token has no manifest');
		const dir = await newDir('round-trip');
		const [record] = await addToStore(dir, [
			storeVersionOf(frozen),
			{ manifestText: manifestTextOf(credential) },
		]);
		const reader = storeReader(storeFilesOfDir(dir));

		expect(record).toEqual({
			id: 'demo.echo',
			version: '1.0.0',
			kind: 'action',
			nodeContract: frozen.manifest.nodeContract,
			manifest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
			bundle: `sha256:${frozen.manifest.bundleHash}`,
			contractHash: frozen.manifest.contractHash,
			permissions: { egress: ['a.example.com', 'b.example.com'], imports: [] },
		});
		expect(await reader.records('demo.echo')).toEqual([record]);
		expect((await reader.catalog()).map(({ id }) => id)).toEqual(['demo.echo', 'demo.token']);
		const read = await reader.readManifest(record as StoreRecord);
		expect(read?.manifest).toEqual(frozen.manifest);
		expect(read?.text).toBe(manifestTextOf(frozen.manifest));
		expect((await reader.blob(`sha256:${frozen.manifest.bundleHash}`))?.toString('utf8')).toBe(
			frozen.bundle,
		);
		const [credentialRecord] = await reader.records('demo.token');
		expect((await reader.readManifest(credentialRecord as StoreRecord))?.manifest).toEqual(
			credential,
		);
	});

	it('writes the same bytes for the same source', async () => {
		const [first, second] = [await newDir('first'), await newDir('second')];
		await addToStore(first, [storeVersionOf(await freeze())]);
		await addToStore(second, [storeVersionOf(await freeze())]);
		expect(await treeOf(second)).toEqual(await treeOf(first));
		expect(Object.keys(await treeOf(first)).sort()).toEqual(
			expect.arrayContaining(['catalog.json', 'index/demo.echo.ndjson']),
		);
	});

	it('refuses a blob that does not match its digest', async () => {
		const frozen = await freeze();
		const dir = await newDir('tampered');
		const [record] = await addToStore(dir, [storeVersionOf(frozen)]);
		if (!record) throw new Error('nothing stored');
		const reader = storeReader(storeFilesOfDir(dir));
		const bundle = `sha256:${frozen.manifest.bundleHash}`;
		await writeFile(path.join(dir, storeBlobFileOf(bundle)), `${frozen.bundle} `);
		await expect(reader.blob(bundle)).rejects.toThrow('does not match its digest');
		await writeFile(path.join(dir, storeBlobFileOf(record.manifest)), '{}');
		await expect(reader.readManifest(record)).rejects.toThrow('does not match its digest');
	});

	it('refuses an index line that does not match its manifest', async () => {
		const dir = await newDir('lying-line');
		const [record] = await addToStore(dir, [storeVersionOf(await freeze())]);
		if (!record) throw new Error('nothing stored');
		await expect(
			storeReader(storeFilesOfDir(dir)).readManifest({ ...record, version: '1.0.7' }),
		).rejects.toThrow('The index line of demo.echo@1.0.7 does not match its manifest (version)');
	});

	it('skips index lines that are not version records', async () => {
		const dir = await newDir('records');
		const [record] = await addToStore(dir, [storeVersionOf(await freeze())]);
		await appendFile(
			path.join(dir, storeIndexFileOf('demo.echo')),
			[
				JSON.stringify({ id: 'demo.echo', yank: '1.0.0', reason: 'wrong output' }),
				'not json',
				JSON.stringify({ ...record, contractHash: 'b'.repeat(64) }),
				'',
			].join('\n'),
		);
		expect(await storeReader(storeFilesOfDir(dir)).records('demo.echo')).toEqual([record]);
	});

	it('keeps a stored version and refuses other bytes for it', async () => {
		const dir = await newDir('immutable');
		const frozen = await freeze();
		await addToStore(dir, [storeVersionOf(frozen)]);
		const index = await readFile(path.join(dir, storeIndexFileOf('demo.echo')), 'utf8');
		await addToStore(dir, [storeVersionOf(frozen)]);
		expect(await readFile(path.join(dir, storeIndexFileOf('demo.echo')), 'utf8')).toBe(index);
		await expect(
			addToStore(dir, [storeVersionOf(await freeze(0, "input.text + '!'"))]),
		).rejects.toThrow('demo.echo@1.0.0 is in the store with other bytes');
	});

	it('keeps a stored credential version and refuses other bytes for it', async () => {
		const dir = await newDir('immutable-credential');
		const textOf = async (type: Parameters<typeof freezeCredential>[0]) => {
			const manifest = await freezeCredential(type);
			if (!manifest) throw new Error('no manifest');
			return manifestTextOf(manifest);
		};
		await addToStore(dir, [{ manifestText: await textOf(token) }]);
		await addToStore(dir, [{ manifestText: await textOf(token) }]);
		await expect(
			addToStore(dir, [{ manifestText: await textOf(tokenWith({ displayName: 'Demo' })) }]),
		).rejects.toThrow('demo.token@1.0.0 is in the store with other bytes');
	});

	it('refuses an id that is not a store file name', () => {
		expect(() => storeIndexFileOf('../demo')).toThrow('is not a contract id');
		expect(() => storeBlobFileOf('sha256:../x')).toThrow('is not a sha256 digest');
	});

	it('reads a file:// store as a directory', async () => {
		const dir = await newDir('file-url');
		const [record] = await addToStore(dir, [storeVersionOf(await freeze())]);
		const fetch = vi.fn();
		const reader = storeReader(storeFilesOfUrl(`file://${dir}`, fetch));
		expect(await reader.records('demo.echo')).toEqual([record]);
		expect(await reader.records('demo.other')).toEqual([]);
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe('unresolvedCredentialPinsOf', () => {
	const pinning = async () =>
		await freezeNative(
			defineNode({
				id: 'demo',
				displayName: 'Demo',
				credential: credential({ types: [token] }),
			}).trigger('hook', {
				trigger: 'On call',
				summary: 'Starts on a call.',
				input: { path: t.str() },
				output: t.obj({ body: t.str() }),
				native: { type: 'n8n-nodes-base.webhook', version: 2.2, on: 'webhook' },
			}),
		);
	const credentialOf = async (type: Parameters<typeof freezeCredential>[0]) => {
		const manifest = await freezeCredential(type);
		if (!manifest) throw new Error('no manifest');
		return manifest;
	};

	it('pins the credential id and major', async () => {
		expect((await pinning()).credentials).toEqual(['demo.token@1']);
	});

	it('resolves a pin only by a credential manifest of its id and major', async () => {
		const manifest = await pinning();
		expect(unresolvedCredentialPinsOf(manifest, [await credentialOf(token)])).toEqual([]);
		expect(unresolvedCredentialPinsOf(manifest, [])).toEqual(['demo.token@1']);
		expect(
			unresolvedCredentialPinsOf(manifest, [await credentialOf(tokenWith({ version: 2 }))]),
		).toEqual(['demo.token@1']);
	});

	it('does not resolve a pin by a credential type that the contract does not list', async () => {
		const manifest = await pinning();
		const other = { ...manifest, contract: { ...manifest.contract, credentials: ['otherApi'] } };
		expect(unresolvedCredentialPinsOf(other, [await credentialOf(token)])).toEqual([
			'demo.token@1',
		]);
	});
});

describe('store status lines', () => {
	const at = '2026-10-02T12:00:00.000Z';
	const yank: StoreStatusRecord = { id: 'demo.echo', yank: '1.1.0', reason: 'wrong output', at };
	const revoke: StoreStatusRecord = { id: 'demo.echo', revoke: '1.0.1', reason: 'leaks', at };
	const deprecate: StoreStatusRecord = {
		id: 'demo.echo',
		deprecate: '1',
		message: 'Use major 2',
		use: 'demo.echo@2',
		at,
	};

	const threeVersions = async () => {
		const dir = await newDir('statuses');
		const lastOf = lastPublishedIn(storeReader(storeFilesOfDir(dir)));
		for (const [minor, text] of [
			[0, 'input.text'],
			[0, "input.text + '!'"],
			[1, "input.text + '?'"],
		] as const) {
			await writeFile(dirs.entry, echoSource(minor, text));
			await addToStore(dir, [storeVersionOf(await freezeAction(dirs.entry, 'echo', lastOf))]);
		}
		return dir;
	};

	it('lists the newest version that is not yanked or revoked in the catalog', async () => {
		const dir = await threeVersions();
		const reader = storeReader(storeFilesOfDir(dir));
		const catalogVersions = async () => (await reader.catalog()).map(({ version }) => version);
		expect(await catalogVersions()).toEqual(['1.1.0']);
		await addStatusToStore(dir, [yank]);
		expect(await catalogVersions()).toEqual(['1.0.1']);
		await addStatusToStore(dir, [revoke, deprecate]);
		expect(await catalogVersions()).toEqual(['1.0.0']);
		expect((await reader.records('demo.echo')).map(({ version }) => version)).toEqual([
			'1.0.0',
			'1.0.1',
			'1.1.0',
		]);
		expect((await reader.index('demo.echo')).statuses).toEqual([yank, revoke, deprecate]);
		expect(await reader.ids()).toEqual(['demo.echo']);
		await addStatusToStore(dir, [{ ...yank, yank: '1.0.0' }]);
		expect(await catalogVersions()).toEqual([]);
		expect(await reader.ids()).toEqual(['demo.echo']);
	});

	it('appends a status line once', async () => {
		const dir = await threeVersions();
		await addStatusToStore(dir, [yank]);
		const index = await readFile(path.join(dir, storeIndexFileOf('demo.echo')), 'utf8');
		await addStatusToStore(dir, [{ ...yank }]);
		expect(await readFile(path.join(dir, storeIndexFileOf('demo.echo')), 'utf8')).toBe(index);
	});

	it('refuses a status line of a version that the store does not have', async () => {
		const dir = await threeVersions();
		await expect(addStatusToStore(dir, [{ ...yank, yank: '1.0.9' }])).rejects.toThrow(
			'The store has no version demo.echo@1.0.9',
		);
		await expect(addStatusToStore(dir, [{ ...deprecate, id: 'demo.other' }])).rejects.toThrow(
			'The store has no version of demo.other',
		);
		const { reason: _, ...noReason } = { ...revoke, reason: '' };
		await expect(addStatusToStore(dir, [noReason as unknown as StoreStatusRecord])).rejects.toThrow(
			'is not a status line',
		);
	});

	it('signs the canonical form of a status line', () => {
		const signed = { ...yank, signatures: [signStoreStatus(yank, privateKey)] };
		const reordered = { at, reason: yank.reason, yank: '1.1.0', id: 'demo.echo' };
		expect(storeStatusTextOf(signed)).toBe(storeStatusTextOf(reordered));
		expect(verifyStoreSignature(signed, storeStatusTextOf(signed), publicKey)).toBe(true);
		const changed = { ...signed, reason: 'other' };
		expect(verifyStoreSignature(changed, storeStatusTextOf(changed), publicKey)).toBe(false);
	});

	it('publishes a signed status line', async () => {
		const dir = await threeVersions();
		await publishStatus({ registryDir: dir, privateKey }, revoke);
		const [line] = (await storeReader(storeFilesOfDir(dir)).index('demo.echo')).statuses;
		expect(line).toEqual({ ...revoke, signatures: [expect.any(Object)] });
		expect(verifyStoreSignature(line ?? {}, storeStatusTextOf(line ?? revoke), publicKey)).toBe(
			true,
		);
	});
});

describe('store signatures', () => {
	it('verify the manifest bytes with the trusted key', async () => {
		const { manifest } = await freeze();
		const text = manifestTextOf(manifest);
		const signatures = [signStoreManifest(text, privateKey)];
		expect(verifyStoreSignature({ signatures }, text, publicKey)).toBe(true);
		expect(verifyStoreSignature({ signatures }, text, otherKey)).toBe(false);
		expect(verifyStoreSignature({ signatures }, `${text} `, publicKey)).toBe(false);
		expect(verifyStoreSignature({}, text, publicKey)).toBe(false);
	});
});

describe('publishAction', () => {
	it('appends one line for each version and keeps the old lines', async () => {
		const registry = await newDir('registry');
		const publish = async () =>
			await publishAction({
				entryFile: dirs.entry,
				exportName: 'echo',
				fixtures: {
					executions: [{ name: 'echo', params: { text: 'hi' }, output: [{ text: 'hi' }] }],
				},
				registryDir: registry,
				privateKey,
			});
		const index = path.join(registry, storeIndexFileOf('demo.echo'));
		await writeFile(dirs.entry, echoSource(0, 'input.text'));
		const v100 = await publish();
		const first = await readFile(index, 'utf8');
		await expect(publish()).resolves.toEqual(v100);
		expect(await readFile(index, 'utf8')).toBe(first);

		await writeFile(dirs.entry, echoSource(0, 'String(input.text)'));
		const v101 = await publish();
		expect(v101.semver).toBe('1.0.1');
		const lines = (await readFile(index, 'utf8')).split('\n').filter(Boolean);
		expect(lines).toHaveLength(2);
		expect(`${lines[0]}\n`).toBe(first);

		const reader = storeReader(storeFilesOfDir(registry));
		const records = await reader.records('demo.echo');
		expect(records.map(({ version }) => version)).toEqual(['1.0.0', '1.0.1']);
		expect(records.every(({ published, fixtures }) => published && fixtures)).toBe(true);
		const text = (await reader.readManifest(records[1] as StoreRecord))?.text ?? '';
		expect(verifyStoreSignature(records[1] as StoreRecord, text, publicKey)).toBe(true);
		expect((await reader.catalog()).map(({ version }) => version)).toEqual(['1.0.1']);
		expect(await lastPublishedIn(reader)('demo.echo', 1, 0)).toEqual(records[1]);
		expect(records[1]?.bundle).toBe(`sha256:${v101.bundleHash}`);
		expect(await lastPublishedIn(reader)('demo.echo', 1, 1)).toBeUndefined();
	});
});

describe('publishCredential', () => {
	it('appends a signed line and a manifest blob for each version', async () => {
		const registry = await newDir('credential-registry');
		const publish = async (type = tokenWith({})) =>
			await publishCredential({ type, registryDir: registry, privateKey });
		const index = path.join(registry, storeIndexFileOf('demo.token'));

		const v100 = await publish();
		const first = await readFile(index, 'utf8');
		await expect(publish()).resolves.toEqual(v100);
		expect(await readFile(index, 'utf8')).toBe(first);

		const v101 = await publish(tokenWith({ displayName: 'Demo' }));
		expect([v100.semver, v101.semver]).toEqual(['1.0.0', '1.0.1']);
		const lines = (await readFile(index, 'utf8')).split('\n').filter(Boolean);
		expect(`${lines[0]}\n`).toBe(first);

		const reader = storeReader(storeFilesOfDir(registry));
		const records = await reader.records('demo.token');
		expect(records).toEqual([
			expect.objectContaining({ version: '1.0.0', kind: 'credential', name: 'demoApi' }),
			expect.objectContaining({ version: '1.0.1', kind: 'credential', name: 'demoApi' }),
		]);
		expect(records.every(({ bundle, published }) => bundle === undefined && published)).toBe(true);
		const read = await reader.readManifest(records[1] as StoreRecord);
		expect(read?.manifest).toEqual(v101);
		expect(verifyStoreSignature(records[1] as StoreRecord, read?.text ?? '', publicKey)).toBe(true);
	});

	it('refuses a new host without a new major', async () => {
		const registry = await newDir('credential-hosts');
		await publishCredential({ type: tokenWith({}), registryDir: registry, privateKey });
		await expect(
			publishCredential({
				type: tokenWith({ hosts: ['b.example.com'] }),
				registryDir: registry,
				privateKey,
			}),
		).rejects.toThrow('demo.token@1.0.1 is a patch bump from 1.0.0, but the change is major');
		const v200 = await publishCredential({
			type: tokenWith({ hosts: ['b.example.com'], version: 2 }),
			registryDir: registry,
			privateKey,
		});
		expect(v200).toMatchObject({ semver: '2.0.0', hosts: ['b.example.com'] });
	});
});

describe('credentialChangeOf', () => {
	const manifestOf = async (fields: Parameters<typeof defineCredential>[0]['fields'], doc = '') =>
		await freezeCredential(
			defineCredential({
				id: 'demo.token',
				displayName: 'Demo API',
				...(doc ? { docs: doc } : {}),
				fields,
				auth: (a) => a.none(),
			}),
		);

	it.each([
		['a text change', { a: t.str() }, { a: t.str() }, 'patch', 'other-docs'],
		['a new optional field', { a: t.str() }, { a: t.str(), b: t.str().optional() }, 'minor', ''],
		['a new required field', { a: t.str() }, { a: t.str(), b: t.str() }, 'major', ''],
		['a removed field', { a: t.str(), b: t.str() }, { a: t.str() }, 'major', ''],
	])('rates %s', async (_what, before, after, change, doc) => {
		const [previous, next] = [await manifestOf(before), await manifestOf(after, doc)];
		if (!previous || !next) throw new Error('no manifest');
		expect(credentialChangeOf(previous, next)).toBe(change);
	});
});

describe('publishNative', () => {
	it('appends a line without a bundle and reads the manifest back', async () => {
		const registry = await newDir('native-registry');
		const publish = async (summary = 'Starts on a call.') =>
			await publishNative({ native: hookWith(summary), registryDir: registry, privateKey });

		const v100 = await publish();
		expect(v100).toMatchObject({
			kind: 'trigger',
			id: 'demo.hook',
			semver: '1.0.0',
			native: { type: 'n8n-nodes-base.webhook', version: 2.2 },
			contract: { trigger: 'webhook' },
		});
		expect(v100).not.toHaveProperty('bundleHash');
		await expect(publish()).resolves.toEqual(v100);
		const v101 = await publish('Starts when a caller calls.');
		expect(v101.semver).toBe('1.0.1');

		const reader = storeReader(storeFilesOfDir(registry));
		const records = await reader.records('demo.hook');
		expect(records).toEqual([
			expect.objectContaining({ version: '1.0.0', native: 'n8n-nodes-base.webhook' }),
			expect.objectContaining({ version: '1.0.1', native: 'n8n-nodes-base.webhook' }),
		]);
		expect(records.every(({ bundle }) => bundle === undefined)).toBe(true);
		expect((await reader.readManifest(records[0] as StoreRecord))?.manifest).toEqual(v100);
		expect((await reader.catalog()).map(({ id, version }) => `${id}@${version}`)).toEqual([
			'demo.hook@1.0.1',
		]);
	});

	it('refuses a patch with another legacy node version', async () => {
		const registry = await newDir('native-binding');
		await publishNative({
			native: hookWith('Starts on a call.'),
			registryDir: registry,
			privateKey,
		});
		await expect(
			publishNative({
				native: hookWith('Starts on a call.', 2.1),
				registryDir: registry,
				privateKey,
			}),
		).rejects.toThrow('demo.hook@1.0.1 is a patch, so it must keep the legacy node');
	});
});
