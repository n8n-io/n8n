import { freezePackage } from '@n8n/node-sdk/freeze';
import type { FrozenVersion } from '@n8n/node-sdk/host';
import { replayFixtures } from '@n8n/node-sdk/publish';
import {
	embeddedStoreDirOf,
	isVersionManifest,
	parseFixtures,
	storeFilesOfDir,
	storeReader,
} from '@n8n/node-sdk/registry';
import { sandboxedVersionOf } from '@n8n/node-sdk/sandbox';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { nodesCore } from '../index';

const STORE_DIR = embeddedStoreDirOf(nodesCore);

const fixturesOf = (id: string) =>
	parseFixtures(readFileSync(path.join(nodesCore.dir, 'fixtures', `${id}.json`), 'utf8'));

/** The bundled HEAD of an action, as the host reads it from the embedded store. */
async function headOf(id: string): Promise<FrozenVersion> {
	const store = storeReader(storeFilesOfDir(STORE_DIR));
	const [record] = await store.records(id);
	const read = record && (await store.readManifest(record));
	if (!read || !isVersionManifest(read.manifest)) throw new Error(`${id} has no bundled HEAD`);
	const bundle = record.bundle && (await store.blob(record.bundle));
	if (!bundle) throw new Error(`${id} has no bundle`);
	return {
		manifest: read.manifest,
		origin: 'first-party',
		readBundle: async () => bundle.toString('utf8'),
	};
}

describe('bundled versions', () => {
	it('are the same bytes as the embedded store of the build', async () => {
		const copy = mkdtempSync(path.join(tmpdir(), 'nodes-core-versions-'));
		try {
			const { manifests } = await freezePackage(nodesCore, copy);
			const filesOf = (dir: string) =>
				readdirSync(dir, { recursive: true, encoding: 'utf8' })
					.filter((file) => statSync(path.join(dir, file)).isFile())
					.sort()
					.map((file) => [file, readFileSync(path.join(dir, file), 'base64')]);
			expect(manifests.map(({ id }) => id).sort()).toEqual(
				nodesCore.actions.map(({ id }) => id).sort(),
			);
			expect(filesOf(copy)).toEqual(filesOf(STORE_DIR));
		} finally {
			rmSync(copy, { recursive: true, force: true });
		}
	});

	it('replay the fixtures of the HEAD through the current executor', async () => {
		const issues = await Promise.all(
			nodesCore.actions.map(async ({ id }) => {
				const head = await headOf(id);
				const bundle = await head.readBundle();
				return await replayFixtures({ manifest: head.manifest, bundle }, fixturesOf(id));
			}),
		);
		expect(issues.flat()).toEqual([]);
	});
});

const SANDBOX = path.resolve(__dirname, '../../node_modules/@n8n/node-sdk/sandbox');
// The credential types of the shipped nodes stand in for the registry of n8n.
const shippedCredentialTypes = new Map(
	nodesCore.actions
		.flatMap(({ node }) => node.credential?.types ?? [])
		.map((type) => [type.name, type]),
);
const sandbox = {
	sidecar: path.join(SANDBOX, 'sidecar/target/release/n8n-sandbox'),
	guests: path.join(SANDBOX, 'dist'),
	credentialType: (name: string) => shippedCredentialTypes.get(name),
};
// `pnpm --filter @n8n/node-sdk sandbox:build` builds them.
const sandboxBuilt = [sandbox.sidecar, path.join(sandbox.guests, 'action.wasm')].every(existsSync);

describe.skipIf(!sandboxBuilt)('bundled versions in the sandbox', () => {
	const cacheDir = mkdtempSync(path.join(tmpdir(), 'nodes-core-sandbox-'));
	afterAll(() => rmSync(cacheDir, { recursive: true, force: true }));

	it('replay the fixtures of the HEAD of each action', async () => {
		const issues: string[] = [];
		// One at a time: the first load compiles the guest for all.
		for (const { id } of nodesCore.actions) {
			const head = await headOf(id);
			const loaded = await sandboxedVersionOf(head, { ...sandbox, cacheDir });
			const bundle = await head.readBundle();
			issues.push(
				...(await replayFixtures({ manifest: head.manifest, bundle }, fixturesOf(id), {
					contract: loaded.action,
					executor: loaded.executor,
					migrate: loaded.migrate,
				})),
			);
		}
		expect(issues).toEqual([]);
	}, 120_000);
});
