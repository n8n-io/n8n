import { getMetadataArgsStorage } from '../../globals';
import { PrimaryGeneratedColumnNumericOptions } from '../options/PrimaryGeneratedColumnNumericOptions';
import { PrimaryGeneratedColumnUUIDOptions } from '../options/PrimaryGeneratedColumnUUIDOptions';
import { GeneratedMetadataArgs } from '../../metadata-args/GeneratedMetadataArgs';
import { ColumnOptions } from '../options/ColumnOptions';
import { PrimaryGeneratedColumnIdentityOptions } from '../options/PrimaryGeneratedColumnIdentityOptions';
import { ObjectUtils } from '../../util/ObjectUtils';

/**
 * Column decorator is used to mark a specific class property as a table column.
 */
export function PrimaryGeneratedColumn(): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 */
export function PrimaryGeneratedColumn(
	options: PrimaryGeneratedColumnNumericOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 */
export function PrimaryGeneratedColumn(
	strategy: 'increment',
	options?: PrimaryGeneratedColumnNumericOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 */
export function PrimaryGeneratedColumn(
	strategy: 'uuid',
	options?: PrimaryGeneratedColumnUUIDOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 */
export function PrimaryGeneratedColumn(
	strategy: 'rowid',
	options?: PrimaryGeneratedColumnUUIDOptions,
): PropertyDecorator;

export function PrimaryGeneratedColumn(
	strategy: 'identity',
	options?: PrimaryGeneratedColumnIdentityOptions,
): PropertyDecorator;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 * This column creates an integer PRIMARY COLUMN with generated set to true.
 */
export function PrimaryGeneratedColumn(
	strategyOrOptions?:
		| 'increment'
		| 'uuid'
		| 'rowid'
		| 'identity'
		| PrimaryGeneratedColumnNumericOptions
		| PrimaryGeneratedColumnUUIDOptions
		| PrimaryGeneratedColumnIdentityOptions,
	maybeOptions?:
		| PrimaryGeneratedColumnNumericOptions
		| PrimaryGeneratedColumnUUIDOptions
		| PrimaryGeneratedColumnIdentityOptions,
): PropertyDecorator {
	// normalize parameters
	const options: ColumnOptions = {};
	let strategy: 'increment' | 'uuid' | 'rowid' | 'identity';
	if (strategyOrOptions) {
		if (typeof strategyOrOptions === 'string')
			strategy = strategyOrOptions as 'increment' | 'uuid' | 'rowid' | 'identity';

		if (ObjectUtils.isObject(strategyOrOptions)) {
			strategy = 'increment';
			Object.assign(options, strategyOrOptions);
		}
	} else {
		strategy = 'increment';
	}
	if (ObjectUtils.isObject(maybeOptions)) Object.assign(options, maybeOptions);

	return function (object: Object, propertyName: string) {
		// if column type is not explicitly set then determine it based on generation strategy
		if (!options.type) {
			if (strategy === 'increment' || strategy === 'identity') {
				options.type = Number;
			} else if (strategy === 'uuid') {
				options.type = 'uuid';
			} else if (strategy === 'rowid') {
				options.type = 'int';
			}
		}

		// explicitly set a primary and generated to column options
		options.primary = true;

		// register column metadata args
		getMetadataArgsStorage().columns.push({
			target: object.constructor,
			propertyName: propertyName,
			mode: 'regular',
			options: options,
		});

		// register generated metadata args
		getMetadataArgsStorage().generations.push({
			target: object.constructor,
			propertyName: propertyName,
			strategy: strategy,
		} as GeneratedMetadataArgs);
	};
}
