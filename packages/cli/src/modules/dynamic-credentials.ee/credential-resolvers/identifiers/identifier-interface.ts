import type { ICredentialContext } from 'n8n-workflow';

export class IdentifierValidationError extends Error {}

export interface ITokenIdentifier {
	/**
	 * This validates and resolves a unique identifier for the entity in the given context
	 *
	 * @param context - The credential context containing execution and environment details
	 * @param identifierOptions - Options specific to the identifier implementation
	 * @returns The unique identifier for the entity in the given context
	 *
	 * @throws {IdentifierValidationError} When validation fails
	 */
	resolve(context: ICredentialContext, identifierOptions: Record<string, unknown>): Promise<string>;

	/**
	 * Test is given identifier options are valid
	 *
	 * @param identifierOptions - Options specific to the identifier implementation
	 */
	validateOptions(identifierOptions: Record<string, unknown>): Promise<void>;
}
