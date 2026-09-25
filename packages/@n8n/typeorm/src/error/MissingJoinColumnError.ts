import { EntityMetadata } from '../metadata/EntityMetadata';
import { RelationMetadata } from '../metadata/RelationMetadata';
import { TypeORMError } from './TypeORMError';

export class MissingJoinColumnError extends TypeORMError {
	constructor(entityMetadata: EntityMetadata, relation: RelationMetadata) {
		super();

		if (relation.inverseRelation) {
			this.message =
				`JoinColumn is missing on both sides of ${entityMetadata.name}#${relation.propertyName} and ` +
				`${relation.inverseEntityMetadata.name}#${relation.inverseRelation.propertyName} one-to-one relationship. ` +
				`You need to put JoinColumn decorator on one of the sides.`;
		} else {
			this.message =
				`JoinColumn is missing on ${entityMetadata.name}#${relation.propertyName} one-to-one relationship. ` +
				`You need to put JoinColumn decorator on it.`;
		}
	}
}
