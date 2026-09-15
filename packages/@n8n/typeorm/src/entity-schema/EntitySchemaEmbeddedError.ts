import { TypeORMError } from '../error';

export class EntitySchemaEmbeddedError extends TypeORMError {
	static createEntitySchemaIsRequiredException(field: string): EntitySchemaEmbeddedError {
		return new EntitySchemaEmbeddedError(`EntitySchema is required for ${field} embedded field`);
	}

	static createTargetIsRequired(field: string): EntitySchemaEmbeddedError {
		return new EntitySchemaEmbeddedError(
			`Target field is required for ${field} embedded EntitySchema`,
		);
	}

	constructor(message: string) {
		super(message);
	}
}
