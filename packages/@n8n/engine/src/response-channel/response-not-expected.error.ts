import type { ResponseExpectationKind } from './execution-response.types';

/** A step tried to respond, but the caller does not expect a step response. */
export class ResponseNotExpectedError extends Error {
	constructor(readonly kind: Exclude<ResponseExpectationKind, 'stepResponse'>) {
		super(`The caller does not expect a step response (expectation: '${kind}')`);
		this.name = 'ResponseNotExpectedError';
	}
}
