/**
 * Integration test for the runtime-credentials backend module.
 *
 * Drives a workflow with a synthetic trigger payload through `WorkflowRunner`
 * and verifies the full path: configured rule → trigger payload stripped at
 * context establishment → downstream node reads value via `getRuntimeCredential`.
 *
 * Uses two inline test nodes (registered under the `n8n-nodes-base.*` namespace
 * the integration `initNodeTypes` helper expects):
 *   - `testSensitiveTrigger` — bare trigger description; never actually fires,
 *     the test feeds its output directly via `nodeExecutionStack`.
 *   - `runtimeCredentialEcho` — calls `this.getRuntimeCredential(alias)` for a
 *     CSV list of aliases and emits one item per alias.
 */

import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ExecutionContextHookRegistry } from 'n8n-core';
import type {
	IExecuteData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypeData,
	IRunExecutionData,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowRunner } from '@/workflow-runner';

import { saveCredential } from '../shared/db/credentials';
import { LicenseMocker } from '../shared/license';
import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';

// ---------------------------------------------------------------------------
// Inline test nodes
// ---------------------------------------------------------------------------

const TRIGGER_NODE_TYPE = 'n8n-nodes-base.testSensitiveTrigger';
const ECHO_NODE_TYPE = 'n8n-nodes-base.runtimeCredentialEcho';

const testSensitiveTrigger: INodeType = {
	description: {
		displayName: 'Test Sensitive Trigger',
		name: 'testSensitiveTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Synthetic trigger for runtime-credentials integration tests',
		defaults: { name: 'Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		// Never actually invoked — the test pre-populates the trigger output via
		// `nodeExecutionStack`. Provided only to satisfy the trigger interface.
		return {};
	},
};

const runtimeCredentialEcho: INodeType = {
	description: {
		displayName: 'Runtime Credential Echo',
		name: 'runtimeCredentialEcho',
		group: ['transform'],
		version: 1,
		description: 'Echoes the result of getRuntimeCredential for each requested alias',
		defaults: { name: 'Echo' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Aliases',
				name: 'aliases',
				type: 'string',
				default: '',
				description: 'Comma-separated alias list',
			},
		],
	},
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const aliases = (this.getNodeParameter('aliases', 0) as string)
			.split(',')
			.map((a) => a.trim())
			.filter((a) => a.length > 0);

		const out: INodeExecutionData[] = await Promise.all(
			aliases.map(async (alias) => {
				const value = await this.getRuntimeCredential(alias);
				return {
					json: {
						alias,
						value: value === undefined ? null : value,
						valueType: typeof value,
					},
				};
			}),
		);

		return [out];
	},
};

// Registered under the HTTP Request type, because only nodes that enforce domain
// restrictions may resolve `$runtimeCredentials`.
const CONSUMER_NODE_TYPE = 'n8n-nodes-base.httpRequest';

const credentialConsumer: INodeType = {
	description: {
		displayName: 'Credential Consumer',
		name: 'httpRequest',
		group: ['transform'],
		version: 1,
		description: 'Returns the header that its Header Auth credential resolves to',
		defaults: { name: 'Consumer' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'httpHeaderAuth', required: true }],
		properties: [],
	},
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('httpHeaderAuth');
		// Echoes the value, like an API that returns the headers it received.
		return [
			[
				{
					json: {
						headerName: credentials.name,
						headerValue: `Bearer ${String(credentials.value)}`,
					},
				},
			],
		];
	},
};

