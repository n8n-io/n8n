import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

/**
 * An SSO login denied because role mapping resolved to "Block access".
 *
 * Kept distinct from a generic authentication failure so the SSO callbacks can
 * send the user somewhere that explains they have no access, instead of
 * surfacing it as something that went wrong.
 */
export class SsoAccessDeniedError extends ForbiddenError {
	constructor() {
		super('Access denied by SSO role mapping configuration');
	}
}
