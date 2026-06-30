import { getMetadataArgsStorage } from '../../globals';
import { RelationMetadataArgs } from '../../metadata-args/RelationMetadataArgs';
import { RelationOptions } from '../options/RelationOptions';

/**
 * Marks a entity property as a children of the tree.
 * "Tree children" will contain all children (bind) of this entity.
 */
export function TreeChildren(options?: {
	cascade?: boolean | ('insert' | 'update' | 'remove' | 'soft-remove' | 'recover')[];
}): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		if (!options) options = {} as RelationOptions;

		// now try to determine it its lazy relation
		const reflectedType =
			Reflect && (Reflect as any).getMetadata
				? Reflect.getMetadata('design:type', object, propertyName)
				: undefined;
		const isLazy =
			(reflectedType &&
				typeof reflectedType.name === 'string' &&
				reflectedType.name.toLowerCase() === 'promise') ||
			false;

		// add one-to-many relation for this
		getMetadataArgsStorage().relations.push({
			isTreeChildren: true,
			target: object.constructor,
			propertyName: propertyName,
			isLazy: isLazy,
			relationType: 'one-to-many',
			type: () => object.constructor,
			options: options,
		} as RelationMetadataArgs);
	};
}
