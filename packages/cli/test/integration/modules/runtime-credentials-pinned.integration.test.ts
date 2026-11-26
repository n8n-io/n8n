/**
 * Pinned trigger data and run-time inputs.
 *
 * Pinned data replaces the output of the trigger node in a manual run. The context hook
 * only sees the items that enter the trigger. These tests record what that means for a
 * matched path and for a stub credential.
 */

import { ModuleRegistry } from '@n8n/backend-common';
import { createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ExecutionContextHookRegistry } from 'n8n-core';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeData,
	IPinData,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsHelper } from '@/credentials-helper';
import {
	runtimeStubId,
	stripMarker,
} from '@/modules/runtime-credentials/runtime-credentials.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';

const TRIGGER_NODE_TYPE = 'n8n-nodes-base.testPinnedTrigger';
const ECHO_NODE_TYPE = 'n8n-nodes-base.testPinnedEcho';

const testPinnedTrigger: INodeType = {
	description: {
		displayName: 'Test Pinned Trigger',
		name: 'testPinnedTrigger',
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

/** Copies its input and adds the artifact that the hook stored for the alias. */
const testPinnedEcho: INodeType = {
	description: {
		displayName: 'Test Pinned Echo',
		name: 'testPinnedEcho',
		group: ['transform'],
		version: 1,
		description: 'Echo',
		defaults: { name: 'Echo' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	},
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const artifact = await this.getRuntimeCredential('bearerToken');
		return [
			this.getInputData().map((item) => ({
				json: { input: item.json, artifact: artifact === undefined ? null : artifact },
			})),
		];
	},
};

const NODE_TYPES: INodeTypeData = {
	[TRIGGER_NODE_TYPE]: { type: testPinnedTrigger, sourcePath: '' },
	[ECHO_NODE_TYPE]: { type: testPinnedEcho, sourcePath: '' },
};

const RULES = {
	bearerToken: {
		nodeType: '*',
		path: 'headers.authorization',
		credentialType: 'httpHeaderAuth',
		transform: 'field:value',
	},
};
const STUB_ID = runtimeStubId('bearerToken');
const MARKER = stripMarker('httpHeaderAuth');
const REAL_VALUE = 'Bearer real-secret-1';

describe('runtime-credentials: pinned trigger data', { timeout: 60_000 }, () => {
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

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
	});

	const buildWorkflow = async (pinData?: IPinData) =>
		await createWorkflow(
			{
				name: 'Pinned run-time inputs',
				nodes: [
					{
						id: uuid(),
						name: 'Trigger',
						type: TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: uuid(),
						name: 'Echo',
						type: ECHO_NODE_TYPE,
						typeVersion: 1,
						position: [200, 0],
						parameters: {},
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'Echo', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
				...(pinData ? { pinData } : {}),
			} as Partial<IWorkflowDb>,
			owner,
		);

	const runManually = async (workflowData: IWorkflowDb, pinData: IPinData) => {
		const executionId = await workflowRunner.run(
			{ workflowData, userId: owner.id, executionMode: 'manual', pinData },
			true,
		);
		const start = Date.now();
		while (Date.now() - start < 10_000) {
			const execution = await executionRepository.findOneBy({ id: executionId });
			if (execution?.finished) break;
			await new Promise((r) => setTimeout(r, 50));
		}
		const execution = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		if (!execution) throw new Error('Execution not found');
		return execution;
	};

	/** What a node sees when it asks for the stub credential in the persisted context. */
	const resolveStub = async (executionContext: unknown) => {
		const additionalData = await WorkflowExecuteAdditionalData.getBase({ userId: owner.id });
		additionalData.executionContext = executionContext as never;
		return await Container.get(CredentialsHelper).getDecrypted(
			additionalData,
			{ id: STUB_ID, name: 'Request value: bearerToken' },
			'httpHeaderAuth',
			'manual',
			undefined,
			true,
		);
	};

	const pinned = (authorization: string): IPinData => ({
		Trigger: [{ json: { headers: { authorization, ua: 'curl' } } }],
	});

	it('shows the marker when the pin came from a stripped execution output', async () => {
		const pinData = pinned(MARKER);
		const execution = await runManually(await buildWorkflow(pinData), pinData);

		expect(execution.status).toBe('success');
		const echo = execution.data.resultData.runData.Echo?.[0]?.data?.main?.[0]?.[0]?.json;
		expect(echo).toEqual({
			input: { headers: { authorization: MARKER, ua: 'curl' } },
			artifact: null,
		});
		// The hook found no items on the trigger input, so it stored no artifacts.
		expect(execution.data.executionData?.runtimeData?.secureArtifacts).toBeUndefined();
	});

	it('does not run the stub on a manual run with pinned trigger data', async () => {
		const pinData = pinned(MARKER);
		const execution = await runManually(await buildWorkflow(pinData), pinData);

		await expect(resolveStub(execution.data.executionData?.runtimeData)).rejects.toThrow(
			'Run the workflow through its trigger',
		);
	});

	it('keeps a real value that someone pinned by hand, and the hook does not strip it', async () => {
		const pinData = pinned(REAL_VALUE);
		const workflow = await buildWorkflow(pinData);
		const execution = await runManually(workflow, pinData);

		// The value stays in the workflow pin data, in the stored run data, and downstream.
		expect(JSON.stringify(workflow.pinData)).toContain(REAL_VALUE);
		expect(JSON.stringify(execution.data.resultData.pinData)).toContain(REAL_VALUE);
		expect(JSON.stringify(execution.data.resultData.runData)).toContain(REAL_VALUE);
		// The hook never saw the value, so the stub has nothing to use.
		expect(execution.data.executionData?.runtimeData?.secureArtifacts).toBeUndefined();
		await expect(resolveStub(execution.data.executionData?.runtimeData)).rejects.toThrow(
			'Run the workflow through its trigger',
		);
	});
});
