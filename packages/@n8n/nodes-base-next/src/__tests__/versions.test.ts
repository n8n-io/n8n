import * as sdk from '@n8n/node-sdk';
import {
	actionFileOf,
	nodeNameOf,
	openContractPackage,
	packageNameOf,
	parseFixtures,
	requiredNodeContractOf,
	toContract,
	validate,
	verifyManifestSignature,
	type JsonSchema,
	type VersionManifest,
} from '@n8n/node-sdk';
import { npmRegistry, replayFixtures } from '@n8n/node-sdk/publish';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { compileFunction } from 'node:vm';
import type { ICredentialType, IExecuteFunctions, VersionedNodeType } from 'n8n-workflow';

import {
	actionEntries,
	credentialClassFile,
	freezeAll,
	freezeCredentials,
	NODES_DIR,
	nodeClassFile,
} from '../../scripts/freeze';
import { FIXTURES_DIR } from '../../scripts/publish';
import { actions, credentialTypes, nativeTriggers, triggers } from '../index';
import { versionsOf, VERSIONS_DIR } from '../registry';

/**
 * Runs a generated class file as the n8n loader does: `require` the file, then construct the
 * export that the file name names. `dir` holds the frozen versions that the file reads.
 */
function loadNodeClass(contract: Parameters<typeof nodeClassFile>[0], dir: string) {
	const { file, source } = nodeClassFile(contract);
	const [className = ''] = path.parse(file).name.split('.');
	const modules: Record<string, unknown> = {
		'@n8n/node-sdk': sdk,
		'../registry': { versionsOf: (id: string) => versionsOf(id, dir) },
	};
	const module: { exports: Record<string, unknown> } = { exports: {} };
	compileFunction(source, ['exports', 'require'])(module.exports, (id: string) => modules[id]);
	return module.exports[className] as new () => VersionedNodeType;
}

const contracts = [...actions, ...triggers];

