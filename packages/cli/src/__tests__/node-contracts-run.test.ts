import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { hostRuntime } from '@n8n/node-sdk/host';
import {
	contractStore,
	embeddedContractsOf,
	manifestTextOf,
	type InstanceStore,
	type StoredManifest,
} from '@n8n/node-sdk/registry';
import { FIRST_PARTY_PACKAGES, versionsOf } from '@test/first-party-contracts';
import type { INode } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { nodeTypeOf } from '@/node-contracts-catalog';
import { ContractNodeLoader, NodeContractsStore } from '@/node-contracts-registry';
import { nodeGroupsForRun, pinNodeContracts, prepareNodeContractsRun } from '@/node-contracts-run';
import { NodeContractsSync } from '@/node-contracts-sync';

describe('nodeGroupsForRun', () => {
	const draftGroups = [{ id: 'g-draft', name: 'Draft', nodeIds: ['a'] }];
	const versionGroups = [{ id: 'g-version', name: 'Version', nodeIds: ['b'] }];
	const { instanceAi } = Container.get(GlobalConfig);

	afterEach(() => {
		instanceAi.nodeContractsEnabled = true;
	});

	it('returns the groups of the version with node contracts enabled', () => {
		instanceAi.nodeContractsEnabled = true;

		expect(nodeGroupsForRun(draftGroups, versionGroups)).toBe(versionGroups);
	});

	it('returns the groups of the draft with node contracts disabled', () => {
		instanceAi.nodeContractsEnabled = false;

		expect(nodeGroupsForRun(draftGroups, versionGroups)).toBe(draftGroups);
	});
});

describe('prepareNodeContractsRun', () => {
	const { instanceAi } = Container.get(GlobalConfig);
	const workflowOf = (type: string) => ({ id: 'w', nodes: [mock<INode>({ type })] });

	afterEach(() => {
		instanceAi.nodeContractsEnabled = true;
	});

	it('prepares a run with a contract node of any first-party package, only with node contracts on', async () => {
		const sync = mockInstance(NodeContractsSync);
		instanceAi.nodeContractsEnabled = true;
		await prepareNodeContractsRun(workflowOf('@n8n/nodes-core.noOpPass'));
		await prepareNodeContractsRun(workflowOf('@n8n/nodes-core.httpRequestGet'));
		await prepareNodeContractsRun(workflowOf('n8n-nodes-base.noOp'));
		instanceAi.nodeContractsEnabled = false;
		await prepareNodeContractsRun(workflowOf('@n8n/nodes-core.noOpPass'));

		expect(sync.prepareRun.mock.calls.map(([{ nodes }]) => nodes[0]?.type)).toEqual([
			'@n8n/nodes-core.noOpPass',
			'@n8n/nodes-core.httpRequestGet',
		]);
	});
});

