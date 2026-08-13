import { TypeORMError } from './TypeORMError';

export class QueryRunnerAlreadyReleasedError extends TypeORMError {
	constructor() {
		super(`Query runner already released. Cannot run queries anymore.`);
	}
}
