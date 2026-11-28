/**
 * Allowed domains of a run-time input rule.
 *
 * The rule limits the hosts that the secret can be sent to. n8n reuses the allowed domain
 * fields of a credential, so the HTTP Request node checks them. These tests run a real
 * HTTP Request node with a stub credential.
 */

import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { createWorkflow, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ExecutionContextHookRegistry } from 'n8n-core';
import { HttpRequest } from 'n8n-nodes-base/nodes/HttpRequest/HttpRequest.node';
import type {
	IExecuteData,
	INode,
	INodeType,
	INodeTypeData,
	IRunExecutionData,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { v4 as uuid } from 'uuid';

import { runtimeStubId } from '@/modules/runtime-credentials/runtime-credentials.service';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';

const TRIGGER_NODE_TYPE = 'n8n-nodes-base.testAllowedDomainsTrigger';
const STUB_ID = runtimeStubId('limited');
const RULES = {
	limited: {
		nodeType: '*',
		path: 'headers.x-secret',
		credentialType: 'httpBasicAuth',
		transform: 'field:password',
		allowedDomains: '127.0.0.1',
	},
};

const trigger: INodeType = {
	description: {
		displayName: 'Test Allowed Domains Trigger',
		name: 'testAllowedDomainsTrigger',
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

const NODE_TYPES: INodeTypeData = {
	[TRIGGER_NODE_TYPE]: { type: trigger, sourcePath: '' },
	'n8n-nodes-base.httpRequest': { type: new HttpRequest() as unknown as INodeType, sourcePath: '' },
};

describe('run-time input rule allowed domains: integration', () => {
	let owner: User;
	let server: Server;
	let port: number;
	let requestsSeen: number;

	beforeAll(async () => {
		mockInstance(LicenseState);
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

		server = createServer((_req, res) => {
			requestsSeen++;
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ ok: true }));
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		port = (server.address() as AddressInfo).port;
	});

	beforeEach(() => {
		requestsSeen = 0;
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
		await testDb.terminate();
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
		delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
	});

	const runWithUrl = async (url: string) => {
		const workflow = await createWorkflow(
			{
				name: 'Allowed domains',
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
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [200, 0],
						parameters: {
							url,
							authentication: 'genericCredentialType',
							genericAuthType: 'httpBasicAuth',
						},
						credentials: { httpBasicAuth: { id: STUB_ID, name: 'Request value: limited' } },
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'HTTP', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
			} as Partial<IWorkflowDb>,
			owner,
		);
		const triggerNode = workflow.nodes.find((n) => n.name === 'Trigger') as INode;
		const startItem: IExecuteData = {
			node: triggerNode,
			data: { main: [[{ json: { headers: { 'x-secret': 'tok-123' } } }]] },
			source: null,
		};
		const executionData: IRunExecutionData = createRunExecutionData({
			executionData: { nodeExecutionStack: [startItem] },
		});

		const executionId = await Container.get(WorkflowRunner).run(
			{ workflowData: workflow, userId: owner.id, executionMode: 'webhook', executionData },
			true,
		);

		const repository = Container.get(ExecutionRepository);
		const start = Date.now();
		for (;;) {
			const execution = await repository.findOneBy({ id: executionId });
			if (execution?.finished || execution?.status === 'error') break;
			if (Date.now() - start > 30_000) throw new Error('Execution did not finish');
			await new Promise((r) => setTimeout(r, 50));
		}
		const execution = await repository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		return execution!.data.resultData;
	};

	it('blocks the request to a host that the rule does not list', async () => {
		const result = await runWithUrl(`http://localhost:${port}/`);

		expect(result.error?.message).toContain('Domain not allowed');
		expect(requestsSeen).toBe(0);
		expect(JSON.stringify(result)).not.toContain('tok-123');
	});

	it('sends the request to a host that the rule lists', async () => {
		const result = await runWithUrl(`http://127.0.0.1:${port}/`);

		expect(result.error).toBeUndefined();
		expect(requestsSeen).toBe(1);
		expect(result.runData.HTTP?.[0]?.data?.main?.[0]?.[0]?.json).toEqual({ ok: true });
	});
});
