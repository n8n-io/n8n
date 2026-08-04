/** Row actions on the service accounts table. */
export const SERVICE_ACCOUNT_ACTIONS = {
	/**
	 * Kept as `impersonate` internally and in telemetry; the UI label is
	 * "Act as this account" — "impersonate" reads as an attack.
	 */
	IMPERSONATE: 'impersonate',
	DISABLE: 'disable',
	ENABLE: 'enable',
	DELETE: 'delete',
	CREDENTIALS: 'credentials',
} as const;

export const CREATE_SERVICE_ACCOUNT_MODAL_KEY = 'createServiceAccount';

export const DEFAULT_SERVICE_ACCOUNT_ROLE = 'global:member';

/** Matches the `varchar(32)` the name is stored in (`user.firstName`). */
export const SERVICE_ACCOUNT_NAME_MAX_LENGTH = 32;
