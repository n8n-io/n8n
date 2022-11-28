/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { EventMessageGeneric } from '../EventMessageClasses/EventMessageGeneric';
import { MessageEventBusDestination } from './MessageEventBusDestination';
import * as Sentry from '@sentry/node';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { getInstanceOwner } from '../../UserManagement/UserManagementHelper';
import {
	EventMessageLevel,
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';

export const isMessageEventBusDestinationSentryOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationSentryOptions => {
	const o = candidate as MessageEventBusDestinationSentryOptions;
	if (!o) return false;
	return o.dsn !== undefined;
};

function eventMessageLevelToSentrySeverity(emLevel: EventMessageLevel): Sentry.SeverityLevel {
	switch (emLevel) {
		case EventMessageLevel.log:
			return 'log';
		case EventMessageLevel.debug:
			return 'debug';
		case EventMessageLevel.info:
			return 'info';
		case EventMessageLevel.error:
			return 'error';
		case EventMessageLevel.verbose:
			return 'debug';
		case EventMessageLevel.warn:
			return 'warning';
		default:
			return 'log';
	}
}

export class MessageEventBusDestinationSentry
	extends MessageEventBusDestination
	implements MessageEventBusDestinationSentryOptions
{
	dsn: string;

	tracesSampleRate: number;

	resource: string;

	sendPayload: boolean;

	authentication: 'none' | 'predefinedCredentialType';

	nodeCredentialType: 'sentryIoApi';

	constructor(options: MessageEventBusDestinationSentryOptions) {
		super(options);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.sentry;
		this.dsn = options.dsn;
		this.tracesSampleRate = options.tracesSampleRate ?? 1.0;
		const { N8N_VERSION: release, ENVIRONMENT: environment } = process.env;

		Sentry.init({
			dsn: this.dsn,
			tracesSampleRate: this.tracesSampleRate,
			environment,
			release,
		});
		console.debug(`MessageEventBusDestinationSentry Broker initialized`);
	}

	//TODO: fill all event fields
	async receiveFromEventBus(msg: EventMessageGeneric): Promise<boolean> {
		try {
			const user = await getInstanceOwner();
			const context = {
				level: eventMessageLevelToSentrySeverity(msg.level),
				user: {
					id: user.id,
					email: user.email,
				},
				tags: {
					event: msg.getEventName(),
					logger: this.getId(),
				},
			};
			const sentryResult = Sentry.captureMessage(
				msg.payload ? JSON.stringify(msg.payload) : msg.eventName,
				context,
			);
			if (sentryResult) {
				await eventBus.confirmSent(msg);
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
			authentication: this.authentication,
			nodeCredentialType: this.nodeCredentialType,
			sendPayload: this.sendPayload,
			resource: this.resource,
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
