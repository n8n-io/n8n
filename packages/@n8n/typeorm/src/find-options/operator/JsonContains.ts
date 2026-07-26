import { FindOperator } from '../FindOperator';

/**
 * FindOptions Operator.
 * Example: { someField: JsonContains({...}) }
 */
export function JsonContains<T extends Record<string | number | symbol, unknown>>(
	value: T | FindOperator<T>,
): FindOperator<any> {
	return new FindOperator('jsonContains', value as any);
}
