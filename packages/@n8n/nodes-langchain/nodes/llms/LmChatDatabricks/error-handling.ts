import { OperationalError } from 'n8n-workflow';

import { findSessionExpiredError } from '../../../utils/oauth2-token-provider';
import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';

function isExpiredTokenResponse(error: unknown, expiredStatus: number): boolean {
	if (typeof error !== 'object' || error === null) return false;
	if (!('status' in error) || error.status !== expiredStatus) return false;
	// A 403 also covers "no permission on this endpoint", which reconnecting won't fix
	return (
		'message' in error && typeof error.message === 'string' && /invalid token/i.test(error.message)
	);
}

/**
 * A dead session arrives either as a rejected response or as a wrapped throw.
 * `expiredStatus` is undefined for grants that cannot be reconnected, such as a
 * service principal — those keep the generic "check your credentials" advice.
 */
export function makeDatabricksFailedAttemptHandler(expiredStatus?: number) {
	return (error: unknown) => {
		const sessionExpired = findSessionExpiredError(error);
		if (sessionExpired) throw sessionExpired;

		if (expiredStatus !== undefined && isExpiredTokenResponse(error, expiredStatus)) {
			throw new OperationalError(
				'Databricks rejected the access token and it could not be refreshed. The sign-in session has likely expired - open the credential and select Connect to sign in again.',
				{ cause: error },
			);
		}

		openAiFailedAttemptHandler(error);
	};
}
