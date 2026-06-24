import { FindOperator } from '../FindOperator';

/**
 * Find Options Operator.
 * Used to negate expression.
 * Example: { title: not("hello") } will return entities where title not equal to "hello".
 */
export function Not<T>(value: T | FindOperator<T>) {
	return new FindOperator('not', value);
}
