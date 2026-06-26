import { FindOperator } from '../FindOperator';

/**
 * Find Options Operator.
 * Example: { someField: Any([...]) }
 */
export function Any<T>(value: readonly T[] | FindOperator<T>): FindOperator<T> {
	return new FindOperator('any', value as any);
}
