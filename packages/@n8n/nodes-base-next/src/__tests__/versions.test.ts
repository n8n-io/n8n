import { isRecord, validate, type JsonSchema } from '@n8n/node-sdk';
import * as host from '@n8n/node-sdk/host';
import {
	actionFileOf,
	embeddedStoreDirOf,
	isVersionManifest,
	parseFixtures,
	parseStoreCatalog,
	requiredNodeContractOf,
	STORE_CATALOG_FILE,
	storeBlobFileOf,
	storeFilesOfUrl,
	storeReader,
	toContract,
	unresolvedCredentialPinsOf,
	verifyStoreSignature,
} from '@n8n/node-sdk/registry';
import {
	actionEntries,
	credentialTypesOf,
	freezePackage,
	type FrozenPackage,
} from '@n8n/node-sdk/freeze';
import { replayFixtures } from '@n8n/node-sdk/publish';
import { sandboxedVersionOf } from '@n8n/node-sdk/sandbox';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ICredentialType, IExecuteFunctions } from 'n8n-workflow';

import { nodesBaseNext } from '../nodes';
import { bundledCredentialsOf, bundledIdsOf, versionsOf } from '../registry';

const { actions, triggers, natives } = nodesBaseNext;
const contracts = [...actions, ...triggers];
const credentialTypes = credentialTypesOf(nodesBaseNext);
const EMBEDDED_STORE_DIR = embeddedStoreDirOf(nodesBaseNext);
const NODES_DIR = path.join(nodesBaseNext.dir, 'src', 'nodes');
const FIXTURES_DIR = path.join(nodesBaseNext.dir, 'fixtures');

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
		const files = (await actionEntries(nodesBaseNext)).map(({ entryFile, action }) => [
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
	const frozen: FrozenPackage = {
		manifests: [],
		credentials: [],
		natives: [],
	};

	beforeAll(async () => {
		Object.assign(frozen, await freezePackage(nodesBaseNext, copy));
	});

	afterAll(() => rmSync(copy, { recursive: true, force: true }));

	it('hold the HEAD of every action, as the source builds it', () => {
		const { manifests } = frozen;
		expect(manifests.map(({ id }) => id).sort()).toEqual(contracts.map(({ id }) => id).sort());
		expect(manifests.map(({ id }) => versionsOf(id)[0]?.manifest)).toEqual(manifests);
	});

	it('are the same bytes as the embedded store of the build', () => {
		const filesOf = (dir: string) =>
			readdirSync(dir, { recursive: true, encoding: 'utf8' })
				.filter((file) => statSync(path.join(dir, file)).isFile())
				.sort()
				.map((file) => [file, readFileSync(path.join(dir, file), 'base64')]);
		expect(filesOf(copy)).toEqual(filesOf(EMBEDDED_STORE_DIR));
	});

	it('carry no JSON Schema validator: the host gives it', () => {
		const blobs = path.join(EMBEDDED_STORE_DIR, 'blobs', 'sha256');
		const carrying = readdirSync(blobs).filter((file) => {
			const text = readFileSync(path.join(blobs, file), 'utf8');
			// The first is a message of ajv, the second an issue text of the SDK validator.
			return (
				text.includes('must NOT have additional properties') ||
				text.includes('does not match any allowed shape')
			);
		});
		expect(carrying).toEqual([]);
	});

	it('hold a manifest without a bundle for each native contract', () => {
		const catalog = parseStoreCatalog(readFileSync(path.join(copy, STORE_CATALOG_FILE), 'utf8'));
		const lineOf = (id: string) => catalog.find((line) => line.id === id);
		expect(natives.map(({ id }) => [id, lineOf(id)?.native, lineOf(id)?.bundle])).toEqual(
			natives.map(({ id, native }) => [id, native?.type, undefined]),
		);
	});

	it('are the only node list: package.json has no n8n key', () => {
		const manifest: unknown = JSON.parse(
			readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
		);
		expect(isRecord(manifest) && 'n8n' in manifest).toBe(false);
		expect(bundledIdsOf(copy).sort()).toEqual(contracts.map(({ id }) => id).sort());
		expect(bundledIdsOf().sort()).toEqual([...contracts.map(({ id }) => id), 'noOp.pass'].sort());
	});

	it('project the node description of each version from its contract fields only', () => {
		const describe = (id: string) => {
			const source = contracts.find((contract) => contract.id === id);
			if (!source) throw new Error(`${id} has no source`);
			return new ('kind' in source ? host.toTriggerNodeType(source) : host.toNodeType(source))()
				.description;
		};
		const { manifests } = frozen;
		expect(manifests.filter((manifest) => 'description' in manifest)).toEqual([]);
		expect(manifests.map((manifest) => host.nodeDescriptionOf(manifest))).toEqual(
			manifests.map(({ id }) => describe(id)),
		);
		const outsideContract = manifests.flatMap((manifest) => {
			const { id, contract } = manifest;
			const { properties, credentials } = host.nodeDescriptionOf(manifest);
			return [
				...properties
					.filter(
						({ name }) =>
							name !== host.AUTHENTICATION && !(name in (contract.input.properties ?? {})),
					)
					.map(({ name }) => `${id}: field ${name}`),
				...(credentials ?? [])
					.filter(({ name }) => !contract.credentials.includes(name))
					.map(({ name }) => `${id}: credential ${name}`),
			];
		});
		expect(outsideContract).toEqual([]);
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
		// A bundle that validates takes the validator from the host, which has it since 2.9.0.
		const validating = new Set([
			'ai.agent',
			'ai.classify',
			'ai.prompt',
			'code.javaScript',
			'code.python',
			'gmail.message.get',
			'gmail.message.getAll',
			'gmail.message.send',
			'googleSheets.sheet.read',
			'httpRequest.get',
			'notion.databasePage.getAll',
			'openAi.text.message',
			'slack.channel.getAll',
			'slack.channel.history',
			'whatsApp.message.send',
			'whatsApp.message.sendTemplate',
		]);
		expect(versions).toEqual(
			Object.fromEntries(
				contracts.map((contract) => [
					contract.id,
					validating.has(contract.id)
						? '2.9.0'
						: requiredNodeContractOf(
								toContract(contract),
								'list' in contract && contract.list !== undefined,
							),
				]),
			),
		);
		// Only the file readers need 2.8.0, only counted inputs and binary key patterns need 2.6.0,
		// only the paged lists need 2.4.0, only the actions with host imports, named inputs or
		// providers need 2.3.0, and only the actions with binary data need 2.2.0.
		const withVersion = (version: string) =>
			Object.keys(versions)
				.filter((id) => versions[id] === version)
				.sort();
		expect(withVersion('2.9.0')).toEqual([...validating].sort());
		expect(withVersion('2.8.0')).toEqual([
			'extractFromFile.csv',
			'extractFromFile.json',
			'extractFromFile.pdf',
			'extractFromFile.text',
			'extractFromFile.xlsx',
		]);
		expect(withVersion('2.6.0')).toEqual(['merge.append', 'merge.combineByPosition']);
		expect(withVersion('2.5.0')).toEqual([]);
		expect(withVersion('2.4.0')).toEqual([
			'github.issue.getAll',
			'googleDrive.file.search',
			'supabase.row.getAll',
		]);
		expect(withVersion('2.3.0')).toEqual([
			'anthropic.chatModel',
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
			'merge.combine',
			'minimax.chatModel',
			'openAi.chatModel',
			'wait.interval',
			'wait.until',
			'xAi.chatModel',
		]);
		expect(withVersion('2.2.0')).toEqual([
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

		it('with every frozen action, trigger, credential and native manifest', () => {
			const catalog = parseStoreCatalog(readFileSync(path.join(copy, STORE_CATALOG_FILE), 'utf8'));
			const groupOf = ({ kind, native }: (typeof catalog)[number]) =>
				kind === 'credential' ? 'credential' : native === undefined ? 'bundled' : 'native';
			const idsOf = (group: ReturnType<typeof groupOf>) =>
				catalog
					.filter((line) => groupOf(line) === group)
					.map(({ id }) => id)
					.sort();
			const sortedIds = (list: ReadonlyArray<{ readonly id: string }>) =>
				list.map(({ id }) => id).sort();
			expect(idsOf('bundled')).toEqual(sortedIds(contracts));
			expect(idsOf('credential')).toEqual(sortedIds(credentialTypes));
			expect(idsOf('native')).toEqual(sortedIds(natives));
			const issues = catalog.flatMap(({ id, manifest }) =>
				validate(readJson(path.join(copy, storeBlobFileOf(manifest))), schema, { path: id }),
			);
			expect(issues).toEqual([]);
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
			credentials: ['slack.token@1'],
		});
		expect(byId.get('openAi.chatModel')).toMatchObject({ kind: 'provider' });
		expect(triggers.map(({ id }) => byId.get(id)?.kind)).toEqual(triggers.map(() => 'trigger'));
		expect(byId.get('gmail.message.send')).toMatchObject({ credentials: ['gmail.oauth2@1'] });
		// A compat credential type has no credential manifest, so no pin.
		expect(byId.get('github.issue.getAll')?.credentials).toEqual(['github.token@1']);
	});

	it('pin only credential manifests that the embedded store holds', () => {
		const pinning = [...frozen.manifests, ...frozen.natives];
		expect(pinning.filter(({ credentials }) => credentials?.length).length).toBeGreaterThan(40);
		expect(
			pinning.flatMap((manifest) =>
				unresolvedCredentialPinsOf(manifest, frozen.credentials).map(
					(pin) => `${manifest.id} ${pin}`,
				),
			),
		).toEqual([]);
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

		const result = await nodeTypeOf('httpRequest.get', EMBEDDED_STORE_DIR)
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
					nodeContract: '2.9.0',
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
			const bundle = await head.readBundle();
			const replayed = await replayFixtures({ manifest: head.manifest, bundle }, fixturesOf(id), {
				contract: loaded.action,
				executor: loaded.executor,
				migrate: loaded.migrate,
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
			[...contracts, ...natives]
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
// This package publishes first-party versions.
const FIRST_PARTY_KEY_FILE = process.env.N8N_NODE_CONTRACTS_FIRST_PARTY_KEY_FILE;

// Old versions live only in the registry, so this check runs where one is configured.
describe.skipIf(!REGISTRY_URL)('published versions', () => {
	it('replay their own fixtures through the current executor', async () => {
		const registry = storeReader(
			storeFilesOfUrl(REGISTRY_URL ?? '', async (url) => await fetch(url)),
		);
		const publicKey = FIRST_PARTY_KEY_FILE ? readFileSync(FIRST_PARTY_KEY_FILE, 'utf8') : undefined;
		const issues = await Promise.all(
			actions.map(async ({ id }) => {
				const replayed = await Promise.all(
					(await registry.records(id)).map(async (record) => {
						const at = `${id}@${record.version}`;
						const read = await registry.readManifest(record);
						const [bundle, fixtures] = await Promise.all(
							[record.bundle, record.fixtures].map(async (digest) =>
								digest ? (await registry.blob(digest))?.toString('utf8') : undefined,
							),
						);
						if (!read || !isVersionManifest(read.manifest) || !bundle || !fixtures) {
							return [`${at} has no manifest, bundle or fixtures`];
						}
						const signed = !publicKey || verifyStoreSignature(record, read.text, publicKey);
						return [
							...(signed ? [] : [`${at} has no valid signature`]),
							...(await replayFixtures(
								{ manifest: read.manifest, bundle },
								parseFixtures(fixtures),
							)),
						];
					}),
				);
				return replayed.flat();
			}),
		);
		expect(issues.flat()).toEqual([]);
	}, 120_000);
});
