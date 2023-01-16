/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
	LoggerProxy,
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationStdoutOptions,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';
import { EventMessageTypes } from '../EventMessageClasses';
import { eventMessageGenericDestinationTestEvent } from '../EventMessageClasses/EventMessageGeneric';
import { eventBus } from '../MessageEventBus/MessageEventBus';
import { isLogStreamingEnabled } from '../MessageEventBus/MessageEventBusHelper';
import { MessageEventBusDestination } from './MessageEventBusDestination.ee';

export const isMessageEventBusDestinationStdoutOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationStdoutOptions => {
	const o = candidate as MessageEventBusDestinationStdoutOptions;
	return o ? true : false;
};

export class MessageEventBusDestinationStdout
	extends MessageEventBusDestination
	implements MessageEventBusDestinationStdoutOptions
{
	constructor(options: MessageEventBusDestinationStdoutOptions) {
		super(options as MessageEventBusDestinationOptions);
		this.__type = options.__type ?? MessageEventBusDestinationTypeNames.stdout;
		this.label = options.label ?? 'Stdout';

		LoggerProxy.debug(`MessageEventBusDestinationStdout with id ${this.getId()} initialized`);
	}

	async receiveFromEventBus(msg: EventMessageTypes): Promise<boolean> {
		let sendResult = false;
		if (msg.eventName !== eventMessageGenericDestinationTestEvent) {
			if (!isLogStreamingEnabled()) return sendResult;
			if (!this.hasSubscribedToEvent(msg)) return sendResult;
		}
		try {
			const serializedMessage = msg.serialize();
			if (this.anonymizeAuditMessages) {
				serializedMessage.payload = msg.anonymize();
			}
			delete serializedMessage.__type;
			console.log(JSON.stringify(serializedMessage), {
				msgid: msg.id,
				timestamp: msg.ts.toJSDate(),
			});
			await eventBus.confirmSent(msg, { id: this.id, name: this.label });
			sendResult = true;
		} catch (error) {
			console.log(error);
		}
		if (msg.eventName === eventMessageGenericDestinationTestEvent) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		return sendResult;
	}

	serialize(): MessageEventBusDestinationStdoutOptions {
		const abstractSerialized = super.serialize();
		return {
			...abstractSerialized,
		};
	}

	static deserialize(
		data: MessageEventBusDestinationOptions,
	): MessageEventBusDestinationStdout | null {
		if (
			'__type' in data &&
			data.__type === MessageEventBusDestinationTypeNames.stdout &&
			isMessageEventBusDestinationStdoutOptions(data)
		) {
			return new MessageEventBusDestinationStdout(data);
		}
		return null;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}
}
