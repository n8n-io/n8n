import { getMetadataArgsStorage } from '../../globals';
import { RelationMetadataArgs } from '../../metadata-args/RelationMetadataArgs';
import { ObjectType } from '../../common/ObjectType';
import { RelationOptions } from '../options/RelationOptions';
import { ObjectUtils } from '../../util/ObjectUtils';

/**
 * A many-to-one relation allows creating the type of relation where Entity1 can have a single instance of Entity2, but
 * Entity2 can have multiple instances of Entity1. Entity1 is the owner of the relationship, and stores the id of
 * Entity2 on its side of the relation.
 */
export function ManyToOne<T>(
	typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
	options?: RelationOptions,
): PropertyDecorator;

/**
 * A many-to-one relation allows creating the type of relation where Entity1 can have a single instance of Entity2, but
 * Entity2 can have multiple instances of Entity1. Entity1 is the owner of the relationship, and stores the id of
 * Entity2 on its side of the relation.
 */
export function ManyToOne<T>(
	typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
	inverseSide?: string | ((object: T) => any),
	options?: RelationOptions,
): PropertyDecorator;

/**
 * A many-to-one relation allows creating the type of relation where Entity1 can have a single instance of Entity2, but
 * Entity2 can have multiple instances of Entity1. Entity1 is the owner of the relationship, and stores the id of
 * Entity2 on its side of the relation.
 */
export function ManyToOne<T>(
	typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
	inverseSideOrOptions?: string | ((object: T) => any) | RelationOptions,
	options?: RelationOptions,
): PropertyDecorator {
	// Normalize parameters.
	let inverseSideProperty: string | ((object: T) => any);
	if (ObjectUtils.isObject(inverseSideOrOptions)) {
		options = <RelationOptions>inverseSideOrOptions;
	} else {
		inverseSideProperty = inverseSideOrOptions as any;
	}

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
			relationType: 'many-to-one',
			isLazy: isLazy,
			type: typeFunctionOrTarget,
			inverseSideProperty: inverseSideProperty,
			options: options,
		} as RelationMetadataArgs);
	};
}
