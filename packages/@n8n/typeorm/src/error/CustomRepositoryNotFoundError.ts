import { TypeORMError } from './TypeORMError';

/**
 * Thrown if custom repository was not found.
 */
export class CustomRepositoryNotFoundError extends TypeORMError {
	constructor(repository: any) {
		super(
			`Custom repository ${
				typeof repository === 'function' ? repository.name : repository.constructor.name
			} was not found. ` + `Did you forgot to put @EntityRepository decorator on it?`,
		);
	}
}
