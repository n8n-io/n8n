import { v7 as uuidv7 } from 'uuid';

/**
 * Generate a time-ordered (uuidv7) id. The timestamp prefix keeps inserts at
 * the right edge of the primary-key index rather than scattering them, which
 * matters for the engine's hot execution/step tables.
 */
export function generateId(): string {
	return uuidv7();
}
