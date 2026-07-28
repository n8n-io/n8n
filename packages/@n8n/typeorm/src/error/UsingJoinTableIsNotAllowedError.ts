import { EntityMetadata } from '../metadata/EntityMetadata';
import { RelationMetadata } from '../metadata/RelationMetadata';
import { TypeORMError } from './TypeORMError';

export class UsingJoinTableIsNotAllowedError extends TypeORMError {
	constructor(entityMetadata: EntityMetadata, relation: RelationMetadata) {
		super(
			`Using JoinTable on ${entityMetadata.name}#${relation.propertyName} is wrong. ` +
				`${entityMetadata.name}#${relation.propertyName} has ${relation.relationType} relation, ` +
				`however you can use JoinTable only on many-to-many relations.`,
		);
	}
}
