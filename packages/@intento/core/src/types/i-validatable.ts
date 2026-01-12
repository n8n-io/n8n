/**
 * Interface for objects that support validation with error throwing.
 *
 * Enables fail-fast validation pattern where invalid state is detected
 * early and reported with descriptive errors. Implementations should
 * validate all invariants and throw descriptive errors on violations.
 */
export interface IValidatable {
	/**
	 * Validates object state and throws if invalid.
	 *
	 * Should check all invariants and constraints, throwing descriptive
	 * errors that explain what is invalid and why.
	 *
	 * @throws Error if object state violates any validation rules
	 */
	throwIfInvalid(): void;
}