const n8nManifest = () => {
	const manifest: unknown = JSON.parse(
		readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
	);
	return sdk.isRecord(manifest) && sdk.isRecord(manifest.n8n) ? manifest.n8n : {};
};

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
			contracts
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
		[frozen.manifests] = await Promise.all([freezeAll(copy), freezeCredentials(copy)]);
	});

	afterAll(() => rmSync(copy, { recursive: true, force: true }));

	it('hold the HEAD of every action, as the source builds it', () => {
		const { manifests } = frozen;
		expect(manifests.map(({ id }) => id).sort()).toEqual(contracts.map(({ id }) => id).sort());
		expect(manifests.map(({ id }) => versionsOf(id)[0]?.manifest)).toEqual(manifests);
	});

	it('match the n8n.nodes list of package.json with one generated class file each', () => {
		expect(n8nManifest().nodes).toEqual(
			contracts.map((contract) => `dist/${nodeClassFile(contract).file}`),
		);
	});

	it('load from the generated class files with the class name of each file', () => {
		const loaded = contracts.map((contract) => {
			const { description } = new (loadNodeClass(contract, copy))();
			return [description.name, description.defaultVersion];
		});
		expect(loaded).toEqual(contracts.map(({ id, version }) => [nodeNameOf(id), version]));
		const versions = Object.fromEntries(
			frozen.manifests.map(({ id, nodeContract }) => [id, nodeContract]),
		);
		expect(versions).toEqual(
			Object.fromEntries(
				contracts.map((contract) => [
					contract.id,
					requiredNodeContractOf(
						toContract(contract),
						'list' in contract && contract.list !== undefined,
					),
				]),
			),
		);
		// Only the paged lists need 2.4.0, only the actions with host imports, named inputs or
		// providers need 2.3.0, and only the actions with binary data need 2.2.0.
		const withVersion = (version: string) =>
			Object.keys(versions)
				.filter((id) => versions[id] === version)
				.sort();
		expect(withVersion('2.5.0')).toEqual([]);
		expect(withVersion('2.4.0')).toEqual([
			'github.issue.getAll',
			'googleDrive.file.search',
			'httpRequest.get',
			'supabase.row.getAll',
		]);
		expect(withVersion('2.3.0')).toEqual([
			'ai.agent',
			'ai.classify',
			'ai.prompt',
			'anthropic.chatModel',
			'code.javaScript',
			'code.python',
			'dataTable.row.delete',
			'dataTable.row.exists',
			'dataTable.row.get',
			'dataTable.row.insert',
			'dataTable.row.update',
			'dataTable.row.upsert',
			'dataTable.table.clear',
			'dataTable.table.create',
			'dataTable.table.delete',
			'dataTable.table.list',
			'dataTable.table.rename',
			'googleGemini.chatModel',
			'merge.append',
			'merge.combine',
			'minimax.chatModel',
			'openAi.chatModel',
			'wait.interval',
			'wait.until',
			'xAi.chatModel',
		]);
		expect(withVersion('2.2.0')).toEqual([
			'gmail.message.send',
			'googleDrive.file.upload',
			'httpRequest.download',
			'httpRequest.send',
			'openAi.image.generate',
			'slack.file.upload',
		]);
	});

	describe('match spec/manifest.schema.json of node-sdk', () => {
		const schema = JSON.parse(
			readFileSync(
				path.resolve(__dirname, '../../node_modules/@n8n/node-sdk/spec/manifest.schema.json'),
				'utf8',
			),
		) as JsonSchema;
		const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));
		const issuesOf = (dir: string, ids: readonly string[]) =>
			ids.flatMap((id) =>
				validate(readJson(path.join(dir, id, 'manifest.json')), schema, { path: id }),
			);

		it('with every frozen action, trigger and credential manifest', () => {
			const actionDirs = readdirSync(copy).filter((name) => name !== 'credentials');
			const credentialDirs = readdirSync(path.join(copy, 'credentials'));
			expect(actionDirs.sort()).toEqual(contracts.map(({ id }) => id).sort());
			expect(credentialDirs.sort()).toEqual(credentialTypes.map(({ id }) => id).sort());
			expect(issuesOf(copy, actionDirs)).toEqual([]);
			expect(issuesOf(path.join(copy, 'credentials'), credentialDirs)).toEqual([]);
		});

		it('with the manifests frozen before nodeContract', () => {
			const legacyDir = path.resolve(__dirname, '../../fixtures/versions');
			const legacy = readdirSync(legacyDir);
			expect(legacy.length).toBeGreaterThan(0);
			expect(issuesOf(legacyDir, legacy)).toEqual([]);
		});
	});

	it('record the kind and the credential major of each version', () => {
		const byId = new Map(frozen.manifests.map((manifest) => [manifest.id, manifest]));
		expect(byId.get('slack.message.send')).toMatchObject({
			kind: 'action',
			credentials: ['slackApi@1'],
		});
		expect(byId.get('openAi.chatModel')).toMatchObject({ kind: 'provider' });
		expect(triggers.map(({ id }) => byId.get(id)?.kind)).toEqual(triggers.map(() => 'trigger'));
		// A compat credential type has no credential manifest, so no pin.
		expect(byId.get('gmail.message.send')).not.toHaveProperty('credentials');
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

		const HttpRequestGet = loadNodeClass({ id: 'httpRequest.get' }, VERSIONS_DIR);
		const result = await new HttpRequestGet().getNodeType(3).execute?.call(context);

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
					nodeContract: '2.4.0',
				},
			},
		]);
	});
});

describe('credential classes', () => {
	const ownTypes = [
		...new Map(
			[...contracts, ...nativeTriggers]
				.flatMap(({ node }) => node.credential?.types ?? [])
				.filter(({ scheme }) => scheme.kind !== 'compat')
				.map((type) => [type.name, type]),
		).values(),
	];

	it('match the n8n.credentials list of package.json with every non-compat type of a shipped node', () => {
		expect(ownTypes.map(({ name }) => name)).toEqual(
			expect.arrayContaining(['notionApi', 'slackApi', 'whatsAppTriggerApi']),
		);
		expect(credentialTypes).toEqual(ownTypes);
		expect(n8nManifest().credentials).toEqual(
			ownTypes.map((type) => `dist/${credentialClassFile(type).file}`),
		);
	});

	it('load from the generated class files as the projected type with the legacy name', () => {
		const loaded = credentialTypes.map((type) => {
			const { file, source } = credentialClassFile(type);
			const [className = ''] = path.parse(file).name.split('.');
			const modules: Record<string, unknown> = {
				'@n8n/node-sdk': sdk,
				'../index': { credentialTypes },
			};
			const module: { exports: Record<string, unknown> } = { exports: {} };
			compileFunction(source, ['exports', 'require'])(module.exports, (id: string) => modules[id]);
			const Class = module.exports[className] as new () => ICredentialType;
			const instance = new Class();
			// A generated `authenticate` is a new function each time.
			const { authenticate } = instance;
			return {
				className: instance.constructor.name,
				...instance,
				authenticate: typeof authenticate,
			};
		});
		expect(loaded).toEqual(
			credentialTypes.map((type) => {
				const projected = sdk.toCredentialType(type);
				return {
					className: `${type.name.charAt(0).toUpperCase()}${type.name.slice(1)}`,
					...projected,
					authenticate: typeof projected?.authenticate,
				};
			}),
		);
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
