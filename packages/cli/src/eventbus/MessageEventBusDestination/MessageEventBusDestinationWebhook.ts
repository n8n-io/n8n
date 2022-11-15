import { EventMessage } from '../EventMessageClasses/EventMessage';
import { MessageEventBusDestination } from '../EventMessageClasses/MessageEventBusDestination';
import axios from 'axios';
import { JsonObject, jsonParse, JsonValue } from 'n8n-workflow';

export const isMessageEventBusDestinationWebhookOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationWebhookOptions => {
	const o = candidate as MessageEventBusDestinationWebhookOptions;
	if (!o) return false;
	return o.url !== undefined;
};

export interface MessageEventBusDestinationWebhookOptions {
	url: string;
	name?: string;
	expectedStatusCode?: number;
}

export class MessageEventBusDestinationWebhook extends MessageEventBusDestination {
	static readonly type = '$$MessageEventBusDestinationWebhook';

	readonly url: string;

	readonly expectedStatusCode: number;

	constructor(options: MessageEventBusDestinationWebhookOptions) {
		super({ name: options.name ?? 'WebhookDestination' });
		this.expectedStatusCode = options.expectedStatusCode ?? 200;
		this.url = options.url;
		console.debug(`MessageEventBusDestinationWebhook Broker initialized`);
	}

	async receiveFromEventBus(msg: EventMessage): Promise<boolean> {
		console.log('URL', this.url);
		try {
			const postResult = await axios.post(this.url, msg);
			if (postResult.status === this.expectedStatusCode) {
				return true;
			}
		} catch (error) {
			console.log(error);
		}
		return false;
	}

	serialize(): JsonValue {
		return {
			type: MessageEventBusDestinationWebhook.type,
			options: {
				name: this.name,
				expectedStatusCode: this.expectedStatusCode,
				urls: this.url,
			},
		};
	}

	static deserialize(data: JsonObject): MessageEventBusDestinationWebhook | undefined {
		if (
			'type' in data &&
			data.type === MessageEventBusDestinationWebhook.type &&
			'options' in data &&
			isMessageEventBusDestinationWebhookOptions(data.options)
		) {
			return new MessageEventBusDestinationWebhook(data.options);
		}
		return undefined;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	static fromString(data: string): MessageEventBusDestinationWebhook | undefined {
		const o = jsonParse<JsonObject>(data);
		return MessageEventBusDestinationWebhook.deserialize(o);
	}

	async close() {
		// Nothing to do
	}
}
