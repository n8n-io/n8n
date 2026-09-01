import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SharedWorkflowRepository, User, WorkflowEntity, type Project } from '@n8n/db';
import {
	ERROR_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
	type IConnections,
	type INode,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { McpPostSaveMetricsService } from '../mcp-post-save-metrics.service';
import { createUpdateWorkflowTool } from '../tools/workflow-builder/update-workflow.tool';
import { NON_FATAL_OPERATION_TYPES } from '../tools/workflow-builder/workflow-operations';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { NodeTypes } from '@/node-types';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import { TagService } from '@/services/tag.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowService } from '@/workflows/workflow.service';

const mockAutoPopulateNodeCredentials = vi.fn();
const mockTrackAutoassignOutcomes = vi.fn();
vi.mock('../tools/workflow-builder/credentials-auto-assign', () => ({
	autoPopulateNodeCredentials: (...args: unknown[]) =>
		mockAutoPopulateNodeCredentials(...args) as unknown,
	stripNullCredentialStubs: vi.fn(),
	trackAutoassignOutcomes: (...args: unknown[]) => mockTrackAutoassignOutcomes(...args) as unknown,
}));

const mockValidateJSON = vi.fn().mockReturnValue([]);
vi.mock('@n8n/ai-workflow-builder', () => ({
	MCP_UPDATE_WORKFLOW_TOOL: {
		toolName: 'update_workflow',
		displayTitle: 'Updating workflow',
	},
	ParseValidateHandler: vi.fn().mockImplementation(function () {
		return {
			validateJSON: (json: unknown) => mockValidateJSON(json) as unknown,
		};
	}),
	// Real key logic (code|nodeName|parameterPath), inlined because the module
	// is fully mocked; the pre-existing annotation tests depend on it.
	getWarningKey: (warning: { code: string; nodeName?: string; parameterPath?: string }) =>
		`${warning.code}|${warning.nodeName ?? ''}|${warning.parameterPath ?? ''}`,
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

type DataTableOpsMock = {
	getManyAndCount: Mock;
};

const userWithScopes = (scopeSlugs: string[]) =>
	Object.assign(new User(), {
		id: 'user-1',
		role: { slug: 'global:test', scopes: scopeSlugs.map((slug) => ({ slug })) },
	});

describe('update-workflow MCP tool', () => {
	const user = userWithScopes(['tag:create']);
	let workflowFinderService: WorkflowFinderService;
	let findWorkflowMock: Mock;
	let findWorkflowHeadMock: Mock;
	let workflowService: WorkflowService;
	let updateMock: Mock;
	let urlService: UrlService;
	let telemetry: Telemetry;
	let credentialsService: CredentialsService;
	let sharedWorkflowRepository: SharedWorkflowRepository;
	let nodeTypes: ReturnType<typeof mockInstance<NodeTypes>>;
	let collaborationService: CollaborationService;
	let dataTableOps: DataTableOpsMock;
	let tagService: TagService;
	let findOrCreateByNamesMock: Mock;
	let getByNamesMock: Mock;
	let globalConfig: GlobalConfig;
	let subworkflowPolicyChecker: SubworkflowPolicyChecker;
	let policyCheckMock: Mock;
	let workflowPublishedDataService: WorkflowPublishedDataService;
	let getPublishedWorkflowDataMock: Mock;

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
		vi.clearAllMocks();

		findWorkflowMock = vi.fn().mockResolvedValue(buildExistingWorkflow());
		findWorkflowHeadMock = vi.fn().mockResolvedValue({ versionId: 'v1', updatedAt: new Date() });
		workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: findWorkflowMock,
			findWorkflowHeadForUser: findWorkflowHeadMock,
		});
		updateMock = vi.fn().mockImplementation(async function (_user, workflow, workflowId) {
			return Object.assign(new WorkflowEntity(), { ...workflow, id: workflowId });
		});
		workflowService = mockInstance(WorkflowService, { update: updateMock });
		urlService = mockInstance(UrlService, {
			getInstanceBaseUrl: vi.fn().mockReturnValue('https://n8n.example.com'),
		});
		telemetry = mockInstance(Telemetry, { track: vi.fn() });
		credentialsService = mockInstance(CredentialsService);
		sharedWorkflowRepository = mockInstance(SharedWorkflowRepository, {
			findOneOrFail: vi.fn().mockResolvedValue({ projectId: 'project-1' }),
		});
		nodeTypes = mockInstance(NodeTypes);
		nodeTypes.getByNameAndVersion.mockImplementation(((type: string) => {
			if (type === '@n8n/n8n-nodes-langchain.agent') {
				return { description: { group: ['transform'], outputs: [NodeConnectionTypes.Main] } };
			}
			if (type === '@n8n/n8n-nodes-langchain.agentTool') {
				return { description: { group: ['transform'], outputs: [NodeConnectionTypes.AiTool] } };
			}
			// The group validator resolves trigger-ness via description.group; an
			// empty (non-trigger) group keeps that check from crashing on `undefined`.
			return { description: { group: ['transform'] } };
		}) as typeof nodeTypes.getByNameAndVersion);
		collaborationService = mockInstance(CollaborationService, {
			ensureWorkflowEditable: vi.fn().mockResolvedValue(undefined),
			broadcastWorkflowUpdate: vi.fn().mockResolvedValue(undefined),
		});
		mockAutoPopulateNodeCredentials.mockResolvedValue({
			assignments: [],
			skippedHttpNodes: [],
			outcomes: [],
		});
		mockValidateJSON.mockReturnValue([]);

		dataTableOps = {
			getManyAndCount: vi.fn().mockResolvedValue({ data: [], count: 0 }),
		};

		findOrCreateByNamesMock = vi.fn();
		getByNamesMock = vi.fn();
		tagService = mockInstance(TagService, {
			findOrCreateByNames: findOrCreateByNamesMock,
			getByNames: getByNamesMock,
		});
		globalConfig = mockInstance(GlobalConfig, {
			tags: { disabled: false },
			executions: { maxTimeout: 3600, timeout: -1 },
			nodes: { errorTriggerType: ERROR_TRIGGER_NODE_TYPE },
			workflows: { useWorkflowPublicationService: false },
		});
		policyCheckMock = vi.fn().mockResolvedValue(undefined);
		subworkflowPolicyChecker = mockInstance(SubworkflowPolicyChecker, {
			check: policyCheckMock,
		});
		getPublishedWorkflowDataMock = vi.fn().mockResolvedValue(null);
		workflowPublishedDataService = mockInstance(WorkflowPublishedDataService, {
			getPublishedWorkflowData: getPublishedWorkflowDataMock,
		});
	});

	const aiGatewayService = mock<AiGatewayService>();
	aiGatewayService.isAvailable.mockResolvedValue({ available: false });

	const logger = mockInstance(Logger, { error: vi.fn(), warn: vi.fn() });
	const postSaveMetrics = mockInstance(McpPostSaveMetricsService, {
		incrementPostSaveFailure: vi.fn(),
	});

	const createTool = (options?: { canvasGroupsEnabled?: boolean }) =>
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
			dataTableOps as never,
			tagService,
			globalConfig,
			subworkflowPolicyChecker,
			workflowPublishedDataService,
			aiGatewayService,
			options,
			logger,
			postSaveMetrics,
		);

	const callHandler = async (
		input: {
			workflowId: string;
			skillsUsed?: string[];
			operations: unknown[];
			versionName?: string;
			versionDescription?: string;
		},
		tool = createTool(),
	) =>
		await tool.handler(
			{
				workflowId: input.workflowId,
				skillsUsed: input.skillsUsed,
				operations: input.operations as never,
				versionName: input.versionName as string,
				versionDescription: input.versionDescription as string,
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

	describe('docs mention the non-fatal group exception only when canvasGroupsEnabled', () => {
		const operationsDescription = (tool: ReturnType<typeof createTool>) =>
			(tool.config.inputSchema!.operations as z.ZodTypeAny).description;

		test('flag off: neither the tool description nor the operations field mention the exception', () => {
			const tool = createTool();
			expect(tool.config.description).not.toContain('one exception to "atomically"');
			expect(operationsDescription(tool)).not.toContain('except node-group operations');
		});

		test('flag on: both the tool description and the operations field name the non-fatal operation types', () => {
			const tool = createTool({ canvasGroupsEnabled: true });
			const nonFatalTypesList = [...NON_FATAL_OPERATION_TYPES].join(', ');
			expect(tool.config.description).toContain(
				`Node-group operations (${nonFatalTypesList}) are the one exception to "atomically"`,
			);
			expect(operationsDescription(tool)).toContain(
				`except node-group operations (${nonFatalTypesList})`,
			);
		});
	});

	describe('output schema conformance', () => {
		// Regression for ADO-5448 / GH #32503: the error path returned
		// `structuredContent: { error }`, which failed validation against the
		// declared outputSchema (the MCP SDK publishes it with
		// additionalProperties: false and required success fields). Strict MCP
		// clients then rejected the response with an opaque `-32602` schema
		// mismatch that masked the real error. Both the error and success
		// envelopes must validate against the published schema.
		const buildStrictOutputSchema = (tool: ReturnType<typeof createTool>) =>
			z.object(tool.config.outputSchema as z.ZodRawShape).strict();

		test('error-path structuredContent conforms to declared outputSchema', async () => {
			// A JSON Pointer path without a leading "/" passes input validation but
			// fails at apply time — the exact repro from the ticket.
			const tool = createTool();
			const result = (await callHandler(
				{
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeParameter',
							nodeName: 'B',
							path: 'parameters.url',
							value: 'https://new',
						},
					],
				},
				tool,
			)) as { isError?: boolean; structuredContent: unknown };

			// The real, previously-masked error is now surfaced...
			expect(result.isError).toBe(true);
			const structured = result.structuredContent as { error?: string };
			expect(structured.error).toContain('Operation 0 failed');
			expect(structured.error).toContain('is invalid or contains unsafe segments');

			// ...and the error envelope validates against the published schema,
			// so strict clients no longer reject it with -32602.
			expect(() => buildStrictOutputSchema(tool).parse(result.structuredContent)).not.toThrow();
			expect(workflowService.update).not.toHaveBeenCalled();
		});

		test('success-path structuredContent conforms to declared outputSchema', async () => {
			const tool = createTool();
			const result = (await callHandler(
				{
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					],
				},
				tool,
			)) as { isError?: boolean; structuredContent: unknown };

			expect(result.isError).toBeUndefined();
			expect(() => buildStrictOutputSchema(tool).parse(result.structuredContent)).not.toThrow();
		});
	});

	describe('version metadata', () => {
		test('passes client-provided versionName and versionDescription to the update', async () => {
			await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
				versionName: 'Pointed B at the new API',
				versionDescription: 'Switched the request URL after the API migration',
			});

			expect(updateMock.mock.calls[0][3]).toEqual(
				expect.objectContaining({
					versionName: 'Pointed B at the new API',
					versionDescription: 'Switched the request URL after the API migration',
				}),
			);
		});

		test('falls back to diff-based version metadata when the client omits it', async () => {
			await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			expect(updateMock.mock.calls[0][3]).toEqual(
				expect.objectContaining({
					versionName: 'Updated B',
					versionDescription: 'Updated nodes: B',
				}),
			);
		});
	});

	describe('node group operations', () => {
		const buildPublishedInputSchema = (tool: ReturnType<typeof createTool>) =>
			z.object(tool.config.inputSchema as z.ZodRawShape);

		const addGroupInput = {
			workflowId: 'wf-1',
			operations: [{ type: 'addNodeGroup', name: 'Group', nodeNames: ['A', 'B'] }],
		};

		test('published schema rejects gated group ops when the flag is off', () => {
			const parsed = buildPublishedInputSchema(createTool()).safeParse(addGroupInput);
			expect(parsed.success).toBe(false);
		});

		test('published schema accepts gated group ops when the flag is on', () => {
			const parsed = buildPublishedInputSchema(createTool({ canvasGroupsEnabled: true })).safeParse(
				addGroupInput,
			);
			expect(parsed.success).toBe(true);
		});

		test('handler rejects gated group ops when the flag is off', async () => {
			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'addNodeGroup', name: 'Group', nodeNames: ['A'] }],
			});

			expect(result.isError).toBe(true);
			const response = parseResult(result);
			expect(response.error).toContain('not available on this instance');
			expect(updateMock).not.toHaveBeenCalled();
		});

		test('setNodeGroups works with the flag off', async () => {
			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{
						type: 'setNodeGroups',
						nodeGroups: [{ id: 'g1', name: 'Group', nodeNames: ['A', 'B'] }],
					},
				],
			});

			expect(result.isError).toBeUndefined();
			const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
			expect(saved.nodeGroups).toEqual([{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }]);
		});

		test('applies addNodeGroup end-to-end when the flag is on', async () => {
			const result = await callHandler(
				{
					workflowId: 'wf-1',
					operations: [{ type: 'addNodeGroup', id: 'g1', name: 'Group', nodeNames: ['A', 'B'] }],
				},
				createTool({ canvasGroupsEnabled: true }),
			);

			expect(result.isError).toBeUndefined();
			const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
			expect(saved.nodeGroups).toEqual([{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }]);
		});

		test('applies updateNodeGroup and removeNodeGroup against existing groups when the flag is on', async () => {
			findWorkflowMock.mockResolvedValue(
				Object.assign(buildExistingWorkflow(), {
					nodeGroups: [
						{ id: 'g1', name: 'First', nodeIds: ['a'] },
						{ id: 'g2', name: 'Second', nodeIds: ['b'] },
					],
				}),
			);

			const result = await callHandler(
				{
					workflowId: 'wf-1',
					operations: [
						{
							type: 'updateNodeGroup',
							groupName: 'First',
							newName: 'Renamed',
							description: 'Ingest step',
						},
						{ type: 'removeNodeGroup', groupName: 'Second' },
					],
				},
				createTool({ canvasGroupsEnabled: true }),
			);

			expect(result.isError).toBeUndefined();
			const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
			expect(saved.nodeGroups).toEqual([
				{ id: 'g1', name: 'Renamed', nodeIds: ['a'], description: 'Ingest step' },
			]);
		});

		test('removeNode prunes the node from groups and persists them, regardless of the flag', async () => {
			findWorkflowMock.mockResolvedValue(
				Object.assign(buildExistingWorkflow(), {
					nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }],
				}),
			);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'removeNode', nodeName: 'B' }],
			});

			expect(result.isError).toBeUndefined();
			const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
			expect(saved.nodeGroups).toEqual([{ id: 'g1', name: 'Group', nodeIds: ['a'] }]);
		});

		test('does not attach nodeGroups when no operation touches groups', async () => {
			findWorkflowMock.mockResolvedValue(
				Object.assign(buildExistingWorkflow(), {
					nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a'] }],
				}),
			);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'setNodePosition', nodeName: 'A', position: [50, 50] }],
			});

			expect(result.isError).toBeUndefined();
			const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
			expect('nodeGroups' in saved).toBe(false);
		});
	});

	describe('group operation structural validation', () => {
		const buildWorkflowWithTrigger = () =>
			Object.assign(new WorkflowEntity(), {
				id: 'wf-1',
				name: 'Existing',
				settings: { availableInMCP: true },
				nodes: [
					makeNode({ id: 'trigger', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
					makeNode({ id: 'a', name: 'A', position: [200, 0] }),
					makeNode({ id: 'b', name: 'B', position: [400, 0] }),
				],
				connections: {
					Trigger: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
					A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
				} as IConnections,
			});

		beforeEach(() => {
			// The group validator resolves trigger-ness via description.group.
			nodeTypes.getByNameAndVersion.mockImplementation(((type: string) => {
				if (type === 'n8n-nodes-base.manualTrigger') {
					return { description: { group: ['trigger'], outputs: [NodeConnectionTypes.Main] } };
				}

				if (type === '@n8n/n8n-nodes-langchain.agent') {
					return { description: { group: ['transform'], outputs: [NodeConnectionTypes.Main] } };
				}

				if (type === '@n8n/n8n-nodes-langchain.agentTool') {
					return { description: { group: ['transform'], outputs: [NodeConnectionTypes.AiTool] } };
				}
				return { description: { group: ['transform'], outputs: [NodeConnectionTypes.Main] } };
			}) as typeof nodeTypes.getByNameAndVersion);
		});

		describe('canvasGroupsEnabled off', () => {
			test('a structurally invalid group is not pre-checked; a persistence-layer rejection still surfaces as isError', async () => {
				findWorkflowMock.mockResolvedValue(buildWorkflowWithTrigger());
				updateMock.mockRejectedValueOnce(
					new Error('Node group "Group" cannot contain trigger nodes: Trigger.'),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeGroups',
							nodeGroups: [{ id: 'g1', name: 'Group', nodeNames: ['Trigger', 'A'] }],
						},
					],
				});

				expect(result.isError).toBe(true);
				const response = parseResult(result);
				expect(response.error).toContain('cannot contain trigger nodes');
			});

			test('a non-group operation that disconnects an existing group is not pre-checked either', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(new WorkflowEntity(), {
						id: 'wf-1',
						name: 'Existing',
						settings: { availableInMCP: true },
						nodes: [makeNode({ id: 'a', name: 'A' }), makeNode({ id: 'b', name: 'B' })],
						connections: {
							A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
						} as IConnections,
						nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }],
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'removeConnection', source: 'A', target: 'B' }],
				});

				expect(result.isError).toBeUndefined();
				// nodeGroups isn't touched or re-checked with the flag off — omitted from
				// the persisted payload exactly as before this fix (preserve-on-omit).
				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect('nodeGroups' in saved).toBe(false);
			});
		});

		describe('canvasGroupsEnabled on', () => {
			const createOnTool = () => createTool({ canvasGroupsEnabled: true });

			test('a group with a trigger inside is skipped while the rest of the update saves', async () => {
				findWorkflowMock.mockResolvedValue(buildWorkflowWithTrigger());

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [
							{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
							{
								type: 'setNodeGroups',
								nodeGroups: [{ id: 'g1', name: 'Group', nodeNames: ['Trigger', 'A'] }],
							},
						],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.nodes.find((n) => n.name === 'B')!.parameters).toEqual({
					url: 'https://new',
				});
				expect(saved.nodeGroups ?? []).toEqual([]);

				const response = parseResult(result);
				expect(response.skippedOperations).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							reason: expect.stringContaining('cannot contain trigger nodes') as string,
						}),
					]),
				);
			});

			test('a non-group operation that disconnects an existing group is caught: the group is removed and reported in removedGroups, the rest of the update still saves', async () => {
				// A removeConnection never touches nodeGroups directly, so
				// nodeGroupsChanged alone would miss this — the structural check must
				// run whenever the workflow HAS groups, not only when a group op ran.
				findWorkflowMock.mockResolvedValue(
					Object.assign(new WorkflowEntity(), {
						id: 'wf-1',
						name: 'Existing',
						settings: { availableInMCP: true },
						nodes: [makeNode({ id: 'a', name: 'A' }), makeNode({ id: 'b', name: 'B' })],
						connections: {
							A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
						} as IConnections,
						nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }],
					}),
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'removeConnection', source: 'A', target: 'B' }],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				// The connection removal itself still applied...
				expect(saved.connections.A?.main?.[0] ?? []).toEqual([]);
				// ...and the now-disconnected group was dropped, not silently re-sent as-is.
				expect(saved.nodeGroups).toEqual([]);

				const response = parseResult(result);
				// No operation was skipped: the caller asked for a removeConnection and got
				// it. The group is collateral damage, so it belongs in removedGroups.
				expect(response.skippedOperations ?? []).toEqual([]);
				expect(response.removedGroups).toEqual([
					{
						groupName: 'Group',
						reason: expect.stringContaining('single connected subgraph') as string,
					},
				]);
			});

			describe('a submitted group overlapping an existing one', () => {
				const buildWorkflowWithGroup = () =>
					Object.assign(buildWorkflowWithTrigger(), {
						nodeGroups: [{ id: 'g1', name: 'Existing group', nodeIds: ['a', 'b'] }],
					});

				test('is skipped without taking the existing group down with it', async () => {
					// The validator flags both sides of an overlap; only the submitted one
					// may go, since the operation that caused it was rejected.
					findWorkflowMock.mockResolvedValue(buildWorkflowWithGroup());

					const result = await callHandler(
						{
							workflowId: 'wf-1',
							operations: [
								{ type: 'addNodeGroup', name: 'Overlapping', nodeNames: ['Trigger', 'A'] },
							],
						},
						createOnTool(),
					);

					expect(result.isError).toBeUndefined();

					const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
					expect(saved.nodeGroups).toEqual([
						{ id: 'g1', name: 'Existing group', nodeIds: ['a', 'b'] },
					]);

					const response = parseResult(result);
					expect(response.skippedOperations).toEqual([
						{
							opIndex: 0,
							type: 'addNodeGroup',
							reason: expect.stringContaining('belongs to multiple groups') as string,
						},
					]);
					expect(response.removedGroups).toBeUndefined();
				});

				test('does not stop the other operations in the same batch from saving', async () => {
					findWorkflowMock.mockResolvedValue(buildWorkflowWithGroup());

					const result = await callHandler(
						{
							workflowId: 'wf-1',
							operations: [
								{ type: 'renameNode', oldName: 'B', newName: 'B renamed' },
								{ type: 'addNodeGroup', name: 'Overlapping', nodeNames: ['Trigger', 'A'] },
							],
						},
						createOnTool(),
					);

					expect(result.isError).toBeUndefined();

					const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
					expect(saved.nodes.map((n) => n.name)).toContain('B renamed');
					expect(saved.nodeGroups).toHaveLength(1);

					const response = parseResult(result);
					expect(response.appliedOperations).toBe(1);
					expect(response.skippedOperations).toEqual([
						expect.objectContaining({ opIndex: 1, type: 'addNodeGroup' }),
					]);
					expect(response.removedGroups).toBeUndefined();
				});

				test('drops both when the same setNodeGroups submitted both of them', async () => {
					// Neither group has priority here: the caller wrote both in one
					// operation, so both belong in skippedOperations, not removedGroups.
					findWorkflowMock.mockResolvedValue(buildWorkflowWithGroup());

					const result = await callHandler(
						{
							workflowId: 'wf-1',
							operations: [
								{
									type: 'setNodeGroups',
									nodeGroups: [
										{ id: 'g1', name: 'First', nodeNames: ['A', 'B'] },
										{ id: 'g2', name: 'Second', nodeNames: ['A'] },
									],
								},
							],
						},
						createOnTool(),
					);

					expect(result.isError).toBeUndefined();

					const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
					expect(saved.nodeGroups).toEqual([]);

					const response = parseResult(result);
					expect(response.removedGroups).toBeUndefined();
					expect(response.skippedOperations).toHaveLength(2);
				});
			});

			test('a group that splits an AI sub-node from its Agent is skipped', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(new WorkflowEntity(), {
						id: 'wf-1',
						name: 'Existing',
						settings: { availableInMCP: true },
						nodes: [
							makeNode({ id: 'agent', name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
							makeNode({
								id: 'model',
								name: 'Model',
								type: '@n8n/n8n-nodes-langchain.agentTool',
								position: [200, 0],
							}),
						],
						connections: {
							Model: {
								ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]],
							},
						} as IConnections,
					}),
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'addNodeGroup', name: 'Group', nodeNames: ['Agent'] }],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.nodeGroups ?? []).toEqual([]);

				const response = parseResult(result);
				// The op that actually created this group was addNodeGroup, not setNodeGroups —
				// the reported type must reflect that, not a hardcoded guess.
				expect(response.skippedOperations).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							type: 'addNodeGroup',
							reason: expect.stringContaining('cannot cross the') as string,
						}),
					]),
				);
			});

			test('a group whose nodes form a disconnected subgraph is skipped', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(new WorkflowEntity(), {
						id: 'wf-1',
						name: 'Existing',
						settings: { availableInMCP: true },
						nodes: [
							makeNode({ id: 'a', name: 'A' }),
							makeNode({ id: 'b', name: 'B', position: [400, 0] }),
						],
						connections: {} as IConnections,
					}),
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'addNodeGroup', name: 'Group', nodeNames: ['A', 'B'] }],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.nodeGroups ?? []).toEqual([]);

				const response = parseResult(result);
				expect(response.skippedOperations).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							reason: expect.stringContaining('single connected subgraph') as string,
						}),
					]),
				);
			});

			test('one invalid group among valid ones in the same setNodeGroups only drops the invalid one', async () => {
				findWorkflowMock.mockResolvedValue(buildWorkflowWithTrigger());

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [
							{
								type: 'setNodeGroups',
								nodeGroups: [
									{ id: 'g1', name: 'Bad', nodeNames: ['Trigger'] },
									{ id: 'g2', name: 'Good', nodeNames: ['A', 'B'] },
								],
							},
						],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.nodeGroups).toEqual([{ id: 'g2', name: 'Good', nodeIds: ['a', 'b'] }]);

				const response = parseResult(result);
				expect(response.skippedOperations).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							type: 'setNodeGroups',
							reason: expect.stringContaining('cannot contain trigger nodes') as string,
						}),
					]),
				);
				// "Good" was persisted, so the operation did apply — just not in full.
				expect(response.appliedOperations).toBe(1);
			});

			test('a setNodeGroups whose every group is dropped is discounted once, not per group', async () => {
				// Trigger -> A -> B plus a detached C: one group fails on the trigger and
				// the other on connectivity, with no member overlap between them.
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildWorkflowWithTrigger(), {
						nodes: [
							makeNode({ id: 'trigger', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
							makeNode({ id: 'a', name: 'A', position: [200, 0] }),
							makeNode({ id: 'b', name: 'B', position: [400, 0] }),
							makeNode({ id: 'c', name: 'C', position: [600, 200] }),
						],
					}),
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [
							{
								type: 'setNodeGroups',
								nodeGroups: [
									{ id: 'g1', name: 'Bad', nodeNames: ['Trigger'] },
									{ id: 'g2', name: 'AlsoBad', nodeNames: ['A', 'C'] },
								],
							},
						],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const response = parseResult(result);
				// Two violations, one operation: the count must not go negative.
				expect(response.skippedOperations).toHaveLength(2);
				expect(response.appliedOperations).toBe(0);
			});

			test('a group made invalid via updateNodeGroup reports updateNodeGroup, not a hardcoded type', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildWorkflowWithTrigger(), {
						nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }],
					}),
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [
							{ type: 'updateNodeGroup', groupName: 'Group', nodeNames: ['Trigger', 'A', 'B'] },
						],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.nodeGroups ?? []).toEqual([]);

				const response = parseResult(result);
				expect(response.skippedOperations).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							type: 'updateNodeGroup',
							reason: expect.stringContaining('cannot contain trigger nodes') as string,
						}),
					]),
				);
			});

			test('when addNodeGroup then updateNodeGroup touch the same group in one batch, the later op wins', async () => {
				findWorkflowMock.mockResolvedValue(buildWorkflowWithTrigger());

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [
							{ type: 'addNodeGroup', name: 'Group', nodeNames: ['A', 'B'] },
							{ type: 'updateNodeGroup', groupName: 'Group', nodeNames: ['Trigger', 'A', 'B'] },
						],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.nodeGroups ?? []).toEqual([]);

				const response = parseResult(result);
				// Created by addNodeGroup, then modified by updateNodeGroup — the reported
				// type must reflect the LAST op that touched it, not the one that created it.
				expect(response.skippedOperations).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							type: 'updateNodeGroup',
							reason: expect.stringContaining('cannot contain trigger nodes') as string,
						}),
					]),
				);
			});

			test('a group made invalid by removeNode pruning its bridge node is reported in removedGroups, not as a skipped removeNode', async () => {
				// Trigger -> A -> B -> C, group {A, B, C}. Removing the bridge node B
				// prunes it from the group, leaving {A, C} with no path between them.
				findWorkflowMock.mockResolvedValue(
					Object.assign(new WorkflowEntity(), {
						id: 'wf-1',
						name: 'Existing',
						settings: { availableInMCP: true },
						nodes: [
							makeNode({ id: 'trigger', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
							makeNode({ id: 'a', name: 'A', position: [200, 0] }),
							makeNode({ id: 'b', name: 'B', position: [400, 0] }),
							makeNode({ id: 'c', name: 'C', position: [600, 0] }),
						],
						connections: {
							Trigger: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
							A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
							B: { main: [[{ node: 'C', type: 'main', index: 0 }]] },
						} as IConnections,
						nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b', 'c'] }],
					}),
				);

				const result = await callHandler(
					{ workflowId: 'wf-1', operations: [{ type: 'removeNode', nodeName: 'B' }] },
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.nodeGroups ?? []).toEqual([]);

				const response = parseResult(result);
				// The node is gone: the removeNode applied in full. Pruning the group was
				// a side effect, so the group's loss is not a skipped operation.
				expect(response.skippedOperations ?? []).toEqual([]);
				expect(response.appliedOperations).toBe(1);
				expect(response.removedGroups).toEqual([
					{
						groupName: 'Group',
						reason: expect.stringContaining('single connected subgraph') as string,
					},
				]);
			});

			test('adding a node that branches out of an existing group removes the group and reports it as collateral', async () => {
				// Trigger -> A -> B, group {A, B}. Branching a new node off A gives the
				// group two outgoing boundary connections, breaking single-entry/exit.
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildWorkflowWithTrigger(), {
						nodeGroups: [{ id: 'g1', name: 'Chain', nodeIds: ['a', 'b'] }],
					}),
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [
							{ type: 'addNode', node: { name: 'C', type: 'n8n-nodes-base.set', typeVersion: 1 } },
							{ type: 'addConnection', source: 'A', target: 'C' },
						],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				// Both requested operations landed...
				expect(saved.nodes.map((n) => n.name)).toContain('C');
				expect(saved.connections.A?.main?.[0]).toEqual(
					expect.arrayContaining([expect.objectContaining({ node: 'C' })]),
				);
				// ...and only the group was lost.
				expect(saved.nodeGroups).toEqual([]);

				const response = parseResult(result);
				expect(response.appliedOperations).toBe(2);
				expect(response.skippedOperations ?? []).toEqual([]);
				expect(response.removedGroups).toEqual([
					{
						groupName: 'Chain',
						reason: expect.stringContaining('single connected subgraph') as string,
					},
				]);
			});

			test('a group already invalid before this batch is removed and reported, whatever the operations were', async () => {
				// Legacy data: basic-only validation (e.g. a git import) lets a group
				// with a trigger through, so any later update has to clean it up —
				// the same removal the canvas performs on load.
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildWorkflowWithTrigger(), {
						nodeGroups: [{ id: 'g1', name: 'Legacy', nodeIds: ['trigger', 'a'] }],
					}),
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'setNodePosition', nodeName: 'B', position: [50, 50] }],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.nodeGroups).toEqual([]);

				const response = parseResult(result);
				expect(response.appliedOperations).toBe(1);
				expect(response.skippedOperations ?? []).toEqual([]);
				expect(response.removedGroups).toEqual([
					{
						groupName: 'Legacy',
						reason: expect.stringContaining('cannot contain trigger nodes') as string,
					},
				]);
			});

			test('every skippedOperations entry carries the index of the operation it belongs to', async () => {
				findWorkflowMock.mockResolvedValue(buildWorkflowWithTrigger());

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [
							{ type: 'setNodePosition', nodeName: 'A', position: [10, 10] },
							// Fails the basic checks: unknown member.
							{ type: 'addNodeGroup', name: 'Missing', nodeNames: ['Nope'] },
							// Passes them, then fails the structural check.
							{ type: 'addNodeGroup', name: 'WithTrigger', nodeNames: ['Trigger', 'A'] },
						],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const response = parseResult(result);
				expect(response.skippedOperations).toEqual([
					expect.objectContaining({ opIndex: 1, type: 'addNodeGroup' }),
					expect.objectContaining({ opIndex: 2, type: 'addNodeGroup' }),
				]);
				expect(response.appliedOperations).toBe(1);
			});

			test('all groups valid: no skipped operations are reported', async () => {
				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'addNodeGroup', name: 'Group', nodeNames: ['A', 'B'] }],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.nodeGroups).toEqual([
					{ id: expect.any(String) as string, name: 'Group', nodeIds: ['a', 'b'] },
				]);

				const response = parseResult(result);
				expect(response.skippedOperations ?? []).toEqual([]);
			});

			test('no group operation in the batch: structural validation does not run', async () => {
				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'setNodePosition', nodeName: 'A', position: [50, 50] }],
					},
					createOnTool(),
				);

				expect(result.isError).toBeUndefined();

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect('nodeGroups' in saved).toBe(false);
			});

			test('the response reports skippedOperations with a human-readable reason', async () => {
				findWorkflowMock.mockResolvedValue(buildWorkflowWithTrigger());

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [
							{
								type: 'setNodeGroups',
								nodeGroups: [{ id: 'g1', name: 'Group', nodeNames: ['Trigger', 'A'] }],
							},
						],
					},
					createOnTool(),
				);

				const response = parseResult(result);
				expect(response.skippedOperations).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							reason: expect.stringContaining('cannot contain trigger nodes') as string,
						}),
					]),
				);
			});
		});
	});

	describe('appliedOperations count', () => {
		test('excludes an operation skipped for a basic validation failure (Part A)', async () => {
			const result = await callHandler(
				{
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
						{ type: 'addNodeGroup', name: 'Group', nodeNames: ['Missing'] },
					],
				},
				createTool({ canvasGroupsEnabled: true }),
			);

			expect(result.isError).toBeUndefined();
			const response = parseResult(result);
			expect(response.skippedOperations).toHaveLength(1);
			expect(response.appliedOperations).toBe(1);
		});

		test('does not exclude a submitted operation whose unrelated side effect removed a group (Part B)', async () => {
			// The removeConnection operation itself ran successfully — only the
			// pre-existing, untouched group it indirectly broke gets dropped.
			findWorkflowMock.mockResolvedValue(
				Object.assign(new WorkflowEntity(), {
					id: 'wf-1',
					name: 'Existing',
					settings: { availableInMCP: true },
					nodes: [makeNode({ id: 'a', name: 'A' }), makeNode({ id: 'b', name: 'B' })],
					connections: {
						A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
					} as IConnections,
					nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }],
				}),
			);

			const result = await callHandler(
				{
					workflowId: 'wf-1',
					operations: [{ type: 'removeConnection', source: 'A', target: 'B' }],
				},
				createTool({ canvasGroupsEnabled: true }),
			);

			expect(result.isError).toBeUndefined();
			const response = parseResult(result);
			expect(response.skippedOperations ?? []).toEqual([]);
			expect(response.removedGroups).toHaveLength(1);
			expect(response.appliedOperations).toBe(1);
		});

		test('excludes a group operation whose group the structural check dropped', async () => {
			// The whole point of the addNodeGroup was that group; nothing of it
			// survived the save, so it must not be counted as applied.
			findWorkflowMock.mockResolvedValue(
				Object.assign(new WorkflowEntity(), {
					id: 'wf-1',
					name: 'Existing',
					settings: { availableInMCP: true },
					nodes: [makeNode({ id: 'a', name: 'A' }), makeNode({ id: 'b', name: 'B' })],
					connections: {} as IConnections,
				}),
			);

			const result = await callHandler(
				{
					workflowId: 'wf-1',
					operations: [{ type: 'addNodeGroup', name: 'Group', nodeNames: ['A', 'B'] }],
				},
				createTool({ canvasGroupsEnabled: true }),
			);

			expect(result.isError).toBeUndefined();
			const response = parseResult(result);
			expect(response.skippedOperations).toEqual([
				{
					opIndex: 0,
					type: 'addNodeGroup',
					reason: expect.stringContaining('single connected subgraph') as string,
				},
			]);
			expect(response.removedGroups ?? []).toEqual([]);
			expect(response.appliedOperations).toBe(0);
		});

		test('counts all operations when nothing is skipped', async () => {
			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					{ type: 'setNodePosition', nodeName: 'A', position: [50, 50] },
				],
			});

			expect(parseResult(result).appliedOperations).toBe(2);
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

		test('applies setNodeSettings and persists node-level settings', async () => {
			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{
						type: 'setNodeSettings',
						nodeName: 'B',
						settings: {
							onError: 'continueErrorOutput',
							retryOnFail: true,
							maxTries: 3,
							waitBetweenTries: 1000,
							alwaysOutputData: true,
							executeOnce: true,
						},
					},
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.appliedOperations).toBe(1);

			const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
			const b = saved.nodes.find((n) => n.name === 'B')!;
			expect(b.onError).toBe('continueErrorOutput');
			expect(b.retryOnFail).toBe(true);
			expect(b.maxTries).toBe(3);
			expect(b.waitBetweenTries).toBe(1000);
			expect(b.alwaysOutputData).toBe(true);
			expect(b.executeOnce).toBe(true);
			expect(b.parameters).toEqual({ url: 'https://old', method: 'GET' });
		});

		test('returns success when post-save side effect fails but DB write committed', async () => {
			// workflowService.update succeeds, but telemetry throws afterwards —
			// mimics an `workflow.afterUpdate` hook or reactivate step that explodes
			// after the row is already on disk.
			(telemetry.track as Mock).mockImplementationOnce(() => {
				throw new Error('Telemetry pipeline exploded');
			});

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.workflowId).toBe('wf-1');
			expect(postSaveMetrics.incrementPostSaveFailure).toHaveBeenCalledWith(
				'update',
				expect.any(Error),
			);
			expect(logger.error).toHaveBeenCalledWith(
				'Post-save side effect failed for update_workflow',
				expect.objectContaining({ workflowId: 'wf-1' }),
			);
		});

		test('does not record post-save failure metric when telemetry fails on error path', async () => {
			findWorkflowMock.mockResolvedValue(null);
			(telemetry.track as Mock).mockImplementationOnce(() => {
				throw new Error('Telemetry pipeline exploded');
			});

			const result = await callHandler({
				workflowId: 'non-existent-id',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			expect(result.isError).toBe(true);
			expect(postSaveMetrics.incrementPostSaveFailure).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				'Telemetry failed for update_workflow (error path)',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});

		test('recovers from a thrown post-save error when persisted nodes and connections match expected', async () => {
			const expectedWf = buildExistingWorkflow();
			expectedWf.nodes.find((n) => n.name === 'B')!.parameters = {
				url: 'https://new',
				method: 'GET',
			};

			updateMock.mockImplementation(async (_user, _workflow: WorkflowEntity, _id: string) => {
				throw new Error('workflow.afterUpdate hook failed');
			});
			// The first findWorkflowForUser call is the pre-update read; the second
			// is the post-save recovery check.
			findWorkflowMock
				.mockResolvedValueOnce(buildExistingWorkflow())
				.mockResolvedValueOnce(expectedWf);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.workflowId).toBe('wf-1');
			expect(response.name).toBe('Existing');
			expect(response.url).toBe('https://n8n.example.com/workflow/wf-1');
			expect(response.note).toContain('post-save operation failed');
			// Verify recovery output payload is trimmed (nodes, active, updatedAt, versionId removed)
			expect(response.nodes).toBeUndefined();
			expect(response.active).toBeUndefined();
			expect(response.updatedAt).toBeUndefined();
			expect(response.versionId).toBeUndefined();
		});

		test('records post-save failure metric when recovery returns success', async () => {
			const postSaveError = new Error('workflow.afterUpdate hook failed');
			const expectedWf = buildExistingWorkflow();
			expectedWf.nodes.find((n) => n.name === 'B')!.parameters = {
				url: 'https://new',
				method: 'GET',
			};

			updateMock.mockRejectedValue(postSaveError);
			findWorkflowMock
				.mockResolvedValueOnce(buildExistingWorkflow())
				.mockResolvedValueOnce(expectedWf);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			expect(result.isError).toBeUndefined();
			expect(postSaveMetrics.incrementPostSaveFailure).toHaveBeenCalledWith(
				'update',
				postSaveError,
			);
		});

		test('does not recover graph update when persisted graph differs', async () => {
			const older = new Date('2024-01-01T00:00:00.000Z');
			const recent = new Date('2024-01-02T00:00:00.000Z');
			updateMock.mockRejectedValue(new Error('workflow.afterUpdate hook failed'));

			const preUpdate = buildExistingWorkflow();
			preUpdate.updatedAt = older;
			const recovered = buildExistingWorkflow();
			recovered.updatedAt = recent;
			recovered.nodes.find((n) => n.name === 'B')!.parameters = {
				url: 'https://new',
				method: 'GET',
				normalized: true,
			};

			findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe('workflow.afterUpdate hook failed');
			expect(response.errorCode).toBe('UNKNOWN_ERROR');
		});

		test('reports a genuine failure for a no-op graph operation that throws before commit', async () => {
			const sameTimestamp = new Date('2024-01-01T00:00:00.000Z');
			updateMock.mockRejectedValue(new Error('Update failed before commit'));

			const preUpdate = buildExistingWorkflow();
			preUpdate.updatedAt = sameTimestamp;
			const recovered = buildExistingWorkflow();
			recovered.updatedAt = sameTimestamp;

			findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://old' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe('Update failed before commit');
			expect(response.errorCode).toBe('UNKNOWN_ERROR');
			expect(postSaveMetrics.incrementPostSaveFailure).not.toHaveBeenCalledWith(
				'update',
				expect.any(Error),
			);
		});

		test('recovers graph update when content changed but updatedAt has the same millisecond timestamp', async () => {
			const sameTimestamp = new Date('2024-01-01T00:00:00.000Z');
			updateMock.mockRejectedValue(new Error('workflow.afterUpdate hook failed'));

			const preUpdate = buildExistingWorkflow();
			preUpdate.updatedAt = sameTimestamp;
			const recovered = buildExistingWorkflow();
			recovered.updatedAt = sameTimestamp;
			recovered.nodes.find((n) => n.name === 'B')!.parameters = {
				url: 'https://new',
				method: 'GET',
			};

			findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.workflowId).toBe('wf-1');
			expect(response.note).toContain('post-save operation failed');
		});

		test('recovers node-group-only update when updatedAt has the same millisecond timestamp', async () => {
			const sameTimestamp = new Date('2024-01-01T00:00:00.000Z');
			updateMock.mockRejectedValue(new Error('workflow.afterUpdate hook failed'));

			const preUpdate = buildExistingWorkflow();
			preUpdate.updatedAt = sameTimestamp;
			const recovered = buildExistingWorkflow();
			recovered.updatedAt = sameTimestamp;
			recovered.nodeGroups = [{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }];

			findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

			const result = await callHandler(
				{
					workflowId: 'wf-1',
					operations: [{ type: 'addNodeGroup', id: 'g1', name: 'Group', nodeNames: ['A', 'B'] }],
				},
				createTool({ canvasGroupsEnabled: true }),
			);

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.workflowId).toBe('wf-1');
			expect(response.note).toContain('post-save operation failed');
		});

		test('recovers graph update when node parameter undefined is omitted after persistence', async () => {
			const sameTimestamp = new Date('2024-01-01T00:00:00.000Z');
			updateMock.mockRejectedValue(new Error('workflow.afterUpdate hook failed'));

			const preUpdate = buildExistingWorkflow();
			preUpdate.updatedAt = sameTimestamp;
			const recovered = buildExistingWorkflow();
			recovered.updatedAt = sameTimestamp;
			recovered.nodes.find((n) => n.name === 'B')!.parameters = {
				url: 'https://new',
				method: 'GET',
			};

			findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{
						type: 'updateNodeParameters',
						nodeName: 'B',
						parameters: { url: 'https://new', optional: undefined },
					},
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.workflowId).toBe('wf-1');
			expect(response.note).toContain('post-save operation failed');
		});

		test.each([
			['renameNode', { type: 'renameNode', oldName: 'B', newName: 'B renamed' }],
			['setNodePosition', { type: 'setNodePosition', nodeName: 'B', position: [300, 100] }],
			['setNodeDisabled', { type: 'setNodeDisabled', nodeName: 'B', disabled: true }],
		])(
			'does not recover %s when persisted graph does not match expected graph',
			async (_operationType, operation) => {
				const older = new Date('2024-01-01T00:00:00.000Z');
				const recent = new Date('2024-01-02T00:00:00.000Z');
				updateMock.mockRejectedValue(new Error('workflow.afterUpdate hook failed'));

				const preUpdate = buildExistingWorkflow();
				preUpdate.updatedAt = older;
				const recovered = buildExistingWorkflow();
				recovered.updatedAt = recent;

				findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [operation],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toBe('workflow.afterUpdate hook failed');
				expect(response.errorCode).toBe('UNKNOWN_ERROR');
			},
		);

		test('recovers settings-only update when updatedAt changed', async () => {
			const older = new Date('2024-01-01T00:00:00.000Z');
			const recent = new Date('2024-01-02T00:00:00.000Z');
			updateMock.mockRejectedValue(new Error('Post-save hook failed'));

			const preUpdate = buildExistingWorkflow();
			preUpdate.updatedAt = older;
			const recovered = buildExistingWorkflow();
			recovered.updatedAt = recent;
			recovered.nodes.push(makeNode({ id: 'c', name: 'C' }));

			findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'setWorkflowSettings', settings: { executionTimeout: 120 } }],
			});

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.workflowId).toBe('wf-1');
			expect(response.note).toContain('post-save operation failed');
		});

		test('recovers settings-only update when updatedAt has the same millisecond timestamp', async () => {
			const sameTimestamp = new Date('2024-01-01T00:00:00.000Z');
			updateMock.mockRejectedValue(new Error('Post-save hook failed'));

			const preUpdate = buildExistingWorkflow();
			preUpdate.updatedAt = sameTimestamp;
			const recovered = buildExistingWorkflow();
			recovered.updatedAt = sameTimestamp;
			recovered.settings = { availableInMCP: true, executionTimeout: 120 };

			findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'setWorkflowSettings', settings: { executionTimeout: 120 } }],
			});

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.workflowId).toBe('wf-1');
			expect(response.note).toContain('post-save operation failed');
		});

		test.each([
			{
				name: 'DEFAULT settings',
				initialSettings: { availableInMCP: true, saveManualExecutions: false },
				operationSettings: { saveManualExecutions: 'DEFAULT' },
			},
			{
				name: 'default executionTimeout',
				initialSettings: { availableInMCP: true, executionTimeout: 120 },
				operationSettings: { executionTimeout: -1 },
			},
		])(
			'recovers settings-only update that normalizes $name when updatedAt has the same millisecond timestamp',
			async ({ initialSettings, operationSettings }) => {
				const sameTimestamp = new Date('2024-01-01T00:00:00.000Z');
				updateMock.mockRejectedValue(new Error('Post-save hook failed'));

				const preUpdate = buildExistingWorkflow();
				preUpdate.updatedAt = sameTimestamp;
				preUpdate.settings = initialSettings;
				const recovered = buildExistingWorkflow();
				recovered.updatedAt = sameTimestamp;
				recovered.settings = { availableInMCP: true };

				findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: operationSettings }],
				});

				const response = parseResult(result);
				expect(result.isError).toBeUndefined();
				expect(response.workflowId).toBe('wf-1');
				expect(response.note).toContain('post-save operation failed');
			},
		);

		test('does not recover tag update when persisted tags do not match expected tags', async () => {
			const older = new Date('2024-01-01T00:00:00.000Z');
			const recent = new Date('2024-01-02T00:00:00.000Z');
			updateMock.mockRejectedValue(new Error('Tag mapping failed'));
			findOrCreateByNamesMock.mockResolvedValue([
				{ id: 'tag-0', name: 'production' },
				{ id: 'tag-1', name: 'critical' },
			]);

			const preUpdate = Object.assign(buildExistingWorkflow(), {
				updatedAt: older,
				tags: [{ id: 'tag-0', name: 'production' }],
			});
			const recovered = Object.assign(buildExistingWorkflow(), {
				updatedAt: recent,
				tags: [{ id: 'tag-0', name: 'production' }],
			});

			findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'addTags', names: ['critical'] }],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe('Tag mapping failed');
			expect(findWorkflowMock).toHaveBeenLastCalledWith(
				'wf-1',
				user,
				['workflow:read'],
				expect.objectContaining({ includeTags: true }),
			);
		});

		test('recovers tag update when persisted names match expected after trimming and case-deduplication', async () => {
			// The LLM sometimes supplies tag names with surrounding whitespace or
			// repeats the same name in different casings. The tag service normalizes
			// those via dedupeNamesPreservingCase before persisting, so the recovery
			// check must compare against the normalized expected names — not the raw
			// input — otherwise a successful save would be reported as failed.
			const older = new Date('2024-01-01T00:00:00.000Z');
			const recent = new Date('2024-01-02T00:00:00.000Z');
			updateMock.mockRejectedValue(new Error('Tag mapping failed'));
			findOrCreateByNamesMock.mockResolvedValue([{ id: 'tag-0', name: 'Production' }]);

			const preUpdate = Object.assign(buildExistingWorkflow(), {
				updatedAt: older,
				tags: [],
			});
			const recovered = Object.assign(buildExistingWorkflow(), {
				updatedAt: recent,
				tags: [{ id: 'tag-0', name: 'Production' }],
			});

			findWorkflowMock.mockResolvedValueOnce(preUpdate).mockResolvedValueOnce(recovered);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'addTags', names: [' Production ', 'production'] }],
			});

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.workflowId).toBe('wf-1');
			expect(response.note).toContain('post-save operation failed');
		});

		test('reports a genuine failure when persisted nodes differ from expected (concurrent edit or uncommitted update)', async () => {
			updateMock.mockRejectedValue(new Error('Connection lost mid-save'));
			// Recovery fetch returns a workflow with different nodes (e.g. edited concurrently by another process)
			const concurrentWf = buildExistingWorkflow();
			concurrentWf.nodes.push(makeNode({ id: 'c', name: 'C' }));

			findWorkflowMock
				.mockResolvedValueOnce(buildExistingWorkflow())
				.mockResolvedValueOnce(concurrentWf);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe('Connection lost mid-save');
			expect(response.errorCode).toBe('UNKNOWN_ERROR');
		});

		test('maps NotFoundError to errorCode HTTP_404', async () => {
			findWorkflowMock.mockRejectedValue(new NotFoundError('Workflow not found'));

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.errorCode).toBe('HTTP_404');
		});

		test('reports a genuine failure when the recovery lookup returns null', async () => {
			updateMock.mockRejectedValue(new Error('DB write exploded'));
			// Pre-update read: empty (workflow not yet seen), then recovery read:
			// still empty (the row really does not exist).
			findWorkflowMock.mockResolvedValueOnce(buildExistingWorkflow());
			findWorkflowMock.mockResolvedValueOnce(null);

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe('DB write exploded');
			expect(response.errorCode).toBe('UNKNOWN_ERROR');
		});

		test('logs and falls through to genuine failure when the recovery lookup throws', async () => {
			updateMock.mockRejectedValue(new Error('Outer failure'));
			// Pre-update read OK; the post-save recovery lookup itself throws.
			findWorkflowMock.mockResolvedValueOnce(buildExistingWorkflow());
			findWorkflowMock.mockRejectedValueOnce(new Error('Lookup DB outage'));

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
				],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe('Outer failure');
			expect(response.errorCode).toBe('UNKNOWN_ERROR');
			expect(logger.warn).toHaveBeenCalledWith(
				'Post-update verification lookup failed',
				expect.objectContaining({ workflowId: 'wf-1' }),
			);
		});

		test('includes errorCode on validation error responses', async () => {
			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'invalidOp' as never, nodeName: 'B' }],
			});

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(typeof response.errorCode).toBe('string');
			expect(response.error).toContain('Invalid operations');
		});

		describe('setWorkflowSettings', () => {
			// Published error workflow: the Error Trigger lives in the active version,
			// while the draft nodes are empty — proving validation reads the published
			// version (what runtime runs), not the draft.
			const errorHandlerWorkflow = () =>
				Object.assign(new WorkflowEntity(), {
					id: 'err-wf',
					name: 'Error Handler',
					settings: { availableInMCP: true },
					nodes: [],
					connections: {},
					activeVersionId: 'err-wf-v1',
					activeVersion: {
						nodes: [makeNode({ id: 'et', name: 'Error Trigger', type: ERROR_TRIGGER_NODE_TYPE })],
						connections: {},
					},
				});

			test('applies setWorkflowSettings and persists merged workflow-level settings', async () => {
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'err-wf' ? errorHandlerWorkflow() : buildExistingWorkflow(),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setWorkflowSettings',
							settings: { errorWorkflow: 'err-wf', executionOrder: 'v1' },
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBeUndefined();
				expect(response.appliedOperations).toBe(1);

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				// Existing settings (availableInMCP) preserved, new keys merged in.
				expect(saved.settings).toEqual({
					availableInMCP: true,
					errorWorkflow: 'err-wf',
					executionOrder: 'v1',
				});
				expect(response.settings).toEqual(
					expect.objectContaining({ errorWorkflow: 'err-wf', executionOrder: 'v1' }),
				);
			});

			test('rejects when the error workflow is not found or inaccessible', async () => {
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'wf-1' ? buildExistingWorkflow() : null,
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { errorWorkflow: 'missing-wf' } }],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("Error workflow 'missing-wf' was not found");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('rejects when the error workflow has no published version', async () => {
				// Draft contains an Error Trigger, but the workflow was never published —
				// runtime would never run it, so this must be rejected.
				findWorkflowMock.mockImplementation(async (id: string) => {
					if (id === 'wf-1') return buildExistingWorkflow();
					if (id === 'draft-only-wf') {
						return Object.assign(new WorkflowEntity(), {
							id: 'draft-only-wf',
							name: 'Draft Only Handler',
							nodes: [makeNode({ id: 'et', name: 'Error Trigger', type: ERROR_TRIGGER_NODE_TYPE })],
							connections: {},
							activeVersionId: null,
							activeVersion: null,
						});
					}
					return null;
				});

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'setWorkflowSettings', settings: { errorWorkflow: 'draft-only-wf' } },
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('has no published version');
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('honors a custom error trigger type (NODES_ERROR_TRIGGER_TYPE)', async () => {
				const customType = 'n8n-nodes-base.customErrorTrigger';
				globalConfig = mockInstance(GlobalConfig, {
					tags: { disabled: false },
					executions: { maxTimeout: 3600, timeout: -1 },
					nodes: { errorTriggerType: customType },
				});
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'err-wf'
						? Object.assign(new WorkflowEntity(), {
								id: 'err-wf',
								name: 'Custom Error Handler',
								settings: { availableInMCP: true },
								nodes: [],
								connections: {},
								activeVersionId: 'err-wf-v1',
								activeVersion: {
									nodes: [makeNode({ id: 'cet', name: 'Custom Error Trigger', type: customType })],
									connections: {},
								},
							})
						: buildExistingWorkflow(),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { errorWorkflow: 'err-wf' } }],
				});

				// The published version has the configured custom trigger, so it is accepted
				// even though it lacks the default n8n-nodes-base.errorTrigger.
				expect(result.isError).toBeUndefined();
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('rejects when the published version has no active Error Trigger node', async () => {
				// Published, but the active version lacks an Error Trigger (e.g. it was
				// only added to the draft after publishing).
				findWorkflowMock.mockImplementation(async (id: string) => {
					if (id === 'wf-1') return buildExistingWorkflow();
					if (id === 'no-trigger-wf') {
						return Object.assign(new WorkflowEntity(), {
							id: 'no-trigger-wf',
							name: 'Not An Error Handler',
							nodes: [makeNode({ id: 'et', name: 'Error Trigger', type: ERROR_TRIGGER_NODE_TYPE })],
							connections: {},
							activeVersionId: 'no-trigger-wf-v1',
							activeVersion: { nodes: [makeNode({ id: 'x', name: 'X' })], connections: {} },
						});
					}
					return null;
				});

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'setWorkflowSettings', settings: { errorWorkflow: 'no-trigger-wf' } },
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('no active Error Trigger node');
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('with publication service enabled, validates the service-published version', async () => {
				globalConfig = mockInstance(GlobalConfig, {
					tags: { disabled: false },
					executions: { maxTimeout: 3600, timeout: -1 },
					nodes: { errorTriggerType: ERROR_TRIGGER_NODE_TYPE },
					workflows: { useWorkflowPublicationService: true },
				});
				// findWorkflowForUser grants read access; its activeVersion is intentionally
				// absent to prove the published nodes come from the publication service.
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'err-wf'
						? Object.assign(new WorkflowEntity(), {
								id: 'err-wf',
								name: 'Error Handler',
								settings: { availableInMCP: true },
								nodes: [],
								connections: {},
								activeVersionId: null,
								activeVersion: null,
							})
						: buildExistingWorkflow(),
				);
				getPublishedWorkflowDataMock.mockResolvedValue({
					workflow: { id: 'err-wf' },
					publishedVersion: {
						nodes: [makeNode({ id: 'et', name: 'Error Trigger', type: ERROR_TRIGGER_NODE_TYPE })],
						connections: {},
					},
				});

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { errorWorkflow: 'err-wf' } }],
				});

				expect(result.isError).toBeUndefined();
				expect(getPublishedWorkflowDataMock).toHaveBeenCalledWith('err-wf');
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('with publication service enabled, ignores a stale activeVersion when the service reports none', async () => {
				globalConfig = mockInstance(GlobalConfig, {
					tags: { disabled: false },
					executions: { maxTimeout: 3600, timeout: -1 },
					nodes: { errorTriggerType: ERROR_TRIGGER_NODE_TYPE },
					workflows: { useWorkflowPublicationService: true },
				});
				// The entity's activeVersion (with a trigger) is stale; the publication
				// service — the runtime source of truth — reports no published version.
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'err-wf'
						? Object.assign(new WorkflowEntity(), {
								id: 'err-wf',
								name: 'Error Handler',
								settings: { availableInMCP: true },
								nodes: [],
								connections: {},
								activeVersionId: 'err-wf-v1',
								activeVersion: {
									nodes: [
										makeNode({ id: 'et', name: 'Error Trigger', type: ERROR_TRIGGER_NODE_TYPE }),
									],
									connections: {},
								},
							})
						: buildExistingWorkflow(),
				);
				getPublishedWorkflowDataMock.mockResolvedValue(null);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { errorWorkflow: 'err-wf' } }],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('has no published version');
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('rejects when this workflow may not call the error workflow (caller policy)', async () => {
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'err-wf' ? errorHandlerWorkflow() : buildExistingWorkflow(),
				);
				policyCheckMock.mockRejectedValue(
					new SubworkflowPolicyDenialError({
						subworkflowId: 'err-wf',
						subworkflowProject: { id: 'p1', type: 'personal', name: 'Personal' } as Project,
						hasReadAccess: true,
						instanceUrl: 'https://n8n.example.com',
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { errorWorkflow: 'err-wf' } }],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain(
					'cannot be called by this workflow because of its caller policy',
				);
				expect(workflowService.update).not.toHaveBeenCalled();
				// The policy check runs against the failing (parent) workflow id.
				expect(policyCheckMock).toHaveBeenCalledWith(expect.anything(), 'wf-1', undefined, user.id);
			});

			test('clears the error workflow with "DEFAULT" without a validation lookup', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { errorWorkflow: 'DEFAULT' } }],
				});

				expect(result.isError).toBeUndefined();
				// Only the main workflow lookup ran; no second lookup for "DEFAULT".
				expect(findWorkflowMock).toHaveBeenCalledTimes(1);
				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.settings).toEqual(expect.objectContaining({ errorWorkflow: 'DEFAULT' }));
			});

			test('does not attach settings for node-only edits', async () => {
				await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					],
				});

				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.settings).toBeUndefined();
			});

			test('rejects callerPolicy "workflowsFromAList" without callerIds', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'setWorkflowSettings', settings: { callerPolicy: 'workflowsFromAList' } },
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('callerPolicy "workflowsFromAList" requires callerIds');
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('rejects callerPolicy "workflowsFromAList" with blank callerIds', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setWorkflowSettings',
							settings: { callerPolicy: 'workflowsFromAList', callerIds: ' , ' },
						},
					],
				});

				expect(result.isError).toBe(true);
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('accepts callerPolicy "workflowsFromAList" when callerIds set in the same op', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setWorkflowSettings',
							settings: { callerPolicy: 'workflowsFromAList', callerIds: 'wf-7, wf-8' },
						},
					],
				});

				expect(result.isError).toBeUndefined();
				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.settings).toEqual(
					expect.objectContaining({ callerPolicy: 'workflowsFromAList', callerIds: 'wf-7, wf-8' }),
				);
			});

			test('accepts setting only callerPolicy when callerIds already exist on the workflow', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						settings: { availableInMCP: true, callerIds: 'wf-9' },
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'setWorkflowSettings', settings: { callerPolicy: 'workflowsFromAList' } },
					],
				});

				expect(result.isError).toBeUndefined();
				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.settings).toEqual(
					expect.objectContaining({ callerPolicy: 'workflowsFromAList', callerIds: 'wf-9' }),
				);
			});

			test('rejects executionTimeout above the instance maximum', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { executionTimeout: 7200 } }],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("exceeds this instance's maximum of 3600s");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('accepts executionTimeout within the instance maximum', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { executionTimeout: 300 } }],
				});

				expect(result.isError).toBeUndefined();
				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.settings).toEqual(expect.objectContaining({ executionTimeout: 300 }));
			});

			test('rejects executionTimeout of 0 at the schema level', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { executionTimeout: 0 } }],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('Invalid operations');
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('accepts executionTimeout of -1 (unlimited), bypassing the max check', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { executionTimeout: -1 } }],
				});

				expect(result.isError).toBeUndefined();
				const saved = updateMock.mock.calls[0][1] as WorkflowEntity;
				expect(saved.settings).toEqual(expect.objectContaining({ executionTimeout: -1 }));
			});

			test('rejects settings changes on a published workflow without publish permission', async () => {
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'wf-1'
						? Object.assign(buildExistingWorkflow(), { activeVersionId: 'wf-1-v1' })
						: null,
				);
				// Edit access yes (findWorkflowForUser above), publish access no.
				findWorkflowHeadMock.mockResolvedValue(null);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { timezone: 'UTC' } }],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('requires publish permission');
				expect(findWorkflowHeadMock).toHaveBeenCalledWith('wf-1', user, ['workflow:publish']);
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('allows settings changes on a published workflow with publish permission', async () => {
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'wf-1'
						? Object.assign(buildExistingWorkflow(), { activeVersionId: 'wf-1-v1' })
						: null,
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { timezone: 'UTC' } }],
				});

				expect(result.isError).toBeUndefined();
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('skips the publish-permission lookup when the user has a global publish scope', async () => {
				const globalPublisher = userWithScopes(['workflow:update', 'workflow:publish']);
				const tool = createUpdateWorkflowTool(
					globalPublisher,
					workflowFinderService,
					workflowService,
					urlService,
					telemetry,
					nodeTypes,
					credentialsService,
					sharedWorkflowRepository,
					collaborationService,
					dataTableOps as never,
					tagService,
					globalConfig,
					subworkflowPolicyChecker,
					workflowPublishedDataService,
					aiGatewayService,
					{},
					logger,
					postSaveMetrics,
				);
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'wf-1'
						? Object.assign(buildExistingWorkflow(), { activeVersionId: 'wf-1-v1' })
						: null,
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'setWorkflowSettings', settings: { timezone: 'UTC' } }],
					},
					tool,
				);

				expect(result.isError).toBeUndefined();
				// Global publish scope is proven in-memory, so no DB probe is needed.
				expect(findWorkflowHeadMock).not.toHaveBeenCalled();
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('does not require publish permission for settings on an unpublished workflow', async () => {
				// No activeVersionId → not published → reactivation never happens.
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'wf-1' ? buildExistingWorkflow() : null,
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowSettings', settings: { timezone: 'UTC' } }],
				});

				expect(result.isError).toBeUndefined();
				// Unpublished → no publish probe at all.
				expect(findWorkflowHeadMock).not.toHaveBeenCalled();
				expect(workflowService.update).toHaveBeenCalled();
			});
		});

		test('returns error when workflow has active write lock', async () => {
			(collaborationService.ensureWorkflowEditable as Mock).mockRejectedValue(
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
				expect.objectContaining({ aiBuilderAssisted: true, source: 'n8n-mcp' }),
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
		});

		test('reports auto-assigned credentials in the response', async () => {
			mockAutoPopulateNodeCredentials.mockResolvedValue({
				assignments: [
					{
						nodeName: 'C',
						credentialName: 'My Slack',
						credentialType: 'slackApi',
						source: 'user',
					},
					{
						nodeName: 'D',
						credentialName: 'Gateway credits',
						credentialType: 'openAiApi',
						source: 'aiGateway',
					},
				],
				skippedHttpNodes: [],
				outcomes: [],
			});

			const tool = createTool();
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
				{ nodeName: 'C', credentialName: 'My Slack', credentialType: 'slackApi', source: 'user' },
				{
					nodeName: 'D',
					credentialName: 'Gateway credits',
					credentialType: 'openAiApi',
					source: 'aiGateway',
				},
			]);

			// The `source` field must be declared in the item schema; validate items
			// strictly so a returned key missing from the schema fails the test
			// (MCP publishes the schema with additionalProperties: false).
			const itemsField = (
				tool.config.outputSchema as {
					autoAssignedCredentials: z.ZodOptional<z.ZodArray<z.ZodObject<z.ZodRawShape>>>;
				}
			).autoAssignedCredentials.unwrap();
			expect(() =>
				z.array(itemsField.element.strict()).parse(response.autoAssignedCredentials),
			).not.toThrow();
		});

		test('tracks auto-assign outcomes with the persisted workflow id after update', async () => {
			mockAutoPopulateNodeCredentials.mockResolvedValue({
				assignments: [],
				skippedHttpNodes: [],
				outcomes: [
					{
						nodeName: 'C',
						credentialType: 'openAiApi',
						source: 'aiGateway',
						hadUserCredential: false,
						aiGatewayAvailable: true,
					},
				],
			});

			await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'addNode', node: { name: 'C', type: 'n8n-nodes-base.slack', typeVersion: 1 } },
				],
			});

			expect(mockTrackAutoassignOutcomes).toHaveBeenCalledTimes(1);
			const trackArgs = mockTrackAutoassignOutcomes.mock.calls[0];
			expect(trackArgs[2]).toBe('update_workflow');
			expect(trackArgs[5]).toBe('wf-1');
			// Tracking runs only after the update persists.
			expect(updateMock.mock.invocationCallOrder[0]).toBeLessThan(
				mockTrackAutoassignOutcomes.mock.invocationCallOrder[0],
			);
		});

		test('does not track auto-assign outcomes when the update fails to persist', async () => {
			mockAutoPopulateNodeCredentials.mockResolvedValue({
				assignments: [],
				skippedHttpNodes: [],
				outcomes: [
					{
						nodeName: 'C',
						credentialType: 'openAiApi',
						source: 'aiGateway',
						hadUserCredential: false,
						aiGatewayAvailable: true,
					},
				],
			});
			updateMock.mockRejectedValueOnce(new Error('update failed'));

			const result = await callHandler({
				workflowId: 'wf-1',
				operations: [
					{ type: 'addNode', node: { name: 'C', type: 'n8n-nodes-base.slack', typeVersion: 1 } },
				],
			});

			expect(result.isError).toBe(true);
			expect(mockTrackAutoassignOutcomes).not.toHaveBeenCalled();
		});

		test('reports skipped HTTP nodes in the note', async () => {
			mockAutoPopulateNodeCredentials.mockResolvedValue({
				assignments: [],
				skippedHttpNodes: ['HTTP Request'],
				outcomes: [],
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
				skillsUsed: ['workflow-builder', 'node-selection'],
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
						skillsUsed: ['workflow-builder', 'node-selection'],
						opCount: 2,
						opTypes: ['setWorkflowMetadata', 'updateNodeParameters'],
					}),
					results: expect.objectContaining({ success: true }),
				}),
			);
		});

		test('omits skillsUsed from telemetry when not provided', async () => {
			await callHandler({
				workflowId: 'wf-1',
				operations: [{ type: 'setWorkflowMetadata', name: 'Renamed' }],
			});

			const trackedPayload = (telemetry.track as Mock).mock.calls[0][1] as {
				parameters: Record<string, unknown>;
			};
			expect(trackedPayload.parameters).not.toHaveProperty('skillsUsed');
		});

		test('omits skillsUsed from telemetry when an empty array is passed', async () => {
			await callHandler({
				workflowId: 'wf-1',
				skillsUsed: [],
				operations: [{ type: 'setWorkflowMetadata', name: 'Renamed' }],
			});

			const trackedPayload = (telemetry.track as Mock).mock.calls[0][1] as {
				parameters: Record<string, unknown>;
			};
			expect(trackedPayload.parameters).not.toHaveProperty('skillsUsed');
		});

		test('normalizes skillsUsed before tracking telemetry', async () => {
			await callHandler({
				workflowId: 'wf-1',
				skillsUsed: ['  Workflow-Builder  ', 'workflow-builder', 'has spaces', 'NODE-SELECTION'],
				operations: [{ type: 'setWorkflowMetadata', name: 'Renamed' }],
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					parameters: expect.objectContaining({
						skillsUsed: ['workflow-builder', 'node-selection'],
					}),
				}),
			);
		});

		test('does not reject the call when skillsUsed overflows the cap', async () => {
			const oversized = Array.from({ length: 60 }, (_, i) => `skill-${i}`);
			const result = await callHandler({
				workflowId: 'wf-1',
				skillsUsed: oversized,
				operations: [{ type: 'setWorkflowMetadata', name: 'Renamed' }],
			});

			expect(result.isError).toBeUndefined();
			const trackedPayload = (telemetry.track as Mock).mock.calls[0][1] as {
				parameters: { skillsUsed: string[] };
			};
			expect(trackedPayload.parameters.skillsUsed).toHaveLength(50);
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
				// Post-apply pass finds warnings; pre-update pass is clean, so nothing
				// is annotated as pre-existing.
				mockValidateJSON
					.mockReturnValueOnce([
						{ code: 'GRAPH_ERR', message: 'unwired node', nodeName: 'B' },
						{ code: 'JSON_WARN', message: 'parameter missing' },
					])
					.mockReturnValueOnce([]);

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

			test('annotates warnings that already existed before the update as pre-existing', async () => {
				const carriedOver = {
					code: 'JSON_WARN',
					message: 'Missing discriminator "parameters.operation".',
					nodeName: 'Google Drive',
				};
				mockValidateJSON
					.mockReturnValueOnce([
						carriedOver,
						{ code: 'GRAPH_ERR', message: 'unwired node', nodeName: 'B' },
					])
					.mockReturnValueOnce([carriedOver]);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					],
				});

				const response = parseResult(result);
				expect(response.validationWarnings).toEqual([
					{
						code: 'JSON_WARN',
						message: '[pre-existing] Missing discriminator "parameters.operation".',
						nodeName: 'Google Drive',
						preExisting: true,
					},
					{ code: 'GRAPH_ERR', message: 'unwired node', nodeName: 'B' },
				]);

				// The pre-update pass validated the workflow as loaded, before ops.
				expect(mockValidateJSON).toHaveBeenCalledTimes(2);
				const preJson = mockValidateJSON.mock.calls[1][0] as { name: string; nodes: INode[] };
				expect(preJson.name).toBe('Existing');
			});

			test('matches pre-existing warnings by location, not message content', async () => {
				mockValidateJSON
					.mockReturnValueOnce([{ code: 'JSON_WARN', message: 'reworded message', nodeName: 'B' }])
					.mockReturnValueOnce([{ code: 'JSON_WARN', message: 'original message', nodeName: 'B' }]);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					],
				});

				const response = parseResult(result);
				expect(response.validationWarnings).toEqual([
					{
						code: 'JSON_WARN',
						message: '[pre-existing] reworded message',
						nodeName: 'B',
						preExisting: true,
					},
				]);
			});

			test('skips the pre-update validation pass when the post-apply pass is clean', async () => {
				await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					],
				});

				expect(mockValidateJSON).toHaveBeenCalledTimes(1);
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

			test('refuses to save when an addConnection wires an agent as a tool to another agent', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(new WorkflowEntity(), {
						id: 'wf-1',
						name: 'Existing',
						settings: { availableInMCP: true },
						nodes: [
							makeNode({
								id: 'manager',
								name: 'Manager Agent',
								type: '@n8n/n8n-nodes-langchain.agent',
								typeVersion: 3,
							}),
							makeNode({
								id: 'worker',
								name: 'Worker Agent',
								type: '@n8n/n8n-nodes-langchain.agent',
								typeVersion: 3,
								position: [200, 0],
							}),
						],
						connections: {} as IConnections,
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'addConnection',
							source: 'Worker Agent',
							target: 'Manager Agent',
							connectionType: 'ai_tool',
						},
					],
				});

				expect(result.isError).toBe(true);
				expect(updateMock).not.toHaveBeenCalled();
				const response = parseResult(result);
				expect(response.error).toContain('Worker Agent');
				expect(response.error).toContain('Manager Agent');
				expect(response.error).toContain('@n8n/n8n-nodes-langchain.agentTool');
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
					if (type === 'n8n-nodes-base.httpRequest') {
						// HTTP Request declares its predefined/generic credential selectors
						// as `credentialsSelect` properties rather than static credentials.
						return {
							description: {
								credentials: [{ name: 'httpSslAuth' }],
								properties: [
									{ name: 'nodeCredentialType', type: 'credentialsSelect' },
									{ name: 'genericAuthType', type: 'credentialsSelect' },
								],
							},
						};
					}
					return { description: {} };
				}) as typeof nodeTypes.getByNameAndVersion);

				// Credentials reachable from the workflow's project (mirrors the
				// runtime permission gate).
				(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
					{ id: 'cred-slack', name: 'My Slack', type: 'slackApi' },
					{ id: 'cred-wrong-type', name: 'Wrong', type: 'discordApi' },
				]);

				// getOne is the user-scoped fallback used only to tell a missing
				// credential apart from a cross-project one.
				(credentialsService.getOne as Mock).mockImplementation(async function (_user, id: string) {
					if (id === 'cred-slack') return { id, name: 'My Slack', type: 'slackApi' };
					if (id === 'cred-wrong-type') return { id, name: 'Wrong', type: 'discordApi' };
					if (id === 'cred-other-project') {
						return { id, name: 'Other Project Slack', type: 'slackApi' };
					}
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

			test('accepts setNodeCredential for a predefined credential type on an HTTP Request node', async () => {
				(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
					{ id: 'cred-github', name: 'My GitHub', type: 'githubApi' },
				]);
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [
							makeNode({
								id: 'h',
								name: 'HTTP Request',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 4,
								parameters: {
									authentication: 'predefinedCredentialType',
									nodeCredentialType: 'githubApi',
								},
							}),
						],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeCredential',
							nodeName: 'HTTP Request',
							credentialKey: 'githubApi',
							credentialId: 'cred-github',
							credentialName: 'My GitHub',
						},
					],
				});

				expect(result.isError).toBeUndefined();
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('accepts addNode binding a predefined credential type on an HTTP Request node', async () => {
				(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
					{ id: 'cred-github', name: 'My GitHub', type: 'githubApi' },
				]);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'addNode',
							node: {
								name: 'HTTP Request',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 4,
								parameters: {
									authentication: 'predefinedCredentialType',
									nodeCredentialType: 'githubApi',
								},
								credentials: { githubApi: { id: 'cred-github', name: 'My GitHub' } },
							},
						},
					],
				});

				expect(result.isError).toBeUndefined();
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('rejects a predefined credential type when the HTTP Request node is not configured for it', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [
							makeNode({
								id: 'h',
								name: 'HTTP Request',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 4,
								parameters: {},
							}),
						],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeCredential',
							nodeName: 'HTTP Request',
							credentialKey: 'githubApi',
							credentialId: 'cred-github',
							credentialName: 'My GitHub',
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("does not accept credential 'githubApi'");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('accepts a predefined credential configured via updateNodeParameters earlier in the same batch', async () => {
				(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
					{ id: 'cred-github', name: 'My GitHub', type: 'githubApi' },
				]);
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [
							makeNode({
								id: 'h',
								name: 'HTTP Request',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 4,
								parameters: {},
							}),
						],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'updateNodeParameters',
							nodeName: 'HTTP Request',
							parameters: {
								authentication: 'predefinedCredentialType',
								nodeCredentialType: 'githubApi',
							},
						},
						{
							type: 'setNodeCredential',
							nodeName: 'HTTP Request',
							credentialKey: 'githubApi',
							credentialId: 'cred-github',
							credentialName: 'My GitHub',
						},
					],
				});

				expect(result.isError).toBeUndefined();
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('accepts a predefined credential configured via setNodeParameter earlier in the same batch', async () => {
				(credentialsService.getCredentialsAUserCanUseInAWorkflow as Mock).mockResolvedValue([
					{ id: 'cred-github', name: 'My GitHub', type: 'githubApi' },
				]);
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [
							makeNode({
								id: 'h',
								name: 'HTTP Request',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion: 4,
								parameters: {},
							}),
						],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeParameter',
							nodeName: 'HTTP Request',
							path: '/nodeCredentialType',
							value: 'githubApi',
						},
						{
							type: 'setNodeCredential',
							nodeName: 'HTTP Request',
							credentialKey: 'githubApi',
							credentialId: 'cred-github',
							credentialName: 'My GitHub',
						},
					],
				});

				expect(result.isError).toBeUndefined();
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('rejects a dynamic credential key on a node that does not declare a credential selector', async () => {
				// A Set node carries nodeCredentialType but exposes no credentialsSelect
				// property, so it must not be able to "accept" githubApi just by setting
				// the parameter.
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [
							makeNode({
								id: 's',
								name: 'Setter',
								type: 'n8n-nodes-base.set',
								parameters: { nodeCredentialType: 'githubApi' },
							}),
						],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'setNodeCredential',
							nodeName: 'Setter',
							credentialKey: 'githubApi',
							credentialId: 'cred-github',
							credentialName: 'My GitHub',
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("does not accept credential 'githubApi'");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('rejects setNodeCredential with a credential from another project', async () => {
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
							credentialId: 'cred-other-project',
							credentialName: 'Other Project Slack',
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("credential 'cred-other-project' is not usable");
				expect(response.error).toContain("this workflow's project");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('rejects addNode whose credential belongs to another project', async () => {
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
									slackApi: { id: 'cred-other-project', name: 'Other Project Slack' },
								},
							},
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("credential 'cred-other-project' is not usable");
				expect(workflowService.update).not.toHaveBeenCalled();
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

		describe('data table validation', () => {
			const dataTableLocator = (mode: 'id' | 'name' | 'list', value: string) => ({
				__rl: true as const,
				mode,
				value,
			});

			const dataTableNode = (name: string, dataTableId: ReturnType<typeof dataTableLocator>) => ({
				name,
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1,
				parameters: { dataTableId },
			});

			test('rejects addNode of a data table node whose id does not exist', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'addNode',
							node: dataTableNode('DT', dataTableLocator('id', 'missing')),
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('Operation 0 failed');
				expect(response.error).toContain("node 'DT'");
				expect(response.error).toContain("data table with id 'missing' not found");
				expect(response.error).toContain('create_data_table');
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('rejects addNode of a data table node whose name does not exist', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'addNode',
							node: dataTableNode('DT', dataTableLocator('name', 'orders')),
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain("data table with name 'orders' not found");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('accepts addNode of a data table node whose id exists in the project', async () => {
				dataTableOps.getManyAndCount.mockResolvedValue({
					data: [{ id: 'dt-1', name: 'Orders', projectId: 'project-1' }],
					count: 1,
				});

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'addNode',
							node: dataTableNode('DT', dataTableLocator('id', 'dt-1')),
						},
					],
				});

				expect(result.isError).toBeUndefined();
				expect(workflowService.update).toHaveBeenCalled();
				expect(dataTableOps.getManyAndCount).toHaveBeenCalledWith(
					expect.objectContaining({
						filter: { id: 'dt-1', projectId: 'project-1' },
					}),
				);
			});

			test('validates after updateNodeParameters changes dataTableId', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [
							makeNode({
								id: 'dt',
								name: 'DT',
								type: 'n8n-nodes-base.dataTable',
								typeVersion: 1,
								parameters: { dataTableId: dataTableLocator('id', 'dt-1') },
							}),
						],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'updateNodeParameters',
							nodeName: 'DT',
							parameters: { dataTableId: dataTableLocator('id', 'newly-missing') },
						},
					],
				});

				const response = parseResult(result);
				expect(result.isError).toBe(true);
				expect(response.error).toContain('Operation 0 failed');
				expect(response.error).toContain("data table with id 'newly-missing' not found");
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('skips data-table lookup when no touched node references one', async () => {
				await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'updateNodeParameters', nodeName: 'B', parameters: { url: 'https://new' } },
					],
				});

				expect(dataTableOps.getManyAndCount).not.toHaveBeenCalled();
				expect(workflowService.update).toHaveBeenCalled();
			});

			test('skips data-table lookup when dataTableId is an expression', async () => {
				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [
						{
							type: 'addNode',
							node: dataTableNode('DT', dataTableLocator('id', '={{ $json.tableId }}')),
						},
					],
				});

				expect(result.isError).toBeUndefined();
				expect(dataTableOps.getManyAndCount).not.toHaveBeenCalled();
			});

			test('does not flag a pre-existing dangling data table reference on an untouched node', async () => {
				findWorkflowMock.mockResolvedValue(
					Object.assign(buildExistingWorkflow(), {
						nodes: [
							makeNode({
								id: 'dt',
								name: 'DT',
								type: 'n8n-nodes-base.dataTable',
								typeVersion: 1,
								parameters: { dataTableId: dataTableLocator('id', 'long-gone') },
							}),
							makeNode({ id: 'b', name: 'B' }),
						],
						connections: {},
					}),
				);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'updateNodeParameters', nodeName: 'B', parameters: { foo: 'bar' } }],
				});

				expect(result.isError).toBeUndefined();
				expect(dataTableOps.getManyAndCount).not.toHaveBeenCalled();
				expect(workflowService.update).toHaveBeenCalled();
			});
		});

		describe('tag operations', () => {
			const workflowWithTags = (tagNames: string[]) =>
				Object.assign(buildExistingWorkflow(), {
					tags: tagNames.map((name, i) => ({ id: `tag-${i}`, name })),
				});

			test('resolves added tag names and passes tagIds to workflow update', async () => {
				findWorkflowMock.mockResolvedValue(workflowWithTags(['production']));
				findOrCreateByNamesMock.mockResolvedValue([
					{ id: 'tag-0', name: 'production' },
					{ id: 'tag-new', name: 'critical' },
				]);

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'addTags', names: ['critical'] }],
				});

				expect(result.isError).toBeUndefined();
				expect(findWorkflowMock).toHaveBeenCalledWith(
					'wf-1',
					user,
					['workflow:update'],
					expect.objectContaining({ includeTags: true }),
				);
				expect(findOrCreateByNamesMock).toHaveBeenCalledTimes(1);
				const passedNames = findOrCreateByNamesMock.mock.calls[0][0] as string[];
				expect(passedNames.sort()).toEqual(['critical', 'production']);

				const [, , , updateOptions] = updateMock.mock.calls[0];
				expect(updateOptions.tagIds.sort()).toEqual(['tag-0', 'tag-new']);
			});

			test('collapses case-duplicate tag names before resolving', async () => {
				findWorkflowMock.mockResolvedValue(workflowWithTags([]));
				findOrCreateByNamesMock.mockResolvedValue([{ id: 'tag-0', name: 'Critical' }]);

				await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'addTags', names: ['Critical', ' critical ', 'CRITICAL'] }],
				});

				expect(findOrCreateByNamesMock).toHaveBeenCalledWith(['Critical']);
			});

			test('removeTags drops names from the resolved set', async () => {
				findWorkflowMock.mockResolvedValue(workflowWithTags(['production', 'critical']));
				findOrCreateByNamesMock.mockResolvedValue([{ id: 'tag-0', name: 'production' }]);

				await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'removeTags', names: ['critical'] }],
				});

				expect(findOrCreateByNamesMock).toHaveBeenCalledWith(['production']);
				const [, , , updateOptions] = updateMock.mock.calls[0];
				expect(updateOptions.tagIds).toEqual(['tag-0']);
			});

			test('removing the last tag passes an empty tagIds array', async () => {
				findWorkflowMock.mockResolvedValue(workflowWithTags(['production']));
				findOrCreateByNamesMock.mockResolvedValue([]);

				await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'removeTags', names: ['production'] }],
				});

				expect(findOrCreateByNamesMock).toHaveBeenCalledWith([]);
				const [, , , updateOptions] = updateMock.mock.calls[0];
				expect(updateOptions.tagIds).toEqual([]);
			});

			test('does not call tagService or pass tagIds when no tag ops are present', async () => {
				await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'setWorkflowMetadata', name: 'renamed' }],
				});

				expect(findOrCreateByNamesMock).not.toHaveBeenCalled();
				const [, , , updateOptions] = updateMock.mock.calls[0];
				expect(updateOptions.tagIds).toBeUndefined();
				// Tags should not be loaded when there are no tag ops
				expect(findWorkflowMock).toHaveBeenCalledWith(
					'wf-1',
					user,
					['workflow:update'],
					expect.objectContaining({ includeTags: false }),
				);
			});

			test('rejects tag operations when tags are disabled instance-wide', async () => {
				globalConfig = mockInstance(GlobalConfig, { tags: { disabled: true } });

				const result = await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'addTags', names: ['anything'] }],
				});

				expect(result.isError).toBe(true);
				expect(findOrCreateByNamesMock).not.toHaveBeenCalled();
				expect(workflowService.update).not.toHaveBeenCalled();
				expect(findWorkflowMock).not.toHaveBeenCalled();
			});

			test('without tag:create scope, attaches only existing tags', async () => {
				const memberUser = userWithScopes([]);
				findWorkflowMock.mockResolvedValue(workflowWithTags([]));
				getByNamesMock.mockResolvedValue([{ id: 'tag-existing', name: 'production' }]);

				const tool = createUpdateWorkflowTool(
					memberUser,
					workflowFinderService,
					workflowService,
					urlService,
					telemetry,
					nodeTypes,
					credentialsService,
					sharedWorkflowRepository,
					collaborationService,
					dataTableOps as never,
					tagService,
					globalConfig,
					subworkflowPolicyChecker,
					workflowPublishedDataService,
					aiGatewayService,
					{},
					logger,
					postSaveMetrics,
				);

				await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'addTags', names: ['production'] }],
					},
					tool,
				);

				expect(getByNamesMock).toHaveBeenCalledWith(['production']);
				expect(findOrCreateByNamesMock).not.toHaveBeenCalled();
				const [, , , updateOptions] = updateMock.mock.calls[0];
				expect(updateOptions.tagIds).toEqual(['tag-existing']);
			});

			test('without tag:create scope, case-duplicate input still attaches the existing tag', async () => {
				const memberUser = userWithScopes([]);
				findWorkflowMock.mockResolvedValue(workflowWithTags([]));
				getByNamesMock.mockResolvedValue([{ id: 'tag-existing', name: 'Prod' }]);

				const tool = createUpdateWorkflowTool(
					memberUser,
					workflowFinderService,
					workflowService,
					urlService,
					telemetry,
					nodeTypes,
					credentialsService,
					sharedWorkflowRepository,
					collaborationService,
					dataTableOps as never,
					tagService,
					globalConfig,
					subworkflowPolicyChecker,
					workflowPublishedDataService,
					aiGatewayService,
					{},
					logger,
					postSaveMetrics,
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'addTags', names: ['Prod', 'prod'] }],
					},
					tool,
				);

				expect(result.isError).toBeUndefined();
				expect(getByNamesMock).toHaveBeenCalledWith(['Prod']);
				const [, , , updateOptions] = updateMock.mock.calls[0];
				expect(updateOptions.tagIds).toEqual(['tag-existing']);
			});

			test('without tag:create scope, fails when a tag name does not exist', async () => {
				const memberUser = userWithScopes([]);
				findWorkflowMock.mockResolvedValue(workflowWithTags([]));
				getByNamesMock.mockResolvedValue([{ id: 'tag-existing', name: 'production' }]);

				const tool = createUpdateWorkflowTool(
					memberUser,
					workflowFinderService,
					workflowService,
					urlService,
					telemetry,
					nodeTypes,
					credentialsService,
					sharedWorkflowRepository,
					collaborationService,
					dataTableOps as never,
					tagService,
					globalConfig,
					subworkflowPolicyChecker,
					workflowPublishedDataService,
					aiGatewayService,
					{},
					logger,
					postSaveMetrics,
				);

				const result = await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'addTags', names: ['production', 'novel-tag'] }],
					},
					tool,
				);

				expect(result.isError).toBe(true);
				expect(findOrCreateByNamesMock).not.toHaveBeenCalled();
				expect(workflowService.update).not.toHaveBeenCalled();
			});

			test('does not flip aiBuilderAssisted when the batch contains only tag operations', async () => {
				findWorkflowMock.mockResolvedValue(workflowWithTags(['existing']));
				findOrCreateByNamesMock.mockResolvedValue([{ id: 'tag-0', name: 'existing' }]);

				await callHandler({
					workflowId: 'wf-1',
					operations: [{ type: 'addTags', names: ['existing'] }],
				});

				const [, workflowArg, , updateOptions] = updateMock.mock.calls[0];
				expect(updateOptions.aiBuilderAssisted).toBe(false);
				expect(workflowArg.meta).not.toEqual(
					expect.objectContaining({ aiBuilderAssisted: true, builderVariant: 'mcp' }),
				);
			});

			test('keeps aiBuilderAssisted=true when tag ops are mixed with node ops', async () => {
				findWorkflowMock.mockResolvedValue(workflowWithTags([]));
				findOrCreateByNamesMock.mockResolvedValue([{ id: 'tag-0', name: 'foo' }]);

				await callHandler({
					workflowId: 'wf-1',
					operations: [
						{ type: 'setWorkflowMetadata', name: 'Renamed' },
						{ type: 'addTags', names: ['foo'] },
					],
				});

				const [, workflowArg, , updateOptions] = updateMock.mock.calls[0];
				expect(updateOptions.aiBuilderAssisted).toBe(true);
				expect(workflowArg.meta).toEqual(
					expect.objectContaining({ aiBuilderAssisted: true, builderVariant: 'mcp' }),
				);
			});
		});
	});
});
