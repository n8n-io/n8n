import type { Token } from "./lexer";

/**
 * Statements do not result in a value at runtime. They contain one or more expressions internally.
 */
export class Statement {
	type = "Statement";
}

/**
 * Defines a block which contains many statements. Each chat template corresponds to one Program.
 */
export class Program extends Statement {
	override type = "Program";

	constructor(public body: Statement[]) {
		super();
	}
}

export class If extends Statement {
	override type = "If";

	constructor(
		public test: Expression,
		public body: Statement[],
		public alternate: Statement[]
	) {
		super();
	}
}

/**
 * Loop over each item in a sequence
 * https://jinja.palletsprojects.com/en/3.0.x/templates/#for
 */
export class For extends Statement {
	override type = "For";

	constructor(
		public loopvar: Identifier | TupleLiteral,
		public iterable: Expression,
		public body: Statement[],
		public defaultBlock: Statement[] // if no iteration took place
	) {
		super();
	}
}

export class Break extends Statement {
	override type = "Break";
}
export class Continue extends Statement {
	override type = "Continue";
}

export class SetStatement extends Statement {
	override type = "Set";
	constructor(
		public assignee: Expression,
		public value: Expression | null,
		public body: Statement[]
	) {
		super();
	}
}

export class Macro extends Statement {
	override type = "Macro";

	constructor(
		public name: Identifier,
		public args: Expression[],
		public body: Statement[]
	) {
		super();
	}
}

export class Comment extends Statement {
	override type = "Comment";
	constructor(public value: string) {
		super();
	}
}

/**
 * Expressions will result in a value at runtime (unlike statements).
 */
export class Expression extends Statement {
	override type = "Expression";
}

export class MemberExpression extends Expression {
	override type = "MemberExpression";

	constructor(
		public object: Expression,
		public property: Expression,
		public computed: boolean
	) {
		super();
	}
}

export class CallExpression extends Expression {
	override type = "CallExpression";

	constructor(
		public callee: Expression,
		public args: Expression[]
	) {
		super();
	}
}

/**
 * Represents a user-defined variable or symbol in the template.
 */
export class Identifier extends Expression {
	override type = "Identifier";

	/**
	 * @param {string} value The name of the identifier
	 */
	constructor(public value: string) {
		super();
	}
}

/**
 * Abstract base class for all Literal expressions.
 * Should not be instantiated directly.
 */
abstract class Literal<T> extends Expression {
	override type = "Literal";

	constructor(public value: T) {
		super();
	}
}

export class IntegerLiteral extends Literal<number> {
	override type = "IntegerLiteral";
}

export class FloatLiteral extends Literal<number> {
	override type = "FloatLiteral";
}

/**
 * Represents a text constant in the template.
 */
export class StringLiteral extends Literal<string> {
	override type = "StringLiteral";
}

/**
 * Represents an array literal in the template.
 */
export class ArrayLiteral extends Literal<Expression[]> {
	override type = "ArrayLiteral";
}

/**
 * Represents a tuple literal in the template.
 */
export class TupleLiteral extends Literal<Expression[]> {
	override type = "TupleLiteral";
}

/**
 * Represents an object literal in the template.
 */
export class ObjectLiteral extends Literal<Map<Expression, Expression>> {
	override type = "ObjectLiteral";
}

/**
 * An operation with two sides, separated by an operator.
 * Note: Either side can be a Complex Expression, with order
 * of operations being determined by the operator.
 */
export class BinaryExpression extends Expression {
	override type = "BinaryExpression";

	constructor(
		public operator: Token,
		public left: Expression,
		public right: Expression
	) {
		super();
	}
}

/**
 * An operation with two sides, separated by the | operator.
 * Operator precedence: https://github.com/pallets/jinja/issues/379#issuecomment-168076202
 */
export class FilterExpression extends Expression {
	override type = "FilterExpression";

	constructor(
		public operand: Expression,
		public filter: Identifier | CallExpression
	) {
		super();
	}
}

export class FilterStatement extends Statement {
	override type = "FilterStatement";

	constructor(
		public filter: Identifier | CallExpression,
		public body: Statement[]
	) {
		super();
	}
}

/**
 * An operation which filters a sequence of objects by applying a test to each object,
 * and only selecting the objects with the test succeeding.
 *
 * It may also be used as a shortcut for a ternary operator.
 */
export class SelectExpression extends Expression {
	override type = "SelectExpression";

	constructor(
		public lhs: Expression,
		public test: Expression
	) {
		super();
	}
}

/**
 * An operation with two sides, separated by the "is" operator.
 */
export class TestExpression extends Expression {
	override type = "TestExpression";

	constructor(
		public operand: Expression,
		public negate: boolean,
		public test: Identifier // TODO: Add support for non-identifier tests
	) {
		super();
	}
}

/**
 * An operation with one side (operator on the left).
 */
export class UnaryExpression extends Expression {
	override type = "UnaryExpression";

	constructor(
		public operator: Token,
		public argument: Expression
	) {
		super();
	}
}

export class SliceExpression extends Expression {
	override type = "SliceExpression";

	constructor(
		public start: Expression | undefined = undefined,
		public stop: Expression | undefined = undefined,
		public step: Expression | undefined = undefined
	) {
		super();
	}
}

export class KeywordArgumentExpression extends Expression {
	override type = "KeywordArgumentExpression";

	constructor(
		public key: Identifier,
		public value: Expression
	) {
		super();
	}
}

export class SpreadExpression extends Expression {
	override type = "SpreadExpression";

	constructor(public argument: Expression) {
		super();
	}
}

export class CallStatement extends Statement {
	override type = "CallStatement";

	constructor(
		public call: CallExpression,
		public callerArgs: Expression[] | null,
		public body: Statement[]
	) {
		super();
	}
}

export class Ternary extends Expression {
	override type = "Ternary";
	constructor(
		public condition: Expression,
		public trueExpr: Expression,
		public falseExpr: Expression
	) {
		super();
	}
}
