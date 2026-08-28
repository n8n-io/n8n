import { Brackets } from './Brackets';

/**
 * Syntax sugar.
 * Allows to use negate brackets in WHERE expressions for better syntax.
 */
export class NotBrackets extends Brackets {
	readonly '@instanceof' = Symbol.for('NotBrackets');
}
