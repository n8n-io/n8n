import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { IWebhookData, IWorkflowExecuteAdditionalData, Workflow } from 'n8n-workflow';
import { WebhookPathTakenError } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';
import { WebhookActivationService } from '@/webhooks/webhook-activation.service';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import type { WebhookService } from '@/webhooks/webhook.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

jest.mock('@/webhooks/webhook-helpers');
jest.mock('@/workflow-execute-additional-data');

describe('WebhookActivationService', () => {
	const errorReporter = mock<ErrorReporter>();
	const nodeTypes = mock<NodeTypes>();
	const webhookService = mock<WebhookService>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowStaticDataService = mock<WorkflowStaticDataService>();

	const getWorkflowWebhooks = WebhookHelpers.getWorkflowWebhooks as jest.Mock;
	const getBase = WorkflowExecuteAdditionalData.getBase as jest.Mock;

	let service: WebhookActivationService;

	const additionalData = mock<IWorkflowExecuteAdditionalData>();

	function webhookData(node: string, overrides: Partial<IWebhookData> = {}): IWebhookData {
		return {
			node,
			path: node,
			httpMethod: 'GET',
			workflowId: 'wf-1',
			...overrides,
		} as IWebhookData;
	}

	/** A workflow whose `getNode` maps a node name to a node with `<name>-id`. */
	function mockWorkflow() {
		return mock<Workflow>({
			id: 'wf-1',
			name: 'My Workflow',
			getNode: ((name: string) => ({ id: `${name}-id`, name })) as never,
			expression: {
				acquireIsolate: jest.fn(),
				releaseIsolate: jest.fn(),
			} as never,
		});
	}

	beforeEach(() => {
		jest.clearAllMocks();
		getWorkflowWebhooks.mockReturnValue([]);
		getBase.mockResolvedValue(additionalData);
		webhookService.createWebhook.mockImplementation(
			(data) => ({ webhookPath: data.webhookPath ?? '', node: data.node }) as never,
		);
		service = new WebhookActivationService(
			mockLogger(),
			errorReporter,
			nodeTypes,
			webhookService,
			workflowRepository,
			workflowStaticDataService,
		);
	});

	describe('addWebhooks', () => {
		test('returns false and registers nothing when the workflow has no webhooks', async () => {
			getWorkflowWebhooks.mockReturnValue([]);

			const result = await service.addWebhooks({
				workflow: mockWorkflow(),
				additionalData,
				mode: 'trigger',
				activation: 'update',
			});

			expect(result).toBe(false);
			expect(webhookService.storeWebhook).not.toHaveBeenCalled();
		});

		test('registers each webhook, persists static data and returns true', async () => {
			getWorkflowWebhooks.mockReturnValue([webhookData('A'), webhookData('B')]);
			const workflow = mockWorkflow();

			const result = await service.addWebhooks({
				workflow,
				additionalData,
				mode: 'trigger',
				activation: 'update',
			});

			expect(result).toBe(true);
			expect(webhookService.storeWebhook).toHaveBeenCalledTimes(2);
			expect(webhookService.createWebhookIfNotExists).toHaveBeenCalledTimes(2);
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
		});

		test('registers only the webhooks of the given nodeIds', async () => {
			getWorkflowWebhooks.mockReturnValue([webhookData('A'), webhookData('B')]);

			await service.addWebhooks({
				workflow: mockWorkflow(),
				additionalData,
				mode: 'trigger',
				activation: 'update',
				nodeIds: new Set(['A-id']),
			});

			expect(webhookService.storeWebhook).toHaveBeenCalledTimes(1);
			expect(webhookService.createWebhookIfNotExists).toHaveBeenCalledTimes(1);
		});

		test('clears webhooks and throws WebhookPathTakenError on a QueryFailedError', async () => {
			getWorkflowWebhooks.mockReturnValue([webhookData('A')]);
			webhookService.storeWebhook.mockRejectedValueOnce(
				Object.assign(new Error('duplicate'), { name: 'QueryFailedError' }),
			);
			const clearSpy = jest.spyOn(service, 'clearWebhooks').mockResolvedValue(undefined);

			await expect(
				service.addWebhooks({
					workflow: mockWorkflow(),
					additionalData,
					mode: 'trigger',
					activation: 'update',
				}),
			).rejects.toThrow(WebhookPathTakenError);

			expect(clearSpy).toHaveBeenCalledWith('wf-1');
		});
	});

	describe('clearWebhooks', () => {
		test('throws when the workflow does not exist', async () => {
			workflowRepository.findOne.mockResolvedValue(null);

			await expect(service.clearWebhooks('wf-1')).rejects.toThrow('Could not find workflow');
		});

		test('throws when the workflow has no active version', async () => {
			workflowRepository.findOne.mockResolvedValue(
				mock<WorkflowEntity>({ activeVersion: undefined }),
			);

			await expect(service.clearWebhooks('wf-1')).rejects.toThrow(
				'Active version not found for workflow',
			);
		});

		test('deregisters webhooks and deletes the workflow webhook rows', async () => {
			workflowRepository.findOne.mockResolvedValue({
				id: 'wf-1',
				name: 'My Workflow',
				activeVersion: { nodes: [], connections: {} },
			} as unknown as WorkflowEntity);
			const deregisterSpy = jest.spyOn(service, 'deregisterWebhooks').mockResolvedValue([]);

			await service.clearWebhooks('wf-1');

			expect(deregisterSpy).toHaveBeenCalled();
			expect(webhookService.deleteWorkflowWebhooks).toHaveBeenCalledWith('wf-1');
		});
	});

	describe('deregisterWebhooks', () => {
		test('deletes each webhook and returns the deregistered node names', async () => {
			getWorkflowWebhooks.mockReturnValue([webhookData('A'), webhookData('B')]);
			const workflow = mockWorkflow();

			const removed = await service.deregisterWebhooks(workflow, additionalData);

			expect(webhookService.deleteWebhook).toHaveBeenCalledTimes(2);
			expect(removed).toEqual(['A', 'B']);
			expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
		});

		test('only deregisters the webhooks of the given nodeIds', async () => {
			getWorkflowWebhooks.mockReturnValue([webhookData('A'), webhookData('B')]);

			const removed = await service.deregisterWebhooks(
				mockWorkflow(),
				additionalData,
				new Set(['B-id']),
			);

			expect(webhookService.deleteWebhook).toHaveBeenCalledTimes(1);
			expect(removed).toEqual(['B']);
		});
	});
});
