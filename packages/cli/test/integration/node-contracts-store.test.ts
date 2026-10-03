import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, NodeContractVersionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { versionsOf } from '@n8n/nodes-base-next';
import {
	createRunExecutionData,
	type INode,
	type IVersionedNodeType,
	type IWorkflowBase,
} from 'n8n-workflow';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import {
	ContractNodeLoader,
	NodeContractsStore,
	useNodeContractsRegistry,
} from '@/node-contracts-registry';
import { NodeContractsSync } from '@/node-contracts-sync';
import { Push } from '@/push';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';

interface Manifest {
	readonly id: string;
	readonly semver: string;
	readonly nodeContract: string;
	readonly bundleHash: string;
	readonly contractHash: string;
}

interface StoreSignature {
	readonly key: string;
	readonly sig: string;
}

interface StoreVersion {
	readonly manifestText: string;
	readonly bundle: string;
	readonly signatures?: StoreSignature[];
}

// The cli does not depend on the node-sdk, so load it through the package that does.
const sdkRequire = createRequire(createRequire(__filename).resolve('@n8n/nodes-base-next'));
const sdk = sdkRequire('@n8n/node-sdk/registry') as {
	parseManifest(text: string): Manifest;
	addToStore(dir: string, versions: StoreVersion[]): Promise<unknown>;
	manifestTextOf(manifest: Manifest): string;
	signStoreManifest(manifestText: string, privateKey: string): StoreSignature;
};

const NEXT = path.resolve(__dirname, '../../../@n8n/nodes-base-next');
const GET = '@n8n/nodes-base-next.httpRequestGet';
const OLDER = '2.0.0';

