import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createRunExecutionData, type INode } from 'n8n-workflow';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { ContractNodeLoader, useNodeContractsRegistry } from '@/node-contracts-registry';
import { Push } from '@/push';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';

const NEXT = path.resolve(__dirname, '../../../@n8n/nodes-base-next');
const SANDBOX = path.resolve(__dirname, '../../../@n8n/node-sdk/sandbox');
const sidecar = path.join(SANDBOX, 'sidecar/target/release/n8n-sandbox');
const guests = path.join(SANDBOX, 'dist');
// `pnpm --filter @n8n/node-sdk sandbox:build` builds them.
const built = [
	sidecar,
	...['action', 'provider'].map((kind) => path.join(guests, `${kind}.wasm`)),
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

describe.skipIf(!built)('node contracts in the sandbox', () => {
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
			nodeContractsRegistryUrl: '',
			nodeContractsPublicKeyFile: '',
			nodeContractsUpdatePolicy: 'strict',
			nodeContractRange: '>=1.0.0 <3.0.0',
			nodeContractSandboxSidecar: sidecar,
			nodeContractSandboxGuests: guests,
			nodeContractSandboxCacheDir: cacheDir(),
		});
		await utils.initBinaryDataService();
		const next = new ContractNodeLoader();
		await next.loadAll();
		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		loadNodesAndCredentials.loaders = { '@n8n/nodes-base-next': next };
		await loadNodesAndCredentials.postProcessLoaders();
	});

	afterAll(async () => {
		server.close();
		await rm(state.dir, { recursive: true, force: true });
		await testDb.terminate();
	});

	async function runSend(sandbox: 'off' | 'stored' | 'all') {
		Container.get(GlobalConfig).instanceAi.nodeContractSandbox = sandbox;
		await useNodeContractsRegistry();
		const node: INode = {
			id: 'send',
			name: 'Send',
			type: '@n8n/nodes-base-next.httpRequestSend',
			typeVersion: 3,
			position: [0, 0],
			parameters: {
				method: 'POST',
				url: `${state.url}/echo`,
				body: '{"kind":"json","json":{"name":"Ada"}}',
			},
		};
		const workflow = await createWorkflow(
			{ name: `Send, sandbox ${sandbox}`, nodes: [node], connections: {} },
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

	it('runs a contract action in the n8n process when the sandbox is off', async () => {
		expect(await runSend('off')).toEqual({
			status: 'success',
			items: [{ received: { name: 'Ada' } }],
		});
		expect(existsSync(cacheDir())).toBe(false);
	});

	it('runs a bundled version in the n8n process when the sandbox takes stored versions only', async () => {
		expect(await runSend('stored')).toEqual({
			status: 'success',
			items: [{ received: { name: 'Ada' } }],
		});
		expect(existsSync(cacheDir())).toBe(false);
	});

	it('runs the same action in the sandbox when N8N_NODE_CONTRACT_SANDBOX is all', async () => {
		const manifest = JSON.parse(
			await readFile(path.join(NEXT, 'dist/versions/httpRequest.send/manifest.json'), 'utf8'),
		) as { bundleHash: string };

		expect(await runSend('all')).toEqual({
			status: 'success',
			items: [{ received: { name: 'Ada' } }],
		});
		// Only the sandbox writes the verified bundle to its cache.
		expect(await readdir(path.join(cacheDir(), 'bundles'))).toEqual([`${manifest.bundleHash}.cjs`]);
	}, 60_000);
});
