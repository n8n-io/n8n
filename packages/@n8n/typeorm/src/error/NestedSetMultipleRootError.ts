import { TypeORMError } from './TypeORMError';

export class NestedSetMultipleRootError extends TypeORMError {
	constructor() {
		super(`Nested sets do not support multiple root entities.`);
	}
}
