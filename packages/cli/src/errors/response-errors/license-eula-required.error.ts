import { ResponseError } from './abstract/response.error';

/**
 * Error thrown when license activation requires EULA acceptance.
 *
 * This error is returned when the license server requires explicit EULA acceptance
 * before activating a license. The error includes metadata containing the EULA URL
 * that the user must accept.
 *
 * @example
 * ```typescript
 * throw new LicenseEulaRequiredError('License activation requires EULA acceptance', {
 *   eulaUrl: 'https://n8n.io/legal/eula/'
 * });
 * ```
 */
export class LicenseEulaRequiredError extends ResponseError {
	constructor(
		message: string,
		readonly meta: { eulaUrl: string },
	) {
		super(message, 400);
		this.name = 'LicenseEulaRequiredError';
	}
}
