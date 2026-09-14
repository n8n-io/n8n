import { getMetadataArgsStorage } from '../../globals';
import { ColumnMetadataArgs } from '../../metadata-args/ColumnMetadataArgs';
import { ColumnOptions } from '../options/ColumnOptions';

/**
 * Special type of column that is available only for MongoDB database.
 * Marks your entity's column to be an object id.
 */
export function ObjectIdColumn(options?: ColumnOptions): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		// if column options are not given then create a new empty options
		if (!options) options = {} as ColumnOptions;
		options.primary = true;
		if (!options.name) options.name = '_id';

		// create and register a new column metadata
		getMetadataArgsStorage().columns.push({
			target: object.constructor,
			propertyName: propertyName,
			mode: 'objectId',
			options: options,
		} as ColumnMetadataArgs);
	};
}
