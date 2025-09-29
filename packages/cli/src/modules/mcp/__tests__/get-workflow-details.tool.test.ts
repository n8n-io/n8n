import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { createWorkflow } from './mock.utils';
import { getWorkflowDetails, createWorkflowDetailsTool } from '../tools/get-workflow-details.tool';

import { CredentialsService } from '@/credentials/credentials.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

jest.mock('../tools/webhook-utils', () => ({
	getWebhookDetails: jest.fn().mockResolvedValue('MOCK_TRIGGER_DETAILS'),
}));

describe('get-workflow-details MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const baseWebhookUrl = 'https://example.test';

	describe('smoke tests', () => {
		test('it creates tool correctly', () => {
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn(),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const tool = createWorkflowDetailsTool(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				endpoints,
			);

			expect(tool.name).toBe('get_workflow_details');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.inputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('returns sanitized workflow and trigger info (active)', async () => {
			const workflow = createWorkflow({ active: true });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				endpoints,
				{ workflowId: 'wf-1' },
			);

			expect('pinData' in payload.workflow).toBe(false);
			expect(payload.workflow.nodes.every((n) => !('credentials' in n))).toBe(true);
			expect(payload.triggerInfo).toContain('MOCK_TRIGGER_DETAILS');
			expect(payload.triggerInfo).toContain('Workflow is active and accessible');
		});

		test('returns trigger info (inactive)', async () => {
			const workflow = createWorkflow({ active: false });
			const workflowFinderService = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(workflow),
			});
			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				endpoints,
				{ workflowId: 'wf-2' },
			);

			expect(payload.triggerInfo).toContain('Workflow is not active');
		});

		test('throws for not found/archived/unavailable workflow', async () => {
			const archived = createWorkflow({ isArchived: true });
			const unavailable = createWorkflow({ settings: { availableInMCP: false } });

			const credentialsService = mockInstance(CredentialsService, {});
			const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

			const wfFinder1 = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(null),
			});
			await expect(
				getWorkflowDetails(user, baseWebhookUrl, wfFinder1, credentialsService, endpoints, {
					workflowId: 'missing',
				}),
			).rejects.toThrow('Workflow not found');

			const wfFinder2 = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(archived),
			});
			await expect(
				getWorkflowDetails(user, baseWebhookUrl, wfFinder2, credentialsService, endpoints, {
					workflowId: 'archived',
				}),
			).rejects.toThrow('Workflow not found');

			const wfFinder3 = mockInstance(WorkflowFinderService, {
				findWorkflowForUser: jest.fn().mockResolvedValue(unavailable),
			});
			await expect(
				getWorkflowDetails(user, baseWebhookUrl, wfFinder3, credentialsService, endpoints, {
					workflowId: 'unavailable',
				}),
			).rejects.toThrow('Workflow not found');
		});
	});
});
