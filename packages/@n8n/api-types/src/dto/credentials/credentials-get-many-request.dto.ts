import { Z } from 'zod-class';

import { booleanLiteral } from 'dto/common';

export class CredentialsGetManyRequestQuery extends Z.class({
	/**
	 * Adds the `scopes` field to each credential which includes all scopes the
	 * requesting user has in relation to the credential, e.g.
	 *     ['credential:read', 'credential:update']
	 */
	includeScopes: booleanLiteral.optional(),

	/**
	 * Adds the decrypted `data` field to each credential.
	 *
	 * It only does this for credentials for which the user has the
	 * `credential:update` scope.
	 *
	 * This switches `includeScopes` to true to be able to check for the scopes
	 */
	includeData: booleanLiteral.optional(),
}) {}
