import { getMetadataArgsStorage } from '../../globals';
import { ColumnMetadataArgs } from '../../metadata-args/ColumnMetadataArgs';
import { ColumnOptions } from '../options/ColumnOptions';

/**
 * This column will store an update date of the updated object.
 * This date is being updated each time you persist the object.
 */
export function UpdateDateColumn(options?: ColumnOptions): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		getMetadataArgsStorage().columns.push({
			target: object.constructor,
			propertyName: propertyName,
			mode: 'updateDate',
			options: options ? options : {},
		} as ColumnMetadataArgs);
	};
}
