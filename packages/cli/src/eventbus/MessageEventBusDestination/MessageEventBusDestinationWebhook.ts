import {
	MessageEventBusDestination,
	MessageEventBusDestinationOptions,
} from './MessageEventBusDestination';
import axios from 'axios';
import { JsonObject, JsonValue } from 'n8n-workflow';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { EventMessageTypes } from '../EventMessageClasses';
import { MessageEventBusDestinationTypeNames } from '.';

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
	responseCodeMustMatch?: boolean;
	expectedStatusCode?: number;
}

export class MessageEventBusDestinationWebhook extends MessageEventBusDestination {
	static readonly __type = MessageEventBusDestinationTypeNames.webhook;

	url: string;

	responseCodeMustMatch: boolean;

	expectedStatusCode: number;

	constructor(options: MessageEventBusDestinationWebhookOptions) {
		super(options);
		this.responseCodeMustMatch = options.responseCodeMustMatch ?? false;
		this.expectedStatusCode = options.expectedStatusCode ?? 200;
		this.url = options.url;
	}

	async receiveFromEventBus(msg: EventMessageTypes): Promise<boolean> {
		console.log('URL', this.url);
		try {
			if (this.responseCodeMustMatch) {
				const postResult = await axios.post(this.url, msg);
				if (postResult.status === this.expectedStatusCode) {
					await eventBus.confirmSent(msg);
				}
			} else {
				await axios.post(this.url, msg);
				await eventBus.confirmSent(msg);
			}
			return true;
		} catch (error) {
			console.log(error);
		}
		return false;
	}

	serialize(): { __type: string; [key: string]: JsonValue } {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
			__type: MessageEventBusDestinationWebhook.__type,
			responseCodeMustMatch: this.responseCodeMustMatch,
			expectedStatusCode: this.expectedStatusCode,
			url: this.url,
		};
	}

	// serialize(): JsonValue {
	// 	return {
	// 		__type: MessageEventBusDestinationWebhook.__type,
	// 		options: {
	// 			id: this.getId(),
	// 			name: this.getName(),
	// 			responseCodeMustMatch: this.responseCodeMustMatch,
	// 			expectedStatusCode: this.expectedStatusCode,
	// 			url: this.url,
	// 			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	// 			subscriptionSet: this.subscriptionSet.serialize(),
	// 		},
	// 	};
	// }

	static deserialize(data: JsonObject): MessageEventBusDestinationWebhook | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationWebhook.__type &&
			isMessageEventBusDestinationWebhookOptions(data)
		) {
			return new MessageEventBusDestinationWebhook(data);
		}
		return null;
	}
}
