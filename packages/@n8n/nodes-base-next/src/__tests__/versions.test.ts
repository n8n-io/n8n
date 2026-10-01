import * as sdk from '@n8n/node-sdk';
import {
	ACTION_API_VERSION,
	actionFileOf,
	nodeNameOf,
	openContractPackage,
	packageNameOf,
	parseFixtures,
	verifyManifestSignature,
	type VersionManifest,
} from '@n8n/node-sdk';
import { npmRegistry, replayFixtures } from '@n8n/node-sdk/publish';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { compileFunction } from 'node:vm';
import type { IExecuteFunctions, VersionedNodeType } from 'n8n-workflow';

import { actionEntries, freezeAll, NODES_DIR, nodeClassFile } from '../../scripts/freeze';
import { FIXTURES_DIR } from '../../scripts/publish';
import { actions } from '../index';
import { versionsOf, VERSIONS_DIR } from '../registry';

/**
 * Runs a generated class file as the n8n loader does: `require` the file, then construct the
 * export that the file name names. `dir` holds the frozen versions that the file reads.
 */
function loadNodeClass(actionId: string, dir: string) {
	const { file, source } = nodeClassFile({ id: actionId });
	const [className = ''] = path.parse(file).name.split('.');
	const modules: Record<string, unknown> = {
		'@n8n/node-sdk': sdk,
		'../registry': { versionsOf: (id: string) => versionsOf(id, dir) },
	};
	const module: { exports: Record<string, unknown> } = { exports: {} };
	compileFunction(source, ['exports', 'require'])(module.exports, (id: string) => modules[id]);
	return module.exports[className] as new () => VersionedNodeType;
}

const fixturesOf = (actionId: string) =>
	parseFixtures(readFileSync(path.join(FIXTURES_DIR, `${actionId}.json`), 'utf8'));

describe('action files', () => {
	it('hold one action each, named after its id', async () => {
		const kebab = (name: string) => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
		const files = (await actionEntries()).map(({ entryFile, action }) => [
			action.id,
			path.relative(NODES_DIR, entryFile),
		]);
		expect(files.sort()).toEqual(
			actions
				.map(({ id, node, resource, operation }) => [
					id,
					path.join(kebab(node.id), actionFileOf({ resource, operation })),
				])
				.sort(),
		);
	});
});

describe('bundled versions', () => {
	const copy = mkdtempSync(path.join(tmpdir(), 'nodes-base-next-versions-'));
	const frozen = { manifests: Array.of<VersionManifest>() };

	beforeAll(async () => {
		frozen.manifests = await freezeAll(copy);
	});

	afterAll(() => rmSync(copy, { recursive: true, force: true }));

	it('hold the HEAD of every action, as the source builds it', () => {
		const { manifests } = frozen;
		expect(manifests.map(({ id }) => id).sort()).toEqual(actions.map(({ id }) => id).sort());
		expect(manifests.map(({ id }) => versionsOf(id)[0]?.manifest)).toEqual(manifests);
	});

	it('match the n8n.nodes list of package.json with one generated class file each', () => {
		const manifest: unknown = JSON.parse(
			readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
		);
		const listed = sdk.isRecord(manifest) && sdk.isRecord(manifest.n8n) ? manifest.n8n.nodes : [];
		expect(listed).toEqual(actions.map((action) => `dist/${nodeClassFile(action).file}`));
	});

	it('load from the generated class files with the class name of each file', () => {
		const loaded = actions.map(({ id }) => {
			const { description } = new (loadNodeClass(id, copy))();
			return [description.name, description.defaultVersion];
		});
		expect(loaded).toEqual(actions.map(({ id, version }) => [nodeNameOf(id), version]));
		expect(frozen.manifests.map(({ apiVersion }) => apiVersion)).toEqual(
			actions.map(() => ACTION_API_VERSION),
		);
	});

	it('replay the fixtures of the HEAD through the current executor', async () => {
		const issues = await Promise.all(
			actions.map(async ({ id }) => {
				const [head] = versionsOf(id);
				if (!head) return [`${id} has no bundled HEAD`];
				const bundle = await head.readBundle();
				return await replayFixtures({ manifest: head.manifest, bundle }, fixturesOf(id));
			}),
		);
		expect(issues.flat()).toEqual([]);
	});

	it('run from the bundle in the node class', async () => {
		const parameters: Record<string, unknown> = {
			authentication: 'none',
			url: 'https://api.test/items',
		};
		const metadata: unknown[] = [];
		const context = {
			getInputData: () => [{ json: {} }],
			getNode: () => ({ name: 'GET', credentials: {} }),
			getNodeParameter: (name: string) => parameters[name],
			continueOnFail: () => false,
			setMetadata: (value: unknown) => metadata.push(value),
			helpers: { httpRequest: async () => [{ id: 1 }, { id: 2 }] },
		} as unknown as IExecuteFunctions;

		const HttpRequestGet = loadNodeClass('httpRequest.get', VERSIONS_DIR);
		const result = await new HttpRequestGet().getNodeType(1).execute?.call(context);

		expect(result).toEqual([
			[
				{ json: { id: 1 }, pairedItem: { item: 0 } },
				{ json: { id: 2 }, pairedItem: { item: 0 } },
			],
		]);
		const [head] = versionsOf('httpRequest.get');
		expect(metadata).toEqual([
			{
				nodeContract: {
					action: 'httpRequest.get',
					version: head?.manifest.semver,
					bundleHash: head?.manifest.bundleHash,
					apiVersion: ACTION_API_VERSION,
				},
			},
		]);
	});
});

const REGISTRY_URL = process.env.N8N_NODE_CONTRACTS_REGISTRY_URL;
const PUBLIC_KEY_FILE = process.env.N8N_NODE_CONTRACTS_PUBLIC_KEY_FILE;

// Old versions live only in the registry, so this check runs where one is configured.
describe.skipIf(!REGISTRY_URL)('published versions', () => {
	it('replay their own fixtures through the current executor', async () => {
		const registry = npmRegistry(REGISTRY_URL ?? '');
		const publicKey = PUBLIC_KEY_FILE ? readFileSync(PUBLIC_KEY_FILE, 'utf8') : undefined;
		const issues = await Promise.all(
			actions.map(async ({ id }) => {
				const name = packageNameOf(id);
				const versions = await registry.versions(name);
				const replayed = await Promise.all(
					versions.map(async (version) => {
						const { data, integrity } = await registry.tarball(name, version);
						const pkg = openContractPackage(data, integrity);
						const signed = !publicKey || verifyManifestSignature(pkg, publicKey);
						return [
							...(signed ? [] : [`${id}@${version} has no valid signature`]),
							...(await replayFixtures(pkg, pkg.fixtures)),
						];
					}),
				);
				return replayed.flat();
			}),
		);
		expect(issues.flat()).toEqual([]);
	}, 120_000);
});
