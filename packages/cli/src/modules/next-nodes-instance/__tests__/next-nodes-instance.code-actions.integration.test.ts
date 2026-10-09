import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, NodeContractVersionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { packAction } from '@n8n/node-sdk/pack';
import { contractHash } from '@n8n/node-sdk/registry';
import type { PackedAction } from '@n8n/node-sdk/pack';
import { defaultSandbox } from '@n8n/node-sdk/sandbox';
import { createRunExecutionData, type INode } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NextNodesInstanceService } from '@/modules/next-nodes-instance/next-nodes-instance.service';
import { FALLBACK_PACKAGE } from '@/node-contracts-catalog';
import { contractNodeLoadersOf, nodeContractsRuntime } from '@/node-contracts-registry';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from '../../../../test/integration/shared/db/users';
import * as utils from '../../../../test/integration/shared/utils';

const wasm = defaultSandbox();
const wasmReady = existsSync(wasm.sidecar) && existsSync(path.join(wasm.guests, 'action.wasm'));

const ID = 'acmeCode.greet';
const server = { url: '', http: createServer() };
const dir = mkdtempSync(path.join(tmpdir(), 'code-actions-'));
const state = { owner: undefined as unknown as User, packed: undefined as unknown as PackedAction };

// The bundle counts its evaluations and runs in the global object of the runtime that runs it.
const evaluations = () => Reflect.get(globalThis, 'acmeCodeEvaluations');
const runs = () => Reflect.get(globalThis, 'acmeCodeRuns');

/** Packs the fixture project as the sandbox of the AI builder does. Pack evaluates it here once. */
async function packGreet(semver: string, suffix = '') {
	const file = path.join(dir, `greet-${semver}${suffix}.ts`);
	writeFileSync(
		file,
		`import { defineNode, path, t } from '@n8n/node-sdk';
Reflect.set(globalThis, 'acmeCodeEvaluations', Number(Reflect.get(globalThis, 'acmeCodeEvaluations') ?? 0) + 1);
const acme = defineNode({ id: 'acmeCode', displayName: 'Acme Code', baseUrl: '${server.url}' });
export const greet = acme.action('greet', {
	version: '${semver}',
	action: 'Greet',
	summary: 'Get a greeting for a name.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: { name: t.str().title('Name') },
	output: t.obj({ text: t.str().title('Text') }),
	async run({ input, http }) {
		Reflect.set(globalThis, 'acmeCodeRuns', Number(Reflect.get(globalThis, 'acmeCodeRuns') ?? 0) + 1);
		const reply = await http.request({ path: path\`/greet/\${input.name}\` });
		return { text: String(reply.text) + '${suffix}' };
	},
});`,
	);
	return await packAction(file, 'greet');
}

const service = () => Container.get(NextNodesInstanceService);
const codeOf = ({ manifest, bundle, sdk }: PackedAction) => ({ manifest, bundle, sdk });

async function greetingOf(semver: string) {
	const row = await Container.get(NodeContractVersionRepository).findOneByOrFail({
		contractId: ID,
		version: semver,
	});
	const node: INode = {
		id: 'greet',
		name: 'Greet',
		type: `${FALLBACK_PACKAGE}.acmeCodeGreet`,
		typeVersion: 1,
		position: [0, 0],
		parameters: { name: 'Ada' },
		contract: { version: semver, digest: row.digest },
	};
	const workflow = await createWorkflow({ nodes: [node], connections: {} }, state.owner);
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
		{ timeout: 30_000, interval: 50 },
	);
	const execution = await executions.findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});
	return execution?.data.resultData.runData.Greet?.[0]?.data?.main[0]?.[0]?.json.text;
}

mockInstance(Push);
mockInstance(Publisher);
mockInstance(LicenseState);

