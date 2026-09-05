import { ResponseError } from './abstract/response.error';

/**
 * A community package requires a node-authoring API version this runtime does
 * not support, or declares a malformed one.
 */
export class IncompatibleNodesApiVersionError extends ResponseError {
	constructor(
		message: string,
		readonly meta: {
			/** API version the package requires, or `null` if the declared value is malformed. */
			requiredNodesApiVersion: number | null;
			/** Node API version this runtime supports. */
			supportedNodesApiVersion: number;
		},
		cause?: unknown,
	) {
		super(message, 400, undefined, undefined, cause);
		this.name = 'IncompatibleNodesApiVersionError';
	}
}
