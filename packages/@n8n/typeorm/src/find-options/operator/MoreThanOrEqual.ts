import { FindOperator } from '../FindOperator';

/**
 * Find Options Operator.
 * Example: { someField: MoreThanOrEqual(10) }
 */
export function MoreThanOrEqual<T>(value: T | FindOperator<T>) {
	return new FindOperator('moreThanOrEqual', value);
}
