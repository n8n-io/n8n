import { FindOperator } from './FindOperator';

export class EqualOperator<T> extends FindOperator<T> {
	readonly '@instanceof' = Symbol.for('EqualOperator');

	constructor(value: T | FindOperator<T>) {
		super('equal', value);
	}
}
