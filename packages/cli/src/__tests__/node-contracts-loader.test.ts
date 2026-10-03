import type { GlobalConfig } from '@n8n/config';
import { NODE_PACKAGE as NEXT, versionsOf, type FrozenVersion } from '@n8n/nodes-base-next';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import {
	deepCopy,
	type ICredentialType,
	type INodeTypeDescription,
	type KnownNodesAndCredentials,
} from 'n8n-workflow';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { LoadNodesAndCredentials } from '../load-nodes-and-credentials';
import { ContractNodeLoader } from '../node-contracts-registry';

const PACKAGES = path.resolve(__dirname, '../../..');
const VERSIONS = path.join(PACKAGES, '@n8n/nodes-base-next/dist/versions');
const noStore = async () => new Map<string, readonly FrozenVersion[]>();

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
		const ids = readdirSync(VERSIONS).filter((name) => name !== 'credentials');

		expect(Object.keys(loader.known.nodes)).toHaveLength(ids.length);
		expect(Object.keys(loader.known.credentials)).toHaveLength(
			readdirSync(path.join(VERSIONS, 'credentials')).length,
		);
		for (const id of ids) {
			const [head] = versionsOf(id);
			if (!head) throw new Error(`${id} has no bundled HEAD`);
			const { description } = head.manifest;
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
			manifest: {
				...manifest,
				contract: { ...manifest.contract, version: major },
				description: { ...manifest.description, version: major },
			},
		};
		const sameMajor: FrozenVersion = { ...head, manifest: { ...manifest, semver: '9.9.9' } };
		const loader = new ContractNodeLoader([], [], async () => new Map([[id, [stored, sameMajor]]]));
		await loader.loadAll();

		const { name } = manifest.description;
		const [bundled, other] = loader.frozenVersionsOf(name);
		expect(bundled?.manifest.semver).toBe(manifest.semver);
		// The run trusts a stored version by its identity.
		expect(other).toBe(stored);
		expect(loader.getNode(name).type.getNodeType(major).poll).toBeDefined();
		const served = loader.types.nodes.filter((description) => description.name === name);
		expect(served.map(({ version }) => version)).toEqual([major, manifest.contract.version]);
		expect(served.every(({ properties }) => properties[0]?.name === 'pollTimes')).toBe(true);
		expect(stored.manifest.description.properties.map(({ name }) => name)).not.toContain(
			'pollTimes',
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
});