const NODE_TYPES: INodeTypeData = {
	[TRIGGER_NODE_TYPE]: { type: testSensitiveTrigger, sourcePath: '' },
	[ECHO_NODE_TYPE]: { type: runtimeCredentialEcho, sourcePath: '' },
	[CONSUMER_NODE_TYPE]: { type: credentialConsumer, sourcePath: '' },
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RULES = {
	apiKey: { nodeType: '*', path: 'headers.authorization' },
	formPwd: { nodeType: TRIGGER_NODE_TYPE, path: 'body.password' },
	wrongNodeType: { nodeType: 'n8n-nodes-base.formTrigger', path: 'body.password' },
	missingPath: { nodeType: '*', path: 'does.not.exist' },
};

const TRIGGER_PAYLOAD = {
	headers: { authorization: 'secret-A', ua: 'mozilla' },
	body: { password: 'pw-B', email: 'a@b.test' },
};

const REQUESTED_ALIASES = ['apiKey', 'formPwd', 'wrongNodeType', 'missingPath', 'unknownAlias'];

function buildWorkflow() {
	const triggerId = uuid();
	const echoId = uuid();

	return {
		name: 'Runtime Credentials Integration',
		nodes: [
			{
				id: triggerId,
				name: 'Trigger',
				type: TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
			{
				id: echoId,
				name: 'Echo',
				type: ECHO_NODE_TYPE,
				typeVersion: 1,
				position: [200, 0] as [number, number],
				parameters: { aliases: REQUESTED_ALIASES.join(',') },
			},
		],
		connections: {
			Trigger: {
				main: [[{ node: 'Echo', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		},
	};
}

function buildConsumerWorkflow(credential: { id: string; name: string }) {
	return {
		name: 'Runtime Credentials Consumer',
		nodes: [
			{
				id: uuid(),
				name: 'Trigger',
				type: TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
			{
				id: uuid(),
				name: 'Consumer',
				type: CONSUMER_NODE_TYPE,
				typeVersion: 1,
				position: [200, 0] as [number, number],
				parameters: {},
				credentials: { httpHeaderAuth: credential },
			},
		],
		connections: {
			Trigger: {
				main: [[{ node: 'Consumer', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		},
	};
}

function buildExecutionData(triggerNode: INode): IRunExecutionData {
	const startItem: IExecuteData = {
		node: triggerNode,
		// Deep copy: the strip clears values in place, so a shallow copy leaks into the next test.
		data: { main: [[{ json: structuredClone(TRIGGER_PAYLOAD) }]] },
		source: null,
	};
	return createRunExecutionData({
		executionData: { nodeExecutionStack: [startItem] },
	});
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('runtime-credentials module — integration', () => {
	let owner: User;
	let workflowRunner: WorkflowRunner;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		// Module init reads both env vars; they MUST be set before loadModules().
		process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
		process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES = JSON.stringify(RULES);

		await testModules.loadModules(['runtime-credentials']);
		await testDb.init();

		// `loadModules` only imports the module file (the @BackendModule decorator
		// fires); `initModules` is what runs each module's `init()` body — that's
		// where runtime-credentials wires its hook and provider. Both phases run
		// in production (see `commands/{start,worker,webhook}.ts`).
		await Container.get(ModuleRegistry).initModules('main');

		// Decorator-registered hooks are only instantiated when the registry's
		// init() runs. The hook decorator fires during the module's `init()`
		// above (via dynamic import), so this must come after `initModules`.
		await Container.get(ExecutionContextHookRegistry).init();

		await utils.initNodeTypes(NODE_TYPES);
		await utils.initCredentialsTypes();
		// Decrypting a credential consults the license state (external secrets).
		new LicenseMocker().mockLicenseState(Container.get(LicenseState));
		await utils.initBinaryDataService();

		owner = await createOwner();
		workflowRunner = Container.get(WorkflowRunner);
		executionRepository = Container.get(ExecutionRepository);
	});

	afterEach(async () => {
		await testDb.truncate([
			'ExecutionEntity',
			'WorkflowEntity',
			'SharedCredentials',
			'CredentialsEntity',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
	});

	async function waitForExecution(executionId: string, timeout = 5_000): Promise<void> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOneBy({ id: executionId });
			// A failed run never sets `finished`, so wait for any final status.
			if (execution && ['success', 'error', 'crashed'].includes(execution.status)) return;
			await new Promise((r) => setTimeout(r, 50));
		}
		throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
	}

	async function loadExecution(executionId: string) {
		const e = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		if (!e) throw new Error(`Execution ${executionId} not found`);
		return e;
	}

	it('strips configured fields from the trigger output and exposes them via getRuntimeCredential', async () => {
		const workflow = await createWorkflow(buildWorkflow() as Partial<IWorkflowDb>, owner);
		const triggerNode = workflow.nodes.find((n) => n.name === 'Trigger') as INode;
		const executionData = buildExecutionData(triggerNode);

		const executionId = await workflowRunner.run(
			{
				workflowData: workflow,
				userId: owner.id,
				executionMode: 'webhook',
				executionData,
			},
			true,
		);

		await waitForExecution(executionId);
		const execution = await loadExecution(executionId);

		expect(execution.status).toBe('success');

		const runData = execution.data.resultData.runData;
		const triggerOutput = runData.Trigger?.[0]?.data?.main?.[0]?.[0]?.json;
		const echoOutputItems = runData.Echo?.[0]?.data?.main?.[0] ?? [];

		// --- echo output: one item per requested alias, indexed by alias ----
		const byAlias = Object.fromEntries(
			echoOutputItems.map((item) => [item.json.alias as string, item.json]),
		) as Record<string, { alias: string; value: unknown; valueType: string }>;

		// The node read the value, and output scrubbing replaced it before the run was saved.
		expect(byAlias.apiKey.value).toEqual(['[runtime credential: apiKey]']); // wildcard rule + matched path
		expect(byAlias.formPwd.value).toEqual(['pw-B']); // node-type-scoped rule + matched path

		expect(byAlias.wrongNodeType.value).toBeNull(); // rule scoped to a different node type
		expect(byAlias.wrongNodeType.valueType).toBe('undefined');

		expect(byAlias.missingPath.value).toBeNull(); // configured path absent in payload
		expect(byAlias.missingPath.valueType).toBe('undefined');

		expect(byAlias.unknownAlias.value).toBeNull(); // alias not in rules
		expect(byAlias.unknownAlias.valueType).toBe('undefined');

		// --- trigger output: matched fields stripped, others preserved ------
		expect(triggerOutput).toBeDefined();
		expect((triggerOutput!.headers as Record<string, unknown>).authorization).toBeUndefined();
		expect((triggerOutput!.headers as Record<string, unknown>).ua).toBe('mozilla');
		expect((triggerOutput!.body as Record<string, unknown>).password).toBeUndefined();
		expect((triggerOutput!.body as Record<string, unknown>).email).toBe('a@b.test');

		// --- no-leak scrub: plaintext secrets are absent from the trigger's
		// persisted output (the artifact lives encrypted on runtimeData; the
		// Echo node legitimately re-surfaces values in its own output).
		const triggerRunDataJson = JSON.stringify(runData.Trigger);
		expect(triggerRunDataJson).not.toContain('secret-A');
		expect(triggerRunDataJson).not.toContain('pw-B');

		// --- secureArtifacts on runtimeData is encrypted (not plaintext) ----
		const secureArtifacts = execution.data.executionData?.runtimeData?.secureArtifacts;
		expect(typeof secureArtifacts).toBe('string');
		expect(secureArtifacts as string).not.toContain('secret-A');
		expect(secureArtifacts as string).not.toContain('pw-B');
	});
	describe('$runtimeCredentials in credentials', () => {
		async function runConsumer(credentialOverrides: {
			isGlobal: boolean;
			allowedHttpRequestDomains: string;
		}) {
			const credential = await saveCredential(
				{
					name: 'Inbound auth (runtime)',
					type: 'httpHeaderAuth',
					isGlobal: credentialOverrides.isGlobal,
					data: {
						name: 'Authorization',
						value: '={{ $runtimeCredentials.apiKey }}',
						allowedHttpRequestDomains: credentialOverrides.allowedHttpRequestDomains,
						allowedDomains: 'api.partner.test',
					},
				} as Parameters<typeof saveCredential>[0],
				{ user: owner, role: 'credential:owner' },
			);
			const workflow = await createWorkflow(
				buildConsumerWorkflow({ id: credential.id, name: credential.name }) as Partial<IWorkflowDb>,
				owner,
			);
			const triggerNode = workflow.nodes.find((n) => n.name === 'Trigger') as INode;

			const executionId = await workflowRunner.run(
				{
					workflowData: workflow,
					userId: owner.id,
					executionMode: 'webhook',
					executionData: buildExecutionData(triggerNode),
				},
				true,
			);
			await waitForExecution(executionId);
			return await loadExecution(executionId);
		}

		it('resolves the stripped trigger value in an admin-managed credential', async () => {
			const execution = await runConsumer({ isGlobal: true, allowedHttpRequestDomains: 'domains' });

			expect(execution.data.resultData.error?.message).toBeUndefined();
			expect(execution.status).toBe('success');
			const output = execution.data.resultData.runData.Consumer?.[0]?.data?.main?.[0]?.[0]?.json;
			// The echoed value is scrubbed; the placeholder proves the credential resolved it.
			expect(output).toEqual({
				headerName: 'Authorization',
				headerValue: 'Bearer [runtime credential: apiKey]',
			});
			expect(JSON.stringify(execution.data)).not.toContain('secret-A');
		});

		it.each([
			[
				'a credential that is not global',
				{ isGlobal: false, allowedHttpRequestDomains: 'domains' },
				'available to all users',
			],
			[
				'a credential without a domain restriction',
				{ isGlobal: true, allowedHttpRequestDomains: 'all' },
				'specific domains',
			],
		])('fails the execution for %s', async (_name, overrides, message) => {
			const execution = await runConsumer(overrides);

			expect(execution.status).toBe('error');
			expect(execution.data.resultData.error?.message).toContain(message);
			expect(JSON.stringify(execution.data.resultData.runData)).not.toContain('secret-A');
		});
	});
});
