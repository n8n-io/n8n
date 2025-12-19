import type { ICredentialContext } from 'n8n-workflow';

/**
 * Error thrown when token identifier validation or resolution fails
 */
export class IdentifierValidationError extends Error {}

/**
 * Interface for resolving unique identifiers from credential contexts
 */
export interface ITokenIdentifier {
	/**
	 * Resolves a unique identifier for the entity in the given context
	 *
	 * @param context - Credential context with execution details
	 * @param identifierOptions - Implementation-specific options
	 * @returns Unique identifier string
	 * @throws {IdentifierValidationError} When validation or resolution fails
	 */
	resolve(context: ICredentialContext, identifierOptions: Record<string, unknown>): Promise<string>;

	/**
	 * Validates identifier options before use
	 *
	 * @param identifierOptions - Implementation-specific options
	 * @throws {IdentifierValidationError} When options are invalid
	 */
	validateOptions(identifierOptions: Record<string, unknown>): Promise<void>;
}
