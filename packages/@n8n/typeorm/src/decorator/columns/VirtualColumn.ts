import { ColumnType } from '../../driver/types/ColumnTypes';
import { ColumnTypeUndefinedError } from '../../error';
import { getMetadataArgsStorage } from '../../globals';
import { ColumnMetadataArgs } from '../../metadata-args/ColumnMetadataArgs';
import { VirtualColumnOptions } from '../options/VirtualColumnOptions';
/**
 * VirtualColumn decorator is used to mark a specific class property as a Virtual column.
 */
export function VirtualColumn(options: VirtualColumnOptions): PropertyDecorator;

/**
 * VirtualColumn decorator is used to mark a specific class property as a Virtual column.
 */
export function VirtualColumn(
	typeOrOptions: ColumnType,
	options: VirtualColumnOptions,
): PropertyDecorator;

/**
 * VirtualColumn decorator is used to mark a specific class property as a Virtual column.
 */
export function VirtualColumn(
	typeOrOptions?: ColumnType | VirtualColumnOptions,
	options?: VirtualColumnOptions,
): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		// normalize parameters
		let type: ColumnType | undefined;
		if (typeof typeOrOptions === 'string') {
			type = <ColumnType>typeOrOptions;
		} else {
			options = <VirtualColumnOptions>typeOrOptions;
			type = options.type;
		}

		if (!options?.query) {
			throw new Error('Column options must be defined for calculated columns.');
		}

		// if type is not given explicitly then try to guess it
		const reflectMetadataType =
			Reflect && (Reflect as any).getMetadata
				? (Reflect as any).getMetadata('design:type', object, propertyName)
				: undefined;
		if (!type && reflectMetadataType)
			// if type is not given explicitly then try to guess it
			type = reflectMetadataType;

		// check if there is no type in column options then set type from first function argument, or guessed one
		if (type) options.type = type;

		// specify HSTORE type if column is HSTORE
		if (options.type === 'hstore' && !options.hstoreType)
			options.hstoreType = reflectMetadataType === Object ? 'object' : 'string';

		// if we still don't have a type then we need to give error to user that type is required
		if (!options.type) throw new ColumnTypeUndefinedError(object, propertyName);

		getMetadataArgsStorage().columns.push({
			target: object.constructor,
			propertyName: propertyName,
			mode: 'virtual-property',
			options: options || {},
		} as ColumnMetadataArgs);
	};
}
