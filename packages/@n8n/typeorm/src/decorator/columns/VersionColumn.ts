import { getMetadataArgsStorage } from '../../globals';
import { ColumnMetadataArgs } from '../../metadata-args/ColumnMetadataArgs';
import { ColumnOptions } from '../options/ColumnOptions';

/**
 * This column will store a number - version of the entity.
 * Every time your entity will be persisted, this number will be increased by one -
 * so you can organize visioning and update strategies of your entity.
 */
export function VersionColumn(options?: ColumnOptions): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		getMetadataArgsStorage().columns.push({
			target: object.constructor,
			propertyName: propertyName,
			mode: 'version',
			options: options || {},
		} as ColumnMetadataArgs);
	};
}
