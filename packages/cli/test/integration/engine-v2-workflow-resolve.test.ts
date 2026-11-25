import {
	createActiveWorkflow,
	createWorkflow,
	getPersonalProject,
	testDb,
} from '@n8n/backend-test-utils';
import { EngineConfig } from '@n8n/config';
import type { IWorkflowDb, User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mintActionToken } from '@n8n/engine';
import type { JsonObject } from '@n8n/engine';
import { ErrorTrigger } from 'n8n-nodes-base/nodes/ErrorTrigger/ErrorTrigger.node';
import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';
import type {
	IConnections,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { UserError } from '@n8n/errors';

import { EngineControlPlaneServer } from '@/modules/engine-v2/engine-control-plane-server';
import { WORKFLOWS_RESOLVE_PATH } from '@/modules/engine-v2/engine-v2.constants';
import { EngineWorkflowResolveClient } from '@/modules/engine-v2/engine-workflow-resolve-client';
import type {
	ResolveErrorWorkflowRequest,
	ResolveSubWorkflowRequest,
} from '@/modules/engine-v2/engine-workflow-resolve.contract';

import { createMember } from './shared/db/users';
import { buildDefaultNodes, initNodeTypes } from './shared/utils';

const TRIGGER_TYPE = 'n8n-nodes-base.executeWorkflowTrigger';
const ERROR_TRIGGER_TYPE = 'n8n-nodes-base.errorTrigger';
const SUB_EXECUTION_ID = '01a03900-0000-7000-8000-000000000001';
const ERROR_EXECUTION_ID = '01a03900-0000-7000-8000-000000000002';
const FAILED_EXECUTION_ID = '01a03900-0000-7000-8000-00000000000a';
const TRIGGER_NAME = 'When Executed by Another Workflow';

const triggerNode: INode = {
	id: 'trigger',
	name: TRIGGER_NAME,
	type: TRIGGER_TYPE,
	typeVersion: 1.2,
	position: [0, 0],
	parameters: { inputSource: 'passthrough' },
};
const setNode: INode = {
	id: 'set',
	name: 'Set',
	type: 'n8n-nodes-base.set',
	typeVersion: 3.4,
	position: [200, 0],
	parameters: {},
};
/** A trigger that emits the execution id its context carries. */
class ReportsExecutionId implements INodeType {
	description = {
		displayName: 'Reports Execution Id',
		name: 'reportsExecutionId',
		group: ['trigger'],
		version: 1,
		description: 'Emits the execution id',
		defaults: { name: TRIGGER_NAME },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	} as unknown as INodeType['description'];

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await Promise.resolve([[{ json: { executionId: this.getExecutionId() } }]]);
	}
}

const connections: IConnections = {
	[TRIGGER_NAME]: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
};

