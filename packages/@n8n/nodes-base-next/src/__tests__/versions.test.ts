import {
	openContractPackage,
	packageNameOf,
	parseFixtures,
	verifyManifestSignature,
} from '@n8n/node-sdk';
import { npmRegistry, replayFixtures } from '@n8n/node-sdk/publish';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IExecuteFunctions } from 'n8n-workflow';

import { freezeAll } from '../../scripts/freeze';
import { FIXTURES_DIR } from '../../scripts/publish';
import { actions } from '../index';
import { HttpRequestGet } from '../nodes/HttpRequestGet.node';
import { versionsOf } from '../registry';

const fixturesOf = (actionId: string) =>
	parseFixtures(readFileSync(path.join(FIXTURES_DIR, `${actionId}.json`), 'utf8'));

describe('bundled versions', () => {
	const copy = mkdtempSync(path.join(tmpdir(), 'nodes-base-next-versions-'));

	afterAll(() => rmSync(copy, { recursive: true, force: true }));

	it('hold the HEAD of every action, as the source builds it', async () => {
		const manifests = await freezeAll(copy);

		expect(manifests.map(({ id }) => id).sort()).toEqual(actions.map(({ id }) => id).sort());
		expect(manifests.map(({ id }) => versionsOf(id)[0]?.manifest)).toEqual(manifests);
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
					abi: 1,
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
