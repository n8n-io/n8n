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

function eventNameToMetricName(eventName: string): string {
	return eventName.replace('n8n.', 'event_').replace(/\./g, '_');
}

function nodeTypeToMetricName(nodeType: string): string {
	return nodeType.replace('n8n-nodes-', '').replace(/\./g, '_');
}

function credentialTypeToMetricName(nodeType: string): string {
	return nodeType.replace(/\./g, '_');
}

export async function sendPrometheusMetric(msg: EventMessageTypes): Promise<boolean> {
	if (!config.getEnv('endpoints.metrics.enable')) return false;
	let metricName = eventNameToMetricName(msg.eventName);
	const prefix = config.getEnv('endpoints.metrics.prefix');
	switch (msg.__type) {
		case EventMessageTypeNames.audit:
			if (
				config.getEnv('endpoints.metrics.forEachCredentialType') &&
				msg.eventName.startsWith('n8n.audit.user.credentials') &&
				msg.payload.credentialType
			) {
				metricName = `${prefix}${metricName}_${credentialTypeToMetricName(
					msg.payload.credentialType,
				)}`;
			} else if (
				config.getEnv('endpoints.metrics.forEachWorkflowId') &&
				msg.eventName.startsWith('n8n.audit.workflow') &&
				msg.payload.workflowId
			) {
				metricName = `${prefix}${metricName}_${msg.payload.workflowId?.toString() ?? 'unknown'}`;
			}
			break;
		case EventMessageTypeNames.node:
			if (config.getEnv('endpoints.metrics.forEachNodeType') && msg.payload.nodeType) {
				metricName = `${prefix}${metricName}_${nodeTypeToMetricName(msg.payload.nodeType)}`;
			}
			break;
		case EventMessageTypeNames.workflow:
			if (config.getEnv('endpoints.metrics.forEachWorkflowId') && msg.payload.workflowId) {
				metricName = `${prefix}${metricName}_${msg.payload.workflowId?.toString() ?? 'unknown'}`;
			}
			break;
		case EventMessageTypeNames.generic:
		default:
	}

	if (!promClient.validateMetricName(metricName)) {
		LoggerProxy.debug(`Invalid metric name: ${metricName}`);
		return false;
	}
	let counter = promClient.register.getSingleMetric(metricName) as promClient.Counter<string>;
	if (!counter) {
		counter = new promClient.Counter({ name: metricName, help: `n8n event ${msg.eventName}` });
		promClient.register.registerMetric(counter);
	}
	counter.inc();
	return true;
}
