import {
	manifestTextOf,
	npmNameOf,
	parseManifest,
	signStoreManifest,
	type VersionManifest as Manifest,
} from '@n8n/node-sdk/registry';
import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, NodeContractVersionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { packageOf, versionsOf } from '@test/first-party-contracts';
import {
	createRunExecutionData,
	type INode,
	type IVersionedNodeType,
	type IWorkflowBase,
} from 'n8n-workflow';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { create } from 'tar';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import {
	ContractNodeLoader,
	NodeContractsStore,
	nodeContractsRuntime,
} from '@/node-contracts-registry';
import { NodeContractsSync } from '@/node-contracts-sync';
import { Push } from '@/push';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';

const GET = '@n8n/nodes-core.httpRequestGet';
const NAME = npmNameOf('httpRequest.get');
const OLDER = '2.0.0';

const keys = generateKeyPairSync('ed25519', {
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

/** A packed version, signed by the publisher key. */
const signed = (manifestText: string, bundle: string) => ({
	manifest: parseManifest(manifestText),
	version: {
		manifestText,
		bundle,
		signatures: [signStoreManifest(manifestText, keys.privateKey)],
	},
});

type Published = ReturnType<typeof signed>;

/** An npm registry: the packument and the tarballs of `httpRequest.get`, by URL path. */
const registry = {
	url: '',
	server: createServer(),
	versions: new Map<string, Published>(),
	files: new Map<string, Buffer>(),
};
const state = { dir: '', owner: undefined as unknown as User };

/** Packs the files of a version in `package/`, as `npm publish` uploads them. */
const tgzOf = async (files: Record<string, string>) => {
	const dir = await mkdtemp(path.join(state.dir, 'pack-'));
	await mkdir(path.join(dir, 'package'));
	await Promise.all(
		Object.entries(files).map(
			async ([file, text]) => await writeFile(path.join(dir, 'package', file), text),
		),
	);
	await create({ gzip: true, cwd: dir, file: path.join(dir, 'package.tgz') }, ['package']);
	return await readFile(path.join(dir, 'package.tgz'));
};

/** Puts the npm package of each version of `registry.versions` into the registry. */
const writeRegistry = async () => {
	const versions = await Promise.all(
		[...registry.versions.values()].map(async ({ manifest, version }) => {
			const route = `${NAME}/-/${manifest.semver}.tgz`;
			const n8n = { id: manifest.id, digest: digestOf(version.manifestText) };
			const packageJson = { name: NAME, version: manifest.semver, n8n };
			const files = {
				'package.json': JSON.stringify(packageJson),
				'manifest.json': version.manifestText,
				'bundle.cjs': version.bundle,
				'signatures.json': JSON.stringify(version.signatures),
			};
			registry.files.set(route, await tgzOf(files));
			return [manifest.semver, { ...packageJson, dist: { tarball: `${registry.url}/${route}` } }];
		}),
	);
	const packument = { name: NAME, versions: Object.fromEntries(versions) };
	registry.files.set(NAME, Buffer.from(JSON.stringify(packument)));
};

/** Removes a version from the store, as on an instance that never fetched it. */
const unstore = async ({ id, semver }: Manifest) =>
	await Container.get(NodeContractVersionRepository).delete({ contractId: id, version: semver });

const digestOf = (text: string) => `sha256:${createHash('sha256').update(text).digest('hex')}`;

const pinOf = ({ manifest, version }: Published) => ({
	version: manifest.semver,
	digest: digestOf(version.manifestText),
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

	const olderDir = path.join(
		packageOf('httpRequest.get').dir,
		`fixtures/versions/httpRequest.get@${OLDER}`,
	);
	const older = signed(
		await readFile(path.join(olderDir, 'manifest.json'), 'utf8'),
		await readFile(path.join(olderDir, 'bundle.cjs'), 'utf8'),
	);
	const [headVersion] = versionsOf('httpRequest.get');
	if (!headVersion) throw new Error('httpRequest.get is not bundled');
	const head = signed(manifestTextOf(headVersion.manifest), await headVersion.readBundle());
	registry.versions.set(OLDER, older);
	registry.versions.set(head.manifest.semver, head);
	registry.server.on('request', (request, response) => {
		if (request.url?.startsWith('/echo?')) {
			const { searchParams } = new URL(request.url, registry.url);
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify({ received: Object.fromEntries(searchParams) }));
			return;
		}
		const body = registry.files.get(decodeURIComponent(request.url ?? '').slice(1));
		response.statusCode = body ? 200 : 404;
		response.end(body);
	});
	registry.url = await new Promise<string>((resolve) =>
		registry.server.listen(0, '127.0.0.1', () =>
			resolve(`http://127.0.0.1:${(registry.server.address() as AddressInfo).port}`),
		),
	);
	await writeRegistry();

	const publicKeyFile = path.join(state.dir, 'publisher.pem');
	await writeFile(publicKeyFile, keys.publicKey);
	Object.assign(Container.get(GlobalConfig).instanceAi, {
		nodeContractsEnabled: true,
		nodeContractsNpmRegistry: registry.url,
		nodeContractsVettingKeyFile: publicKeyFile,
		nodeContractRange: '>=2.0.0 <3.0.0',
	});

	// The store holds only the HEAD.
	await Container.get(NodeContractsStore).rows.insert([
		{
			id: head.manifest.id,
			version: head.manifest.semver,
			kind: 'action',
			manifest: digestOf(head.version.manifestText),
			...head.version,
			origin: 'community',
		},
	]);
	await utils.initBinaryDataService();
	await loadContracts();
});

/** Loads the contract nodes with a host runtime of the current config. */
async function loadContracts() {
	const core = packageOf('httpRequest.get');
	const runtime = await nodeContractsRuntime();
	const next = new ContractNodeLoader(runtime, [], [], undefined, [], undefined, undefined, core);
	await next.loadAll();
	const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
	loadNodesAndCredentials.loaders = { [next.packageName]: next };
	await loadNodesAndCredentials.postProcessLoaders();
}

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

async function createOlderWorkflow(contract = pinOf(publishedOlder())) {
	return await createWorkflow(
		{
			name: 'Get on major 2',
			nodes: [
				{
					id: 'get',
					name: 'Get',
					type: GET,
					typeVersion: 2,
					contract,
					position: [0, 0],
					parameters: { url: `${registry.url}/echo?name=Ada` },
				},
			],
			connections: {},
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
	it('fetches the pinned older major at sync, lists majors 2 and 3, and runs the workflow on it', async () => {
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

	it('fetches a version that is not in the store before the run', async () => {
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

	it('names the action, version, digest, and registry when the fetch before the run fails', async () => {
		// npm keeps each published version, so the pin names a version that was never published.
		const pin = { version: OLDER, digest: `sha256:${'f'.repeat(64)}` };
		const workflow = await createOlderWorkflow(pin);
		await unstore(publishedOlder().manifest);
		await Container.get(LoadNodesAndCredentials).refreshNodeTypes();
		await expect(runToEnd(workflow)).rejects.toThrow(
			`Cannot get httpRequest.get@${OLDER} (${pin.digest}) from the registry ${registry.url}`,
		);
	});

	it('fetches a missing version once and rebuilds the node types once for parallel runs', async () => {
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
	it('refuses a run without a rebuild when the host does not run the Node Contract version of its pin', async () => {
		const workflow = await createOlderWorkflow();
		const { instanceAi } = Container.get(GlobalConfig);
		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		await unstore(publishedOlder().manifest);
		await loadNodesAndCredentials.refreshNodeTypes();
		instanceAi.nodeContractRange = '>=2.2.0 <3.0.0';
		const refresh = vi.spyOn(loadNodesAndCredentials, 'refreshNodeTypes');
		try {
			expect(majorsOfGet()).toEqual(['3']);
			await expect(runToEnd(workflow)).rejects.toThrow(
				`its pin httpRequest.get@${OLDER} (${pinOf(publishedOlder()).digest})`,
			);
			await expect(runToEnd(workflow)).rejects.toThrow(
				'needs Node Contract 2.1.0, which this host does not run',
			);
			expect(refresh).not.toHaveBeenCalled();
		} finally {
			refresh.mockRestore();
			instanceAi.nodeContractRange = '>=2.0.0 <3.0.0';
			await loadNodesAndCredentials.refreshNodeTypes();
		}
	});

	it('reports the workflow when the host no longer runs the Node Contract version of its pin', async () => {
		const workflow = await createOlderWorkflow();
		const { instanceAi } = Container.get(GlobalConfig);
		instanceAi.nodeContractRange = '>=2.2.0 <3.0.0';
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
		}
	});
});
