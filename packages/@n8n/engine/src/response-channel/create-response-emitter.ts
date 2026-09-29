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
 * Only a caller that expects a step response gets one. For any other
 * expectation the emitter drops the response before the step builds it.
 */
export function createResponseEmitter(
	sender: ExecutionResponseSender,
	execution: { id: string; responseExpectation: ResponseExpectation },
): ResponseEmitter {
	if (execution.responseExpectation.kind !== 'stepResponse') return noopResponseEmitter;

	return {
		send: (build: () => JsonValue) =>
			sender.send({ type: 'response', executionId: execution.id, payload: build() }),
	};
}
