import { getMetadataArgsStorage } from '../../globals';
import { TableMetadataArgs } from '../../metadata-args/TableMetadataArgs';
import { ViewEntityOptions } from '../options/ViewEntityOptions';
import { ObjectUtils } from '../../util/ObjectUtils';

/**
 * This decorator is used to mark classes that will be an entity view.
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
export function ViewEntity(options?: ViewEntityOptions): ClassDecorator;

/**
 * This decorator is used to mark classes that will be an entity view.
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
export function ViewEntity(name?: string, options?: ViewEntityOptions): ClassDecorator;

/**
 * This decorator is used to mark classes that will be an entity view.
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
export function ViewEntity(
	nameOrOptions?: string | ViewEntityOptions,
	maybeOptions?: ViewEntityOptions,
): ClassDecorator {
	const options =
		(ObjectUtils.isObject(nameOrOptions) ? (nameOrOptions as ViewEntityOptions) : maybeOptions) ||
		{};
	const name = typeof nameOrOptions === 'string' ? nameOrOptions : options.name;

	return function (target: Function) {
		getMetadataArgsStorage().tables.push({
			target: target,
			name: name,
			expression: options.expression,
			dependsOn: options.dependsOn ? new Set(options.dependsOn) : undefined,
			type: 'view',
			database: options.database ? options.database : undefined,
			schema: options.schema ? options.schema : undefined,
			synchronize: options.synchronize === false ? false : true,
			materialized: !!options.materialized,
		} as TableMetadataArgs);
	};
}
