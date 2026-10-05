import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig, NodePermissionClass } from '@n8n/config';
import {
	bundledCredentialsOf,
	bundledIdsOf,
	embeddedStoreDirOf,
	FIRST_PARTY_PACKAGES,
	nodeDescriptionOf,
	versionsOf,
	type ContractPermissionClass,
	type CredentialManifest,
	type FrozenVersion,
} from '@n8n/nodes-base-next';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import {
	deepCopy,
	type ICredentialType,
	type IExecuteFunctions,
	type INodeTypeDescription,
	type IVersionedNodeType,
	type KnownNodesAndCredentials,
} from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expectTypeOf } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { LoadNodesAndCredentials } from '../load-nodes-and-credentials';
import { ContractNodeLoader, NodeContractsStore } from '../node-contracts-registry';

const PACKAGES = path.resolve(__dirname, '../../..');
const [nodesBaseNext, nodesCore] = FIRST_PARTY_PACKAGES;
const NEXT = nodesBaseNext.name;
const storeOf =
	(
		versions: ReadonlyMap<string, readonly FrozenVersion[]> = new Map(),
		credentials: ReadonlyMap<string, CredentialManifest> = new Map(),
	) =>
	async () => ({ versions: async () => versions, credentials: async () => credentials });
const noStore = storeOf();

interface Served {
	readonly nodes: INodeTypeDescription[];
	readonly credentials: ICredentialType[];
	readonly knownNodes: KnownNodesAndCredentials['nodes'];
	readonly knownCredentials: KnownNodesAndCredentials['credentials'];
}

/** What n8n serves of the node contracts, in a form that keeps the order of the loaders out. */
function contractTypesOf({ nodes, credentials, knownNodes, knownCredentials }: Served) {
	const own = (name: string) => name.startsWith(`${NEXT}.`);
	const sorted = (names: readonly string[] | undefined) => [...(names ?? [])].sort();
	return {
		nodes: nodes
			.filter(({ name }) => own(name))
			.map((description) => ({
				name: description.name,
				version: description.version,
				defaultVersion: description.defaultVersion,
				hidden: description.hidden,
				usableAsTool: description.usableAsTool,
				credentials: description.credentials?.map(({ name }) => name),
				properties: description.properties.map(({ name }) => name),
			}))
			.sort((a, b) =>
				`${a.name}@${String(a.version)}`.localeCompare(`${b.name}@${String(b.version)}`),
			),
		credentials: credentials
			.map((type) => ({
				name: type.name,
				extends: type.extends,
				authenticate: type.authenticate,
				supportedNodes: sorted(type.supportedNodes),
				properties: type.properties.map(({ name }) => name),
				test: type.test,
				icon: type.icon,
				iconUrl: type.iconUrl,
				documentationUrl: type.documentationUrl,
			}))
			.sort((a, b) => a.name.localeCompare(b.name)),
		knownNodes: Object.keys(knownNodes).filter(own).sort(),
		knownCredentials: Object.fromEntries(
			Object.entries(knownCredentials)
				.map(([name, { extends: parents, supportedNodes }]) => [
					name,
					{ extends: parents, supportedNodes: sorted(supportedNodes) },
				])
				.sort(([a], [b]) => String(a).localeCompare(String(b))),
		),
	};
}

/** n8n with n8n-nodes-base and the node contracts, after the post-processing of the loaders. */
async function served(next: ContractNodeLoader) {
	const instance = new LoadNodesAndCredentials(
		mock(),
		mock(),
		mock(),
		mock<GlobalConfig>({
			instanceAi: { nodeContractsEnabled: true },
			nodes: { exclude: [], include: [] },
		}),
		mock(),
		mock(),
	);
	const nodesBase = new LazyPackageDirectoryLoader(path.join(PACKAGES, 'nodes-base'));
	await Promise.all([nodesBase.loadAll(), next.loadAll()]);
	instance.loaders = { 'n8n-nodes-base': nodesBase, [NEXT]: next };
	await instance.postProcessLoaders();
	const own = (name: string) => name in next.known.credentials;
	const value: Served = {
		nodes: instance.types.nodes,
		credentials: instance.types.credentials.filter(({ name }) => own(name)),
		knownNodes: instance.knownNodes,
		knownCredentials: Object.fromEntries(
			Object.entries(instance.knownCredentials).filter(([name]) => own(name)),
		),
	};
	// As the editor reads it, e.g. `authenticate: {}` for a generated function.
	return deepCopy(value);
}

