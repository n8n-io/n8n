import 'vitest';

interface ReceiveMessageOptions {
	timeout?: number;
}

type DeserializedMessage<TMessage = object> = string | TMessage;

declare module 'vitest' {
	interface Assertion<T = unknown> {
		toReceiveMessage<TMessage = object>(
			message: DeserializedMessage<TMessage>,
			options?: ReceiveMessageOptions,
		): Promise<T>;
		toHaveReceivedMessages<TMessage = object>(messages: Array<DeserializedMessage<TMessage>>): T;
	}
}
