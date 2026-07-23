import { WhereExpressionBuilder } from './WhereExpressionBuilder';

/**
 * Syntax sugar.
 * Allows to use brackets in WHERE expressions for better syntax.
 */
export class Brackets {
	readonly '@instanceof' = Symbol.for('Brackets');

	/**
	 * WHERE expression that will be taken into brackets.
	 */
	whereFactory: (qb: WhereExpressionBuilder) => any;

	/**
	 * Given WHERE query builder that will build a WHERE expression that will be taken into brackets.
	 */
	constructor(whereFactory: (qb: WhereExpressionBuilder) => any) {
		this.whereFactory = whereFactory;
	}
}
