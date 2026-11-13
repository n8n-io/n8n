import { testDb, createWorkflow } from '@n8n/backend-test-utils';
import type { IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INodeType } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';

const TRIGGER_TYPE = 'n8n-nodes-base.externalWebhookTrigger';
const TRIGGER_NAME = 'External Webhook Trigger';

const checkExists = vi.fn();
const deleteWebhook = vi.fn();

/** A trigger that registers its webhook at an external service. */
const externalWebhookTrigger: INodeType = {
	description: {
		displayName: TRIGGER_NAME,
		name: 'externalWebhookTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when the external service calls the webhook',
		defaults: { name: TRIGGER_NAME },
		inputs: [],
		outputs: ['main'],
		properties: [],
		webhooks: [
			{ name: 'setup', httpMethod: 'GET', responseMode: 'onReceived', path: 'webhook' },
			{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' },
		],
	},
	webhookMethods: {
		default: { checkExists, create: async () => true, delete: deleteWebhook },
	},
};

describe('Manual run of a trigger whose test webhook the external service rejects', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let workflowExecutionService: WorkflowExecutionService;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		await utils.initNodeTypes({ [TRIGGER_TYPE]: { sourcePath: '', type: externalWebhookTrigger } });
		await utils.initBinaryDataService();

		workflowExecutionService = Container.get(WorkflowExecutionService);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const createTriggerWorkflow = async () =>
		await createWorkflow(
			{
				name: TRIGGER_NAME,
				nodes: [
					{
						id: uuid(),
						name: TRIGGER_NAME,
						type: TRIGGER_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						webhookId: uuid(),
					},
				],
				connections: {},
			} as unknown as IWorkflowDb,
			owner,
		);

	const runManually = async (workflow: IWorkflowDb) =>
		await workflowExecutionService.executeManually(
			workflow,
			{ triggerToStartFrom: { name: TRIGGER_NAME } },
			owner,
		);

	test('reports the error of the service after runs that could not delete their webhook', async () => {
		const workflow = await createTriggerWorkflow();
		checkExists.mockRejectedValue(new Error('The service rejected the webhook'));
		deleteWebhook
			.mockRejectedValueOnce(new Error('The service could not delete the webhook'))
			.mockRejectedValueOnce(new Error('The service could not delete the webhook'))
			.mockResolvedValue(true);

		await expect(runManually(workflow)).rejects.toThrow('The service could not delete the webhook');
		await expect(runManually(workflow)).rejects.toThrow('The service could not delete the webhook');

		await expect(runManually(workflow)).rejects.toThrow('The service rejected the webhook');
	});
});
