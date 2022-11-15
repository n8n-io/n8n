import { EventMessage } from '../EventMessageClasses/EventMessage';
import {
	MessageEventBusDestination,
	MessageEventBusDestinationOptions,
} from '../EventMessageClasses/MessageEventBusDestination';
import axios from 'axios';
import { JsonObject, jsonParse, JsonValue } from 'n8n-workflow';
import { eventBus } from '../MessageEventBus/MessageEventBus';

export const isMessageEventBusDestinationWebhookOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationWebhookOptions => {
	const o = candidate as MessageEventBusDestinationWebhookOptions;
	if (!o) return false;
	return o.url !== undefined;
};

export interface MessageEventBusDestinationWebhookOptions
	extends MessageEventBusDestinationOptions {
	url: string;
	expectedStatusCode?: number;
}

export class MessageEventBusDestinationWebhook extends MessageEventBusDestination {
	static readonly serializedName = '$$MessageEventBusDestinationWebhook';

	readonly url: string;

	readonly expectedStatusCode: number;

	constructor(options: MessageEventBusDestinationWebhookOptions) {
		super(options);
		this.expectedStatusCode = options.expectedStatusCode ?? 200;
		this.url = options.url;
		console.debug(`MessageEventBusDestinationWebhook Broker initialized`);
	}

	async receiveFromEventBus(msg: EventMessage): Promise<boolean> {
		console.log('URL', this.url);
		try {
			const postResult = await axios.post(this.url, msg);
			if (postResult.status === this.expectedStatusCode) {
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
			serializedName: MessageEventBusDestinationWebhook.serializedName,
			options: {
				id: this.getId(),
				name: this.getName(),
				expectedStatusCode: this.expectedStatusCode,
				urls: this.url,
				subscriptionSet: this.subscriptionSet.serialize(),
			},
		};
	}

	static deserialize(data: JsonObject): MessageEventBusDestinationWebhook | null {
		if (
			'serializedName' in data &&
			data.serializedName === MessageEventBusDestinationWebhook.serializedName &&
			'options' in data &&
			isMessageEventBusDestinationWebhookOptions(data.options)
		) {
			return new MessageEventBusDestinationWebhook(data.options);
		}
		return null;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	static fromString(data: string): MessageEventBusDestinationWebhook | null {
		const o = jsonParse<JsonObject>(data);
		return MessageEventBusDestinationWebhook.deserialize(o);
	}

	async close() {
		// Nothing to do
	}
}
