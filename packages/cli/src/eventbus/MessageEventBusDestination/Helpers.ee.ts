/* eslint-disable import/no-cycle */
import {
	EventMessageTypeNames,
	LoggerProxy,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';
import type { EventDestinations } from '@/databases/entities/MessageEventBusDestinationEntity';
import type { MessageEventBusDestination } from './MessageEventBusDestination.ee';
import { MessageEventBusDestinationSentry } from './MessageEventBusDestinationSentry.ee';
import { MessageEventBusDestinationSyslog } from './MessageEventBusDestinationSyslog.ee';
import { MessageEventBusDestinationWebhook } from './MessageEventBusDestinationWebhook.ee';
import type { EventMessageTypes } from '../EventMessageClasses';
import promClient from 'prom-client';
import config from '../../config';

export function messageEventBusDestinationFromDb(
	dbData: EventDestinations,
): MessageEventBusDestination | null {
	const destinationData = dbData.destination;
	if ('__type' in destinationData) {
		switch (destinationData.__type) {
			case MessageEventBusDestinationTypeNames.sentry:
				return MessageEventBusDestinationSentry.deserialize(destinationData);
			case MessageEventBusDestinationTypeNames.syslog:
				return MessageEventBusDestinationSyslog.deserialize(destinationData);
			case MessageEventBusDestinationTypeNames.webhook:
				return MessageEventBusDestinationWebhook.deserialize(destinationData);
			default:
				console.log('MessageEventBusDestination __type unknown');
		}
	}
	return null;
}

const prometheusCounters: Record<string, promClient.Counter<string> | null> = {};

function getMetricNameForEvent(event: EventMessageTypes): string {
	const prefix = config.getEnv('endpoints.metrics.prefix');
	return prefix + event.eventName.replace('n8n.', '').replace(/\./g, '_') + '_total';
}

function getLabelValueForNode(nodeType: string): string {
	return nodeType.replace('n8n-nodes-', '').replace(/\./g, '_');
}

function getLabelValueForCredential(credentialType: string): string {
	return credentialType.replace(/\./g, '_');
}

function getLabelsForEvent(event: EventMessageTypes): Record<string, string> {
	switch (event.__type) {
		case EventMessageTypeNames.audit:
			if (event.eventName.startsWith('n8n.audit.user.credentials')) {
				return config.getEnv('endpoints.metrics.includeCredentialTypeLabel')
					? {
							credentialType: getLabelValueForCredential(event.payload.credentialType ?? 'unknown'),
					  }
					: {};
			}

			if (event.eventName.startsWith('n8n.audit.workflow')) {
				return config.getEnv('endpoints.metrics.includeWorkflowIdLabel')
					? { workflowId: event.payload.workflowId?.toString() ?? 'unknown' }
					: {};
			}
			break;

		case EventMessageTypeNames.node:
			return config.getEnv('endpoints.metrics.includeNodeTypeLabel')
				? { nodeType: getLabelValueForNode(event.payload.nodeType ?? 'unknown') }
				: {};

		case EventMessageTypeNames.workflow:
			return config.getEnv('endpoints.metrics.includeWorkflowIdLabel')
				? { workflowId: event.payload.workflowId?.toString() ?? 'unknown' }
				: {};
	}

	return {};
}

function getCounterSingletonForEvent(event: EventMessageTypes) {
	if (!prometheusCounters[event.eventName]) {
		const metricName = getMetricNameForEvent(event);

		if (!promClient.validateMetricName(metricName)) {
			LoggerProxy.debug(`Invalid metric name: ${metricName}`);
			prometheusCounters[event.eventName] = null;
			return null;
		}

		const counter = new promClient.Counter({
			name: metricName,
			help: `n8n event ${event.eventName}`,
			labelNames: Object.keys(getLabelsForEvent(event)),
		});

		promClient.register.registerMetric(counter);
		prometheusCounters[event.eventName] = counter;
	}

	return prometheusCounters[event.eventName];
}

export async function incrementPrometheusMetric(event: EventMessageTypes): Promise<void> {
	const counter = getCounterSingletonForEvent(event);

	if (!counter) {
		return;
	}

	counter.inc(getLabelsForEvent(event));
}
