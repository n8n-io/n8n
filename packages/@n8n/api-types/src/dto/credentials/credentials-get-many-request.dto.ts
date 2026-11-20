import z from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';

export class CredentialsGetManyRequestQuery extends Z.class({
	/**
	 * Adds the `scopes` field to each credential which includes all scopes the
	 * requesting user has in relation to the credential, e.g.
	 *     ['credential:read', 'credential:update']
	 */
	includeScopes: booleanFromString.optional(),

	/**
	 * Adds the decrypted `data` field to each credential.
	 *
	 * It only does this for credentials for which the user has the
	 * `credential:update` scope.
	 *
	 * This switches `includeScopes` to true to be able to check for the scopes
	 */
	includeData: booleanFromString.optional(),

	onlySharedWithMe: booleanFromString.optional(),

	/**
	 * Includes global credentials (credentials available to all users).
	 * Defaults to false.
	 */
	includeGlobal: booleanFromString.optional().default('false'),

	/**
	 * Filters credentials to only include those that are using a specific external secrets provider.
	 * The value should be the `providerKey` of the external secrets store.
	 */
	externalSecretsStore: z.string().optional(),

	/**
	 * Adds the `restriction` field to each credential that a type availability policy makes
	 * unusable. A list filtered by `projectId` is judged by that project, other lists by each
	 * credential's home project. A custom `select` ignores this option.
	 */
	includeRestrictions: booleanFromString.optional(),
}) {}
