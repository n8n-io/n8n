import { FindOperator } from '../FindOperator';

/**
 * FindOptions Operator.
 * Example: { someField: ArrayContains([...]) }
 */
export function ArrayContains<T>(value: readonly T[] | FindOperator<T>): FindOperator<any> {
	return new FindOperator('arrayContains', value as any);
}
