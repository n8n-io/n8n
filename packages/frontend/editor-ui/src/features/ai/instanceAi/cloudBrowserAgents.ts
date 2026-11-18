import type { InstanceAiAgentNode } from '@n8n/api-types';

import type { PendingConfirmationItem } from './instanceAi.store';

/** True when the agent node is a cloud browser sub-agent. The chat does not show its steps. */
export function isCloudBrowserAgent(node: Pick<InstanceAiAgentNode, 'kind'>): boolean {
	return node.kind === 'cloud-browser';
}

/** A resource decision raised by the cloud browser agent. It gets its own floating card. */
export function isCloudBrowserResourceDecision(item: PendingConfirmationItem): boolean {
	return (
		item.toolCall.confirmation.inputType === 'resource-decision' &&
		isCloudBrowserAgent(item.agentNode)
	);
}
