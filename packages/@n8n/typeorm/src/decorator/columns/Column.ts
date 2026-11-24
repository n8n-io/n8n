import { getMetadataArgsStorage } from '../../globals';
import {
	ColumnType,
	SimpleColumnType,
	SpatialColumnType,
	WithLengthColumnType,
	WithPrecisionColumnType,
	WithWidthColumnType,
} from '../../driver/types/ColumnTypes';
import { ColumnMetadataArgs } from '../../metadata-args/ColumnMetadataArgs';
import { ColumnCommonOptions } from '../options/ColumnCommonOptions';
import { SpatialColumnOptions } from '../options/SpatialColumnOptions';
import { ColumnWithLengthOptions } from '../options/ColumnWithLengthOptions';
import { ColumnNumericOptions } from '../options/ColumnNumericOptions';
import { ColumnEnumOptions } from '../options/ColumnEnumOptions';
import { ColumnEmbeddedOptions } from '../options/ColumnEmbeddedOptions';
import { EmbeddedMetadataArgs } from '../../metadata-args/EmbeddedMetadataArgs';
import { ColumnTypeUndefinedError } from '../../error/ColumnTypeUndefinedError';
import { ColumnHstoreOptions } from '../options/ColumnHstoreOptions';
import { ColumnWithWidthOptions } from '../options/ColumnWithWidthOptions';
import { GeneratedMetadataArgs } from '../../metadata-args/GeneratedMetadataArgs';
import { ColumnOptions } from '../options/ColumnOptions';

/**
 * Column decorator is used to mark a specific class property as a table column. Only properties decorated with this
 * decorator will be persisted to the database when entity be saved.
 */
export function Column(): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(options: ColumnOptions): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(type: SimpleColumnType, options?: ColumnCommonOptions): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(
	type: SpatialColumnType,
	options?: ColumnCommonOptions & SpatialColumnOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(
	type: WithLengthColumnType,
	options?: ColumnCommonOptions & ColumnWithLengthOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(
	type: WithWidthColumnType,
	options?: ColumnCommonOptions & ColumnWithWidthOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(
	type: WithPrecisionColumnType,
	options?: ColumnCommonOptions & ColumnNumericOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(
	type: 'enum',
	options?: ColumnCommonOptions & ColumnEnumOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(
	type: 'simple-enum',
	options?: ColumnCommonOptions & ColumnEnumOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(
	type: 'set',
	options?: ColumnCommonOptions & ColumnEnumOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(
	type: 'hstore',
	options?: ColumnCommonOptions & ColumnHstoreOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 *
 * Property in entity can be marked as Embedded, and on persist all columns from the embedded are mapped to the
 * single table of the entity where Embedded is used. And on hydration all columns which supposed to be in the
 * embedded will be mapped to it from the single table.
 */
export function Column(
	type: (type?: any) => Function,
	options?: ColumnEmbeddedOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
export function Column(
	typeOrOptions?: ((type?: any) => Function) | ColumnType | (ColumnOptions & ColumnEmbeddedOptions),
	options?: ColumnOptions & ColumnEmbeddedOptions,
): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		// normalize parameters
		let type: ColumnType | undefined;
		if (typeof typeOrOptions === 'string' || typeof typeOrOptions === 'function') {
			type = <ColumnType>typeOrOptions;
		} else if (typeOrOptions) {
			options = <ColumnOptions>typeOrOptions;
			type = typeOrOptions.type;
		}
		if (!options) options = {} as ColumnOptions;

		// if type is not given explicitly then try to guess it
		const reflectMetadataType =
			Reflect && (Reflect as any).getMetadata
				? (Reflect as any).getMetadata('design:type', object, propertyName)
				: undefined;
		if (!type && reflectMetadataType)
			// if type is not given explicitly then try to guess it
			type = reflectMetadataType;

		// check if there is no type in column options then set type from first function argument, or guessed one
		if (!options.type && type) options.type = type;

		// specify HSTORE type if column is HSTORE
		if (options.type === 'hstore' && !options.hstoreType)
			options.hstoreType = reflectMetadataType === Object ? 'object' : 'string';

		if (typeof typeOrOptions === 'function') {
			// register an embedded
			getMetadataArgsStorage().embeddeds.push({
				target: object.constructor,
				propertyName: propertyName,
				isArray: reflectMetadataType === Array || options.array === true,
				prefix: options.prefix !== undefined ? options.prefix : undefined,
				type: typeOrOptions as (type?: any) => Function,
			} as EmbeddedMetadataArgs);
		} else {
			// register a regular column

			// if we still don't have a type then we need to give error to user that type is required
			if (!options.type) throw new ColumnTypeUndefinedError(object, propertyName);

			// create unique
			if (options.unique === true)
				getMetadataArgsStorage().uniques.push({
					target: object.constructor,
					columns: [propertyName],
				});

			getMetadataArgsStorage().columns.push({
				target: object.constructor,
				propertyName: propertyName,
				mode: 'regular',
				options: options,
			} as ColumnMetadataArgs);

			if (options.generated) {
				getMetadataArgsStorage().generations.push({
					target: object.constructor,
					propertyName: propertyName,
					strategy: typeof options.generated === 'string' ? options.generated : 'increment',
				} as GeneratedMetadataArgs);
			}
		}
	};
}
