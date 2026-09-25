import { getMetadataArgsStorage } from '../../globals';
import { RelationMetadataArgs } from '../../metadata-args/RelationMetadataArgs';
import { ObjectType } from '../../common/ObjectType';
import { RelationOptions } from '../options/RelationOptions';

/**
 * A one-to-many relation allows creating the type of relation where Entity1 can have multiple instances of Entity2,
 * but Entity2 has only one Entity1. Entity2 is the owner of the relationship, and stores the id of Entity1 on its
 * side of the relation.
 */
export function OneToMany<T>(
	typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
	inverseSide: string | ((object: T) => any),
	options?: RelationOptions,
): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		if (!options) options = {} as RelationOptions;

		// Now try to determine if it is a lazy relation.
		let isLazy = options && options.lazy === true;
		if (!isLazy && Reflect && (Reflect as any).getMetadata) {
			// automatic determination
			const reflectedType = (Reflect as any).getMetadata('design:type', object, propertyName);
			if (
				reflectedType &&
				typeof reflectedType.name === 'string' &&
				reflectedType.name.toLowerCase() === 'promise'
			)
				isLazy = true;
		}

		getMetadataArgsStorage().relations.push({
			target: object.constructor,
			propertyName: propertyName,
			// propertyType: reflectedType,
			isLazy: isLazy,
			relationType: 'one-to-many',
			type: typeFunctionOrTarget,
			inverseSideProperty: inverseSide,
			options: options,
		} as RelationMetadataArgs);
	};
}
