import { mockInstance } from '@n8n/backend-test-utils';
import { User, type WorkflowEntity } from '@n8n/db';
import type { INode, INodeTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { CredentialsService } from '@/credentials/credentials.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createWorkflow } from './mock.utils';
import { getWorkflowDetails, createWorkflowDetailsTool } from '../tools/get-workflow-details.tool';
import { getTriggerDetails } from '../tools/webhook-utils';

vi.mock('../tools/webhook-utils', () => ({
	getTriggerDetails: vi.fn().mockResolvedValue('MOCK_TRIGGER_DETAILS'),
}));

const getTriggerDetailsMock = vi.mocked(getTriggerDetails);

describe('get-workflow-details MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const baseWebhookUrl = 'https://example.test';
	const nodeTypes = mock<INodeTypes>();

	describe('smoke tests', () => {
		test('it creates tool correctly', () => {
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn(),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const telemetry = mockInstance(Telemetry, {
				track: vi.fn(),
			});
			const roleService = mockInstance(RoleService, {
				addScopes: vi.fn((wf) => ({ ...wf, scopes: [] })) as unknown as RoleService['addScopes'],
			});
			const projectService = mockInstance(ProjectService, {
				getProjectRelationsForUser: vi.fn().mockResolvedValue([]),
			});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const tool = createWorkflowDetailsTool(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				telemetry,
				roleService,
				projectService,
			);

			expect(tool.name).toBe('get_workflow_details');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.inputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		const roleService = mockInstance(RoleService, {
			addScopes: vi.fn((wf) => ({
				...wf,
				scopes: ['workflow:read', 'workflow:execute'],
			})) as unknown as RoleService['addScopes'],
		});
		const projectService = mockInstance(ProjectService, {
			getProjectRelationsForUser: vi.fn().mockResolvedValue([]),
		});

		test('returns sanitized workflow and trigger info (active)', async () => {
			const workflow = createWorkflow({ activeVersionId: uuid() });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1' },
			);

			expect('pinData' in payload.workflow).toBe(false);
			expect(payload.workflow.nodes?.map((n) => n.credentials)).toEqual([
				{ httpHeaderAuth: { id: 'cred-1', name: 'HeaderAuth' } },
				{ httpHeaderAuth: { id: 'cred-2', name: 'HeaderAuth2' } },
			]);
			expect(payload.triggerInfo).toContain('MOCK_TRIGGER_DETAILS');
			expect(payload.workflow.versionId).toBe(workflow.versionId);
			expect(payload.workflow.activeVersionId).toBe(workflow.activeVersionId);
			expect(payload.workflow.activeVersion).toMatchObject({
				sameAsDraft: false,
				nodes: [
					{ credentials: { httpHeaderAuth: { id: 'cred-1', name: 'HeaderAuth' } } },
					{ credentials: { httpHeaderAuth: { id: 'cred-2', name: 'HeaderAuth2' } } },
				],
			});
			expect(payload.workflow.scopes).toEqual(['workflow:read', 'workflow:execute']);
			expect(payload.workflow.canExecute).toBe(true);
		});

		test('keeps only id and name for real credentials and drops AI Gateway (null-id) slots', async () => {
			const workflow = createWorkflow({
				nodes: [
					{
						id: 'node-1',
						name: 'OpenAI',
						type: '@n8n/n8n-nodes-langchain.openAi',
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
						credentials: {
							openAiApi: { id: null, name: 'Gateway credits', __aiGatewayManaged: true },
						},
					},
					{
						id: 'node-2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						disabled: false,
						parameters: {},
						credentials: {
							httpHeaderAuth: { id: 'cred-1', name: 'HeaderAuth', extra: 'internal' },
						},
					},
				] as INode[],
			});
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1' },
			);

			// Null-id managed slot is dropped entirely (nothing to reference)
			expect(payload.workflow.nodes?.[0]).not.toHaveProperty('credentials');
			// Real credential is reduced to id and name, internal fields removed
			expect(payload.workflow.nodes?.[1].credentials).toEqual({
				httpHeaderAuth: { id: 'cred-1', name: 'HeaderAuth' },
			});
		});

		test('reports the parent folder of a workflow inside a folder', async () => {
			const workflow = createWorkflow({
				parentFolder: { id: 'folder-1' } as WorkflowEntity['parentFolder'],
			});
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1', detailLevel: 'execution' },
			);

			expect(payload.workflow.parentFolderId).toBe('folder-1');
		});

		test("omits graph fields when detailLevel is 'execution'", async () => {
			const workflow = createWorkflow({ activeVersionId: uuid() });
			const findWorkflowForUser = vi.fn().mockResolvedValue(workflow);
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser,
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1', detailLevel: 'execution' },
			);

			// The published version stays loaded: its graph is omitted, but its
			// triggers still feed activeVersionTriggerInfo. The parent folder must
			// be requested too — without it parentFolderId is silently always null.
			expect(findWorkflowForUser).toHaveBeenCalledWith(
				'wf-1',
				user,
				['workflow:read'],
				expect.objectContaining({ includeActiveVersion: true, includeParentFolder: true }),
			);

			expect(payload.workflow.nodes).toBeUndefined();
			expect(payload.workflow.connections).toBeUndefined();
			expect(payload.workflow.nodeGroups).toBeUndefined();
			expect(payload.workflow.activeVersion).toBeUndefined();
			expect(payload.workflow.meta).toBeUndefined();

			// Everything needed to execute is still present
			expect(payload.triggerInfo).toContain('MOCK_TRIGGER_DETAILS');
			expect(payload.workflow.id).toBe('wf-1');
			expect(payload.workflow.active).toBe(true);
			expect(payload.workflow.scopes).toEqual(['workflow:read', 'workflow:execute']);
			expect(payload.workflow.canExecute).toBe(true);
			expect(payload.workflow.description).toBeUndefined();
			// settings carries timezone and errorWorkflow, which shape how a run behaves
			expect(payload.workflow.settings).toEqual({ availableInMCP: true });
			// The workflow size stays reportable despite the trimmed payload
			expect(payload.workflow.nodeCount).toBe(2);
		});

		test("returns all graph fields when detailLevel is 'full'", async () => {
			const workflow = createWorkflow({ activeVersionId: uuid() });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1', detailLevel: 'full' },
			);

			// Guards the full-mode contract: every conditional field must be present,
			// since the output schema marks them optional and cannot enforce this.
			expect(payload.workflow.nodes).toBeDefined();
			expect(payload.workflow.connections).toBeDefined();
			expect(payload.workflow.nodeGroups).toBeDefined();
			expect(payload.workflow.activeVersion).toBeDefined();
			expect(payload.workflow.meta).toBeDefined();
		});

		test('includes activeVersionTriggerInfo only when published triggers diverge from the draft', async () => {
			getTriggerDetailsMock.mockClear();
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			// Published version has the same triggers as the draft: single notice.
			const inSync = createWorkflow({ activeVersionId: uuid() });
			const inSyncFinder = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(inSync),
			});
			const inSyncPayload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				inSyncFinder,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1', detailLevel: 'execution' },
			);
			expect(inSyncPayload.activeVersionTriggerInfo).toBeUndefined();
			expect(getTriggerDetailsMock).toHaveBeenCalledTimes(1);

			// Draft trigger was removed after publishing: both notices returned.
			getTriggerDetailsMock.mockClear();
			getTriggerDetailsMock
				.mockResolvedValueOnce('DRAFT_TRIGGER_INFO')
				.mockResolvedValueOnce('PUBLISHED_TRIGGER_INFO');
			const diverged = createWorkflow({
				activeVersionId: uuid(),
				nodes: [],
				activeVersion: { nodes: createWorkflow({}).nodes },
			} as unknown as Partial<WorkflowEntity>);
			const divergedFinder = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(diverged),
			});
			const divergedPayload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				divergedFinder,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1', detailLevel: 'execution' },
			);
			expect(divergedPayload.triggerInfo).toBe('DRAFT_TRIGGER_INFO');
			expect(divergedPayload.activeVersionTriggerInfo).toBe('PUBLISHED_TRIGGER_INFO');
			expect(getTriggerDetailsMock).toHaveBeenCalledTimes(2);
			// Second call receives the published version's triggers.
			const [, publishedSupported] = getTriggerDetailsMock.mock.calls[1];
			expect(publishedSupported.map((t) => t.name)).toEqual(['Webhook', 'Start']);
		});

		test('suppresses activeVersionTriggerInfo when node differences do not change the trigger info', async () => {
			// Position-only difference: both notices come out identical, nothing extra emitted.
			getTriggerDetailsMock.mockClear();
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };
			const draftNodes = createWorkflow({}).nodes;
			const movedNodes = draftNodes.map((node) => ({ ...node, position: [500, 500] }));
			const moved = createWorkflow({
				activeVersionId: uuid(),
				nodes: draftNodes,
				activeVersion: { nodes: movedNodes },
			} as unknown as Partial<WorkflowEntity>);
			const movedFinder = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(moved),
			});
			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				movedFinder,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1', detailLevel: 'execution' },
			);
			expect(payload.activeVersionTriggerInfo).toBeUndefined();
			// The node-level guard let this through, so the notice compare is what suppressed it
			expect(getTriggerDetailsMock).toHaveBeenCalledTimes(2);
		});

		test('normalizes nodes persisted without a parameters key in the draft and published graphs', async () => {
			// Regression (ADO-5355): drafts can hold skeleton nodes with no
			// `parameters` key at all; the payload and the trigger-info builders
			// must see an object instead.
			getTriggerDetailsMock.mockClear();
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };
			const skeletonNode = {
				id: 'node-1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0],
				webhookId: 'hook-1',
			} as INode;
			const workflow = createWorkflow({
				activeVersionId: uuid(),
				nodes: [skeletonNode],
				activeVersion: { nodes: [{ ...skeletonNode }] },
			} as unknown as Partial<WorkflowEntity>);
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
			});

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1' },
			);

			expect(payload.workflow.nodes?.[0].parameters).toEqual({});
			expect(payload.workflow.activeVersion).toMatchObject({
				sameAsDraft: false,
				nodes: [{ parameters: {} }],
			});
			// The trigger builder received the normalized node ...
			const [, supported] = getTriggerDetailsMock.mock.calls[0];
			expect(supported[0].parameters).toEqual({});
			// ... and the missing key alone did not read as a trigger divergence.
			expect(getTriggerDetailsMock).toHaveBeenCalledTimes(1);
			expect(payload.activeVersionTriggerInfo).toBeUndefined();
		});

		test('never emits activeVersionTriggerInfo when the published version is the draft', async () => {
			// activeVersionId === versionId, so there is no divergence to report and
			// the published triggers are never looked up.
			getTriggerDetailsMock.mockClear();
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };
			const workflow = createWorkflow({ activeVersionId: 'some-version-id' });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
			});

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1', detailLevel: 'execution' },
			);

			expect(payload.activeVersionTriggerInfo).toBeUndefined();
			expect(getTriggerDetailsMock).toHaveBeenCalledTimes(1);
		});

		test('omits activeVersion graph when the published version matches the current draft', async () => {
			// createWorkflow uses versionId 'some-version-id'; publishing that draft
			// sets activeVersionId to the same value.
			const workflow = createWorkflow({ activeVersionId: 'some-version-id' });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1' },
			);

			expect(payload.workflow.activeVersion).toEqual({ sameAsDraft: true });
			expect(payload.workflow.nodes?.length).toBeGreaterThan(0);
		});

		test('presents node groups by member node names, dropping stale ids', async () => {
			const workflow = createWorkflow({
				nodeGroups: [{ id: 'group-1', name: 'Intake', nodeIds: ['node-1', 'stale-id'] }],
			});
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1' },
			);

			// Read path presents groups by member node names; persisted ids stay internal.
			expect(payload.workflow.nodeGroups).toEqual([
				{ id: 'group-1', name: 'Intake', nodeNames: ['Webhook'] },
			]);
		});

		test('requests and returns workflow tags', async () => {
			const tags = [
				{ id: 'tag-1', name: 'production' },
				{ id: 'tag-2', name: 'billing' },
			];
			const workflow = createWorkflow({ tags } as Partial<WorkflowEntity>);
			const findWorkflowForUser = vi.fn().mockResolvedValue(workflow);
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser,
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1' },
			);

			expect(findWorkflowForUser).toHaveBeenCalledWith(
				'wf-1',
				user,
				['workflow:read'],
				expect.objectContaining({ includeTags: true }),
			);
			expect(payload.workflow.tags).toEqual(tags);
		});

		test('passes triggers MCP cannot execute directly to getTriggerDetails', async () => {
			getTriggerDetailsMock.mockClear();
			const workflow = createWorkflow({
				activeVersionId: uuid(),
				nodes: [
					{
						id: 'node-1',
						name: 'Gmail Trigger',
						type: 'n8n-nodes-base.gmailTrigger',
						typeVersion: 1.4,
						position: [0, 0],
						disabled: false,
						parameters: {},
					},
					{
						id: 'node-2',
						name: 'Disabled Trigger',
						type: 'n8n-nodes-base.telegramTrigger',
						typeVersion: 1,
						position: [100, 0],
						disabled: true,
						parameters: {},
					},
				],
			});
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1' },
			);

			const [, supportedTriggers, unsupportedTriggers] = getTriggerDetailsMock.mock.calls[0];
			expect(supportedTriggers).toEqual([]);
			// Only the enabled unsupported trigger is passed; the disabled one is excluded.
			expect(unsupportedTriggers.map((t) => t.name)).toEqual(['Gmail Trigger']);
		});

		test('propagates errors from workflow validation', async () => {
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const wfFinder = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(null),
			});

			await expect(
				getWorkflowDetails(
					user,
					baseWebhookUrl,
					wfFinder,
					credentialsService,
					nodeTypes,
					endpoints,
					roleService,
					projectService,
					{ workflowId: 'any-id' },
				),
			).rejects.toThrow();
		});

		test('returns null activeVersion for unpublished workflows', async () => {
			const unpublished = createWorkflow({ activeVersionId: null });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: vi.fn().mockResolvedValue(unpublished),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				nodeTypes,
				endpoints,
				roleService,
				projectService,
				{ workflowId: 'wf-1' },
			);

			expect(payload.workflow.activeVersion).toBeNull();
			expect(payload.workflow.activeVersionId).toBeNull();
		});
	});
});