const keys = generateKeyPairSync('ed25519', {
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

/** A frozen version, signed by the publisher key. */
const signed = (manifestText: string, bundle: string) => ({
	manifest: sdk.parseManifest(manifestText),
	version: {
		manifestText,
		bundle,
		signatures: [sdk.signStoreManifest(manifestText, keys.privateKey)],
	},
});

type Published = ReturnType<typeof signed>;

const registry = {
	url: '',
	dir: '',
	server: createServer(),
	versions: new Map<string, Published>(),
};
const state = { dir: '', owner: undefined as unknown as User };

/** Writes the registry store again from `registry.versions`. */
const writeRegistry = async () => {
	await rm(registry.dir, { recursive: true, force: true });
	await sdk.addToStore(
		registry.dir,
		[...registry.versions.values()].map(({ version }) => version),
	);
};

/** Removes a version from the store, as on an instance that never fetched it. */
const unstore = async ({ id, semver }: Manifest) =>
	await Container.get(NodeContractVersionRepository).delete({ contractId: id, version: semver });

const lockOf = ({ id, semver, bundleHash, contractHash }: Manifest) => ({
	action: id,
	version: semver,
	bundleHash,
	contractHash,
});

const majorsOfGet = () =>
	Object.keys(
		(Container.get(LoadNodesAndCredentials).getNode(GET).type as IVersionedNodeType).nodeVersions,
	);

mockInstance(Push);

beforeAll(async () => {
	await testDb.init();
	state.owner = await createOwner();
	state.dir = await mkdtemp(path.join(tmpdir(), 'node-contracts-store-'));

	const olderDir = path.join(NEXT, `fixtures/versions/httpRequest.get@${OLDER}`);
	const older = signed(
		await readFile(path.join(olderDir, 'manifest.json'), 'utf8'),
		await readFile(path.join(olderDir, 'bundle.cjs'), 'utf8'),
	);
	const [headVersion] = versionsOf('httpRequest.get');
	if (!headVersion) throw new Error('httpRequest.get is not bundled');
	const head = signed(sdk.manifestTextOf(headVersion.manifest), await headVersion.readBundle());
	registry.versions.set(OLDER, older);
	registry.versions.set(head.manifest.semver, head);
	registry.dir = path.join(state.dir, 'registry');
	await writeRegistry();
	// The registry is static files.
	registry.server.on('request', (request, response) => {
		if (request.url?.startsWith('/echo?')) {
			const { searchParams } = new URL(request.url, registry.url);
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify({ received: Object.fromEntries(searchParams) }));
			return;
		}
		void readFile(path.join(registry.dir, decodeURIComponent(request.url ?? ''))).then(
			(data) => response.end(data),
			() => {
				response.statusCode = 404;
				response.end();
			},
		);
	});
	registry.url = await new Promise<string>((resolve) =>
		registry.server.listen(0, '127.0.0.1', () =>
			resolve(`http://127.0.0.1:${(registry.server.address() as AddressInfo).port}`),
		),
	);

	const publicKeyFile = path.join(state.dir, 'publisher.pem');
	await writeFile(publicKeyFile, keys.publicKey);
	Object.assign(Container.get(GlobalConfig).instanceAi, {
		nodeContractsEnabled: true,
		nodeContractsRegistryUrl: registry.url,
		nodeContractsPublicKeyFile: publicKeyFile,
		nodeContractsUpdatePolicy: 'strict',
		nodeContractRange: '>=2.0.0 <3.0.0',
	});

	// The store holds only the HEAD.
	await Container.get(NodeContractsStore).rows.insert([
		{
			id: head.manifest.id,
			version: head.manifest.semver,
			kind: 'action',
			manifest: `sha256:${createHash('sha256').update(head.version.manifestText).digest('hex')}`,
			...head.version,
		},
	]);
	await useNodeContractsRegistry();
	await utils.initBinaryDataService();
	const next = new ContractNodeLoader();
	await next.loadAll();
	const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
	loadNodesAndCredentials.loaders = { '@n8n/nodes-base-next': next };
	await loadNodesAndCredentials.postProcessLoaders();
});

afterAll(async () => {
	registry.server.close();
	await rm(state.dir, { recursive: true, force: true });
	await testDb.terminate();
});

function publishedOlder() {
	const older = registry.versions.get(OLDER);
	if (!older) throw new Error(`${OLDER} is not published`);
	return older;
}

async function createOlderWorkflow() {
	return await createWorkflow(
		{
			name: 'Get on major 2',
			nodes: [
				{
					id: 'get',
					name: 'Get',
					type: GET,
					typeVersion: 2,
					position: [0, 0],
					parameters: { url: `${registry.url}/echo?name=Ada` },
				},
			],
			connections: {},
			meta: { nodeContracts: { Get: lockOf(publishedOlder().manifest) } } as IWorkflowBase['meta'],
		},
		state.owner,
	);
}

async function runToEnd(workflow: IWorkflowBase) {
	const node = workflow.nodes[0] as INode;
	const executionId = await Container.get(WorkflowRunner).run(
		{
			workflowData: workflow,
			userId: state.owner.id,
			executionMode: 'webhook',
			executionData: createRunExecutionData({
				executionData: {
					nodeExecutionStack: [{ node, data: { main: [[{ json: {} }]] }, source: null }],
				},
			}),
		},
		true,
	);
	const executions = Container.get(ExecutionRepository);
	await vi.waitFor(
		async () => expect((await executions.findOneBy({ id: executionId }))?.finished).toBe(true),
		{ timeout: 10_000, interval: 50 },
	);
	const execution = await executions.findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});
	const [task] = execution?.data.resultData.runData.Get ?? [];
	return {
		status: execution?.status,
		items: task?.data?.main[0]?.map(({ json }) => json),
		ran: task?.metadata?.nodeContract,
	};
}