describe('ContractNodeLoader', () => {
	it('serves the node and credential types that the generated class files served', async () => {
		const value = await served(new ContractNodeLoader([], [], noStore));
		const recorded: unknown = JSON.parse(
			readFileSync(path.join(__dirname, 'fixtures/node-contracts-loader.types.json'), 'utf8'),
		);
		expect(contractTypesOf(value)).toEqual(recorded);
	}, 30_000);

	it('projects one node type for each bundled manifest, with Poll Times for a polling trigger', async () => {
		const loader = new ContractNodeLoader([], [], noStore);
		await loader.loadAll();
		const ids = bundledIdsOf(embeddedStoreDirOf(nodesBaseNext));

		expect(Object.keys(loader.known.nodes)).toHaveLength(ids.length);
		expect(Object.keys(loader.known.credentials)).toHaveLength(bundledCredentialsOf().length);
		for (const id of ids) {
			const [head] = versionsOf(id);
			if (!head) throw new Error(`${id} has no bundled HEAD`);
			const description = nodeDescriptionOf(head.manifest);
			const { type } = loader.getNode(description.name);
			expect(type.description.defaultVersion).toBe(head.manifest.contract.version);
			const served = loader.types.nodes.find(({ name }) => name === description.name);
			const pollTimes = description.polling ? ['pollTimes'] : [];
			expect(served?.properties.map(({ name }) => name)).toEqual([
				...pollTimes,
				...description.properties.map(({ name }) => name),
			]);
		}
	});

	it('adds a stored major next to the bundled HEAD, and leaves the stored manifest as it is', async () => {
		const id = 'notion.dataSource.pageAdded';
		const [head] = versionsOf(id);
		if (!head) throw new Error(`${id} has no bundled HEAD`);
		const { manifest } = head;
		const major = manifest.contract.version + 1;
		const stored: FrozenVersion = {
			...head,
			manifest: { ...manifest, contract: { ...manifest.contract, version: major } },
		};
		const storedManifest = deepCopy(stored.manifest);
		const sameMajor: FrozenVersion = { ...head, manifest: { ...manifest, semver: '9.9.9' } };
		const loader = new ContractNodeLoader([], [], storeOf(new Map([[id, [stored, sameMajor]]])));
		await loader.loadAll();

		const { name } = nodeDescriptionOf(manifest);
		const [bundled, other] = loader.frozenVersionsOf(name);
		expect(bundled?.manifest.semver).toBe(manifest.semver);
		expect(other).toBe(stored);
		expect(loader.getNode(name).type.getNodeType(major).poll).toBeDefined();
		const served = loader.types.nodes.filter((description) => description.name === name);
		expect(served.map(({ version }) => version)).toEqual([major, manifest.contract.version]);
		expect(served.every(({ properties }) => properties[0]?.name === 'pollTimes')).toBe(true);
		expect(stored.manifest).toEqual(storedManifest);
	});

	it('registers a stored credential type of a name that no other package has', async () => {
		const logger = mockInstance(Logger);
		mockInstance(NodeContractsStore, { dir: '/store' });
		const notion = bundledCredentialsOf().find(({ manifest }) => manifest.name === 'notionApi');
		if (!notion) throw new Error('notionApi is not bundled');
		const ping = { ...notion.manifest, id: 'ping.token', name: 'pingApi' };
		const custom = { ...ping, id: 'other.token', name: 'otherApi' };
		const stored = new Map<string, CredentialManifest>([
			['pingApi', ping],
			['notionApi', { ...notion.manifest, displayName: 'Stored Notion' }],
			['otherApi', { ...custom, scheme: { kind: 'custom', reason: 'signs a body' } }],
			['legacyApi', { ...ping, id: 'legacy.token', name: 'legacyApi' }],
		]);
		const loader = new ContractNodeLoader(
			[],
			[],
			storeOf(new Map(), stored),
			[],
			(name) => name === 'legacyApi',
		);
		await loader.loadAll();

		expect(loader.known.credentials.pingApi).toMatchObject({
			className: 'ping.token',
			sourcePath: '/store',
		});
		expect(loader.getCredential('notionApi').type.displayName).toBe(notion.manifest.displayName);
		expect(loader.known.credentials).not.toHaveProperty('otherApi');
		expect(loader.known.credentials).not.toHaveProperty('legacyApi');
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('other.token@1.0.0 does not load: a custom scheme'),
		);
	});

	it('loads only the node types that the node settings allow', async () => {
		const excluded = new ContractNodeLoader([`${NEXT}.httpRequestGet`], [], noStore);
		const included = new ContractNodeLoader([], [`${NEXT}.httpRequestGet`], noStore);
		const otherPackage = new ContractNodeLoader([], ['n8n-nodes-base.httpRequest'], noStore);
		await Promise.all([excluded.loadAll(), included.loadAll(), otherPackage.loadAll()]);

		expect(excluded.known.nodes).not.toHaveProperty('httpRequestGet');
		expect(excluded.known.nodes).toHaveProperty('httpRequestSend');
		expect(Object.keys(included.known.nodes)).toEqual(['httpRequestGet']);
		expect(otherPackage.known.nodes).toEqual({});
	});

	it('does not load a version with a denied permission class, and warns and reports once for each', async () => {
		const logger = mockInstance(Logger);
		const events = mockInstance(EventService);
		const all = new ContractNodeLoader([], [], noStore);
		const egressInput = new ContractNodeLoader([], [], noStore, ['egress-input']);
		const code = new ContractNodeLoader([], [], noStore, ['code']);
		const others = new ContractNodeLoader([], [], noStore, ['files', 'full-community']);
		await Promise.all([all.loadAll(), egressInput.loadAll(), code.loadAll(), others.loadAll()]);
		const refused = ({ known }: ContractNodeLoader) =>
			Object.keys(all.known.nodes).filter((name) => !(name in known.nodes));

		expect(refused(egressInput)).toEqual([
			'httpRequestDownload',
			'httpRequestGet',
			'httpRequestSend',
		]);
		expect(refused(code)).toEqual(['codeJavaScript', 'codePython']);
		expect(refused(others)).toEqual([]);
		expect(logger.warn).toHaveBeenCalledTimes(5);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringMatching(
				/^code\.python@\S+ does not load: N8N_NODE_PERMISSIONS_DENY denies its permission class "code"$/,
			),
		);
		expect(events.emit).toHaveBeenCalledTimes(5);
		expect(events.emit).toHaveBeenCalledWith('node-permission-refused', {
			action: 'httpRequest.get',
			version: versionsOf('httpRequest.get')[0]?.manifest.semver,
			permission: 'egress-input',
			message: expect.stringContaining('does not load'),
		});
	});

	it('loads the node types of each first-party package with its name as prefix, and runs them in-process', async () => {
		const id = 'noOp.pass';
		const [head] = versionsOf(id);
		if (!head) throw new Error(`${id} has no bundled HEAD`);
		const { manifest } = head;
		const stored: FrozenVersion = {
			...head,
			manifest: { ...manifest, contract: { ...manifest.contract, version: 2 } },
		};
		const store = storeOf(new Map([[id, [stored]]]));
		const next = new ContractNodeLoader([], [], store);
		const core = new ContractNodeLoader([], [], store, [], undefined, undefined, nodesCore);
		const instance = new LoadNodesAndCredentials(
			mock(),
			mock(),
			mock(),
			mock<GlobalConfig>({
				instanceAi: { nodeContractsEnabled: true },
				nodes: { exclude: [], include: [] },
			}),
			mock(),
			mock(),
		);
		await Promise.all([next.loadAll(), core.loadAll()]);
		instance.loaders = { [NEXT]: next, [nodesCore.name]: core };
		await instance.postProcessLoaders();

		expect(core.packageName).toBe('@n8n/nodes-core');
		expect(Object.keys(core.known.nodes)).toEqual(['noOpPass']);
		expect(core.known.credentials).toEqual({});
		expect(next.known.nodes).not.toHaveProperty('noOpPass');
		expect(
			core
				.frozenVersionsOf('noOpPass')
				.map((version) => [version.manifest.contract.version, version.origin]),
		).toEqual([
			[1, 'first-party'],
			[2, head.origin],
		]);
		expect(instance.knownNodes['@n8n/nodes-core.noOpPass']).toEqual({
			className: 'noOp.pass',
			sourcePath: path.join(embeddedStoreDirOf(nodesCore), 'index/noOp.pass.ndjson'),
		});
		expect(
			instance.types.nodes
				.filter(({ name }) => name === '@n8n/nodes-core.noOpPass')
				.map(({ version, hidden }) => [version, hidden]),
		).toEqual([
			[2, true],
			[1, true],
		]);
		const context = {
			getInputData: () => [{ json: { a: 1 } }],
			getNode: () => ({ name: 'No Operation', credentials: {} }),
			getNodeParameter: () => undefined,
			continueOnFail: () => false,
			setMetadata: () => {},
		} as unknown as IExecuteFunctions;
		const noOp = instance.getNode('@n8n/nodes-core.noOpPass').type as IVersionedNodeType;
		const result = await noOp.getNodeType(1).execute?.call(context);
		expect(result).toEqual([[{ json: { a: 1 }, pairedItem: { item: 0 } }]]);
	});

	it('maps each config permission class that a contract version can have', () => {
		expectTypeOf<ContractPermissionClass>().toEqualTypeOf<
			Exclude<NodePermissionClass, 'files' | 'full-community'>
		>();
	});

	it('does not load a stored version with a denied permission class', async () => {
		mockInstance(Logger);
		const id = 'notion.dataSource.pageAdded';
		const [head] = versionsOf(id);
		if (!head) throw new Error(`${id} has no bundled HEAD`);
		const { manifest } = head;
		const major = manifest.contract.version + 1;
		const stored: FrozenVersion = {
			...head,
			manifest: {
				...manifest,
				contract: { ...manifest.contract, version: major, egress: { fromInput: 'url' } },
			},
		};
		const loader = new ContractNodeLoader([], [], storeOf(new Map([[id, [stored]]])), [
			'egress-input',
		]);
		await loader.loadAll();

		const majors = (versions: readonly FrozenVersion[]) =>
			versions.map((version) => version.manifest.contract.version);
		expect(majors(loader.frozenVersionsOf(nodeDescriptionOf(manifest).name))).toEqual(
			majors(versionsOf(id)),
		);
	});
});
