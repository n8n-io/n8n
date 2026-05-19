import { getMetadataArgsStorage } from '../globals';
import { CheckMetadataArgs } from '../metadata-args/CheckMetadataArgs';
import { TypeORMError } from '../error';

/**
 * Creates a database check.
 * Can be used on entity property or on entity.
 * Can create checks with composite columns when used on entity.
 */
export function Check(expression: string): ClassDecorator & PropertyDecorator;

/**
 * Creates a database check.
 * Can be used on entity property or on entity.
 * Can create checks with composite columns when used on entity.
 */
export function Check(name: string, expression: string): ClassDecorator & PropertyDecorator;

/**
 * Creates a database check.
 * Can be used on entity property or on entity.
 * Can create checks with composite columns when used on entity.
 */
export function Check(
	nameOrExpression: string,
	maybeExpression?: string,
): ClassDecorator & PropertyDecorator {
	const name = maybeExpression ? nameOrExpression : undefined;
	const expression = maybeExpression ? maybeExpression : nameOrExpression;

	if (!expression) throw new TypeORMError(`Check expression is required`);

	return function (clsOrObject: Function | Object, propertyName?: string | symbol) {
		getMetadataArgsStorage().checks.push({
			target: propertyName ? clsOrObject.constructor : (clsOrObject as Function),
			name: name,
			expression: expression,
		} as CheckMetadataArgs);
	};
}
