import { getMetadataArgsStorage } from '../../globals';
import { JoinTableMetadataArgs } from '../../metadata-args/JoinTableMetadataArgs';
import { JoinTableMultipleColumnsOptions } from '../options/JoinTableMultipleColumnsOptions';
import { JoinTableOptions } from '../options/JoinTableOptions';

/**
 * JoinTable decorator is used in many-to-many relationship to specify owner side of relationship.
 * Its also used to set a custom junction table's name, column names and referenced columns.
 */
export function JoinTable(): PropertyDecorator;

/**
 * JoinTable decorator is used in many-to-many relationship to specify owner side of relationship.
 * Its also used to set a custom junction table's name, column names and referenced columns.
 */
export function JoinTable(options: JoinTableOptions): PropertyDecorator;

/**
 * JoinTable decorator is used in many-to-many relationship to specify owner side of relationship.
 * Its also used to set a custom junction table's name, column names and referenced columns.
 */
export function JoinTable(options: JoinTableMultipleColumnsOptions): PropertyDecorator;

/**
 * JoinTable decorator is used in many-to-many relationship to specify owner side of relationship.
 * Its also used to set a custom junction table's name, column names and referenced columns.
 */
export function JoinTable(
	options?: JoinTableOptions | JoinTableMultipleColumnsOptions,
): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		options = options || ({} as JoinTableOptions | JoinTableMultipleColumnsOptions);
		getMetadataArgsStorage().joinTables.push({
			target: object.constructor,
			propertyName: propertyName,
			name: options.name,
			joinColumns: (options && (options as JoinTableOptions).joinColumn
				? [(options as JoinTableOptions).joinColumn!]
				: (options as JoinTableMultipleColumnsOptions).joinColumns) as any,
			inverseJoinColumns: (options && (options as JoinTableOptions).inverseJoinColumn
				? [(options as JoinTableOptions).inverseJoinColumn!]
				: (options as JoinTableMultipleColumnsOptions).inverseJoinColumns) as any,
			schema: options && options.schema ? options.schema : undefined,
			database: options && options.database ? options.database : undefined,
			synchronize: !(options && options.synchronize === false),
		} as JoinTableMetadataArgs);
	};
}
