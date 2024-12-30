import { Z } from 'zod-class';

import { booleanLiteral } from '../../schemas/booleanLiteral';

export class CredentialsGetOneRequestQuery extends Z.class({
	/**
	 * Adds the decrypted `data` field to each credential.
	 *
	 * It only does this for credentials for which the user has the
	 * `credential:update` scope.
	 */
	includeData: booleanLiteral.optional(),
}) {}
