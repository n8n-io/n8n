import { testDb } from '@n8n/backend-test-utils';
import { NodeContractVersionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	exportContractStore,
	importContractStore,
	storeFilesOfDir,
	storeReader,
	versionsOf,
	type StoredVersion,
} from '@n8n/nodes-base-next';
import { InstanceSettings } from 'n8n-core';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { NodeContractsStore } from '@/node-contracts-registry';

interface StoreVersion {
	readonly manifestText: string;
	readonly bundle: string;
	readonly fixtures?: string;
	readonly signatures?: unknown[];
	readonly published?: string;
}

// The cli does not depend on the node-sdk, so load it through the package that does.
const sdkRequire = createRequire(createRequire(__filename).resolve('@n8n/nodes-base-next'));
const sdk = sdkRequire('@n8n/node-sdk/registry') as {
	addToStore(dir: string, versions: StoreVersion[]): Promise<unknown>;
	manifestTextOf(manifest: unknown): string;
	signStoreManifest(manifestText: string, privateKey: string): unknown;
};

const NEXT = path.resolve(__dirname, '../../../../../@n8n/nodes-base-next');
const OLDER = path.join(NEXT, 'fixtures/versions/httpRequest.get@2.0.0');

const keys = generateKeyPairSync('ed25519', {
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const digestOf = (text: string) => `sha256:${createHash('sha256').update(text).digest('hex')}`;

/** The version 2.0.0 of httpRequest.get and the bundled HEAD, signed and with fixtures. */
const versions = async (): Promise<StoreVersion[]> => {
	const [head] = versionsOf('httpRequest.get');
	if (!head) throw new Error('httpRequest.get is not bundled');
	const texts = [
		{
			manifestText: await readFile(path.join(OLDER, 'manifest.json'), 'utf8'),
			bundle: await readFile(path.join(OLDER, 'bundle.cjs'), 'utf8'),
		},
		{ manifestText: sdk.manifestTextOf(head.manifest), bundle: await head.readBundle() },
	];
	return texts.map((text) => ({
		...text,
		fixtures: '{"executions":[]}\n',
		signatures: [sdk.signStoreManifest(text.manifestText, keys.privateKey)],
		published: '2026-10-02T12:00:00.000Z',
	}));
};

const storedOf = (version: StoreVersion, semver: string): StoredVersion => ({
	id: 'httpRequest.get',
	version: semver,
	kind: 'action',
	manifest: digestOf(version.manifestText),
	manifestText: version.manifestText,
	bundle: version.bundle,
	fixtures: version.fixtures,
	signatures: [],
	published: version.published,
	origin: 'community',
});

/** Every file of a directory and its bytes. */
const treeOf = async (dir: string) => {
	const entries = await readdir(dir, { recursive: true, withFileTypes: true });
	const files = entries
		.filter((entry) => entry.isFile())
		.map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
		.sort();
	return Object.fromEntries(
		await Promise.all(
			files.map(async (file) => [file, (await readFile(path.join(dir, file))).toString('hex')]),
		),
	);
};

const state = { dir: '' };

beforeAll(async () => {
	await testDb.init();
	state.dir = await mkdtemp(path.join(tmpdir(), 'node-contract-version-'));
});

beforeEach(async () => {
	await testDb.truncate(['NodeContractVersion']);
});

afterAll(async () => {
	await rm(state.dir, { recursive: true, force: true });
	await testDb.terminate();
});

describe('NodeContractVersionRepository', () => {
	it('round trips a version and keeps the first bytes of an id and version', async () => {
		const [older] = await versions();
		if (!older) throw new Error('no version');
		const stored = storedOf(older, '2.0.0');
		const { rows } = Container.get(NodeContractsStore);

		await rows.insert([stored]);
		await rows.insert([stored, { ...stored, manifest: `sha256:${'f'.repeat(64)}` }]);

		expect(await rows.manifests('httpRequest.get')).toEqual([
			{
				id: 'httpRequest.get',
				version: '2.0.0',
				kind: 'action',
				manifest: stored.manifest,
				manifestText: older.manifestText,
				signatures: [],
				origin: 'community',
			},
		]);
		expect(await rows.manifests('other.id')).toEqual([]);
		expect(await rows.bundle(stored.manifest)).toBe(older.bundle);
		expect(await rows.versions()).toEqual([stored]);
		expect(await Container.get(NodeContractVersionRepository).count()).toBe(1);
	});

	it('keeps credential and native rows without a bundle', async () => {
		const [older] = await versions();
		if (!older) throw new Error('no version');
		const rowOf = (id: string, kind: StoredVersion['kind'], manifestText: string) => ({
			id,
			version: '1.0.0',
			kind,
			manifest: digestOf(manifestText),
			manifestText,
			signatures: [],
			origin: 'private' as const,
		});
		const credential = rowOf('ping.token', 'credential', '{"kind":"credential"}\n');
		const native = rowOf('ping.called', 'trigger', '{"native":{}}\n');
		const { rows } = Container.get(NodeContractsStore);

		await rows.insert([storedOf(older, '2.0.0'), credential, native]);

		expect(await rows.credentialManifests()).toEqual([credential]);
		expect(await rows.bundle(native.manifest)).toBeUndefined();
		expect(await rows.versions()).toEqual(
			expect.arrayContaining([
				{ ...credential, bundle: undefined, fixtures: undefined, published: undefined },
				{ ...native, bundle: undefined, fixtures: undefined, published: undefined },
			]),
		);
	});

	it('exports the same layout bytes that it imported', async () => {
		const source = path.join(state.dir, 'source');
		await sdk.addToStore(source, await versions());
		const { rows } = Container.get(NodeContractsStore);

		const added = await importContractStore(storeReader(storeFilesOfDir(source)), rows, {
			firstParty: keys.publicKey,
			vetting: undefined,
		});
		expect(added.map(({ origin }) => origin)).toEqual(['first-party', 'first-party']);
		expect(
			(await rows.manifests('httpRequest.get')).map(({ version, origin }) => [version, origin]),
		).toEqual(
			expect.arrayContaining([
				['2.0.0', 'first-party'],
				[expect.any(String), 'first-party'],
			]),
		);
		const out = path.join(state.dir, 'export');
		await exportContractStore(rows, out);

		expect(await treeOf(out)).toEqual(await treeOf(source));
	});

	it('reads the stored version and never the registry on a host that may not fetch', async () => {
		const [older] = await versions();
		if (!older) throw new Error('no version');
		const { rows } = Container.get(NodeContractsStore);
		await rows.insert([storedOf(older, '2.0.0')]);
		const manifest = JSON.parse(older.manifestText) as {
			id: string;
			semver: string;
			bundleHash: string;
			contractHash: string;
		};
		const lock = {
			action: manifest.id,
			version: manifest.semver,
			bundleHash: manifest.bundleHash,
			contractHash: manifest.contractHash,
		};
		const instanceSettings = Container.get(InstanceSettings);
		instanceSettings.markAsFollower();
		try {
			// No server listens there: a fetch would fail.
			const store = await Container.get(NodeContractsStore).open('http://127.0.0.1:9');
			expect(await (await store.locked(lock)).readBundle()).toBe(older.bundle);
			await expect(store.locked({ ...lock, version: '2.0.9' })).rejects.toThrow(
				'only the leader main fetches from the registry',
			);
		} finally {
			instanceSettings.instanceRole = 'unset';
		}
	});
});
