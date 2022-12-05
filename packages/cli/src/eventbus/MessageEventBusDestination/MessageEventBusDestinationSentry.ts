/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { EventMessageGeneric } from '../EventMessageClasses/EventMessageGeneric';
import { MessageEventBusDestination } from './MessageEventBusDestination';
import * as Sentry from '@sentry/node';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';
import { GenericHelpers } from '../..';

export const isMessageEventBusDestinationSentryOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationSentryOptions => {
	const o = candidate as MessageEventBusDestinationSentryOptions;
	if (!o) return false;
	return o.dsn !== undefined;
};

export class MessageEventBusDestinationSentry
	extends MessageEventBusDestination
	implements MessageEventBusDestinationSentryOptions
{
	dsn: string;

	tracesSampleRate = 1.0;

	sendPayload: boolean;

	anonymizeAuditMessages?: boolean;

	constructor(options: MessageEventBusDestinationSentryOptions) {
		super(options);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		this.label = options.label ?? 'Sentry DSN';
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.sentry;
		this.dsn = options.dsn;
		if (options.sendPayload) this.sendPayload = options.sendPayload;
		if (options.tracesSampleRate) this.tracesSampleRate = options.tracesSampleRate;
		if (options.anonymizeAuditMessages)
			this.anonymizeAuditMessages = options.anonymizeAuditMessages;
		const { ENVIRONMENT: environment } = process.env;

		GenericHelpers.getVersions()
			.then((versions) => {
				Sentry.init({
					dsn: this.dsn,
					tracesSampleRate: this.tracesSampleRate,
					environment,
					release: versions.cli,
				});
				console.debug(`MessageEventBusDestinationSentry Broker initialized`);
			})
			.catch(() => {});
	}

	async receiveFromEventBus(msg: EventMessageGeneric): Promise<boolean> {
		if (!eventBus.isLogStreamingEnabled()) return false;
		try {
			let sentryResult = '';
			Sentry.withScope((scope: Sentry.Scope) => {
				scope.setLevel(
					(msg.eventName.toLowerCase().endsWith('error') ? 'error' : 'log') as Sentry.SeverityLevel,
				);
				scope.setTags({
					event: msg.getEventName(),
					logger: this.label ?? this.getId(),
				});
				if (this.sendPayload) {
					scope.setExtras(msg.payload);
				}
				sentryResult = Sentry.captureMessage(msg.message ?? msg.eventName, scope);
			});
			if (sentryResult) {
				await eventBus.confirmSent(msg, { id: this.id, name: this.label });
				return true;
			}
		} catch (error) {
			console.log(error);
		}
		return false;
	}

	serialize(): MessageEventBusDestinationSentryOptions {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
			dsn: this.dsn,
			tracesSampleRate: this.tracesSampleRate,
			sendPayload: this.sendPayload,
		};
	}

	static deserialize(
		data: MessageEventBusDestinationOptions,
	): MessageEventBusDestinationSentry | null {
		if (
			'__type' in data &&
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			data.__type === MessageEventBusDestinationTypeNames.sentry &&
			isMessageEventBusDestinationSentryOptions(data)
		) {
			return new MessageEventBusDestinationSentry(data);
		}
		return null;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	async close() {
		await super.close();
		await Sentry.close();
	}
}
