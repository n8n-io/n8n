import { mockInstance } from '@n8n/backend-test-utils';
import { SharedWorkflowRepository, User, WorkflowEntity } from '@n8n/db';
import type { IConnections, INode } from 'n8n-workflow';

import { createUpdateWorkflowTool } from '../tools/workflow-builder/update-workflow.tool';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeTypes } from '@/node-types';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

const mockAutoPopulateNodeCredentials = jest.fn();
jest.mock('../tools/workflow-builder/credentials-auto-assign', () => ({
	autoPopulateNodeCredentials: (...args: unknown[]) =>
		mockAutoPopulateNodeCredentials(...args) as unknown,
	stripNullCredentialStubs: jest.fn(),
}));

const mockValidateJSON = jest.fn().mockReturnValue([]);
jest.mock('@n8n/ai-workflow-builder', () => ({
	MCP_UPDATE_WORKFLOW_TOOL: {
		toolName: 'update_workflow',
		displayTitle: 'Updating workflow',
	},
	ParseValidateHandler: jest.fn().mockImplementation(() => ({
		validateJSON: (json: unknown) => mockValidateJSON(json) as unknown,
	})),
}));

const parseResult = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse((result.content[0] as { type: 'text'; text: string }).text) as Record<string, unknown>;

const makeNode = (overrides: Partial<INode> = {}): INode => ({
	id: 'node-id',
	name: 'A',
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

describe('update-workflow MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let findWorkflowMock: jest.Mock;
	let workflowService: WorkflowService;
	let updateMock: jest.Mock;
	let urlService: UrlService;
	let telemetry: Telemetry;
	let credentialsService: CredentialsService;
	let sharedWorkflowRepository: SharedWorkflowRepository;
	let nodeTypes: ReturnType<typeof mockInstance<NodeTypes>>;
	let collaborationService: CollaborationService;

	const buildExistingWorkflow = () =>
		Object.assign(new WorkflowEntity(), {
			id: 'wf-1',
			name: 'Existing',
			settings: { availableInMCP: true },
			nodes: [
				makeNode({ id: 'a', name: 'A' }),
				makeNode({
					id: 'b',
					name: 'B',
					position: [200, 0],
					parameters: { url: 'https://old', method: 'GET' },
				}),
			],
			connections: {
				A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
			} as IConnections,
		});

	beforeEach(() => {
		jest.clearAllMocks();

		findWorkflowMock = jest.fn().mockResolvedValue(buildExistingWorkflow());
		workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: findWorkflowMock,
		});
		updateMock = jest
			.fn()
			.mockImplementation(async (_user, workflow, workflowId) =>
				Object.assign(new WorkflowEntity(), { ...workflow, id: workflowId }),
			);
		workflowService = mockInstance(WorkflowService, { update: updateMock });
		urlService = mockInstance(UrlService, {
			getInstanceBaseUrl: jest.fn().mockReturnValue('https://n8n.example.com'),
		});
		telemetry = mockInstance(Telemetry, { track: jest.fn() });
		credentialsService = mockInstance(CredentialsService);
		sharedWorkflowRepository = mockInstance(SharedWorkflowRepository, {
			findOneOrFail: jest.fn().mockResolvedValue({ projectId: 'project-1' }),
		});
		nodeTypes = mockInstance(NodeTypes);
		collaborationService = mockInstance(CollaborationService, {
			ensureWorkflowEditable: jest.fn().mockResolvedValue(undefined),
			broadcastWorkflowUpdate: jest.fn().mockResolvedValue(undefined),
		});
		mockAutoPopulateNodeCredentials.mockResolvedValue({ assignments: [], skippedHttpNodes: [] });
		mockValidateJSON.mockReturnValue([]);
	});

	const createTool = () =>
		createUpdateWorkflowTool(
			user,
			workflowFinderService,
			workflowService,
			urlService,
			telemetry,
			nodeTypes,
			credentialsService,
			sharedWorkflowRepository,
			collaborationService,
		);

	const callHandler = async (
		input: { workflowId: string; operations: unknown[] },
		tool = createTool(),
	) =>
		await tool.handler(
			{
				workflowId: input.workflowId,
				operations: input.operations as never,
			},
			{} as never,
		);

	describe('smoke tests', () => {
		test('exposes correct name, schemas, and handler', () => {
			const tool = createTool();
			expect(tool.name).toBe('update_workflow');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(tool.config.annotations).toEqual(
				expect.objectContaining({
					readOnlyHint: false,
					destructiveHint: true,
					idempotentHint: false,
					openWorldHint: false,
				}),
			);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler', () => {
		test('applies updateNodeParameters and saves the workflow', async () => {
			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.workflowId).toBe('wf-1');
			expect(response.appliedOperations).toBe(1);

			const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
			const b = saved.nodes.find((n) => n.name === 'B')!;
			expect(b.parameters).toEqual({ url: 'https://new', method: 'GET' });
		});

		test('returns error when workflow has active write lock', async () => {
			(collaborationService.ensureWorkflowEditable as jest.Mock).mockRejectedValue(
				new Error('Cannot modify workflow while it is being edited by a user in the editor.'),
			);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toContain('being edited by a user');
			expect(workflowService.update).not.toHaveBeenCalled();
		});

		test('rejects op referencing a nonexistent node and does not save', async () => {
			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'updateNodeParameters', nodeName: 'Nope', parameters: { url: 'x' } }],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toContain('Operation 0 failed');
			expect(response.error).toContain("node 'Nope' not found");
			expect(workflowService.update).not.toHaveBeenCalled();
		});

		test('passes correct workflowId and metadata to workflowService.update', async () => {
			await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'setWorkflowMetadata', name: 'Renamed' }],
			});

			expect(workflowService.update).toHaveBeenCalledWith(
				user,
				expect.any(WorkflowEntity),
				'wf-1',
				{ aiBuilderAssisted: true, source: 'n8n-mcp' },
			);
			expect(updateMock.mock.calls[0][1].name).toBe('Renamed');
			expect(updateMock.mock.calls[0][1].meta).toEqual(
				expect.objectContaining({ aiBuilderAssisted: true, builderVariant: 'mcp' }),
			);
		});

		test('broadcasts workflow update on success', async () => {
			await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'setWorkflowMetadata', name: 'Renamed' }],
			});
			expect(collaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith('wf-1', user.id);
		});

		test('only auto-assigns credentials for nodes added in this batch', async () => {
			await callHandler({
				workflowId: 'wf-1',
				operations: [
					{
						type: 'addNode',
						node: { name: 'C', type: 'n8n-nodes-base.slack', typeVersion: 1 },
					},
					{
						type: 'updateNodeParameters',
						nodeName: 'B',
						parameters: { url: 'https://new' },
					},
				],
			});

			expect(mockAutoPopulateNodeCredentials).toHaveBeenCalledTimes(1);
			const slimWorkflow = mockAutoPopulateNodeCredentials.mock.calls[0][0] as {
				nodes: INode[];
			};
			expect(slimWorkflow.nodes.map((n) => n.name)).toEqual(['C']);
		});

		test('skips credential auto-assign entirely when no nodes are added', async () => {
			await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			expect(mockAutoPopulateNodeCredentials).not.toHaveBeenCalled();
			expect(sharedWorkflowRepository.findOneOrFail).not.toHaveBeenCalled();
		});

		test('reports auto-assigned credentials in the response', async () => {
			mockAutoPopulateNodeCredentials.mockResolvedValue({
				assignments: [{ nodeName: 'C', credentialName: 'My Slack', credentialType: 'slackApi' }],
				skippedHttpNodes: [],
			});

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{
						type: 'addNode',
						node: { name: 'C', type: 'n8n-nodes-base.slack', typeVersion: 1 },
					},
				],
			});

			const response = parseResult(result);
			expect(response.autoAssignedCredentials).toEqual([
				{ nodeName: 'C', credentialName: 'My Slack', credentialType: 'slackApi' },
			]);
		});

		test('reports skipped HTTP nodes in the note', async () => {
			mockAutoPopulateNodeCredentials.mockResolvedValue({
				assignments: [],
				skippedHttpNodes: ['HTTP Request'],
			});

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{
						type: 'addNode',
						node: {
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
						},
					},
				],
			});

			const response = parseResult(result);
			expect(response.note).toBe(
				'HTTP Request nodes (HTTP Request) were skipped during credential auto-assignment. Their credentials must be configured manually.',
			);
		});

		test('assigns webhookId to a webhook node added via addNode', async () => {
			nodeTypes.getByNameAndVersion.mockImplementation(((type: string) => {
				if (type === 'n8n-nodes-base.webhook') {
					return { description: { webhooks: [{ httpMethod: 'GET', path: '' }] } };
				}
				return { description: {} };
			}) as typeof nodeTypes.getByNameAndVersion);

			await callHandler({
				workflowId: 'wf-1',
				operations: [
					{
						type: 'addNode',
						node: { name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1 },
					},
				],
			});

			const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
			const webhook = saved.nodes.find((n) => n.name === 'Webhook')!;
			expect(webhook.webhookId).toBeDefined();
			expect(typeof webhook.webhookId).toBe('string');
		});

		test('returns error when workflow not found', async () => {
			findWorkflowMock.mockResolvedValue(null);

			const result = await callHandler({
				workflowId: 'wf-missing',
				operations: [{ type: 'setWorkflowMetadata', name: 'x' }],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe("Workflow not found or you don't have permission to access it.");
		});

		test('tracks telemetry on success with op metadata', async () => {
			await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'setWorkflowMetadata', name: 'Renamed' },
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'update_workflow',
					parameters: expect.objectContaining({
						workflowId: 'wf-1',
						opCount: 2,
						opTypes: ['setWorkflowMetadata', 'updateNodeParameters'],
					}),
					results: expect.objectContaining({ success: true }),
				}),
			);
		});

		test('tracks telemetry on failure', async () => {
			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'updateNodeParameters', nodeName: 'Nope', parameters: { url: 'x' } }],
			});
			expect(result.isError).toBe(true);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'update_workflow',
					results: expect.objectContaining({ success: false }),
				}),
			);
		});

		describe('validation', () => {
			test('passes the post-apply workflow JSON to validateJSON', async () => {
				await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowMetadata', name: 'Renamed' }],
				});

				expect(mockValidateJSON).toHaveBeenCalledTimes(1);
				const json = mockValidateJSON.mock.calls[0][0] as {
					name: string;
					nodes: INode[];
					connections: IConnections;
				};
				expect(json.name).toBe('Renamed');
				expect(json.nodes.map((n) => n.name)).toEqual(['A', 'B']);
				expect(json.connections).toEqual({
					A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
				});
			});

			test('surfaces validation warnings in the response', async () => {
				mockValidateJSON.mockReturnValue([
					{ code: 'GRAPH_ERR', message: 'unwired node', nodeName: 'B' },
					{ code: 'JSON_WARN', message: 'parameter missing' },
				]);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBeUndefined();
				expect(response.validationWarnings).toEqual([
					{ code: 'GRAPH_ERR', message: 'unwired node', nodeName: 'B' },
					{ code: 'JSON_WARN', message: 'parameter missing' },
				]);
			});

			test('does not block save when validation produces warnings', async () => {
				mockValidateJSON.mockReturnValue([
					{ code: 'GRAPH_ERR', message: 'unwired node', nodeName: 'B' },
				]);

				await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					],
				});

				expect(workflowService.update).toHaveBeenCalled();
			});

			test('returns an empty validationWarnings array when there are no issues', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					],
				});

				const response = parseResult(result);
				expect(response.validationWarnings).toEqual([]);
			});
		});

		describe('credential validation', () => {
			beforeEach(() => {
				nodeTypes.getByNameAndVersion.mockImplementation(((type: string) => {
					if (type === 'n8n-nodes-base.slack') {
						return { description: { credentials: [{ name: 'slackApi' }] } };
					}
					if (type === 'n8n-nodes-base.set') {
						return { description: { credentials: [] } };
					}
					return { description: {} };
				}) as typeof nodeTypes.getByNameAndVersion);

				(credentialsService.getOne as jest.Mock).mockImplementation(async (_user, id: string) => {
					if (id === 'cred-slack') return { id, name: 'My Slack', type: 'slackApi' };
					if (id === 'cred-wrong-type') return { id, name: 'Wrong', type: 'discordApi' };
					throw new NotFoundError(`Credential with ID "${id}" could not be found.`);
				});
			});

			test('rejects setNodeCredential with a non-existent credential id', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [makeNode({ id: 's', name: 'Slack', type: 'n8n-nodes-base.slack' })],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeCredential',
							nodeName: 'Slack',
							credentialKey: 'slackApi',
							credentialId: 'cred-missing',
							credentialName: 'Whatever',
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('Operation 0 failed');
				expect(response.error).toContain("credential 'cred-missing' not found");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('rejects setNodeCredential when credential type does not match the key', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [makeNode({ id: 's', name: 'Slack', type: 'n8n-nodes-base.slack' })],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeCredential',
							nodeName: 'Slack',
							credentialKey: 'slackApi',
							credentialId: 'cred-wrong-type',
							credentialName: 'Wrong',
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("is type 'discordApi'");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('rejects setNodeCredential when the node type does not accept the credential key', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [makeNode({ id: 's', name: 'Setter', type: 'n8n-nodes-base.set' })],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeCredential',
							nodeName: 'Setter',
							credentialKey: 'slackApi',
							credentialId: 'cred-slack',
							credentialName: 'My Slack',
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("does not accept credential 'slackApi'");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('accepts a setNodeCredential whose id, type and key all match', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [makeNode({ id: 's', name: 'Slack', type: 'n8n-nodes-base.slack' })],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeCredential',
							nodeName: 'Slack',
							credentialKey: 'slackApi',
							credentialId: 'cred-slack',
							credentialName: 'My Slack',
						},
					],
				});

				expect(result.isError).toBeUndefined();
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('rejects addNode with an unknown credential id', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'addNode',
							node: {
								name: 'Slack',
								type: 'n8n-nodes-base.slack',
								typeVersion: 1,
								credentials: {
									slackApi: { id: 'cred-missing', name: 'Whatever' },
								},
							},
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("credential 'cred-missing' not found");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('allows addNode credentials with no id (auto-assign will pick one)', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'addNode',
							node: {
								name: 'Slack',
								type: 'n8n-nodes-base.slack',
								typeVersion: 1,
								credentials: { slackApi: { name: 'My Slack' } },
							},
						},
					],
				});

				expect(result.isError).toBeUndefined();
				expect(workflowService.update).toHaveBeenCalled();
			});
		});
	});
});
