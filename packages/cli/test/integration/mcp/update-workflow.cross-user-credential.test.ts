// Regression coverage for the MCP `update_workflow` tool's cross-user
// credential access boundary.
//
// Scenario: workflow W is owned by user A, with a node bound to A's
// credential C. W is shared with B as `workflow:editor`. B has no share on
// C. The tool must not allow B to introduce a binding to C through any
// supported operation. Pre-existing bindings on untouched nodes are
// expected to remain (the share-model gate on use is enforced at execution
// time by PermissionChecker, not on the persisted workflow row).

import {
	createWorkflow,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	CredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { IConnections, INode, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { createUpdateWorkflowTool } from '@/modules/mcp/tools/workflow-builder/update-workflow.tool';
import { NodeTypes } from '@/node-types';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { saveCredential } from '../shared/db/credentials';
import { createUser } from '../shared/db/users';
import { initNodeTypes } from '../shared/utils';

jest.mock('../../../src/modules/mcp/tools/workflow-builder/credentials-auto-assign', () => ({
	autoPopulateNodeCredentials: jest
		.fn()
		.mockResolvedValue({ assignments: [], skippedHttpNodes: [] }),
	stripNullCredentialStubs: jest.fn(),
}));
jest.mock('@n8n/ai-workflow-builder', () => ({
	MCP_UPDATE_WORKFLOW_TOOL: {
		toolName: 'update_workflow',
		displayTitle: 'Updating workflow',
	},
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'get_sdk_reference', displayTitle: '' },
	CODE_BUILDER_VALIDATE_TOOL: { toolName: 'validate_workflow', displayTitle: '' },
	// eslint-disable-next-line @typescript-eslint/naming-convention
	ParseValidateHandler: jest.fn().mockImplementation(() => ({
		validateJSON: () => [],
	})),
}));

const slackDescription: INodeTypeDescription = {
	displayName: 'Slack',
	name: 'slack',
	icon: 'file:slack.svg',
	group: ['output'],
	version: 1,
	defaults: { name: 'Slack' },
	inputs: ['main'],
	outputs: ['main'],
	credentials: [{ name: 'slackApi', required: true }],
	properties: [],
	description: 'Slack',
} as unknown as INodeTypeDescription;
const slackNode: INodeType = { description: slackDescription } as unknown as INodeType;

const parseResult = (result: { content: Array<{ type: string; text?: string }> }) =>
	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
	JSON.parse((result.content[0] as { type: 'text'; text: string }).text) as Record<string, unknown>;

const NODE_NAME = 'Slack';
const NODE_TYPE = 'n8n-nodes-base.slack';

let userA: User;
let userB: User;

beforeAll(async () => {
	await testModules.loadModules(['mcp']);
	await testDb.init();

	await initNodeTypes({
		[NODE_TYPE]: { type: slackNode, sourcePath: '' },
	});

	userA = await createUser({ role: { slug: 'global:member' } });
	userB = await createUser({ role: { slug: 'global:member' } });
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
	]);
});

