import { TypeORMError } from './TypeORMError';

/**
 * Thrown when circular relations detected with nullable set to false.
 */
export class CircularRelationsError extends TypeORMError {
	constructor(path: string) {
		super(
			`Circular relations detected: ${path}. To resolve this issue you need to ` +
				`set nullable: true somewhere in this dependency structure.`,
		);
	}
}
