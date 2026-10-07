import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig, type NodePermissionClass } from '@n8n/config';
import { ExecutionRepository, type User } from '@n8n/db';
import { packageOf, versionsOf } from '@test/first-party-contracts';
import { Container } from '@n8n/di';
import { createRunExecutionData, type INode } from 'n8n-workflow';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import {
	ContractNodeLoader,
	NodeContractsRuntimes,
	nodeContractsRuntime,
} from '@/node-contracts-registry';
import { Push } from '@/push';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';

const SANDBOX = path.resolve(__dirname, '../../../@n8n/node-sdk/sandbox');
const sidecar = path.join(SANDBOX, 'sidecar/target/release/n8n-sandbox');
const guests = path.join(SANDBOX, 'dist');
// `pnpm --filter @n8n/node-sdk sandbox:build` builds them.
const built = [
	sidecar,
	...['action', 'provider', 'trigger'].map((kind) => path.join(guests, `${kind}.wasm`)),
].every(existsSync);

const state = { dir: '', url: '', owner: undefined as unknown as User };

const server = createServer((request, response) => {
	const chunks: Buffer[] = [];
	request.on('data', (chunk: Buffer) => chunks.push(chunk));
	request.on('end', () => {
		response.setHeader('content-type', 'application/json');
		response.end(JSON.stringify({ received: JSON.parse(Buffer.concat(chunks).toString()) }));
	});
});

mockInstance(Push);

describe('node contracts in their runtimes', () => {
	const cacheDir = () => path.join(state.dir, 'cache');

	beforeAll(async () => {
		await testDb.init();
		state.owner = await createOwner();
		state.dir = await mkdtemp(path.join(tmpdir(), 'node-contracts-sandbox-'));
		state.url = await new Promise<string>((resolve) =>
			server.listen(0, '127.0.0.1', () =>
				resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`),
			),
		);
		Object.assign(Container.get(GlobalConfig).instanceAi, {
			nodeContractsEnabled: true,
			nodeContractsNpmRegistry: '',
			nodeContractsFirstPartyKeyFile: '',
			nodeContractsVettingKeyFile: '',
			nodeContractsUpdatePolicy: 'strict',
			nodeContractRange: '>=2.0.0 <3.0.0',
			nodeContractSandboxSidecar: sidecar,
			nodeContractSandboxGuests: guests,
			nodeContractSandboxCacheDir: cacheDir(),
		});
		await utils.initBinaryDataService();
		await loadContracts();
	});

	/** Loads the contract nodes with a host runtime of the current config. */
	async function loadContracts(deny: NodePermissionClass[] = []) {
		const core = packageOf('httpRequest.send');
		const runtime = await nodeContractsRuntime();
		const next = new ContractNodeLoader(
			runtime,
			[],
			[],
			undefined,
			deny,
			undefined,
			undefined,
			core,
		);
		await next.loadAll();
		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		loadNodesAndCredentials.loaders = { [next.packageName]: next };
		await loadNodesAndCredentials.postProcessLoaders();
	}

	afterAll(async () => {
		Container.get(NodeContractsRuntimes).close();
		server.close();
		await rm(state.dir, { recursive: true, force: true });
		await testDb.terminate();
	});

	async function runSend(
		firstParty: GlobalConfig['instanceAi']['nodesNextRuntimesFirstParty'],
		deny: NodePermissionClass[] = [],
	) {
		Container.get(GlobalConfig).instanceAi.nodesNextRuntimesFirstParty = firstParty;
		await loadContracts(deny);
		const node: INode = {
			id: 'send',
			name: 'Send',
			type: '@n8n/nodes-core.httpRequestSend',
			typeVersion: 3,
			position: [0, 0],
			parameters: {
				method: 'POST',
				url: `${state.url}/echo`,
				body: { kind: 'json', json: { name: 'Ada' } },
			},
		};
		const workflow = await createWorkflow(
			{ name: `Send, runtimes ${firstParty.join(',')}`, nodes: [node], connections: {} },
			state.owner,
		);
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
			{ timeout: 20_000, interval: 50 },
		);
		const execution = await executions.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		const [task] = execution?.data.resultData.runData.Send ?? [];
		return { status: execution?.status, items: task?.data?.main[0]?.map(({ json }) => json) };
	}

	const bundles = async () => {
		const [{ manifest }] = versionsOf('httpRequest.send');
		return { written: await readdir(path.join(cacheDir(), 'bundles')), manifest };
	};

	it('runs a bundled version in the n8n process when in-process comes first', async () => {
		expect(await runSend(['in-process', 'worker'])).toEqual({
			status: 'success',
			items: [{ received: { name: 'Ada' } }],
		});
		expect(existsSync(path.join(cacheDir(), 'bundles'))).toBe(false);
	});

	it('runs a bundled version in a worker with the default first-party list', async () => {
		const made = vi.spyOn(Container.get(NodeContractsRuntimes), 'get');

		expect(await runSend(['worker', 'in-process', 'wasm', 'container'])).toEqual({
			status: 'success',
			items: [{ received: { name: 'Ada' } }],
		});
		expect(made).toHaveBeenCalledWith('worker', expect.any(Function));
		// Only a runtime outside this process reads the verified bundle from the cache.
		const { written, manifest } = await bundles();
		expect(written).toEqual([`${manifest.bundleHash}.cjs`]);
	}, 60_000);

	it('does not run a version whose permission class is denied, whatever the runtime lists', async () => {
		const made = vi.spyOn(Container.get(NodeContractsRuntimes), 'get');
		try {
			await expect(runSend(['in-process', 'worker'], ['egress-input'])).rejects.toThrow(
				'Unrecognized node type: @n8n/nodes-core.httpRequestSend',
			);
			expect(made).not.toHaveBeenCalled();
		} finally {
			await loadContracts();
		}
	}, 60_000);

	it.skipIf(!built)(
		'runs the action in the WASM sandbox when wasm comes first',
		async () => {
			const made = vi.spyOn(Container.get(NodeContractsRuntimes), 'get');

			expect(await runSend(['wasm'])).toEqual({
				status: 'success',
				items: [{ received: { name: 'Ada' } }],
			});
			expect(made).toHaveBeenCalledWith('wasm', expect.any(Function));
			const { written, manifest } = await bundles();
			expect(written).toEqual([`${manifest.bundleHash}.cjs`]);
		},
		60_000,
	);
});
