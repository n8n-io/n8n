/**
 * Negative-control integration test: with the runtime-credentials module not
 * loaded, the same workflow + payload as the happy-path test must behave as if
 * the module were absent — no stripping in the trigger output, and
 * `getRuntimeCredential` returns undefined for every alias.
 *
 * Lives in a separate spec file so Jest's per-file worker isolation guarantees
 * a clean process: the runtime-credentials provider registers itself globally
 * on `RuntimeCredentialProxyService` in module init, so reusing the same
 * worker across enabled/disabled cases would leak state.
 */

import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb, type User } from '@n8n/db';
import { Container } from '@n8n/di';
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

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';

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

const NODE_TYPES: INodeTypeData = {
	[TRIGGER_NODE_TYPE]: { type: testSensitiveTrigger, sourcePath: '' },
	[ECHO_NODE_TYPE]: { type: runtimeCredentialEcho, sourcePath: '' },
};

const TRIGGER_PAYLOAD = {
	headers: { authorization: 'secret-A', ua: 'mozilla' },
	body: { password: 'pw-B', email: 'a@b.test' },
};

const REQUESTED_ALIASES = ['apiKey', 'formPwd', 'unknownAlias'];

function buildWorkflow() {
	return {
		name: 'Runtime Credentials Disabled',
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
				name: 'Echo',
				type: ECHO_NODE_TYPE,
				typeVersion: 1,
				position: [200, 0] as [number, number],
				parameters: { aliases: REQUESTED_ALIASES.join(',') },
			},
		],
		connections: {
			Trigger: { main: [[{ node: 'Echo', type: NodeConnectionTypes.Main, index: 0 }]] },
		},
	};
}

function buildExecutionData(triggerNode: INode): IRunExecutionData {
	const startItem: IExecuteData = {
		node: triggerNode,
		data: { main: [[{ json: { ...TRIGGER_PAYLOAD } }]] },
		source: null,
	};
	return createRunExecutionData({
		executionData: { nodeExecutionStack: [startItem] },
	});
}

describe('runtime-credentials module — disabled', () => {
	let owner: User;
	let workflowRunner: WorkflowRunner;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		// Explicitly do NOT load runtime-credentials. Sanity-check the feature
		// flag is off so a stray env var from a parent process can't quietly
		// enable the module and turn this control test into a duplicate of the
		// happy-path test.
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;

		await testDb.init();
		await utils.initNodeTypes(NODE_TYPES);
		await utils.initBinaryDataService();

		owner = await createOwner();
		workflowRunner = Container.get(WorkflowRunner);
		executionRepository = Container.get(ExecutionRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function waitForExecution(executionId: string, timeout = 10_000): Promise<void> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOneBy({ id: executionId });
			if (execution?.finished) return;
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

	it('passes the trigger payload through unchanged and returns undefined for every alias', async () => {
		const workflow = await createWorkflow(buildWorkflow() as Partial<IWorkflowDb>, owner);
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
		const execution = await loadExecution(executionId);

		expect(execution.status).toBe('success');

		const runData = execution.data.resultData.runData;
		const triggerOutput = runData.Trigger?.[0]?.data?.main?.[0]?.[0]?.json;
		const echoOutputItems = runData.Echo?.[0]?.data?.main?.[0] ?? [];

		// Every alias resolves to undefined — the proxy has no provider.
		for (const item of echoOutputItems) {
			expect(item.json.value).toBeNull();
			expect(item.json.valueType).toBe('undefined');
		}

		// Trigger payload passes through verbatim — no hook ever touched it.
		expect(triggerOutput).toEqual(TRIGGER_PAYLOAD);
	});
});
