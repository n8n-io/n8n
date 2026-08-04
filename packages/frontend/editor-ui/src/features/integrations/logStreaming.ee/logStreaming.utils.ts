import type {
	INodeCredentials,
	INodeParameters,
	MessageEventBusDestinationOptions,
} from 'n8n-workflow';
import {
	MessageEventBusDestinationWebhookOptionsSchema,
	MessageEventBusDestinationSentryOptionsSchema,
	MessageEventBusDestinationSyslogOptionsSchema,
} from 'n8n-workflow';
import type { INodeUi } from '@/Interface';

export function destinationToFakeINodeUi(
	destination: MessageEventBusDestinationOptions,
	fakeType = 'n8n-nodes-base.stickyNote',
): INodeUi {
	return {
		id: destination.id,
		name: destination.id,
		typeVersion: 1,
		type: fakeType,
		position: [0, 0],
		credentials: {
			...(destination.credentials as INodeCredentials),
		},
		parameters: {
			...(destination as unknown as INodeParameters),
		},
	} as INodeUi;
}

/** Whether a log streaming destination has all required fields filled in (telemetry only). */
export function isDestinationComplete(options: INodeParameters): boolean {
	const webhook = MessageEventBusDestinationWebhookOptionsSchema.safeParse(options);
	if (webhook.success) {
		return webhook.data.url !== '';
	}

	const sentry = MessageEventBusDestinationSentryOptionsSchema.safeParse(options);
	if (sentry.success) {
		return sentry.data.dsn !== '';
	}

	const syslog = MessageEventBusDestinationSyslogOptionsSchema.safeParse(options);
	if (syslog.success) {
		return (
			syslog.data.host !== '' &&
			syslog.data.port !== undefined &&
			syslog.data.protocol !== undefined &&
			syslog.data.facility !== undefined &&
			syslog.data.app_name !== ''
		);
	}

	return false;
}
