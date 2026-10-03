import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import {
	createRunExecutionData,
	type INode,
	type IVersionedNodeType,
	type IWorkflowBase,
} from 'n8n-workflow';
import { generateKeyPairSync } from 'node:crypto';
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

// The cli does not depend on the node-sdk, so load it through the package that does.
const sdkRequire = createRequire(createRequire(__filename).resolve('@n8n/nodes-base-next'));
const sdk = sdkRequire('@n8n/node-sdk/registry') as {
	parseManifest(text: string): Manifest;
	integrityOf(tarball: Uint8Array): string;
	packageNameOf(actionId: string): string;
};
const { packContractPackage } = sdkRequire('@n8n/node-sdk/publish') as {
	packContractPackage(
		frozen: { manifest: Manifest; bundle: string },
		fixtures: { executions: unknown[] },
		privateKey: string,
	): Buffer;
};

const NEXT = path.resolve(__dirname, '../../../@n8n/nodes-base-next');
const SEND = '@n8n/nodes-base-next.httpRequestSend';

const keys = generateKeyPairSync('ed25519', {
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

async function pack(dir: string) {
	const manifest = sdk.parseManifest(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
	const bundle = await readFile(path.join(dir, 'bundle.cjs'), 'utf8');
	const data = packContractPackage({ manifest, bundle }, { executions: [] }, keys.privateKey);
	return { manifest, data, integrity: sdk.integrityOf(data) };
}

type Published = Awaited<ReturnType<typeof pack>>;

const registry = { url: '', server: createServer(), versions: new Map<string, Published>() };
const state = { dir: '', storeDir: '', owner: undefined as unknown as User };

const lockOf = ({ id, semver, bundleHash, contractHash }: Manifest) => ({
	action: id,
	version: semver,
	bundleHash,
	contractHash,
});

const majorsOfSend = () =>
	Object.keys(
		(Container.get(LoadNodesAndCredentials).getNode(SEND).type as IVersionedNodeType).nodeVersions,
	);

mockInstance(Push);

beforeAll(async () => {
	await testDb.init();
	state.owner = await createOwner();
	state.dir = await mkdtemp(path.join(tmpdir(), 'node-contracts-store-'));
	state.storeDir = path.join(Container.get(InstanceSettings).n8nFolder, 'node-contracts');
	await rm(state.storeDir, { recursive: true, force: true });

	const v1 = await pack(path.join(NEXT, 'fixtures/versions/httpRequest.send@1.0.2'));
	const v2 = await pack(path.join(NEXT, 'dist/versions/httpRequest.send'));
	registry.versions.set('1.0.2', v1);
	registry.versions.set(v2.manifest.semver, v2);
	const name = sdk.packageNameOf('httpRequest.send');
	registry.server.on('request', (request, response) => {
		const tarball = /^\/tarballs\/(.+)\.tgz$/.exec(request.url ?? '')?.[1];
		const found = tarball ? registry.versions.get(tarball) : undefined;
		if (request.url === `/${name.replace('/', '%2f')}`) {
			const versions = [...registry.versions].map(([version, { manifest, integrity }]) => [
				version,
				{
					n8nContract: {
						id: manifest.id,
						nodeContract: manifest.nodeContract,
						contractHash: manifest.contractHash,
						bundleHash: manifest.bundleHash,
					},
					dist: { tarball: `${registry.url}/tarballs/${version}.tgz`, integrity },
				},
			]);
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify({ name, versions: Object.fromEntries(versions) }));
		} else if (found) {
			response.end(found.data);
		} else if (request.url === '/echo') {
			const chunks: Buffer[] = [];
			request.on('data', (chunk: Buffer) => chunks.push(chunk));
			request.on('end', () => {
				response.setHeader('content-type', 'application/json');
				response.end(JSON.stringify({ received: JSON.parse(Buffer.concat(chunks).toString()) }));
			});
		} else {
			response.statusCode = 404;
			response.end();
		}
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
		nodeContractRange: '>=1.0.0 <3.0.0',
	});

	// The store holds only the HEAD.
	await (await Container.get(NodeContractsStore).open()).add(v2.data);
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
	await rm(state.storeDir, { recursive: true, force: true });
	await testDb.terminate();
});

async function createV1Workflow() {
	const v1 = registry.versions.get('1.0.2');
	if (!v1) throw new Error('1.0.2 is not published');
	return await createWorkflow(
		{
			name: 'Send on major 1',
			nodes: [
				{
					id: 'send',
					name: 'Send',
					type: SEND,
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						method: 'POST',
						url: `${registry.url}/echo`,
						body: '{"kind":"json","json":{"name":"Ada"}}',
					},
				},
			],
			connections: {},
			meta: { nodeContracts: { Send: lockOf(v1.manifest) } } as IWorkflowBase['meta'],
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
	const [task] = execution?.data.resultData.runData.Send ?? [];
	return {
		status: execution?.status,
		items: task?.data?.main[0]?.map(({ json }) => json),
		ran: task?.metadata?.nodeContract,
	};
}

describe('node contracts store', () => {
	it('fetches the locked 1.x at sync, lists majors 1 and 3, and runs the workflow on 1.x', async () => {
		const workflow = await createV1Workflow();
		expect(majorsOfSend()).toEqual(['3']);

		const result = await Container.get(NodeContractsSync).run({ refreshNodeTypes: true });

		expect(result.added.map(({ semver }) => semver)).toEqual(['1.0.2']);
		expect(result.failed).toEqual([]);
		expect(majorsOfSend()).toEqual(['1', '3']);
		const versions = Container.get(LoadNodesAndCredentials)
			.types.nodes.filter(({ name }) => name === SEND)
			.map(({ version }) => version);
		expect(versions.sort()).toEqual([1, 3]);
		expect(Container.get(Push).broadcast).toHaveBeenCalledWith({
			type: 'nodeDescriptionUpdated',
			data: {},
		});

		expect(await runToEnd(workflow)).toEqual({
			status: 'success',
			items: [{ received: { name: 'Ada' } }],
			ran: expect.objectContaining({ version: '1.0.2', nodeContract: '1.0.0' }),
		});
	});

	it('fetches a bundle that is not in the store before the run', async () => {
		const workflow = await createV1Workflow();
		const { bundleHash } = registry.versions.get('1.0.2')?.manifest ?? { bundleHash: '' };
		await rm(path.join(state.storeDir, `${bundleHash}.tgz`));
		// As after a restart: the node types come from the store.
		await Container.get(LoadNodesAndCredentials).refreshNodeTypes();
		expect(majorsOfSend()).toEqual(['3']);

		expect(await runToEnd(workflow)).toMatchObject({
			status: 'success',
			items: [{ received: { name: 'Ada' } }],
		});
		expect(majorsOfSend()).toEqual(['1', '3']);
		expect(await (await Container.get(NodeContractsStore).open()).bundleHashes()).toContain(
			bundleHash,
		);
	});

	it('names the action, version, bundle hash, and registry when the fetch before the run fails', async () => {
		const workflow = await createV1Workflow();
		const v1 = registry.versions.get('1.0.2');
		if (!v1) throw new Error('1.0.2 is not published');
		registry.versions.delete('1.0.2');
		await rm(path.join(state.storeDir, `${v1.manifest.bundleHash}.tgz`));
		await Container.get(LoadNodesAndCredentials).refreshNodeTypes();
		try {
			await expect(runToEnd(workflow)).rejects.toThrow(
				`Cannot get httpRequest.send@1.0.2 (bundle ${v1.manifest.bundleHash}) from the registry ${registry.url}`,
			);
		} finally {
			registry.versions.set('1.0.2', v1);
		}
	});

	it('fetches a missing bundle once and rebuilds the node types once for parallel runs', async () => {
		const workflow = await createV1Workflow();
		const { bundleHash } = registry.versions.get('1.0.2')?.manifest ?? { bundleHash: '' };
		await rm(path.join(state.storeDir, `${bundleHash}.tgz`), { force: true });
		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		await loadNodesAndCredentials.refreshNodeTypes();
		const rebuild = vi.spyOn(loadNodesAndCredentials, 'postProcessLoaders');
		try {
			const sync = Container.get(NodeContractsSync);
			await Promise.all([sync.prepareRun(workflow), sync.prepareRun(workflow)]);
			expect(rebuild).toHaveBeenCalledTimes(1);
			expect(majorsOfSend()).toEqual(['1', '3']);
		} finally {
			rebuild.mockRestore();
		}
	});

	it('refuses a run without a rebuild when the host does not run the Node Contract version of its lock', async () => {
		const workflow = await createV1Workflow();
		const { instanceAi } = Container.get(GlobalConfig);
		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		instanceAi.nodeContractRange = '>=2.0.0 <3.0.0';
		await useNodeContractsRegistry();
		await loadNodesAndCredentials.refreshNodeTypes();
		const refresh = vi.spyOn(loadNodesAndCredentials, 'refreshNodeTypes');
		try {
			expect(majorsOfSend()).toEqual(['3']);
			await expect(runToEnd(workflow)).rejects.toThrow(
				'its lock httpRequest.send@1.0.2 (bundle 4571314301c3',
			);
			await expect(runToEnd(workflow)).rejects.toThrow(
				'needs Node Contract 1.0.0, which this host does not run',
			);
			expect(refresh).not.toHaveBeenCalled();
		} finally {
			refresh.mockRestore();
			instanceAi.nodeContractRange = '>=1.0.0 <3.0.0';
			await useNodeContractsRegistry();
			await loadNodesAndCredentials.refreshNodeTypes();
		}
	});

	it('reports the workflow when the host no longer runs the Node Contract version of its lock', async () => {
		const workflow = await createV1Workflow();
		const { instanceAi } = Container.get(GlobalConfig);
		instanceAi.nodeContractRange = '>=2.0.0 <3.0.0';
		await useNodeContractsRegistry();
		try {
			const { unsupported } = await Container.get(NodeContractsSync).run({
				refreshNodeTypes: false,
			});
			expect(unsupported).toContainEqual(
				expect.objectContaining({
					workflowId: workflow.id,
					node: 'Send',
					nodeContract: '1.0.0',
				}),
			);
		} finally {
			instanceAi.nodeContractRange = '>=1.0.0 <3.0.0';
			await useNodeContractsRegistry();
		}
	});
});