const errorTriggerNode: INode = {
	id: 'error-trigger',
	name: 'Error Trigger',
	type: ERROR_TRIGGER_TYPE,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const nodeTypesFor = (trigger: INodeType) => ({
	...buildDefaultNodes(),
	[TRIGGER_TYPE]: { type: trigger, sourcePath: '' },
	[ERROR_TRIGGER_TYPE]: { type: new ErrorTrigger(), sourcePath: '' },
});

/**
 * The data plane side (`EngineWorkflowResolveClient`) against the real control
 * plane server, the policy checker and the test database.
 */
describe('Engine v2 workflow resolve (integration)', () => {
	const authSecret = 'a'.repeat(64);

	let server: EngineControlPlaneServer;
	let baseUrl: string;
	let member: User;
	let parent: IWorkflowDb;

	beforeAll(async () => {
		await testDb.init();
		await initNodeTypes(nodeTypesFor(new ExecuteWorkflowTrigger()));

		const engineConfig = Container.get(EngineConfig);
		engineConfig.authSecret = authSecret;
		engineConfig.controlPlaneHost = '127.0.0.1';
		// `0` lets the OS pick a free port.
		engineConfig.controlPlanePort = 0;

		server = Container.get(EngineControlPlaneServer);
		await server.start();
		baseUrl = `http://127.0.0.1:${server.port}`;
		// Set before the client is first resolved, because it reads the URL once.
		engineConfig.controlPlaneBaseUrl = baseUrl;

		member = await createMember();
		parent = await createWorkflow({ settings: { engineType: 'v2' } }, member);
	});

	afterAll(async () => {
		await server.stop();
		await testDb.terminate();
	});

	const subWorkflow = async (attributes: Partial<IWorkflowDb>) =>
		await createWorkflow(
			{
				settings: { engineType: 'v2', callerPolicy: 'any' },
				nodes: [triggerNode, setNode],
				connections,
				...attributes,
			},
			member,
		);

	const productionParent = () => ({ ...request('').parent, mode: 'trigger' as const });

	const request = (
		workflowId: string,
		overrides: Partial<ResolveSubWorkflowRequest> = {},
	): ResolveSubWorkflowRequest => ({
		kind: 'sub-workflow',
		workflowId,
		executionId: SUB_EXECUTION_ID,
		parent: {
			executionId: '01a03900-0000-7000-8000-00000000000a',
			workflowId: parent.id,
			mode: 'manual',
			node: { id: 'call', name: 'Call', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1 },
		},
		context: { userId: member.id },
		items: [{ json: { a: 1 } }],
		...overrides,
	});

	const resolve = async (body: ResolveSubWorkflowRequest) =>
		await Container.get(EngineWorkflowResolveClient).resolve(body, new AbortController().signal);

	it('resolves the draft of a sub-workflow for a manual run and shapes the trigger outputs from the items', async () => {
		const workflow = await subWorkflow({});

		const result = await resolve(request(workflow.id));

		expect(result.workflowId).toBe(workflow.id);
		expect(result.graph.nodes.map(({ name }) => name)).toEqual([TRIGGER_NAME, 'Set']);
		expect(result.graph.nodes[0].type).toBe('trigger');
		expect(result.triggerOutputs).toEqual([[{ json: { a: 1 } }]]);
		expect(result.returnLastRunOnly).toBe(false);
		// Neither a named error workflow nor an Error Trigger of its own.
		expect(result.resolveErrorWorkflowOnFailure).toBe(false);
		expect(result.workflow).toMatchObject({ id: workflow.id });
	});

	it('runs the trigger under the sub-execution id', async () => {
		// A stand-in trigger that reports the id it runs under, in the real one's place.
		await initNodeTypes(nodeTypesFor(new ReportsExecutionId()));
		try {
			const workflow = await subWorkflow({});

			const result = await resolve(request(workflow.id));

			expect(result.triggerOutputs).toEqual([[{ json: { executionId: SUB_EXECUTION_ID } }]]);
		} finally {
			await initNodeTypes(nodeTypesFor(new ExecuteWorkflowTrigger()));
		}
	});

	it('resolves the published version of a sub-workflow for a production run, not its draft', async () => {
		const workflow = await createActiveWorkflow(
			{
				settings: { engineType: 'v2', callerPolicy: 'any' },
				nodes: [triggerNode, setNode],
				connections,
			},
			member,
		);
		// The draft moves on after the publish.
		await Container.get(WorkflowRepository).update(
			{ id: workflow.id },
			{
				nodes: [triggerNode, { ...setNode, name: 'Draft Set' }],
				connections: {
					[TRIGGER_NAME]: { main: [[{ node: 'Draft Set', type: 'main', index: 0 }]] },
				},
			},
		);
		const published = await resolve(request(workflow.id, { parent: productionParent() }));
		const draft = await resolve(request(workflow.id));

		expect(published.graph.nodes.map(({ name }) => name)).toEqual([TRIGGER_NAME, 'Set']);
		expect(draft.graph.nodes.map(({ name }) => name)).toEqual([TRIGGER_NAME, 'Draft Set']);
	});

	it('refuses a sub-workflow whose caller policy excludes the parent', async () => {
		const workflow = await subWorkflow({ settings: { engineType: 'v2', callerPolicy: 'none' } });

		const refusal = resolve(request(workflow.id));

		await expect(refusal).rejects.toThrow(UserError);
		// v1's explanation of the denial travels as the description, as the node shows it.
		await expect(refusal).rejects.toMatchObject({
			description: expect.stringContaining('limits which workflows it can be called by'),
		});
	});

	it('refuses a sub-workflow that does not run on engine v2', async () => {
		const workflow = await subWorkflow({ settings: { callerPolicy: 'any' } });

		await expect(resolve(request(workflow.id))).rejects.toThrow(/engine v1/);
	});

	it('refuses a sub-workflow without a trigger to start at', async () => {
		const workflow = await subWorkflow({ nodes: [setNode], connections: {} });

		await expect(resolve(request(workflow.id))).rejects.toThrow(/Execute Workflow Trigger/);
	});

	it('refuses a sub-workflow whose trigger is disabled', async () => {
		const workflow = await subWorkflow({ nodes: [{ ...triggerNode, disabled: true }, setNode] });

		await expect(resolve(request(workflow.id))).rejects.toThrow(/is disabled/);
	});

	it('refuses an unknown workflow id', async () => {
		await expect(resolve(request('missing'))).rejects.toThrow(/does not exist/);
	});

	it('refuses an unpublished sub-workflow for a production run', async () => {
		const workflow = await subWorkflow({});

		await expect(resolve(request(workflow.id, { parent: productionParent() }))).rejects.toThrow(
			/not active/,
		);
	});

	it('refuses a credentials token', async () => {
		const workflow = await subWorkflow({});
		const headers = new Headers();
		headers.set('content-type', 'application/json');
		headers.set('authorization', `Bearer ${mintActionToken(authSecret, 'credentials:read')}`);

		const response = await fetch(`${baseUrl}${WORKFLOWS_RESOLVE_PATH}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(request(workflow.id)),
		});

		expect(response.status).toBe(401);
	});
	describe('an error workflow', () => {
		const errorWorkflow = async (settings: Record<string, string> = {}) =>
			await createActiveWorkflow(
				{
					name: 'Error handler',
					settings: { engineType: 'v2', ...settings },
					nodes: [errorTriggerNode, setNode],
					connections: {
						[errorTriggerNode.name]: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
					},
				},
				member,
			);

		/** The failed execution of the parent workflow, whose stored settings name the error workflow. */
		const source = (settings: Record<string, string>): ResolveErrorWorkflowRequest['source'] => ({
			executionId: FAILED_EXECUTION_ID,
			workflowId: parent.id,
			workflow: {
				id: parent.id,
				name: parent.name,
				nodes: [setNode],
				settings: { engineType: 'v2', ...settings },
			} as unknown as JsonObject,
			hostMode: 'trigger',
			hasParent: false,
			failedStep: { nodeName: 'Set', error: { name: 'Error', message: 'boom' } },
		});

		const resolveError = async (errorSource: ResolveErrorWorkflowRequest['source']) =>
			await Container.get(EngineWorkflowResolveClient).resolve(
				{ kind: 'error-workflow', executionId: ERROR_EXECUTION_ID, source: errorSource },
				new AbortController().signal,
			);

		it('resolves the published error workflow from its Error Trigger, with the error item as its output', async () => {
			const workflow = await errorWorkflow();

			const result = await resolveError(source({ errorWorkflow: workflow.id }));

			expect(result.kind).toBe('error-workflow');
			expect(result.workflowId).toBe(workflow.id);
			expect(result.graph.nodes.map(({ name }) => name)).toEqual([errorTriggerNode.name, 'Set']);
			expect(result.triggerOutputs).toEqual([
				[
					{
						json: expect.objectContaining({
							execution: expect.objectContaining({
								id: FAILED_EXECUTION_ID,
								url: expect.stringContaining(
									`/workflow/${parent.id}/executions/${FAILED_EXECUTION_ID}`,
								),
								lastNodeExecuted: 'Set',
								mode: 'trigger',
							}),
							workflow: { id: parent.id, name: parent.name },
						}),
					},
				],
			]);
			expect(result.resolveErrorWorkflowOnFailure).toBe(false);
		});

		it('runs in the project of the failed workflow', async () => {
			const workflow = await errorWorkflow();

			const result = await resolveError(source({ errorWorkflow: workflow.id }));

			expect(result.projectId).toBe((await getPersonalProject(member)).id);
		});

		it('refuses when the settings name no error workflow', async () => {
			await expect(resolveError(source({}))).rejects.toThrow(UserError);
		});

		it('refuses an error workflow that does not run on engine v2', async () => {
			const workflow = await createActiveWorkflow(
				{ nodes: [errorTriggerNode, setNode], connections: {} },
				member,
			);

			await expect(resolveError(source({ errorWorkflow: workflow.id }))).rejects.toThrow(
				/engine v1/,
			);
		});

		it('refuses an error workflow without an Error Trigger', async () => {
			const workflow = await createActiveWorkflow(
				{ settings: { engineType: 'v2' }, nodes: [setNode], connections: {} },
				member,
			);

			await expect(resolveError(source({ errorWorkflow: workflow.id }))).rejects.toThrow(
				/no enabled Error Trigger/,
			);
		});
	});
});