describe('pinNodeContracts', () => {
	const { instanceAi } = Container.get(GlobalConfig);
	const emptyStore: InstanceStore = {
		embedded: embeddedContractsOf(FIRST_PARTY_PACKAGES),
		manifests: async () => [],
		credentialManifests: async () => [],
		has: async () => false,
		bundle: async () => undefined,
		versions: async () => [],
		insert: async () => {},
		statuses: async () => [],
		insertStatuses: async () => {},
	};
	const nodesStore = mockInstance(NodeContractsStore);
	const headOf = (id: string) => {
		const [head] = versionsOf(id);
		if (!head) throw new Error(`${id} has no bundled version`);
		return {
			range: `^${head.manifest.semver}`,
			version: head.manifest.semver,
			digest: head.digest,
		};
	};
	const nodeOf = (name: string, type: string, typeVersion: number, extra: Partial<INode> = {}) => ({
		id: name,
		name,
		type,
		typeVersion,
		position: [0, 0] as [number, number],
		parameters: {},
		...extra,
	});
	const get = nodeOf('Get', nodeTypeOf('httpRequest.get'), 3);
	const tool = nodeOf('Tool', `${nodeTypeOf('httpRequest.get')}Tool`, 3);
	const notion = nodeOf('Notion', 'n8n-nodes-base.notion', 4, {
		parameters: { resource: 'databasePage', operation: 'getAll' },
	});
	const trigger = nodeOf('Trigger', nodeTypeOf('github.repository.event'), 1);
	const legacy = nodeOf('Set', 'n8n-nodes-base.set', 3);

	beforeAll(async () => {
		const loaders = FIRST_PARTY_PACKAGES.map(
			(pkg) =>
				new ContractNodeLoader(
					hostRuntime(),
					[],
					[],
					async () => ({ versions: async () => new Map(), credentials: async () => new Map() }),
					[],
					undefined,
					undefined,
					pkg,
				),
		);
		await Promise.all(loaders.map(async (loader) => await loader.loadAll()));
		Container.set(
			LoadNodesAndCredentials,
			Object.assign(mock<LoadNodesAndCredentials>(), {
				loaders: Object.fromEntries(loaders.map((loader) => [loader.packageName, loader])),
			}),
		);
		nodesStore.open.mockResolvedValue(
			contractStore({
				registryUrl: '',
				keys: { firstParty: undefined, vetting: undefined },
				store: emptyStore,
				fetch: async () => new Response(null, { status: 404 }),
				runsNodeContract: hostRuntime().runsNodeContract,
			}),
		);
	});

	afterEach(() => {
		instanceAi.nodeContractsEnabled = true;
		nodesStore.open.mockClear();
	});

	it('pins each contract node, tool node and migrated slot to the newest version of its major', async () => {
		instanceAi.nodeContractsEnabled = true;
		const pinned = await pinNodeContracts([get, tool, notion, trigger, legacy]);

		expect(pinned.map((node) => node.contract)).toEqual([
			headOf('httpRequest.get'),
			headOf('httpRequest.get'),
			headOf('notion.databasePage.getAll'),
			undefined,
			undefined,
		]);
		expect(pinned[3]).toBe(trigger);
		expect(pinned[4]).toBe(legacy);
	});

	it('keeps a pin of the same major and re-pins a pin of another major or of other bytes', async () => {
		const head = headOf('httpRequest.get');
		const unknown = { range: '^3.9.9', version: '3.9.9', digest: `sha256:${'b'.repeat(64)}` };
		const pinned = await pinNodeContracts([
			{ ...get, contract: unknown },
			{ ...get, name: 'Old', contract: { version: '2.0.0', digest: unknown.digest } },
			{ ...get, name: 'Bytes', contract: { ...head, digest: unknown.digest } },
		]);

		expect(pinned.map((node) => node.contract)).toEqual([unknown, head, head]);
	});

	it('keeps the stored pin of a node that the client sent without one, and drops the pin of a node that runs no contract', async () => {
		const stored = headOf('httpRequest.get');
		const pinned = await pinNodeContracts(
			[get, { ...legacy, contract: stored }],
			[{ ...get, contract: stored }],
		);

		expect(pinned[0]?.contract).toBe(stored);
		expect(pinned[1]).not.toHaveProperty('contract');
	});

	it('re-pins a stored pin that no source has, and keeps such a pin when it is new to the save', async () => {
		const head = headOf('httpRequest.get');
		const unknown = { version: '3.0.1', digest: `sha256:${'c'.repeat(64)}` };
		const other = { ...unknown, digest: `sha256:${'d'.repeat(64)}` };
		const stored = [{ ...get, contract: unknown }];

		const resaved = await pinNodeContracts([{ ...get, contract: unknown }], stored);
		const dropped = await pinNodeContracts([get], stored);
		const changed = await pinNodeContracts([{ ...get, contract: other }], stored);

		expect([resaved, dropped, changed].map(([node]) => node?.contract)).toEqual([
			{ ...head, range: '^3.0.1' },
			{ ...head, range: '^3.0.1' },
			{ ...other, range: '^3.0.1' },
		]);
	});

	it('locks the range of a node to the newest version in it', async () => {
		const [head] = versionsOf('httpRequest.get');
		if (!head) throw new Error('httpRequest.get has no bundled version');
		const manifestText = manifestTextOf({ ...head.manifest, semver: '3.1.0' });
		const digest = `sha256:${createHash('sha256').update(manifestText).digest('hex')}`;
		const older: StoredManifest = {
			id: head.manifest.id,
			version: '3.1.0',
			kind: 'action',
			manifest: digest,
			manifestText,
			signatures: [],
			origin: 'community',
		};
		nodesStore.open.mockResolvedValueOnce(
			contractStore({
				registryUrl: '',
				keys: { firstParty: undefined, vetting: undefined },
				store: { ...emptyStore, manifests: async () => [older] },
				fetch: async () => new Response(null, { status: 404 }),
				runsNodeContract: hostRuntime().runsNodeContract,
			}),
		);

		const [pinned] = await pinNodeContracts([
			{ ...get, contract: { ...headOf('httpRequest.get'), range: '~3.1.0' } },
		]);

		expect(head.manifest.semver).toBe('3.2.0');
		expect(pinned?.contract).toEqual({ range: '~3.1.0', version: '3.1.0', digest });
	});

	it('writes no pin and opens no store with node contracts off', async () => {
		instanceAi.nodeContractsEnabled = false;
		const nodes = [get, { ...legacy, contract: headOf('httpRequest.get') }];

		expect(await pinNodeContracts(nodes, [])).toBe(nodes);
		expect(nodesStore.open).not.toHaveBeenCalled();
	});
});
