import { ResponseError } from './abstract/response.error';

/**
 * A community package requires a node-authoring API version this runtime does
 * not support, or declares a malformed one.
 */
export class IncompatibleNodesApiVersionError extends ResponseError {
	constructor(
		message: string,
		readonly meta: {
			/**
			 * API version the package requires, as declared (`"3"` or `"3.1"`), or
			 * `null` if the declared value is malformed.
			 */
			requiredNodesApiVersion: string | null;
			/** Node API version this runtime supports, as `"<major>"` or `"<major>.<minor>"`. */
			supportedNodesApiVersion: string;
		},
		cause?: unknown,
	) {
		super(message, 400, undefined, undefined, cause);
		this.name = 'IncompatibleNodesApiVersionError';
	}
}
