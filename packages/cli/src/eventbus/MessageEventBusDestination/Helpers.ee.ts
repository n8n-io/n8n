import { EventMessageTypeNames } from 'n8n-workflow';
import config from '@/config';
import type { EventMessageTypes } from '../EventMessageClasses';

export const METRICS_EVENT_NAME = 'metrics.messageEventBus.Event';

export function getMetricNameForEvent(event: EventMessageTypes): string {
	const prefix = config.getEnv('endpoints.metrics.prefix');
	return prefix + event.eventName.replace('n8n.', '').replace(/\./g, '_') + '_total';
}

export function getLabelValueForNode(nodeType: string): string {
	return nodeType.replace('n8n-nodes-', '').replace(/\./g, '_');
}

export function getLabelValueForCredential(credentialType: string): string {
	return credentialType.replace(/\./g, '_');
}

export function getLabelsForEvent(event: EventMessageTypes): Record<string, string> {
	switch (event.__type) {
		case EventMessageTypeNames.audit:
			if (event.eventName.startsWith('n8n.audit.user.credentials')) {
				return config.getEnv('endpoints.metrics.includeCredentialTypeLabel')
					? {
							credential_type: getLabelValueForCredential(
								event.payload.credentialType ?? 'unknown',
							),
						}
					: {};
			}

			if (event.eventName.startsWith('n8n.audit.workflow')) {
				return config.getEnv('endpoints.metrics.includeWorkflowIdLabel')
					? { workflow_id: event.payload.workflowId?.toString() ?? 'unknown' }
					: {};
			}
			break;

		case EventMessageTypeNames.node:
			return config.getEnv('endpoints.metrics.includeNodeTypeLabel')
				? { node_type: getLabelValueForNode(event.payload.nodeType ?? 'unknown') }
				: {};

		case EventMessageTypeNames.workflow:
			return config.getEnv('endpoints.metrics.includeWorkflowIdLabel')
				? { workflow_id: event.payload.workflowId?.toString() ?? 'unknown' }
				: {};
	}

	return {};
}
