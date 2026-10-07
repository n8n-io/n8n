import { generateKeyPairSync } from 'node:crypto';
import { appendFile, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { packAction, packCredential, packNative, type PackedAction } from '../pack';
import { credential, defineCredential, field } from '../entry/credentials';
import { defineNode, t } from '../index';
import { credentialChangeOf } from '../publish';
import {
	addStatusToStore,
	addToStore,
	manifestTextOf,
	signStoreManifest,
	signStoreStatus,
	storeStatusTextOf,
	storeBlobFileOf,
	storeFilesOfDir,
	storeIndexFileOf,
	storeReader,
	unresolvedCredentialPinsOf,
	verifyStoreSignature,
	type StoreRecord,
	type StoreStatusRecord,
} from '../store';

const echoSource = (version: string, text: string) => `
import { defineNode, t } from '@n8n/node-sdk';

export const echo = defineNode({ id: 'demo', displayName: 'Demo' }).action('echo', {
	version: '${version}',
	action: 'Echo',
	summary: 'Echo the text.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { text: t.str().title('Text')${/^\d+\.0\./.test(version) ? '' : ", suffix: t.str().title('Suffix').optional()"} },
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

const tokenWith = (spec: {
	displayName?: string;
	hosts?: string[];
	version?: `${number}.${number}.${number}`;
}) =>
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

const keys = generateKeyPairSync('ed25519');
const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const otherKey = generateKeyPairSync('ed25519')
	.publicKey.export({ type: 'spki', format: 'pem' })
	.toString();

const dirs = { root: '', entry: '' };

const pack = async (version = '1.0.0', text = 'input.text') => {
	await writeFile(dirs.entry, echoSource(version, text));
	return await packAction(dirs.entry, 'echo');
};

const storeVersionOf = ({ manifest, bundle }: PackedAction) => ({
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
	it('gives back the packed manifest and bundle bytes', async () => {
		const packed = await pack();
		const credential = packCredential(token);
		if (!credential) throw new Error('demo.token has no manifest');
		const dir = await newDir('round-trip');
		const [record] = await addToStore(dir, [
			storeVersionOf(packed),
			{ manifestText: manifestTextOf(credential) },
		]);
		const reader = storeReader(storeFilesOfDir(dir));

		expect(record).toEqual({
			id: 'demo.echo',
			version: '1.0.0',
			kind: 'action',
			nodeContract: packed.manifest.nodeContract,
			manifest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
			bundle: `sha256:${packed.manifest.bundleHash}`,
			contractHash: packed.manifest.contractHash,
			permissions: { egress: ['a.example.com', 'b.example.com'], imports: [] },
		});
		expect(await reader.records('demo.echo')).toEqual([record]);
		expect((await reader.catalog()).map(({ id }) => id)).toEqual(['demo.echo', 'demo.token']);
		const read = await reader.readManifest(record as StoreRecord);
		expect(read?.manifest).toEqual(packed.manifest);
		expect(read?.text).toBe(manifestTextOf(packed.manifest));
		expect((await reader.blob(`sha256:${packed.manifest.bundleHash}`))?.toString('utf8')).toBe(
			packed.bundle,
		);
		const [credentialRecord] = await reader.records('demo.token');
		expect((await reader.readManifest(credentialRecord as StoreRecord))?.manifest).toEqual(
			credential,
		);
	});

	it('writes the same bytes for the same source', async () => {
		const [first, second] = [await newDir('first'), await newDir('second')];
		await addToStore(first, [storeVersionOf(await pack())]);
		await addToStore(second, [storeVersionOf(await pack())]);
		expect(await treeOf(second)).toEqual(await treeOf(first));
		expect(Object.keys(await treeOf(first)).sort()).toEqual(
			expect.arrayContaining(['catalog.json', 'index/demo.echo.ndjson']),
		);
	});

	it('refuses a blob that does not match its digest', async () => {
		const packed = await pack();
		const dir = await newDir('tampered');
		const [record] = await addToStore(dir, [storeVersionOf(packed)]);
		if (!record) throw new Error('nothing stored');
		const reader = storeReader(storeFilesOfDir(dir));
		const bundle = `sha256:${packed.manifest.bundleHash}`;
		await writeFile(path.join(dir, storeBlobFileOf(bundle)), `${packed.bundle} `);
		await expect(reader.blob(bundle)).rejects.toThrow('does not match its digest');
		await writeFile(path.join(dir, storeBlobFileOf(record.manifest)), '{}');
		await expect(reader.readManifest(record)).rejects.toThrow('does not match its digest');
	});

	it('refuses an index line that does not match its manifest', async () => {
		const dir = await newDir('lying-line');
		const [record] = await addToStore(dir, [storeVersionOf(await pack())]);
		if (!record) throw new Error('nothing stored');
		await expect(
			storeReader(storeFilesOfDir(dir)).readManifest({ ...record, version: '1.0.7' }),
		).rejects.toThrow('The index line of demo.echo@1.0.7 does not match its manifest (version)');
	});

	it('skips index lines that are not version records', async () => {
		const dir = await newDir('records');
		const [record] = await addToStore(dir, [storeVersionOf(await pack())]);
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
		const packed = await pack();
		await addToStore(dir, [storeVersionOf(packed)]);
		const index = await readFile(path.join(dir, storeIndexFileOf('demo.echo')), 'utf8');
		await addToStore(dir, [storeVersionOf(packed)]);
		expect(await readFile(path.join(dir, storeIndexFileOf('demo.echo')), 'utf8')).toBe(index);
		await expect(
			addToStore(dir, [storeVersionOf(await pack('1.0.0', "input.text + '!'"))]),
		).rejects.toThrow('demo.echo@1.0.0 is in the store with other bytes');
	});

	it('keeps a stored credential version and refuses other bytes for it', async () => {
		const dir = await newDir('immutable-credential');
		const textOf = (type: Parameters<typeof packCredential>[0]) => {
			const manifest = packCredential(type);
			if (!manifest) throw new Error('no manifest');
			return manifestTextOf(manifest);
		};
		await addToStore(dir, [{ manifestText: textOf(token) }]);
		await addToStore(dir, [{ manifestText: textOf(token) }]);
		await expect(
			addToStore(dir, [{ manifestText: textOf(tokenWith({ displayName: 'Demo' })) }]),
		).rejects.toThrow('demo.token@1.0.0 is in the store with other bytes');
	});

	it('refuses an id that is not a store file name', () => {
		expect(() => storeIndexFileOf('../demo')).toThrow('is not a contract id');
		expect(() => storeBlobFileOf('sha256:../x')).toThrow('is not a sha256 digest');
	});
});

describe('unresolvedCredentialPinsOf', () => {
	const pinning = () =>
		packNative(
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
	const credentialOf = (type: Parameters<typeof packCredential>[0]) => {
		const manifest = packCredential(type);
		if (!manifest) throw new Error('no manifest');
		return manifest;
	};

	it('pins the credential id and major', () => {
		expect(pinning().credentials).toEqual(['demo.token@1']);
	});

	it('resolves a pin only by a credential manifest of its id and major', () => {
		const manifest = pinning();
		expect(unresolvedCredentialPinsOf(manifest, [credentialOf(token)])).toEqual([]);
		expect(unresolvedCredentialPinsOf(manifest, [])).toEqual(['demo.token@1']);
		expect(
			unresolvedCredentialPinsOf(manifest, [credentialOf(tokenWith({ version: '2.0.0' }))]),
		).toEqual(['demo.token@1']);
	});

	it('does not resolve a pin by a credential type that the contract does not list', () => {
		const manifest = pinning();
		const other = { ...manifest, contract: { ...manifest.contract, credentials: ['otherApi'] } };
		expect(unresolvedCredentialPinsOf(other, [credentialOf(token)])).toEqual(['demo.token@1']);
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
		for (const [version, text] of [
			['1.0.0', 'input.text'],
			['1.0.1', "input.text + '!'"],
			['1.1.0', "input.text + '?'"],
		] as const) {
			await addToStore(dir, [storeVersionOf(await pack(version, text))]);
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
});

describe('store signatures', () => {
	it('verify the manifest bytes with the trusted key', async () => {
		const { manifest } = await pack();
		const text = manifestTextOf(manifest);
		const signatures = [signStoreManifest(text, privateKey)];
		expect(verifyStoreSignature({ signatures }, text, publicKey)).toBe(true);
		expect(verifyStoreSignature({ signatures }, text, otherKey)).toBe(false);
		expect(verifyStoreSignature({ signatures }, `${text} `, publicKey)).toBe(false);
		expect(verifyStoreSignature({}, text, publicKey)).toBe(false);
	});
});

describe('credentialChangeOf', () => {
	const manifestOf = (fields: Parameters<typeof defineCredential>[0]['fields'], doc = '') =>
		packCredential(
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
	])('rates %s', (_what, before, after, change, doc) => {
		const [previous, next] = [manifestOf(before), manifestOf(after, doc)];
		if (!previous || !next) throw new Error('no manifest');
		expect(credentialChangeOf(previous, next)).toBe(change);
	});
});
