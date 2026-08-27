import { getMetadataArgsStorage } from '../../globals';
import { ColumnMetadataArgs } from '../../metadata-args/ColumnMetadataArgs';
import { ViewColumnOptions } from '../options/ViewColumnOptions';

/**
 * ViewColumn decorator is used to mark a specific class property as a view column.
 */
export function ViewColumn(options?: ViewColumnOptions): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		getMetadataArgsStorage().columns.push({
			target: object.constructor,
			propertyName: propertyName,
			mode: 'regular',
			options: options || {},
		} as ColumnMetadataArgs);
	};
}
