/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MessageEventBusDestination } from './MessageEventBusDestination.ee';
import * as Sentry from '@sentry/node';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import {
	LoggerProxy,
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';
import { GenericHelpers } from '../..';
import { isLogStreamingEnabled } from '../MessageEventBus/MessageEventBusHelper';
import { EventMessageTypes } from '../EventMessageClasses';
import { eventMessageGenericDestinationTestEvent } from '../EventMessageClasses/EventMessageGeneric';

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

	sentryInitSuccessful = false;

	constructor(options: MessageEventBusDestinationSentryOptions) {
		super(options);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		this.label = options.label ?? 'Sentry DSN';
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.sentry;
		this.dsn = options.dsn;
		if (options.sendPayload) this.sendPayload = options.sendPayload;
		if (options.tracesSampleRate) this.tracesSampleRate = options.tracesSampleRate;
		const { ENVIRONMENT: environment } = process.env;

		GenericHelpers.getVersions()
			.then((versions) => {
				Sentry.init({
					dsn: this.dsn,
					tracesSampleRate: this.tracesSampleRate,
					environment,
					release: versions.cli,
				});
				LoggerProxy.debug(`MessageEventBusDestinationSentry with id ${this.getId()} initialized`);
				this.sentryInitSuccessful = true;
			})
			.catch((error) => {
				this.sentryInitSuccessful = false;
				console.error(error);
			});
	}

	async receiveFromEventBus(msg: EventMessageTypes): Promise<boolean> {
		let sendResult = false;
		if (!this.sentryInitSuccessful) return sendResult;
		if (msg.eventName !== eventMessageGenericDestinationTestEvent) {
			if (!isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
		try {
			if (this.anonymizeAuditMessages || msg.anonymize) {
				msg = msg.anonymize();
			}
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
				sendResult = true;
			}
		} catch (error) {
			console.log(error);
		}
		return sendResult;
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
