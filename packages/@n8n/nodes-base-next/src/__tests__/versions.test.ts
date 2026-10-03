import { isRecord, validate, type JsonSchema } from '@n8n/node-sdk';
import * as host from '@n8n/node-sdk/host';
import {
	actionFileOf,
	openContractPackage,
	packageNameOf,
	parseFixtures,
	requiredNodeContractOf,
	toContract,
	verifyManifestSignature,
	type VersionManifest,
} from '@n8n/node-sdk/registry';
import { npmRegistry, replayFixtures } from '@n8n/node-sdk/publish';
import { sandboxedVersionOf } from '@n8n/node-sdk/sandbox';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ICredentialType, IExecuteFunctions } from 'n8n-workflow';

import { actionEntries, freezeAll, freezeCredentials, NODES_DIR } from '../../scripts/freeze';
import { FIXTURES_DIR } from '../../scripts/publish';
import { actions, credentialTypes, nativeTriggers, triggers } from '../index';
import { bundledCredentialsOf, bundledIdsOf, versionsOf, VERSIONS_DIR } from '../registry';

const contracts = [...actions, ...triggers];

/** The node type that n8n projects from the frozen versions of an action or a trigger. */
const nodeTypeOf = (id: string, dir: string) => {
	const versions = versionsOf(id, dir);
	const typeOf =
		versions[0]?.manifest.kind === 'trigger'
			? host.toVersionedTriggerType
			: host.toVersionedNodeType;
	return new (typeOf(versions))();
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

	it('are the only node list: package.json has no n8n key', () => {
		const manifest: unknown = JSON.parse(
			readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
		);
		expect(isRecord(manifest) && 'n8n' in manifest).toBe(false);
		expect(bundledIdsOf(copy).sort()).toEqual(contracts.map(({ id }) => id).sort());
	});

	it('project one node type each, named after its id', () => {
		const loaded = contracts.map(({ id }) => {
			const { description } = nodeTypeOf(id, copy);
			return [description.name, description.defaultVersion];
		});
		expect(loaded).toEqual(contracts.map(({ id, version }) => [host.nodeNameOf(id), version]));
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

		it('with the older majors in fixtures/versions', () => {
			const olderDir = path.resolve(__dirname, '../../fixtures/versions');
			const older = readdirSync(olderDir);
			expect(older.length).toBeGreaterThan(0);
			expect(issuesOf(olderDir, older)).toEqual([]);
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
		expect(byId.get('gmail.message.send')).toMatchObject({ credentials: ['gmailOAuth2@1'] });
		// A compat credential type has no credential manifest, so no pin.
		expect(byId.get('github.issue.getAll')?.credentials).not.toContain('githubOAuth2Api@1');
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

	it('run from the bundle in the node type', async () => {
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

		const result = await nodeTypeOf('httpRequest.get', VERSIONS_DIR)
			.getNodeType(3)
			.execute?.call(context);

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

const SANDBOX = path.resolve(__dirname, '../../node_modules/@n8n/node-sdk/sandbox');
// The credential types of the shipped nodes stand in for the registry of n8n.
const shippedCredentialTypes = new Map(
	contracts.flatMap(({ node }) => node.credential?.types ?? []).map((type) => [type.name, type]),
);
const sandbox = {
	sidecar: path.join(SANDBOX, 'sidecar/target/release/n8n-sandbox'),
	guests: path.join(SANDBOX, 'dist'),
	credentialType: (name: string) => shippedCredentialTypes.get(name),
};
// `pnpm --filter @n8n/node-sdk sandbox:build` builds them.
const sandboxBuilt = [
	sandbox.sidecar,
	...['action', 'provider'].map((kind) => path.join(sandbox.guests, `${kind}.wasm`)),
].every(existsSync);

describe.skipIf(!sandboxBuilt)('bundled versions in the sandbox', () => {
	const cacheDir = mkdtempSync(path.join(tmpdir(), 'nodes-base-next-sandbox-'));
	afterAll(() => rmSync(cacheDir, { recursive: true, force: true }));

	it('replay the fixtures of the HEAD of each action that the sandbox runs', async () => {
		const refused: Record<string, string> = {};
		const issues: string[] = [];
		// One at a time: the first load compiles the guest for all.
		for (const { id } of actions) {
			const [head] = versionsOf(id);
			if (!head) throw new Error(`${id} has no bundled HEAD`);
			const loaded = await sandboxedVersionOf(head, { ...sandbox, cacheDir }).catch(
				(error: Error) => {
					refused[id] = error.message;
					return undefined;
				},
			);
			if (!loaded) continue;
			// `migrate` has no export in the action world, so only executions replay.
			const fixtures = { ...fixturesOf(id), migrations: [] };
			const bundle = await head.readBundle();
			const replayed = await replayFixtures({ manifest: head.manifest, bundle }, fixtures, {
				contract: loaded.action,
				executor: loaded.executor,
			});
			issues.push(...replayed);
		}
		expect(issues).toEqual([]);
		expect(refused).toEqual({});
	}, 120_000);
});

describe('credential manifests', () => {
	const ownTypes = [
		...new Map(
			[...contracts, ...nativeTriggers]
				.flatMap(({ node }) => node.credential?.types ?? [])
				.filter(({ scheme }) => scheme.kind !== 'compat')
				.map((type) => [type.name, type]),
		).values(),
	];

	it('exist for every non-compat type of a shipped node', () => {
		expect(ownTypes.map(({ name }) => name)).toEqual(
			expect.arrayContaining(['notionApi', 'slackApi', 'whatsAppTriggerApi']),
		);
		expect(credentialTypes).toEqual(ownTypes);
		expect(
			bundledCredentialsOf()
				.map(({ manifest }) => manifest.id)
				.sort(),
		).toEqual(ownTypes.map(({ id }) => id).sort());
	});

	it('project the same n8n type as the source type', () => {
		// A generated function is a new value each time.
		const comparable = ({ authenticate, preAuthentication, ...rest }: ICredentialType) => ({
			...rest,
			authenticate: typeof authenticate === 'function' ? 'function' : authenticate,
			preAuthentication: typeof preAuthentication,
		});
		const projected = new Map(
			bundledCredentialsOf().map(({ manifest }) => [
				manifest.id,
				comparable(host.credentialTypeOfManifest(manifest)),
			]),
		);
		expect(Object.fromEntries(projected)).toEqual(
			Object.fromEntries(
				credentialTypes.flatMap((type) => {
					const source = host.toCredentialType(type);
					return source ? [[type.id, comparable(source)]] : [];
				}),
			),
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
