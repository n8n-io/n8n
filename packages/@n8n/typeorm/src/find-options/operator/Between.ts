import { FindOperator } from '../FindOperator';

/**
 * Find Options Operator.
 * Example: { someField: Between(x, y) }
 */
export function Between<T>(from: T | FindOperator<T>, to: T | FindOperator<T>): FindOperator<T> {
	return new FindOperator('between', [from, to] as any, true, true);
}