describe.skipIf(!wasmReady)('code actions of the AI builder', () => {
	beforeAll(async () => {
		server.http.on('request', (request, response) => {
			const { pathname } = new URL(request.url ?? '', 'http://localhost');
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify({ text: `Hello ${pathname.split('/').pop() ?? ''}` }));
		});
		server.url = await new Promise<string>((resolve) =>
			server.http.listen(0, '127.0.0.1', () =>
				resolve(`http://127.0.0.1:${(server.http.address() as AddressInfo).port}`),
			),
		);
		Object.assign(Container.get(GlobalConfig).instanceAi, {
			nodeContractsEnabled: true,
			nodeContractsNpmRegistry: '',
			nodeContractRange: '>=2.0.0 <3.0.0',
		});
		await testModules.loadModules(['next-nodes-instance']);
		await testDb.init();
		state.owner = await createOwner();
		await utils.initBinaryDataService();
		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		const contracts = contractNodeLoadersOf(await nodeContractsRuntime(), {
			excludeNodes: [],
			includeNodes: [],
			deny: [],
			legacyLoaders: () => loadNodesAndCredentials.loaders,
		});
		loadNodesAndCredentials.loaders = Object.fromEntries(
			contracts.map((loader) => [loader.packageName, loader]),
		);
		await Promise.all(contracts.map(async (loader) => await loader.loadAll()));
		await loadNodesAndCredentials.postProcessLoaders();
		state.packed = await packGreet('1.0.0');
	}, 120_000);

	afterAll(async () => {
		server.http.close();
		rmSync(dir, { recursive: true, force: true });
		await testDb.terminate();
	});

	it('tests, publishes and runs a packed bundle only in the wasm sandbox', async () => {
		const evaluated = evaluations();
		expect(evaluated).toBeGreaterThan(0);

		const result = await service().testPacked(
			codeOf(state.packed),
			{ name: 'Ada' },
			undefined,
			state.owner,
		);

		expect(result).toMatchObject({
			status: 'success',
			items: [{ text: 'Hello Ada' }],
			fixture: {
				params: { name: 'Ada' },
				routes: [{ path: '/greet/Ada', reply: { json: { text: 'Hello Ada' } } }],
				output: [{ text: 'Hello Ada' }],
			},
		});

		const manifest = await service().publishPacked(
			codeOf(state.packed),
			{ executions: [result.fixture] },
			{ userId: state.owner.id },
		);

		expect(manifest).toMatchObject({ id: ID, semver: '1.0.0' });
		const row = await Container.get(NodeContractVersionRepository).findOneByOrFail({
			contractId: ID,
		});
		expect(row).toMatchObject({ origin: 'private', kind: 'action', createdById: state.owner.id });
		const loader = Container.get(LoadNodesAndCredentials).loaders[FALLBACK_PACKAGE];
		const { type } = loader?.getNode('acmeCodeGreet') ?? {};
		const description =
			type && 'nodeVersions' in type ? type.nodeVersions[1]?.description : undefined;
		expect(description).toMatchObject({
			displayName: 'Acme Code: Greet',
			codex: expect.objectContaining({ app: { id: 'acmeCode', displayName: 'Acme Code' } }),
		});
		expect(description?.properties?.[0]).toMatchObject({
			type: 'notice',
			displayName: 'Custom action. It sends requests to 127.0.0.1.',
		});
		const listed = (await service().list()).filter(({ actionId }) => actionId === ID);
		expect(listed).toEqual([
			expect.objectContaining({
				semver: '1.0.0',
				status: 'published',
				publishedBy: expect.objectContaining({ email: state.owner.email }),
			}),
		]);
		const { publishedActions } = await import('@n8n/instance-ai');
		expect(publishedActions().map(({ id }) => id)).toContain(ID);

		expect(await greetingOf('1.0.0')).toBe('Hello Ada');
		// Neither the test run, the publish gate, the node types nor the workflow ran the bundle here.
		expect(evaluations()).toBe(evaluated);
		expect(runs()).toBeUndefined();
	}, 120_000);

	it('refuses a known bundle, a version that is not above the newest, and a changed bundle', async () => {
		const fixtures = { executions: [] };
		const options = { userId: state.owner.id };

		await expect(service().publishPacked(codeOf(state.packed), fixtures, options)).rejects.toThrow(
			`${ID}@1.0.0 already has this bundle`,
		);
		const changed = await packGreet('1.0.0', '!');
		await expect(service().publishPacked(codeOf(changed), fixtures, options)).rejects.toThrow(
			`This instance has ${ID}@1.0.0. Set a higher version and pack again.`,
		);
		await expect(
			service().publishPacked(
				{ ...codeOf(changed), bundle: `${changed.bundle}\n` },
				fixtures,
				options,
			),
		).rejects.toThrow(`The bundle of ${ID}@1.0.0 does not match its manifest`);
		await expect(service().configOf(ID)).rejects.toThrow('is code');
		await expect(
			service().testPacked(
				{ ...codeOf(changed), bundle: `${changed.bundle}\n` },
				{ name: 'Ada' },
				undefined,
				state.owner,
			),
		).rejects.toThrow(`The bundle of ${ID}@1.0.0 does not match its manifest`);
	});

	it('refuses a manifest that does not describe its bundle, and an SDK runtime that n8n does not have', async () => {
		const fixtures = { executions: [] };
		const options = { userId: state.owner.id };
		const next = await packGreet('1.0.1', '?');
		const { contract } = next.manifest;
		const writes = { ...contract, flow: { ...contract.flow, effect: 'write' as const } };
		// The summary is not in the contract hash, so only the sandbox finds this one.
		const summarized = { ...contract, summary: 'Get another greeting.' };

		await expect(
			service().publishPacked(
				{ ...codeOf(next), manifest: { ...next.manifest, contract: writes } },
				fixtures,
				options,
			),
		).rejects.toThrow(
			'The manifest is not valid: The version manifest is not valid or its contract changed',
		);
		expect(contractHash(summarized)).toBe(next.manifest.contractHash);
		await expect(
			service().publishPacked(
				{ ...codeOf(next), manifest: { ...next.manifest, contract: summarized } },
				fixtures,
				options,
			),
		).rejects.toThrow(`The bundle of ${ID}@1.0.1 describes another contract than its manifest`);
		const sdk = 'export default {};';
		const digest = `sha256:${createHash('sha256').update(sdk).digest('hex')}`;
		await expect(
			service().publishPacked(
				{ ...codeOf(next), manifest: { ...next.manifest, sdk: { version: '0.1.0', digest } }, sdk },
				fixtures,
				options,
			),
		).rejects.toThrow(
			`${ID}@1.0.1 pins the SDK runtime ${digest}, which this instance does not have`,
		);
		expect(
			await Container.get(NodeContractVersionRepository).findOneBy({ contractId: 'sdkRuntime' }),
		).toBeNull();
	});

	it('refuses a config as the next version of a code action', async () => {
		const config = {
			contract: {
				id: ID,
				version: 1,
				node: 'acmeCode',
				action: 'Greet',
				summary: 'Get a greeting for a name.',
				flow: { effect: 'read', cardinality: 'per-item', idempotent: true, passthrough: 'replace' },
				credentials: [],
				input: {
					type: 'object',
					properties: { name: { type: 'string' } },
					required: ['name'],
					additionalProperties: false,
				},
				output: {
					type: 'object',
					properties: { text: { type: 'string' } },
					required: ['text'],
					additionalProperties: false,
				},
			},
			baseUrl: server.url,
			request: { method: 'GET', path: '/greet', query: { name: { input: 'name' } } },
		};

		await expect(
			service().publish(config, { executions: [] }, { userId: state.owner.id }),
		).rejects.toThrow(`${ID}@1.0.0 is code, so the next version cannot be a config`);
	});

	it('publishes the next version of the source, then hides the action', async () => {
		const next = await packGreet('1.1.0', '!');
		const result = await service().testPacked(
			codeOf(next),
			{ name: 'Ada' },
			undefined,
			state.owner,
		);
		expect(result).toMatchObject({ status: 'success', items: [{ text: 'Hello Ada!' }] });

		const manifest = await service().publishPacked(
			codeOf(next),
			{ executions: [result.fixture] },
			{ userId: state.owner.id },
		);

		expect(manifest).toMatchObject({ id: ID, semver: '1.1.0' });
		const own = async () => (await service().list()).filter(({ actionId }) => actionId === ID);
		expect((await own()).map(({ semver, status }) => [semver, status])).toEqual([
			['1.1.0', 'published'],
			['1.0.0', 'published'],
		]);

		await service().hide(ID);

		expect((await own()).map(({ status }) => status)).toEqual(['hidden', 'hidden']);
		const { publishedActions } = await import('@n8n/instance-ai');
		expect(publishedActions().map(({ id }) => id)).not.toContain(ID);
	}, 120_000);
});
