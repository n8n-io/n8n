/**
 * Output scrubbing and audit event: a node that runs with a run-time stub credential must not
 * leave the request value in its output or in its error, and the use must send one audit event.
 */

import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
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
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { createRunExecutionData, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { runtimeStubId } from '@/modules/runtime-credentials/runtime-credentials.service';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from '../shared/db/users';
import { LicenseMocker } from '../shared/license';
import * as utils from '../shared/utils';

const TRIGGER_NODE_TYPE = 'n8n-nodes-base.testScrubTrigger';
const CONSUMER_NODE_TYPE = 'n8n-nodes-base.testScrubConsumer';
const PLAIN_NODE_TYPE = 'n8n-nodes-base.testScrubPlain';
const SECRET = 'sk_live_abcdef123456';
const PLACEHOLDER = '[runtime credential: tenantKey]';
const STUB_ID = runtimeStubId('tenantKey');

const trigger: INodeType = {
	description: {
		displayName: 'Test Scrub Trigger',
		name: 'testScrubTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Synthetic trigger',
		defaults: { name: 'Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		return {};
	},
};

/** Echoes the credential like an API that returns the header it received. Can also throw it. */
const consumer: INodeType = {
	description: {
		displayName: 'Test Scrub Consumer',
		name: 'testScrubConsumer',
		group: ['transform'],
		version: 1,
		description: 'Uses the stub credential',
		defaults: { name: 'Consumer' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'httpHeaderAuth', required: true }],
		properties: [
			{ displayName: 'Fail', name: 'fail', type: 'boolean', default: false },
			{ displayName: 'Call count', name: 'calls', type: 'number', default: 1 },
		],
	},
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const calls = this.getNodeParameter('calls', 0) as number;
		let value = '';
		for (let i = 0; i < calls; i++) {
			value = String((await this.getCredentials('httpHeaderAuth')).value);
		}
		if (this.getNodeParameter('fail', 0) as boolean) {
			throw new NodeOperationError(this.getNode(), `Rejected key ${value}`);
		}
		return [[{ json: { echoed: { header: `Bearer ${value}`, list: [value] } } }]];
	},
};

