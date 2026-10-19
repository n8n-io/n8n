import type { ExecutionResponseSender } from './execution-response-sender';
import {
	noopResponseEmitter,
	type ResponseEmitter,
	type ResponseExpectation,
} from './execution-response.types';
import type { JsonValue } from '../common';

/**
 * Gives one step a response emitter that obeys the caller's expectation.
 *
 * Only a caller that expects a step response gets one, and only a caller that
 * expects a stream gets chunks. The emitter drops anything else before the
 * step builds it.
 */
export function createResponseEmitter(
	sender: ExecutionResponseSender,
	execution: { id: string; responseExpectation: ResponseExpectation },
): ResponseEmitter {
	const executionId = execution.id;

	switch (execution.responseExpectation.kind) {
		case 'stepResponse':
			return {
				send: (build: () => JsonValue) =>
					sender.send({ type: 'response', executionId, payload: build() }),
				chunk: noopResponseEmitter.chunk,
			};
		case 'stream':
			return {
				send: noopResponseEmitter.send,
				chunk: (build: () => JsonValue) =>
					sender.send({ type: 'chunk', executionId, payload: build() }),
			};
		default:
			return noopResponseEmitter;
	}
}
