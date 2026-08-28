import { getMetadataArgsStorage } from '../../globals';
import { RelationMetadataArgs } from '../../metadata-args/RelationMetadataArgs';
import { ObjectType } from '../../common/ObjectType';
import { RelationOptions } from '../options/RelationOptions';
import { ObjectUtils } from '../../util/ObjectUtils';

/**
 * One-to-one relation allows to create direct relation between two entities. Entity1 have only one Entity2.
 * Entity1 is an owner of the relationship, and storages Entity1 id on its own side.
 */
export function OneToOne<T>(
	typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
	options?: RelationOptions,
): PropertyDecorator;

/**
 * One-to-one relation allows to create direct relation between two entities. Entity1 have only one Entity2.
 * Entity1 is an owner of the relationship, and storages Entity1 id on its own side.
 */
export function OneToOne<T>(
	typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
	inverseSide?: string | ((object: T) => any),
	options?: RelationOptions,
): PropertyDecorator;

/**
 * One-to-one relation allows to create direct relation between two entities. Entity1 have only one Entity2.
 * Entity1 is an owner of the relationship, and storages Entity1 id on its own side.
 */
export function OneToOne<T>(
	typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
	inverseSideOrOptions?: string | ((object: T) => any) | RelationOptions,
	options?: RelationOptions,
): PropertyDecorator {
	// normalize parameters
	let inverseSideProperty: string | ((object: T) => any);
	if (ObjectUtils.isObject(inverseSideOrOptions)) {
		options = <RelationOptions>inverseSideOrOptions;
	} else {
		inverseSideProperty = inverseSideOrOptions as any;
	}

	return function (object: Object, propertyName: string) {
		if (!options) options = {} as RelationOptions;

		// now try to determine it its lazy relation
		let isLazy = options && options.lazy === true ? true : false;
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
			relationType: 'one-to-one',
			type: typeFunctionOrTarget,
			inverseSideProperty: inverseSideProperty,
			options: options,
		} as RelationMetadataArgs);
	};
}
