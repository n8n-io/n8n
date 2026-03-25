import * as jsep from 'jsep';
import { Expression, IPlugin } from 'jsep';
export const name: string;
export const assignmentOperators: Set<string>;
export const updateOperators: number[];
export const assignmentPrecedence: number;
export function init(this: typeof jsep): void;

export interface UpdateExpression extends Expression {
	type: 'UpdateExpression';
	operator: '++' | '--';
	argument: Expression;
	prefix: boolean;
}

export interface AssignmentExpression extends Expression {
	type: 'AssignmentExpression';
	operator: '='
		| '*='
		| '**='
		| '/='
		| '%='
		| '+='
		| '-='
		| '<<='
		| '>>='
		| '>>>='
		| '&='
		| '^='
		| '|='
	  | '||='
	  | '&&='
	  | '??=';
	left: Expression;
	right: Expression;
}

declare const _export: IPlugin;
export default _export;
