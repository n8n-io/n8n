/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MessageEventBusDestination } from './MessageEventBusDestination.ee';
import * as Sentry from '@sentry/node';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSentryOptions,
} from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import { isLogStreamingEnabled } from '../MessageEventBus/MessageEventBusHelper';
import type { EventMessageTypes } from '../EventMessageClasses';
import { eventMessageGenericDestinationTestEvent } from '../EventMessageClasses/EventMessageGeneric';
import { N8N_VERSION } from '@/constants';

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

	sentryClient?: Sentry.NodeClient;

	constructor(options: MessageEventBusDestinationSentryOptions) {
		super(options);
		this.label = options.label ?? 'Sentry DSN';
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.sentry;
		this.dsn = options.dsn;
		if (options.sendPayload) this.sendPayload = options.sendPayload;
		if (options.tracesSampleRate) this.tracesSampleRate = options.tracesSampleRate;
		const { ENVIRONMENT: environment } = process.env;

		this.sentryClient = new Sentry.NodeClient({
			dsn: this.dsn,
			tracesSampleRate: this.tracesSampleRate,
			environment,
			release: N8N_VERSION,
			transport: Sentry.makeNodeTransport,
			integrations: Sentry.defaultIntegrations,
			stackParser: Sentry.defaultStackParser,
		});
	}

	async receiveFromEventBus(msg: EventMessageTypes): Promise<boolean> {
		let sendResult = false;
		if (!this.sentryClient) return sendResult;
		if (msg.eventName !== eventMessageGenericDestinationTestEvent) {
			if (!isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
		try {
			const payload = this.anonymizeAuditMessages ? msg.anonymize() : msg.payload;
			const scope: Sentry.Scope = new Sentry.Scope();
			const level = (
				msg.eventName.toLowerCase().endsWith('error') ? 'error' : 'log'
			) as Sentry.SeverityLevel;
			scope.setLevel(level);
			scope.setTags({
				event: msg.getEventName(),
				logger: this.label ?? this.getId(),
				app: 'n8n',
			});
			if (this.sendPayload) {
				scope.setExtras(payload);
			}
			const sentryResult = this.sentryClient.captureMessage(
				msg.message ?? msg.eventName,
				level,
				{ event_id: msg.id, data: payload },
				scope,
			);

			if (sentryResult) {
				eventBus.confirmSent(msg, { id: this.id, name: this.label });
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
		await this.sentryClient?.close();
	}
}