describe('update_workflow MCP tool: workflow editor cannot bind to a credential they cannot access', () => {
	async function seedScenario() {
		const credentialC = await saveCredential(
			{
				name: "A's Slack",
				type: 'slackApi',
				data: { accessToken: 'super-secret' },
			},
			{ user: userA, role: 'credential:owner' },
		);

		const N: INode = {
			id: 'node-slack',
			name: NODE_NAME,
			type: NODE_TYPE,
			typeVersion: 1,
			position: [0, 0],
			parameters: { channel: '#internal' },
			credentials: {
				slackApi: { id: credentialC.id, name: credentialC.name },
			},
		};
		const workflowW = await createWorkflow(
			{
				name: 'W',
				nodes: [N],
				connections: {} as IConnections,
				settings: { availableInMCP: true },
			},
			userA,
		);

		// shareWorkflowWithUsers defaults to 'workflow:editor'
		await shareWorkflowWithUsers(workflowW, [userB]);

		return { credentialC, workflowW };
	}

	function createTool(actor: User) {
		return createUpdateWorkflowTool(
			actor,
			Container.get(WorkflowFinderService),
			Container.get(WorkflowService),
			{ getInstanceBaseUrl: () => 'https://test.example.com' } as unknown as UrlService,
			{ track: () => {} } as unknown as Telemetry,
			Container.get(NodeTypes),
			Container.get(CredentialsService),
			Container.get(SharedWorkflowRepository),
			Container.get(CollaborationService),
			{
				// eslint-disable-next-line @typescript-eslint/require-await
				getManyAndCount: async () => ({ data: [], count: 0 }),
			} as never,
		);
	}

	test('precondition: the editor cannot read the owner-only credential', async () => {
		const { credentialC } = await seedScenario();
		const credentialsService = Container.get(CredentialsService);

		await expect(credentialsService.getOne(userB, credentialC.id, false)).rejects.toThrow(
			/could not be found/,
		);
		await expect(credentialsService.getOne(userA, credentialC.id, false)).resolves.toMatchObject({
			id: credentialC.id,
		});
	});

	test('setNodeCredential referencing an inaccessible credential is rejected and the workflow row is unchanged', async () => {
		const { credentialC, workflowW } = await seedScenario();
		const tool = createTool(userB);

		const result = await tool.handler(
			{
				workflowId: workflowW.id,
				skillsUsed: undefined,
				operations: [
					{
						type: 'setNodeCredential',
						nodeName: NODE_NAME,
						credentialKey: 'slackApi',
						credentialId: credentialC.id,
						credentialName: credentialC.name,
					},
				] as never,
			},
			{} as never,
		);

		expect(result.isError).toBe(true);
		const response = parseResult(result);
		expect(response.error).toContain(credentialC.id);
		expect(response.error).toContain('not found');

		const dbRow = await Container.get(WorkflowRepository).findOneByOrFail({ id: workflowW.id });
		expect(dbRow.nodes[0].credentials).toEqual({
			slackApi: { id: credentialC.id, name: credentialC.name },
		});
	});

	test('addNode whose credentials reference an inaccessible credential is rejected and the workflow row is unchanged', async () => {
		const { credentialC, workflowW } = await seedScenario();
		const tool = createTool(userB);

		const result = await tool.handler(
			{
				workflowId: workflowW.id,
				skillsUsed: undefined,
				operations: [
					{
						type: 'addNode',
						node: {
							name: 'Slack2',
							type: NODE_TYPE,
							typeVersion: 1,
							credentials: {
								slackApi: { id: credentialC.id, name: credentialC.name },
							},
						},
					},
				] as never,
			},
			{} as never,
		);

		expect(result.isError).toBe(true);
		const response = parseResult(result);
		expect(response.error).toContain(credentialC.id);
		expect(response.error).toContain('not found');

		const dbRow = await Container.get(WorkflowRepository).findOneByOrFail({ id: workflowW.id });
		expect(dbRow.nodes.map((n) => n.name)).toEqual([NODE_NAME]);
	});

	test('updateNodeParameters by the editor applies the change and leaves the pre-existing credential binding intact', async () => {
		const { credentialC, workflowW } = await seedScenario();
		const tool = createTool(userB);

		const result = await tool.handler(
			{
				workflowId: workflowW.id,
				skillsUsed: undefined,
				operations: [
					{
						type: 'updateNodeParameters',
						nodeName: NODE_NAME,
						parameters: { channel: '#exfil' },
					},
				] as never,
			},
			{} as never,
		);

		expect(result.isError).toBeFalsy();

		const dbRow = await Container.get(WorkflowRepository).findOneByOrFail({ id: workflowW.id });
		const persistedNode = dbRow.nodes.find((n) => n.name === NODE_NAME);

		expect(persistedNode?.parameters).toMatchObject({ channel: '#exfil' });
		expect(persistedNode?.credentials).toEqual({
			slackApi: { id: credentialC.id, name: credentialC.name },
		});

		const owners = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflowW.id,
			role: 'workflow:owner',
		});
		expect(owners).toHaveLength(1);

		const cRow = await Container.get(CredentialsRepository).findOneByOrFail({
			id: credentialC.id,
		});
		expect(cRow.name).toBe("A's Slack");
	});
});
