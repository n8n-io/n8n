import { EventMessage } from '../EventMessageClasses/EventMessage';
import {
	MessageEventBusDestination,
	MessageEventBusDestinationOptions,
} from '../EventMessageClasses/MessageEventBusDestination';
import { JsonObject, jsonParse, JsonValue } from 'n8n-workflow';
import * as Sentry from '@sentry/node';
import { EventMessageLevel } from '../types/EventMessageTypes';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { getInstanceOwner } from '../../UserManagement/UserManagementHelper';

export const isMessageEventBusDestinationSentryOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationSentryOptions => {
	const o = candidate as MessageEventBusDestinationSentryOptions;
	if (!o) return false;
	return o.dsn !== undefined;
};

function eventMessageLevelToSentrySeverity(emLevel: EventMessageLevel): Sentry.SeverityLevel {
	switch (emLevel) {
		case 'debug':
			return 'debug';
		case 'info':
			return 'info';
		case 'notice':
			return 'log';
		case 'warning':
			return 'warning';
		case 'error':
			return 'error';
		case 'crit':
			return 'fatal';
		case 'alert':
			return 'fatal';
		case 'emerg':
			return 'fatal';
		default:
			return 'log';
	}
}

export interface MessageEventBusDestinationSentryOptions extends MessageEventBusDestinationOptions {
	dsn: string;
	tracesSampleRate?: number;
}

export class MessageEventBusDestinationSentry extends MessageEventBusDestination {
	static readonly serializedName = '$$MessageEventBusDestinationSentry';

	readonly dsn: string;

	tracesSampleRate: number;

	constructor(options: MessageEventBusDestinationSentryOptions) {
		super(options);
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
	async receiveFromEventBus(msg: EventMessage): Promise<boolean> {
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
					group: msg.getEventGroup(),
					logger: this.getName(),
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

	serialize(): JsonValue {
		return {
			serializedName: MessageEventBusDestinationSentry.serializedName,
			id: this.getId(),
			options: {
				name: this.getName(),
				dsn: this.dsn,
				tracesSampleRate: this.tracesSampleRate,
				subscriptionSet: this.subscriptionSet.serialize(),
			},
		};
	}

	static deserialize(data: JsonObject): MessageEventBusDestinationSentry | null {
		if (
			'serializedName' in data &&
			data.serializedName === MessageEventBusDestinationSentry.serializedName &&
			'options' in data &&
			isMessageEventBusDestinationSentryOptions(data.options)
		) {
			return new MessageEventBusDestinationSentry(data.options);
		}
		return null;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	static fromString(data: string): MessageEventBusDestinationSentry | null {
		const o = jsonParse<JsonObject>(data);
		return MessageEventBusDestinationSentry.deserialize(o);
	}

	async close() {
		await Sentry.close();
	}
}
