import type { InstanceAiAgentNode } from '@n8n/api-types';
import { i18n } from '@n8n/i18n';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

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

/** The date the user saved a login, as the user reads it: "today", or a date such as "Nov 12". */
export function formatSavedLoginDate(savedAt: string): string {
	const isToday = new Date(savedAt).toDateString() === new Date().toDateString();
	if (isToday) return i18n.baseText('instanceAi.cloudBrowser.savedLoginToday');
	return convertToDisplayDate(savedAt).date;
}
