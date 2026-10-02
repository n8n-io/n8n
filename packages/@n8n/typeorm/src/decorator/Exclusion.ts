import { getMetadataArgsStorage } from '../globals';
import { ExclusionMetadataArgs } from '../metadata-args/ExclusionMetadataArgs';
import { TypeORMError } from '../error';

/**
 * Creates a database exclusion.
 * Can be used on entity.
 * Can create exclusions with composite columns when used on entity.
 */
export function Exclusion(expression: string): ClassDecorator & PropertyDecorator;

/**
 * Creates a database exclusion.
 * Can be used on entity.
 * Can create exclusions with composite columns when used on entity.
 */
export function Exclusion(name: string, expression: string): ClassDecorator & PropertyDecorator;

/**
 * Creates a database exclusion.
 * Can be used on entity.
 * Can create exclusions with composite columns when used on entity.
 */
export function Exclusion(
	nameOrExpression: string,
	maybeExpression?: string,
): ClassDecorator & PropertyDecorator {
	const name = maybeExpression ? nameOrExpression : undefined;
	const expression = maybeExpression ? maybeExpression : nameOrExpression;

	if (!expression) throw new TypeORMError(`Exclusion expression is required`);

	return function (clsOrObject: Function | Object, propertyName?: string | symbol) {
		getMetadataArgsStorage().exclusions.push({
			target: propertyName ? clsOrObject.constructor : (clsOrObject as Function),
			name: name,
			expression: expression,
		} as ExclusionMetadataArgs);
	};
}
