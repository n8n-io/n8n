import { WebhookEntity } from '@n8n/db';
import type {
	Project,
	SharedWorkflowRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import type { IWebhookData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';
import { getWorkflowWebhooks } from '@/webhooks/webhook-helpers';
import type { WebhookService } from '@/webhooks/webhook.service';
import { WebhooksController } from '@/webhooks/webhooks.controller';
import { getTriggerKinds } from '@/workflows/triggers/trigger-kinds';

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/webhooks/webhook-helpers', () => ({
	getWorkflowWebhooks: vi.fn().mockReturnValue([]),
}));
vi.mock('@/workflows/triggers/trigger-kinds', () => ({
	getTriggerKinds: vi.fn().mockReturnValue(new Map()),
}));

describe('WebhooksController', () => {
	const webhookService = mock<WebhookService>();
	const workflowRepository = mock<WorkflowRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const nodeTypes = mock<NodeTypes>();
	const controller = new WebhooksController(
		webhookService,
		workflowRepository,
		sharedWorkflowRepository,
		nodeTypes,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		webhookService.findAll.mockResolvedValue([]);
		workflowRepository.findByIds.mockResolvedValue([]);
		workflowRepository.findPublishedWithActiveVersionNodes.mockResolvedValue([]);
		workflowRepository.findUnpublishedWithNodes.mockResolvedValue([]);
		sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(new Map());
		vi.mocked(getTriggerKinds).mockReturnValue(new Map());
	});

	describe('getAll', () => {
		it('should list registered webhooks with workflow names and full dynamic paths', async () => {
			const staticWebhook = Object.assign(new WebhookEntity(), {
				workflowId: 'wf1',
				webhookPath: 'my-hook',
				method: 'POST',
				node: 'Webhook',
			});
			const dynamicWebhook = Object.assign(new WebhookEntity(), {
				workflowId: 'wf2',
				webhookPath: 'user/:id',
				webhookId: 'abc123',
				method: 'GET',
				node: 'Webhook 2',
			});
			webhookService.findAll.mockResolvedValue([staticWebhook, dynamicWebhook]);
			workflowRepository.findByIds.mockResolvedValue([
				{
					id: 'wf1',
					name: 'My Workflow',
					nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
				} as WorkflowEntity,
			]);
			sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
				new Map([
					[
						'wf1',
						{
							name: 'My Project',
							type: 'team',
							icon: { type: 'icon', value: 'folder' },
						} as Project,
					],
				]),
			);

			const result = await controller.getAll();

			expect(workflowRepository.findByIds).toHaveBeenCalledWith(['wf1', 'wf2'], {
				fields: ['id', 'name', 'nodes'],
			});
			expect(sharedWorkflowRepository.findOwnerProjectsByWorkflowIds).toHaveBeenCalledWith([
				'wf1',
				'wf2',
			]);
			expect(result).toEqual([
				{
					kind: 'webhook',
					workflowId: 'wf1',
					workflowName: 'My Workflow',
					method: 'POST',
					path: 'my-hook',
					node: 'Webhook',
					nodeType: 'n8n-nodes-base.webhook',
					isActive: true,
					project: { name: 'My Project', type: 'team', icon: { type: 'icon', value: 'folder' } },
				},
				{
					kind: 'webhook',
					workflowId: 'wf2',
					workflowName: undefined,
					method: 'GET',
					path: 'abc123/user/:id',
					node: 'Webhook 2',
					nodeType: undefined,
					isActive: true,
					project: undefined,
				},
			]);
		});

		it('should list in-memory triggers of published workflows as active', async () => {
			workflowRepository.findPublishedWithActiveVersionNodes.mockResolvedValue([
				{
					id: 'wf5',
					name: 'Scheduled Workflow',
					activeVersion: {
						nodes: [
							{
								id: 'n1',
								name: 'Schedule Trigger',
								type: 'n8n-nodes-base.scheduleTrigger',
							},
							{ id: 'n2', name: 'Set', type: 'n8n-nodes-base.set' },
							{
								id: 'n3',
								name: 'Sub-workflow Trigger',
								type: 'n8n-nodes-base.executeWorkflowTrigger',
							},
						],
					},
				} as unknown as WorkflowEntity,
			]);
			vi.mocked(getTriggerKinds).mockReturnValue(
				new Map([
					['n1', 'in-memory'],
					['n2', 'persisted'],
					['n3', 'persisted'],
				]),
			);

			const result = await controller.getAll();

			expect(result).toEqual([
				{
					kind: 'trigger',
					workflowId: 'wf5',
					workflowName: 'Scheduled Workflow',
					node: 'Schedule Trigger',
					nodeType: 'n8n-nodes-base.scheduleTrigger',
					isActive: true,
					project: undefined,
				},
				{
					kind: 'trigger',
					workflowId: 'wf5',
					workflowName: 'Scheduled Workflow',
					node: 'Sub-workflow Trigger',
					nodeType: 'n8n-nodes-base.executeWorkflowTrigger',
					isActive: true,
					project: undefined,
				},
			]);
		});

		it('should list triggers resolved from unpublished workflows as inactive', async () => {
			workflowRepository.findUnpublishedWithNodes.mockResolvedValue([
				{
					id: 'wf3',
					name: 'Inactive Workflow',
					nodes: [
						{
							id: 'n1',
							name: 'Webhook',
							type: 'n8n-nodes-base.webhook',
							typeVersion: 2,
							position: [0, 0],
							parameters: {},
							webhookId: 'hook-id',
						},
						{
							id: 'n2',
							name: 'Schedule Trigger',
							type: 'n8n-nodes-base.scheduleTrigger',
						},
					],
					connections: {},
				} as unknown as WorkflowEntity,
			]);
			vi.mocked(getTriggerKinds).mockReturnValue(new Map([['n2', 'in-memory']]));
			vi.mocked(getWorkflowWebhooks).mockReturnValue([
				mock<IWebhookData>({ node: 'Webhook', httpMethod: 'POST', path: 'inactive-hook' }),
			]);

			const result = await controller.getAll();

			expect(result).toEqual([
				{
					kind: 'trigger',
					workflowId: 'wf3',
					workflowName: 'Inactive Workflow',
					node: 'Schedule Trigger',
					nodeType: 'n8n-nodes-base.scheduleTrigger',
					isActive: false,
					project: undefined,
				},
				{
					kind: 'webhook',
					workflowId: 'wf3',
					workflowName: 'Inactive Workflow',
					method: 'POST',
					path: 'inactive-hook',
					node: 'Webhook',
					nodeType: 'n8n-nodes-base.webhook',
					isActive: false,
					project: undefined,
				},
			]);
		});

		it('should skip unpublished workflows without trigger nodes', async () => {
			workflowRepository.findUnpublishedWithNodes.mockResolvedValue([
				{
					id: 'wf4',
					name: 'No Triggers',
					nodes: [{ id: 'n1', name: 'Set', type: 'n8n-nodes-base.set' }],
					connections: {},
				} as unknown as WorkflowEntity,
			]);

			expect(await controller.getAll()).toEqual([]);
			expect(getWorkflowWebhooks).not.toHaveBeenCalled();
		});
	});
});
