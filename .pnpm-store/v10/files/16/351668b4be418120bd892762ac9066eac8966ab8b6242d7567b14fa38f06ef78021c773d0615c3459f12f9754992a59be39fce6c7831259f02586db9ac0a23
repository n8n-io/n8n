declare module 'jsep' {

	namespace jsep {
		export type baseTypes = string | number | boolean | RegExp | null | undefined | object;
		export interface Expression {
			type: string;
			[key: string]: baseTypes | Expression | Array<baseTypes | Expression>;
		}

		export interface ArrayExpression extends Expression {
			type: 'ArrayExpression';
			/** The expression can be null in the case of array holes ([ , , ]) */
			elements: Array<null | Expression>;
		}

		export interface BinaryExpression extends Expression {
			type: 'BinaryExpression';
			operator: string;
			left: Expression;
			right: Expression;
		}

		export interface CallExpression extends Expression {
			type: 'CallExpression';
			arguments: Expression[];
			callee: Expression;
		}

		export interface Compound extends Expression {
			type: 'Compound';
			body: Expression[];
		}

		export interface SequenceExpression extends Expression {
			type: 'SequenceExpression';
			expressions: Expression[];
		}

		export interface ConditionalExpression extends Expression {
			type: 'ConditionalExpression';
			test: Expression;
			consequent: Expression;
			alternate: Expression;
		}

		export interface Identifier extends Expression {
			type: 'Identifier';
			name: string;
		}

		export interface Literal extends Expression {
			type: 'Literal';
			value: boolean | number | string | RegExp | null;
			raw: string;
		}

		export interface MemberExpression extends Expression {
			type: 'MemberExpression';
			computed: boolean;
			object: Expression;
			property: Expression;
			optional?: boolean;
		}

		export interface ThisExpression extends Expression {
			type: 'ThisExpression';
		}

		export interface UnaryExpression extends Expression {
			type: 'UnaryExpression';
			operator: string;
			argument: Expression;
			prefix: boolean;
		}

		export type ExpressionType =
			'Compound'
			| 'SequenceExpression'
			| 'Identifier'
			| 'MemberExpression'
			| 'Literal'
			| 'ThisExpression'
			| 'CallExpression'
			| 'UnaryExpression'
			| 'BinaryExpression'
			| 'ConditionalExpression'
			| 'ArrayExpression';

		export type CoreExpression =
			ArrayExpression
			| BinaryExpression
			| CallExpression
			| Compound
			| SequenceExpression
			| ConditionalExpression
			| Identifier
			| Literal
			| MemberExpression
			| ThisExpression
			| UnaryExpression;

		export type PossibleExpression = Expression | undefined;
		export interface HookScope {
			index: number;
			readonly expr: string;
			readonly char: string; // current character of the expression
			readonly code: number; // current character code of the expression
			gobbleSpaces: () => void;
			gobbleExpressions: (untilICode?: number) => Expression[];
			gobbleExpression: () => Expression;
			gobbleBinaryOp: () => PossibleExpression;
			gobbleBinaryExpression: () => PossibleExpression;
			gobbleToken: () => PossibleExpression;
			gobbleTokenProperty: (node: Expression) => Expression
			gobbleNumericLiteral: () => PossibleExpression;
			gobbleStringLiteral: () => PossibleExpression;
			gobbleIdentifier: () => PossibleExpression;
			gobbleArguments: (untilICode: number) => PossibleExpression;
			gobbleGroup: () => Expression;
			gobbleArray: () => PossibleExpression;
			throwError: (msg: string) => never;
		}

		export type HookType = 'gobble-expression' | 'after-expression' | 'gobble-token' | 'after-token' | 'gobble-spaces';
		export type HookCallback = (this: HookScope, env: { node?: Expression }) => void;
		type HookTypeObj = Partial<{ [key in HookType]: HookCallback}>

		export interface IHooks extends HookTypeObj {
			add(name: HookType, cb: HookCallback, first?: boolean): void;
			add(obj: { [name in HookType]: HookCallback }, first?: boolean): void;
			run(name: string, env: { context?: typeof jsep, node?: Expression }): void;
		}
		let hooks: IHooks;

		export interface IPlugin {
			name: string;
			init: (this: typeof jsep) => void;
		}
		export interface IPlugins {
			registered: { [name: string]: IPlugin };
			register: (...plugins: IPlugin[]) => void;
		}
		let plugins: IPlugins;

		let unary_ops: { [op: string]: any };
		let binary_ops: { [op: string]: number };
		let right_associative: Set<string>;
		let additional_identifier_chars: Set<string>;
		let literals: { [literal: string]: any };
		let this_str: string;

		function addBinaryOp(operatorName: string, precedence: number, rightToLeft?: boolean): void;

		function addUnaryOp(operatorName: string): void;

		function addLiteral(literalName: string, literalValue: any): void;

		function addIdentifierChar(identifierName: string): void;

		function removeBinaryOp(operatorName: string): void;

		function removeUnaryOp(operatorName: string): void;

		function removeLiteral(literalName: string): void;

		function removeIdentifierChar(identifierName: string): void;

		function removeAllBinaryOps(): void;

		function removeAllUnaryOps(): void;

		function removeAllLiterals(): void;

		const version: string;
	}

	function jsep(val: string | jsep.Expression): jsep.Expression;

	export = jsep;
}