/** Uses no credential and returns the same text. It must stay untouched. */
const plain: INodeType = {
	description: {
		displayName: 'Test Scrub Plain',
		name: 'testScrubPlain',
		group: ['transform'],
		version: 1,
		description: 'Returns fixed text',
		defaults: { name: 'Plain' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
	async execute(): Promise<INodeExecutionData[][]> {
		return [[{ json: { text: SECRET } }]];
	},
};

const NODE_TYPES: INodeTypeData = {
	[TRIGGER_NODE_TYPE]: { type: trigger, sourcePath: '' },
	[CONSUMER_NODE_TYPE]: { type: consumer, sourcePath: '' },
	[PLAIN_NODE_TYPE]: { type: plain, sourcePath: '' },
};

const RULES = {
	tenantKey: {
		nodeType: '*',
		path: 'headers.x-tenant-key',
		credentialType: 'httpHeaderAuth',
		transform: 'field:value',
	},
};

const node = (name: string, type: string, x: number, parameters = {}, credentials = {}) => ({
	id: uuid(),
	name,
	type,
	typeVersion: 1,
	position: [x, 0] as [number, number],
	parameters,
	credentials,
});

const stubCredential = { httpHeaderAuth: { id: STUB_ID, name: 'Request value: tenantKey' } };

describe('runtime-credentials output scrubbing: integration', () => {
	vi.setConfig({ testTimeout: 60_000 });
	let owner: User;
	let workflowRunner: WorkflowRunner;
	let executionRepository: ExecutionRepository;
	const emitted: Array<Record<string, unknown>> = [];

	beforeAll(async () => {
		process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
		process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES = JSON.stringify(RULES);

		await testModules.loadModules(['runtime-credentials']);
		await testDb.init();
		await utils.initCredentialsTypes();
		// Decrypting a credential consults the license state.
		new LicenseMocker().mockLicenseState(Container.get(LicenseState));
		await Container.get(ModuleRegistry).initModules('main');
		await Container.get(ExecutionContextHookRegistry).init();
		await utils.initNodeTypes(NODE_TYPES);
		await utils.initBinaryDataService();

		Container.get(EventService).on('runtime-credential-used', (event) => {
			emitted.push(event);
		});

		owner = await createOwner();
		workflowRunner = Container.get(WorkflowRunner);
		executionRepository = Container.get(ExecutionRepository);
	});

	beforeEach(() => {
		emitted.length = 0;
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
	});

	async function run(consumerParameters: Record<string, unknown>) {
		const workflow = await createWorkflow(
			{
				name: 'Runtime Credentials Scrub',
				nodes: [
					node('Trigger', TRIGGER_NODE_TYPE, 0),
					node('Consumer', CONSUMER_NODE_TYPE, 200, consumerParameters, stubCredential),
					node('Plain', PLAIN_NODE_TYPE, 400),
				],
				connections: {
					Trigger: { main: [[{ node: 'Consumer', type: NodeConnectionTypes.Main, index: 0 }]] },
					Consumer: { main: [[{ node: 'Plain', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
			} as Partial<IWorkflowDb>,
			owner,
		);
		const triggerNode = workflow.nodes.find((n) => n.name === 'Trigger') as INode;
		const startItem: IExecuteData = {
			node: triggerNode,
			data: { main: [[{ json: { headers: { 'x-tenant-key': SECRET } } }]] },
			source: null,
		};
		const executionId = await workflowRunner.run(
			{
				workflowData: workflow,
				userId: owner.id,
				executionMode: 'webhook',
				executionData: createRunExecutionData({
					executionData: { nodeExecutionStack: [startItem] },
				}),
			},
			true,
		);

		const start = Date.now();
		for (;;) {
			const execution = await executionRepository.findOneBy({ id: executionId });
			if (execution && ['success', 'error'].includes(execution.status)) break;
			if (Date.now() - start > 20_000) {
				throw new Error(`Execution did not finish: ${JSON.stringify(execution)}`);
			}
			await new Promise((r) => setTimeout(r, 50));
		}
		const execution = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		return { execution: execution!, executionId, workflowId: workflow.id };
	}

	it('replaces the value in the output of the node that used the stub, and only there', async () => {
		const { execution } = await run({});
		const runData = execution.data.resultData.runData;

		expect(execution.data.resultData.error?.message).toBeUndefined();
		expect(runData.Consumer[0].data?.main?.[0]?.[0]?.json).toEqual({
			echoed: { header: `Bearer ${PLACEHOLDER}`, list: [PLACEHOLDER] },
		});
		// A node without the stub is not scrubbed (documented limit).
		expect(runData.Plain[0].data?.main?.[0]?.[0]?.json).toEqual({ text: SECRET });
		expect(JSON.stringify(runData.Trigger)).not.toContain(SECRET);
		expect(JSON.stringify(runData.Consumer)).not.toContain(SECRET);
	});

	it('replaces the value in the error of the node', async () => {
		const { execution } = await run({ fail: true });
		const runData = execution.data.resultData.runData;

		expect(execution.status).toBe('error');
		expect(runData.Consumer[0].error?.message).toBe(`Rejected key ${PLACEHOLDER}`);
		expect(JSON.stringify(runData.Consumer)).not.toContain(SECRET);
		expect(JSON.stringify(execution.data.resultData.error)).not.toContain(SECRET);
	});

	it('sends one audit event for each execution, stub and node, without the value', async () => {
		const { executionId, workflowId } = await run({ calls: 3 });

		expect(emitted).toEqual([
			{
				alias: 'tenantKey',
				credentialId: STUB_ID,
				credentialType: 'httpHeaderAuth',
				workflowId,
				executionId,
				nodeName: 'Consumer',
				nodeType: CONSUMER_NODE_TYPE,
			},
		]);
		expect(JSON.stringify(emitted)).not.toContain(SECRET);
	});
});
