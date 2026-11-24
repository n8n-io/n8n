import { TRIGGER_COUNT_EXCLUDED_NODES } from '@/constants';
import { Service } from '@n8n/di';
import type { INodeType, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import * as WebhookHelpers from '@/webhooks/webhook-helpers';

@Service()
export class TriggerCountService {
	/**
	 * Count all triggers in the workflow, excluding Manual Trigger and other n8n-internal triggers.
	 */
	count(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData) {
		const triggerFilter = (nodeType: INodeType) =>
			!!nodeType.trigger &&
			!nodeType.description.name.includes('manualTrigger') &&
			!TRIGGER_COUNT_EXCLUDED_NODES.some((x) => x.endsWith(nodeType.description.name));

		// Retrieve unique webhooks as some nodes have multiple webhooks.
		const workflowWebhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			undefined,
			true,
		);

		const uniqueWebhooks = workflowWebhooks.reduce<Set<string>>((acc, webhook) => {
			acc.add(webhook.node);
			return acc;
		}, new Set());

		return (
			workflow.queryNodes(triggerFilter).length +
			workflow.getPollNodes().length +
			uniqueWebhooks.size
		);
	}
}
