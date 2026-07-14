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
import { z } from 'zod';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { NodeTypes } from '@/node-types';
import { TagService } from '@/services/tag.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createUpdateWorkflowTool } from '../tools/workflow-builder/update-workflow.tool';

const mockAutoPopulateNodeCredentials = vi.fn();
vi.mock('../tools/workflow-builder/credentials-auto-assign', () => ({
	autoPopulateNodeCredentials: (...args: unknown[]) =>
		mockAutoPopulateNodeCredentials(...args) as unknown,
	stripNullCredentialStubs: vi.fn(),
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
	let findByNamesMock: Mock;
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
				return { description: { outputs: [NodeConnectionTypes.Main] } };
			}
			if (type === '@n8n/n8n-nodes-langchain.agentTool') {
				return { description: { outputs: [NodeConnectionTypes.AiTool] } };
			}
			return { description: {} };
		}) as typeof nodeTypes.getByNameAndVersion);
		collaborationService = mockInstance(CollaborationService, {
			ensureWorkflowEditable: vi.fn().mockResolvedValue(undefined),
			broadcastWorkflowUpdate: vi.fn().mockResolvedValue(undefined),
		});
		mockAutoPopulateNodeCredentials.mockResolvedValue({ assignments: [], skippedHttpNodes: [] });
		mockValidateJSON.mockReturnValue([]);

		dataTableOps = {
			getManyAndCount: vi.fn().mockResolvedValue({ data: [], count: 0 }),
		};

		findOrCreateByNamesMock = vi.fn();
		findByNamesMock = vi.fn();
		tagService = mockInstance(TagService, {
			findOrCreateByNames: findOrCreateByNamesMock,
			findByNames: findByNamesMock,
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
			dataTableOps as never,
			tagService,
			globalConfig,
			subworkflowPolicyChecker,
			workflowPublishedDataService,
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
				);
				findWorkflowMock.mockImplementation(async (id: string) =>
					id === 'wf-1'
						? Object.assign(buildExistingWorkflow(), { activeVersionId: 'wf-1-v1' })
						: null,
				);

				const result = await tool.handler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'setWorkflowSettings', settings: { timezone: 'UTC' } }],
					},
					{} as never,
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
				findByNamesMock.mockResolvedValue([{ id: 'tag-existing', name: 'production' }]);

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
				);

				await callHandler(
					{
						workflowId: 'wf-1',
						operations: [{ type: 'addTags', names: ['production'] }],
					},
					tool,
				);

				expect(findByNamesMock).toHaveBeenCalledWith(['production']);
				expect(findOrCreateByNamesMock).not.toHaveBeenCalled();
				const [, , , updateOptions] = updateMock.mock.calls[0];
				expect(updateOptions.tagIds).toEqual(['tag-existing']);
			});

			test('without tag:create scope, fails when a tag name does not exist', async () => {
				const memberUser = userWithScopes([]);
				findWorkflowMock.mockResolvedValue(workflowWithTags([]));
				findByNamesMock.mockResolvedValue([{ id: 'tag-existing', name: 'production' }]);

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
