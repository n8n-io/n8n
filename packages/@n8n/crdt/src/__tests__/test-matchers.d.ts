import 'vitest';

interface ReceiveMessageOptions {
	timeout?: number;
}

type DeserializedMessage<TMessage = object> = string | TMessage;

declare module 'vitest' {
	interface Assertion<R, T> {
		toReceiveMessage<TMessage = object>(
			message: DeserializedMessage<TMessage>,
			options?: ReceiveMessageOptions,
		): Promise<void>;
		toHaveReceivedMessages<TMessage = object>(messages: Array<DeserializedMessage<TMessage>>): R;
	}
}
