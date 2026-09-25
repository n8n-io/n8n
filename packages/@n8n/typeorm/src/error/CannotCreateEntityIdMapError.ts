import { EntityMetadata } from '../metadata/EntityMetadata';
import { ObjectLiteral } from '../common/ObjectLiteral';
import { TypeORMError } from './TypeORMError';

/**
 * Thrown when user tries to create entity id map from the mixed id value,
 * but id value is a single value when entity requires multiple values.
 */
export class CannotCreateEntityIdMapError extends TypeORMError {
	constructor(metadata: EntityMetadata, id: any) {
		super();

		const objectExample = metadata.primaryColumns.reduce((object, column, index) => {
			column.setEntityValue(object, index + 1);
			return object;
		}, {} as ObjectLiteral);
		this.message = `Cannot use given entity id "${id}" because "${
			metadata.targetName
		}" contains multiple primary columns, you must provide object in following form: ${JSON.stringify(
			objectExample,
		)} as an id.`;
	}
}
