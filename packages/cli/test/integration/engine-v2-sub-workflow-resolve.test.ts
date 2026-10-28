import { createActiveWorkflow, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { EngineConfig } from '@n8n/config';
import type { IWorkflowDb, User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mintActionToken } from '@n8n/engine';
import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';
import type {
	IConnections,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import { NodeConnectionTypes, UserError } from 'n8n-workflow';

import { EngineControlPlaneServer } from '@/modules/engine-v2/engine-control-plane-server';
import { EngineSubWorkflowClient } from '@/modules/engine-v2/engine-sub-workflow-client';
import type { ResolveSubWorkflowRequest } from '@/modules/engine-v2/engine-sub-workflow.contract';
import { SUB_WORKFLOWS_RESOLVE_PATH } from '@/modules/engine-v2/engine-v2.constants';

import { createMember } from './shared/db/users';
import { buildDefaultNodes, initNodeTypes } from './shared/utils';

const TRIGGER_TYPE = 'n8n-nodes-base.executeWorkflowTrigger';
const CHILD_EXECUTION_ID = '01a03900-0000-7000-8000-000000000001';
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

/**
 * The data plane side (`EngineSubWorkflowClient`) against the real control
 * plane server, the policy checker and the test database.
 */
describe('Engine v2 sub-workflow resolve (integration)', () => {
	const authSecret = 'a'.repeat(64);

	let server: EngineControlPlaneServer;
	let baseUrl: string;
	let member: User;
	let parent: IWorkflowDb;

	beforeAll(async () => {
		await testDb.init();
		await initNodeTypes({
			...buildDefaultNodes(),
			[TRIGGER_TYPE]: { type: new ExecuteWorkflowTrigger(), sourcePath: '' },
		});

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

	const child = async (attributes: Partial<IWorkflowDb>) =>
		await createWorkflow(
			{
				settings: { engineType: 'v2', callerPolicy: 'any' },
				nodes: [triggerNode, setNode],
				connections,
				...attributes,
			},
			member,
		);

	const request = (
		workflowId: string,
		overrides: Partial<ResolveSubWorkflowRequest> = {},
	): ResolveSubWorkflowRequest => ({
		workflowId,
		executionId: CHILD_EXECUTION_ID,
		parent: { executionId: 'exec-parent', workflowId: parent.id, mode: 'manual' },
		context: { userId: member.id },
		items: [{ json: { a: 1 } }],
		...overrides,
	});

	const resolve = async (body: ResolveSubWorkflowRequest) =>
		await Container.get(EngineSubWorkflowClient).resolve(body, new AbortController().signal);

	it('resolves the draft of a child for a manual run and shapes the trigger outputs from the items', async () => {
		const workflow = await child({});

		const result = await resolve(request(workflow.id));

		expect(result.workflowId).toBe(workflow.id);
		expect(result.graph.nodes.map(({ name }) => name)).toEqual([TRIGGER_NAME, 'Set']);
		expect(result.graph.nodes[0].type).toBe('trigger');
		expect(result.triggerOutputs).toEqual([[{ json: { a: 1 } }]]);
		expect(result.returnLastRunOnly).toBe(false);
		expect(result.workflow).toMatchObject({ id: workflow.id });
	});

	it('runs the trigger under the child execution id', async () => {
		// A stand-in trigger that reports the id it runs under, in the real one's place.
		await initNodeTypes({
			...buildDefaultNodes(),
			[TRIGGER_TYPE]: { type: new ReportsExecutionId(), sourcePath: '' },
		});
		try {
			const workflow = await child({});

			const result = await resolve(request(workflow.id));

			expect(result.triggerOutputs).toEqual([[{ json: { executionId: CHILD_EXECUTION_ID } }]]);
		} finally {
			await initNodeTypes({
				...buildDefaultNodes(),
				[TRIGGER_TYPE]: { type: new ExecuteWorkflowTrigger(), sourcePath: '' },
			});
		}
	});

	it('resolves the published version of a child for a production run, not its draft', async () => {
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
		const production = {
			executionId: 'exec-parent',
			workflowId: parent.id,
			mode: 'trigger' as const,
		};

		const published = await resolve(request(workflow.id, { parent: production }));
		const draft = await resolve(request(workflow.id));

		expect(published.graph.nodes.map(({ name }) => name)).toEqual([TRIGGER_NAME, 'Set']);
		expect(draft.graph.nodes.map(({ name }) => name)).toEqual([TRIGGER_NAME, 'Draft Set']);
	});

	it('refuses a child whose caller policy excludes the parent', async () => {
		const workflow = await child({ settings: { engineType: 'v2', callerPolicy: 'none' } });

		await expect(resolve(request(workflow.id))).rejects.toThrow(UserError);
	});

	it('refuses a child that does not run on engine v2', async () => {
		const workflow = await child({ settings: { callerPolicy: 'any' } });

		await expect(resolve(request(workflow.id))).rejects.toThrow(/engine v1/);
	});

	it('refuses a child without a trigger to start at', async () => {
		const workflow = await child({ nodes: [setNode], connections: {} });

		await expect(resolve(request(workflow.id))).rejects.toThrow(/Execute Workflow Trigger/);
	});

	it('refuses an unknown workflow id', async () => {
		await expect(resolve(request('missing'))).rejects.toThrow(/does not exist/);
	});

	it('refuses an unpublished child for a production run', async () => {
		const workflow = await child({});

		await expect(
			resolve(
				request(workflow.id, {
					parent: { executionId: 'exec-parent', workflowId: parent.id, mode: 'trigger' },
				}),
			),
		).rejects.toThrow(/not active/);
	});

	it('refuses a credentials token', async () => {
		const workflow = await child({});
		const headers = new Headers();
		headers.set('content-type', 'application/json');
		headers.set('authorization', `Bearer ${mintActionToken(authSecret, 'credentials:read')}`);

		const response = await fetch(`${baseUrl}${SUB_WORKFLOWS_RESOLVE_PATH}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(request(workflow.id)),
		});

		expect(response.status).toBe(401);
	});
});
