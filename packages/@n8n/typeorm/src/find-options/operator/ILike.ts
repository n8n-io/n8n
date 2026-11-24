import { FindOperator } from '../FindOperator';

/**
 * Find Options Operator.
 * Example: { someField: ILike("%SOME string%") }
 */
export function ILike<T>(value: T | FindOperator<T>) {
	return new FindOperator('ilike', value);
}
