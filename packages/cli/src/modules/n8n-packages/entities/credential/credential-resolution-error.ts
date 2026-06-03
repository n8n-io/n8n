import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import type { CredentialResolution } from './credential.types';

/** Maps unresolved credential references to the 422 returned by the package import API. */
export function toCredentialResolutionFailedError(
	failures: CredentialResolution['failures'],
): UnprocessableRequestError {
	const count = failures.length;
	const message =
		count === 1
			? '1 credential reference could not be resolved.'
			: `${count} credential references could not be resolved.`;

	const error = new UnprocessableRequestError(message);
	Object.assign(error, { meta: { failures } });

	return error;
}
