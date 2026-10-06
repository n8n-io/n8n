import { isRecord, validate, type Action, type JsonSchema, type Trigger } from '@n8n/node-sdk';
import type { AnyCredentialType } from '@n8n/node-sdk/credentials';
import * as host from '@n8n/node-sdk/host';
import {
	actionFileOf,
	embeddedStoreDirOf,
	type SourcePackage,
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
	contractsOfPackage,
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

import {
	bundledCredentialsOf,
	bundledIdsOf,
	FIRST_PARTY_PACKAGES,
	nodesCore,
	nodesIntegrations,
	packageOf,
	sourceOf,
	versionsOf,
	type SourceContracts,
} from './first-party';

// The checks run over every first-party package: the packages share one store format and the
// expectations name actions of both. The contracts come from the action files, as freeze finds them.
const sources = new Map<string, SourceContracts>();
const contractsOf = ({ name }: SourcePackage): Array<Action | Trigger> => {
	const found = sources.get(name);
	return found ? [...found.actions, ...found.triggers] : [];
};
const source = {
	contracts: [] as Array<Action | Trigger>,
	triggers: [] as Trigger[],
	natives: [] as Array<Action | Trigger>,
	credentialTypes: [] as AnyCredentialType[],
	// The core package replays its own actions.
	actions: [] as Action[],
};

beforeAll(async () => {
	const found = await Promise.all(FIRST_PARTY_PACKAGES.map(async (pkg) => await sourceOf(pkg)));
	FIRST_PARTY_PACKAGES.forEach((pkg, index) => {
		const contracts = found[index];
		if (contracts) sources.set(pkg.name, contracts);
	});
	const contracts = FIRST_PARTY_PACKAGES.flatMap(contractsOf);
	const natives = found.flatMap((pkg) => pkg.natives);
	Object.assign(source, {
		contracts,
		triggers: found.flatMap((pkg) => pkg.triggers),
		natives,
		credentialTypes: credentialTypesOf([...contracts, ...natives]),
		actions: sources.get(nodesIntegrations.name)?.actions ?? [],
	});
});

const sortedIdsOf = (list: ReadonlyArray<{ readonly id: string }>) =>
	list.map(({ id }) => id).sort();

/** The node type that n8n projects from the frozen versions of an action or a trigger. */
const nodeTypeOf = (id: string, dir: string) => {
	const versions = versionsOf(id, dir);
	const typeOf =
		versions[0]?.manifest.kind === 'trigger'
			? host.toVersionedTriggerType
			: host.toVersionedNodeType;
	return new (typeOf(versions, host.hostRuntime()))();
};

const fixturesOf = (actionId: string) =>
	parseFixtures(
		readFileSync(path.join(packageOf(actionId).dir, 'fixtures', `${actionId}.json`), 'utf8'),
	);

describe('action files', () => {
	it.each(FIRST_PARTY_PACKAGES)(
		'of $name hold one action each, named after its id',
		async (pkg) => {
			const kebab = (name: string) => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
			const { entries } = await contractsOfPackage(pkg);
			const files = entries.map(({ entryFile, action }) => [
				action.id,
				path.relative(path.join(pkg.dir, 'src', 'nodes'), entryFile),
			]);
			expect(files).toEqual(
				entries.map(({ action: { id, node, resource, operation } }) => [
					id,
					path.join(kebab(node.id), actionFileOf({ resource, operation })),
				]),
			);
		},
	);
});

describe('bundled versions', () => {
	const copies = new Map(
		FIRST_PARTY_PACKAGES.map((pkg) => [pkg.name, mkdtempSync(path.join(tmpdir(), 'versions-'))]),
	);
	const copyOf = ({ name }: SourcePackage) => copies.get(name) ?? '';
	const frozen: FrozenPackage = {
		manifests: [],
		credentials: [],
		natives: [],
	};

	beforeAll(async () => {
		const packages = await Promise.all(
			FIRST_PARTY_PACKAGES.map(async (pkg) => await freezePackage(pkg, copyOf(pkg))),
		);
		Object.assign(frozen, {
			manifests: packages.flatMap(({ manifests }) => manifests),
			credentials: packages.flatMap(({ credentials }) => credentials),
			natives: packages.flatMap((pkg) => pkg.natives),
		});
	});

	afterAll(() => {
		for (const copy of copies.values()) rmSync(copy, { recursive: true, force: true });
	});

	it('hold the HEAD of every action, as the source builds it', () => {
		const { manifests } = frozen;
		expect(manifests.map(({ id }) => id).sort()).toEqual(
			source.contracts.map(({ id }) => id).sort(),
		);
		expect(manifests.map(({ id }) => versionsOf(id)[0]?.manifest)).toEqual(manifests);
	});

	it.each(FIRST_PARTY_PACKAGES)('of $name are the same bytes as its embedded store', (pkg) => {
		const filesOf = (dir: string) =>
			readdirSync(dir, { recursive: true, encoding: 'utf8' })
				.filter((file) => statSync(path.join(dir, file)).isFile())
				.sort()
				.map((file) => [file, readFileSync(path.join(dir, file), 'base64')]);
		expect(filesOf(copyOf(pkg))).toEqual(filesOf(embeddedStoreDirOf(pkg)));
	});

	it.each(FIRST_PARTY_PACKAGES)('of $name carry no JSON Schema validator', (pkg) => {
		const blobs = path.join(embeddedStoreDirOf(pkg), 'blobs', 'sha256');
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
		const catalog = FIRST_PARTY_PACKAGES.flatMap((pkg) =>
			parseStoreCatalog(readFileSync(path.join(copyOf(pkg), STORE_CATALOG_FILE), 'utf8')),
		);
		const lineOf = (id: string) => catalog.find((line) => line.id === id);
		expect(source.natives.map(({ id }) => [id, lineOf(id)?.native, lineOf(id)?.bundle])).toEqual(
			source.natives.map(({ id, native }) => [id, native?.type, undefined]),
		);
	});

	it.each(FIRST_PARTY_PACKAGES)('of $name are the only node list: no n8n key', (pkg) => {
		const manifest: unknown = JSON.parse(readFileSync(path.join(pkg.dir, 'package.json'), 'utf8'));
		expect(isRecord(manifest) && 'n8n' in manifest).toBe(false);
		expect(bundledIdsOf(copyOf(pkg)).sort()).toEqual(sortedIdsOf(contractsOf(pkg)));
		expect(bundledIdsOf().sort()).toEqual(sortedIdsOf(source.contracts));
	});

	it('project the node description of each version from its contract fields only', () => {
		const describe = (id: string) => {
			const contract = source.contracts.find((each) => each.id === id);
			if (!contract) throw new Error(`${id} has no source`);
			return new ('kind' in contract
				? host.toTriggerNodeType(contract)
				: host.toNodeType(contract))().description;
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
		const loaded = source.contracts.map(({ id }) => {
			const { description } = nodeTypeOf(id, copyOf(packageOf(id)));
			return [description.name, description.defaultVersion];
		});
		expect(loaded).toEqual(
			source.contracts.map(({ id, version }) => [host.nodeNameOf(id), version]),
		);
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
				source.contracts.map((contract) => [
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
			const catalog = FIRST_PARTY_PACKAGES.flatMap((pkg) =>
				parseStoreCatalog(readFileSync(path.join(copyOf(pkg), STORE_CATALOG_FILE), 'utf8')).map(
					(line) => ({ ...line, dir: copyOf(pkg) }),
				),
			);
			const groupOf = ({ kind, native }: (typeof catalog)[number]) =>
				kind === 'credential' ? 'credential' : native === undefined ? 'bundled' : 'native';
			const idsOf = (group: ReturnType<typeof groupOf>) =>
				catalog
					.filter((line) => groupOf(line) === group)
					.map(({ id }) => id)
					.sort();
			const sortedIds = (list: ReadonlyArray<{ readonly id: string }>) =>
				list.map(({ id }) => id).sort();
			expect(idsOf('bundled')).toEqual(sortedIds(source.contracts));
			expect(idsOf('credential')).toEqual(sortedIds(source.credentialTypes));
			expect(idsOf('native')).toEqual(sortedIds(source.natives));
			const issues = catalog.flatMap(({ id, manifest, dir }) =>
				validate(readJson(path.join(dir, storeBlobFileOf(manifest))), schema, { path: id }),
			);
			expect(issues).toEqual([]);
		});

		it('with the older majors in fixtures/versions', () => {
			const olderDir = path.join(nodesCore.dir, 'fixtures', 'versions');
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
		expect(source.triggers.map(({ id }) => byId.get(id)?.kind)).toEqual(
			source.triggers.map(() => 'trigger'),
		);
		expect(byId.get('gmail.message.send')).toMatchObject({ credentials: ['gmail.oauth2@1'] });
		// A compat credential type has no credential manifest, so no pin.
		expect(byId.get('github.issue.getAll')?.credentials).toEqual(['github.token@1']);
	});

	it('keep the contract hash of each action whose form stores a widget value', () => {
		const hashes = {
			'condition.filter': 'aa8830cd901361a5bf4a0a3ec863c4ff97f9e56348edc75cc01b260fc9da5e12',
			'condition.if': '2dca760b26cb04784c6559f964ae776d032ca5764ab4f0a6df624d2d0641687a',
			'condition.switch': '5489f13a9ca3e538beb61b40e55503b5d9a0b69aa39521e54d8ca6d9ef464214',
			'dataTable.row.delete': '3610afcccb217c59900372617206f868c86e20211dd219e69f064aae7d422d15',
			'dataTable.row.exists': 'b6e933c8b15f511dc85e8006ffedd7db702578184d79a55de5c2dab0e2cebd77',
			'dataTable.row.get': 'b2a2b1f69d9df8bd65730985bdc43cda05824a31a0a87d4d5a8f69ff89af58cf',
			'dataTable.row.insert': '8d913e5a31de808245ba4c5936dc1b17a21d18feb8f86ffd8fa554d7b1474e01',
			'dataTable.row.update': '9dfab426ad0d98220cd6061a7aedeb4ba44c380f6f0e4a4d0c259967d5780177',
			'dataTable.row.upsert': '053644629a3b4c07f1d01ab9719c4cb3884c0580c2e59bfcafab54de58ab9ed7',
			'dataTable.table.clear': '7edc8a5181ef6903d2cf36cc7678a1559524d307faa7b1e7ff0461c92ad7fcf5',
			'dataTable.table.create': '32b8fdce70102b4ba3990cd8b3bcee13069669e0d3225721b90ac102d85c7838',
			'dataTable.table.delete': 'c285d405c96d8c8629a05e420d11552fe3bb9849f0d489c780acf98d77062939',
			'dataTable.table.list': '18725da682c96334562e2a33369869466a4bf47b289c7ed85a5eb4511285dd9f',
			'dataTable.table.rename': 'b3298d41d3ada2f39485aa894f91d9fad6eea2f0bc9a2979b6fc1e72b6ff257f',
			'httpRequest.download': '34269aafdd883187df73f377356082e3f451f20f11f052bf481d5a4129cface5',
			'httpRequest.get': 'ca272258c8aa21b1e026eec1cc14eaa29d238f9c3d2b7da76530a55583129e44',
			'httpRequest.send': '1ff7a015d1a429d97e97fdd5a618c32a3fec30f3d0a00415f3be78ce6fa0e2d3',
			'items.renameKeys': 'fb94642d9bb468c870e883e9a0ee13f825e03ae98f3d0150a393efd9d63c509c',
			'items.set': '86cbf3d0b0d13a69a6de6d6710e3339050cd41406045c2b8d6d4246050d56464',
			'items.sort': '5ba4066cb65478a779e2d2ac18fb023932f6a5976cfd83c8a60bbc0ef24d49c5',
		};
		const byId = new Map(frozen.manifests.map((manifest) => [manifest.id, manifest]));
		expect(
			Object.fromEntries(Object.keys(hashes).map((id) => [id, byId.get(id)?.contractHash])),
		).toEqual(hashes);
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
			source.actions.map(async ({ id }) => {
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

		const result = await nodeTypeOf('httpRequest.get', embeddedStoreDirOf(nodesCore))
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
const sandbox = {
	sidecar: path.join(SANDBOX, 'sidecar/target/release/n8n-sandbox'),
	guests: path.join(SANDBOX, 'dist'),
	credentialType: (name: string) =>
		source.contracts
			.flatMap(({ node }) => node.credential?.types ?? [])
			.find((type) => type.name === name),
};
// `pnpm --filter @n8n/node-sdk sandbox:build` builds them.
const sandboxBuilt = [
	sandbox.sidecar,
	...['action', 'provider'].map((kind) => path.join(sandbox.guests, `${kind}.wasm`)),
].every(existsSync);

describe.skipIf(!sandboxBuilt)('bundled versions in the sandbox', () => {
	const cacheDir = mkdtempSync(path.join(tmpdir(), 'nodes-integrations-sandbox-'));
	afterAll(() => rmSync(cacheDir, { recursive: true, force: true }));

	it('replay the fixtures of the HEAD of each action that the sandbox runs', async () => {
		const refused: Record<string, string> = {};
		const issues: string[] = [];
		// One at a time: the first load compiles the guest for all.
		for (const { id } of source.actions) {
			const [head] = versionsOf(id);
			if (!head) throw new Error(`${id} has no bundled HEAD`);
			const loaded = await sandboxedVersionOf(
				head,
				{ ...sandbox, cacheDir },
				host.hostRuntime(),
			).catch((error: Error) => {
				refused[id] = error.message;
				return undefined;
			});
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
	it('exist for every non-compat type of a shipped node', () => {
		const ownTypes = [
			...new Map(
				[...source.contracts, ...source.natives]
					.flatMap(({ node }) => node.credential?.types ?? [])
					.filter(({ scheme }) => scheme.kind !== 'compat')
					.map((type) => [type.name, type]),
			).values(),
		];
		expect(ownTypes.map(({ name }) => name)).toEqual(
			expect.arrayContaining(['notionApi', 'slackApi', 'whatsAppTriggerApi']),
		);
		expect(source.credentialTypes).toEqual(ownTypes);
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
				source.credentialTypes.flatMap((type) => {
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
			source.actions.map(async ({ id }) => {
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
