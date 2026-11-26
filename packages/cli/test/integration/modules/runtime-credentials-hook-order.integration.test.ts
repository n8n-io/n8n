/**
 * Hook order: a hook that the trigger node configures (here a stand-in for the bearer token
 * extractor) must read the real request value before the run-time input rule clears it.
 *
 * Phase 1 (capture) copies the value. The configured hook then reads and masks the header.
 * Phase 3 (finalize) writes the marker over the mask.
 */

import { ModuleRegistry } from '@n8n/backend-common';
import { createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb, type User } from '@n8n/db';
import {
	ContextEstablishmentHook,
	type ContextEstablishmentOptions,
	type ContextEstablishmentResult,
	type HookDescription,
	type IContextEstablishmentHook,
} from '@n8n/decorators';
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

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';

const TRIGGER_NODE_TYPE = 'n8n-nodes-base.testHookOrderTrigger';
const ECHO_NODE_TYPE = 'n8n-nodes-base.testHookOrderEcho';
const EXTRACTOR_NAME = 'TestBearerExtractor';
const MARKER = '[moved to credential: httpHeaderAuth]';

/** What the configured hook saw in the trigger items when it ran. */
const seenByExtractor: { authorization?: unknown } = {};

@ContextEstablishmentHook({ alwaysExecute: false })
export class TestBearerExtractor implements IContextEstablishmentHook {
	hookDescription: HookDescription = { name: EXTRACTOR_NAME };

	isApplicableToTriggerNode(): boolean {
		return true;
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		const headers = options.triggerItems?.[0]?.json.headers as Record<string, unknown> | undefined;
		seenByExtractor.authorization = headers?.authorization;
		// Same as the dynamic credentials extractors: mask the header in the trigger item.
		if (headers) headers.authorization = '**********';
		return { triggerItems: options.triggerItems ?? undefined };
	}
}

const trigger: INodeType = {
	description: {
		displayName: 'Test Hook Order Trigger',
		name: 'testHookOrderTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Synthetic trigger for the hook order test',
		defaults: { name: 'Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		// The node loader adds these two properties to real trigger nodes. A parameter that the
		// node type does not declare is dropped, so the test node declares them itself.
		properties: [
			{
				displayName: 'Executions Hooks Version',
				name: 'executionsHooksVersion',
				type: 'hidden',
				default: 1,
			},
			{
				displayName: 'Context establishment hooks',
				name: 'contextEstablishmentHooks',
				type: 'fixedCollection',
				default: {},
				typeOptions: { multipleValues: true },
				options: [
					{
						name: 'hooks',
						displayName: 'Hooks',
						values: [
							{
								displayName: 'Hook name',
								name: 'hookName',
								type: 'options',
								options: [{ name: EXTRACTOR_NAME, value: EXTRACTOR_NAME }],
								default: '',
							},
						],
					},
				],
			},
		],
	},
	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		return {};
	},
};

const echo: INodeType = {
	description: {
		displayName: 'Test Hook Order Echo',
		name: 'testHookOrderEcho',
		group: ['transform'],
		version: 1,
		description: 'Echoes the run-time value of the apiKey alias',
		defaults: { name: 'Echo' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const value = await this.getRuntimeCredential('apiKey');
		return [[{ json: { value: value ?? null } }]];
	},
};

const NODE_TYPES: INodeTypeData = {
	[TRIGGER_NODE_TYPE]: { type: trigger, sourcePath: '' },
	[ECHO_NODE_TYPE]: { type: echo, sourcePath: '' },
};

const RULES = {
	apiKey: {
		nodeType: '*',
		path: 'headers.authorization',
		credentialType: 'httpHeaderAuth',
		transform: 'field:value',
	},
};

function buildWorkflow() {
	return {
		name: 'Runtime Credentials Hook Order',
		nodes: [
			{
				id: uuid(),
				name: 'Trigger',
				type: TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {
					executionsHooksVersion: 1,
					contextEstablishmentHooks: { hooks: [{ hookName: EXTRACTOR_NAME }] },
				},
			},
			{
				id: uuid(),
				name: 'Echo',
				type: ECHO_NODE_TYPE,
				typeVersion: 1,
				position: [200, 0] as [number, number],
				parameters: {},
			},
		],
		connections: {
			Trigger: { main: [[{ node: 'Echo', type: NodeConnectionTypes.Main, index: 0 }]] },
		},
	};
}

describe('runtime-credentials hook order: integration', () => {
	let owner: User;
	let workflowRunner: WorkflowRunner;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
		process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES = JSON.stringify(RULES);

		await testModules.loadModules(['runtime-credentials']);
		await testDb.init();
		await utils.initCredentialsTypes();
		await Container.get(ModuleRegistry).initModules('main');
		await Container.get(ExecutionContextHookRegistry).init();
		await utils.initNodeTypes(NODE_TYPES);
		await utils.initBinaryDataService();

		owner = await createOwner();
		workflowRunner = Container.get(WorkflowRunner);
		executionRepository = Container.get(ExecutionRepository);
	});

	afterAll(async () => {
		await testDb.terminate();
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
	});

	it('lets the configured hook read the real value, then leaves the marker', async () => {
		const workflow = await createWorkflow(buildWorkflow() as Partial<IWorkflowDb>, owner);
		const triggerNode = workflow.nodes.find((n) => n.name === 'Trigger') as INode;
		const startItem: IExecuteData = {
			node: triggerNode,
			data: { main: [[{ json: { headers: { authorization: 'Bearer tok-123', ua: 'x' } } }]] },
			source: null,
		};
		const executionData: IRunExecutionData = createRunExecutionData({
			executionData: { nodeExecutionStack: [startItem] },
		});

		const executionId = await workflowRunner.run(
			{ workflowData: workflow, userId: owner.id, executionMode: 'webhook', executionData },
			true,
		);

		const start = Date.now();
		for (;;) {
			const execution = await executionRepository.findOneBy({ id: executionId });
			if (execution?.finished) break;
			if (Date.now() - start > 30_000) throw new Error('Execution did not finish');
			await new Promise((r) => setTimeout(r, 50));
		}
		const execution = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		const runData = execution!.data.resultData.runData;

		// The configured hook saw the real value, not the marker.
		expect(seenByExtractor.authorization).toBe('Bearer tok-123');
		// The value was captured for the credential.
		expect(runData.Echo?.[0]?.data?.main?.[0]?.[0]?.json.value).toEqual(['Bearer tok-123']);
		// The stored trigger output has the marker, not the mask and not the value.
		const headers = runData.Trigger?.[0]?.data?.main?.[0]?.[0]?.json.headers as Record<
			string,
			unknown
		>;
		expect(headers.authorization).toBe(MARKER);
		expect(headers.ua).toBe('x');
		expect(JSON.stringify(runData.Trigger)).not.toContain('tok-123');
	});
});
