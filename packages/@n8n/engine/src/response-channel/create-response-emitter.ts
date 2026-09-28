import { createResultError, type Result } from '@n8n/utils/result';

import type { ExecutionResponseSender } from './execution-response-sender';
import type { ResponseEmitter, ResponseExpectation } from './execution-response.types';
import { ResponseNotExpectedError } from './response-not-expected.error';
import type { JsonValue } from '../common';

/**
 * Gives one step a response emitter that obeys the caller's expectation.
 *
 * Only a caller that expects a step response gets one. For any other
 * expectation the emitter rejects the response before the step builds it.
 */
export function createResponseEmitter(
	sender: ExecutionResponseSender,
	execution: { id: string; responseExpectation: ResponseExpectation },
): ResponseEmitter {
	const { kind } = execution.responseExpectation;

	if (kind !== 'stepResponse') {
		return {
			send: (): Result<void, Error> => createResultError(new ResponseNotExpectedError(kind)),
		};
	}

	return {
		send: (build: () => JsonValue) =>
			sender.send({ type: 'response', executionId: execution.id, payload: build() }),
	};
}
