import { EntityMetadata } from '../metadata/EntityMetadata';
import { TypeORMError } from './TypeORMError';

export class MissingDeleteDateColumnError extends TypeORMError {
	constructor(entityMetadata: EntityMetadata) {
		super(`Entity "${entityMetadata.name}" does not have delete date columns.`);
	}
}
