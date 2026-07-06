import { mock } from 'vitest-mock-extended';
import type { IWebhookData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { TriggerCountService } from '@/workflows/triggers/trigger-count.service';

import { createWorkflow, node } from './trigger-test-utils';

describe('TriggerCountService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	test('counts triggers, pollers, and unique webhook nodes while excluding internal triggers', () => {
		vi.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([
			mock<IWebhookData>({ node: 'Webhook A' }),
			mock<IWebhookData>({ node: 'Webhook A' }),
			mock<IWebhookData>({ node: 'Webhook B' }),
		]);
		const workflow = createWorkflow([
			node('trigger', 'trigger'),
			node('manual', 'manual'),
			node('execute', 'execute-workflow'),
			node('poll', 'poll'),
			node('regular', 'regular'),
		]);
		const service = new TriggerCountService();

		expect(service.count(workflow, mock<IWorkflowExecuteAdditionalData>())).toBe(4);
	});
});
