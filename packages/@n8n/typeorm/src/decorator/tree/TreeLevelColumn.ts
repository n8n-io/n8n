import { getMetadataArgsStorage } from '../../globals';
import { ColumnMetadataArgs } from '../../metadata-args/ColumnMetadataArgs';

/**
 * Creates a "level"/"length" column to the table that holds a closure table.
 */
export function TreeLevelColumn(): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		getMetadataArgsStorage().columns.push({
			target: object.constructor,
			propertyName: propertyName,
			mode: 'treeLevel',
			options: {},
		} as ColumnMetadataArgs);
	};
}
