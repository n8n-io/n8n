type ObjectLiteral = { [key: string | symbol]: unknown };

/**
 * Checks if the provided value is a plain object literal (not null, not an array, not a class instance, and not a primitive).
 * This function serves as a type guard.
 *
 * @param candidate - The value to check
 * @returns {boolean} True if the value is an object literal, false otherwise
 */
export function isObjectLiteral(candidate: unknown): candidate is ObjectLiteral {
	return (
		typeof candidate === 'object' &&
		candidate !== null &&
		!Array.isArray(candidate) &&
		(Object.getPrototypeOf(candidate) as object)?.constructor?.name === 'Object'
	);
}