describe('node contracts store', () => {
	it('fetches the locked older major at sync, lists majors 2 and 3, and runs the workflow on it', async () => {
		const workflow = await createOlderWorkflow();
		expect(majorsOfGet()).toEqual(['3']);

		const result = await Container.get(NodeContractsSync).run({ refreshNodeTypes: true });

		expect(result.added.map(({ semver }) => semver)).toEqual([OLDER]);
		expect(result.failed).toEqual([]);
		expect(majorsOfGet()).toEqual(['2', '3']);
		const versions = Container.get(LoadNodesAndCredentials)
			.types.nodes.filter(({ name }) => name === GET)
			.map(({ version }) => version);
		expect(versions.sort()).toEqual([2, 3]);
		expect(Container.get(Push).broadcast).toHaveBeenCalledWith({
			type: 'nodeDescriptionUpdated',
			data: {},
		});

		expect(await runToEnd(workflow)).toEqual({
			status: 'success',
			items: [{ received: { name: 'Ada' } }],
			ran: expect.objectContaining({ version: OLDER, nodeContract: '2.1.0' }),
		});
	});

	it('fetches a bundle that is not in the store before the run', async () => {
		const workflow = await createOlderWorkflow();
		const { bundleHash } = publishedOlder().manifest;
		await unstore(publishedOlder().manifest);
		// As after a restart: the node types come from the store.
		await Container.get(LoadNodesAndCredentials).refreshNodeTypes();
		expect(majorsOfGet()).toEqual(['3']);

		expect(await runToEnd(workflow)).toMatchObject({
			status: 'success',
			items: [{ received: { name: 'Ada' } }],
		});
		expect(majorsOfGet()).toEqual(['2', '3']);
		expect(await (await Container.get(NodeContractsStore).open()).bundleHashes()).toContain(
			bundleHash,
		);
	});

	it('names the action, version, bundle hash, and registry when the fetch before the run fails', async () => {
		const workflow = await createOlderWorkflow();
		const older = publishedOlder();
		registry.versions.delete(OLDER);
		await writeRegistry();
		await unstore(older.manifest);
		await Container.get(LoadNodesAndCredentials).refreshNodeTypes();
		try {
			await expect(runToEnd(workflow)).rejects.toThrow(
				`Cannot get httpRequest.get@${OLDER} (bundle ${older.manifest.bundleHash}) from the registry ${registry.url}`,
			);
		} finally {
			registry.versions.set(OLDER, older);
			await writeRegistry();
		}
	});

	it('fetches a missing bundle once and rebuilds the node types once for parallel runs', async () => {
		const workflow = await createOlderWorkflow();
		await unstore(publishedOlder().manifest);
		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		await loadNodesAndCredentials.refreshNodeTypes();
		const rebuild = vi.spyOn(loadNodesAndCredentials, 'postProcessLoaders');
		try {
			const sync = Container.get(NodeContractsSync);
			await Promise.all([sync.prepareRun(workflow), sync.prepareRun(workflow)]);
			expect(rebuild).toHaveBeenCalledTimes(1);
			expect(majorsOfGet()).toEqual(['2', '3']);
		} finally {
			rebuild.mockRestore();
		}
	});

	// Narrow the range after the rebuild: some bundled HEADs also need 2.1.0.
	it('refuses a run without a rebuild when the host does not run the Node Contract version of its lock', async () => {
		const workflow = await createOlderWorkflow();
		const { instanceAi } = Container.get(GlobalConfig);
		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		await unstore(publishedOlder().manifest);
		await loadNodesAndCredentials.refreshNodeTypes();
		instanceAi.nodeContractRange = '>=2.2.0 <3.0.0';
		await useNodeContractsRegistry();
		const refresh = vi.spyOn(loadNodesAndCredentials, 'refreshNodeTypes');
		try {
			expect(majorsOfGet()).toEqual(['3']);
			await expect(runToEnd(workflow)).rejects.toThrow(
				`its lock httpRequest.get@${OLDER} (bundle ${publishedOlder().manifest.bundleHash.slice(0, 12)}`,
			);
			await expect(runToEnd(workflow)).rejects.toThrow(
				'needs Node Contract 2.1.0, which this host does not run',
			);
			expect(refresh).not.toHaveBeenCalled();
		} finally {
			refresh.mockRestore();
			instanceAi.nodeContractRange = '>=2.0.0 <3.0.0';
			await useNodeContractsRegistry();
			await loadNodesAndCredentials.refreshNodeTypes();
		}
	});

	it('reports the workflow when the host no longer runs the Node Contract version of its lock', async () => {
		const workflow = await createOlderWorkflow();
		const { instanceAi } = Container.get(GlobalConfig);
		instanceAi.nodeContractRange = '>=2.2.0 <3.0.0';
		await useNodeContractsRegistry();
		try {
			const { unsupported } = await Container.get(NodeContractsSync).run({
				refreshNodeTypes: false,
			});
			expect(unsupported).toContainEqual(
				expect.objectContaining({
					workflowId: workflow.id,
					node: 'Get',
					nodeContract: '2.1.0',
				}),
			);
		} finally {
			instanceAi.nodeContractRange = '>=2.0.0 <3.0.0';
			await useNodeContractsRegistry();
		}
	});
});
