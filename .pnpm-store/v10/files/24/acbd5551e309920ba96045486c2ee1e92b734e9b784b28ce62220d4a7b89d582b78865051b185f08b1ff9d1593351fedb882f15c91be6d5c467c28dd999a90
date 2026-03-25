import { Token, TOKEN_TYPES } from "./lexer";
import type { TokenType } from "./lexer";
import type { Statement } from "./ast";
import {
	Program,
	If,
	For,
	Break,
	Continue,
	SetStatement,
	MemberExpression,
	CallExpression,
	Identifier,
	StringLiteral,
	ArrayLiteral,
	ObjectLiteral,
	BinaryExpression,
	FilterExpression,
	TestExpression,
	UnaryExpression,
	SliceExpression,
	KeywordArgumentExpression,
	TupleLiteral,
	Macro,
	SelectExpression,
	CallStatement,
	FilterStatement,
	SpreadExpression,
	IntegerLiteral,
	FloatLiteral,
	Ternary,
	Comment,
} from "./ast";

/**
 * Generate the Abstract Syntax Tree (AST) from a list of tokens.
 * Operator precedence can be found here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence#table
 */
export function parse(tokens: Token[]): Program {
	const program = new Program([]);
	let current = 0;

	/**
	 * Consume the next token if it matches the expected type, otherwise throw an error.
	 * @param type The expected token type
	 * @param error The error message to throw if the token does not match the expected type
	 * @returns The consumed token
	 */
	function expect(type: string, error: string): Token {
		const prev = tokens[current++];
		if (!prev || prev.type !== type) {
			throw new Error(`Parser Error: ${error}. ${prev.type} !== ${type}.`);
		}
		return prev;
	}

	function expectIdentifier(name: string): void {
		if (!isIdentifier(name)) {
			throw new SyntaxError(`Expected ${name}`);
		}
		++current;
	}

	function parseAny(): Statement {
		switch (tokens[current].type) {
			case TOKEN_TYPES.Comment:
				return new Comment(tokens[current++].value);
			case TOKEN_TYPES.Text:
				return parseText();
			case TOKEN_TYPES.OpenStatement:
				return parseJinjaStatement();
			case TOKEN_TYPES.OpenExpression:
				return parseJinjaExpression();
			default:
				throw new SyntaxError(`Unexpected token type: ${tokens[current].type}`);
		}
	}

	function is(...types: TokenType[]): boolean {
		return current + types.length <= tokens.length && types.every((type, i) => type === tokens[current + i].type);
	}

	function isStatement(...names: string[]): boolean {
		return (
			tokens[current]?.type === TOKEN_TYPES.OpenStatement &&
			tokens[current + 1]?.type === TOKEN_TYPES.Identifier &&
			names.includes(tokens[current + 1]?.value)
		);
	}

	function isIdentifier(...names: string[]): boolean {
		return (
			current + names.length <= tokens.length &&
			names.every((name, i) => tokens[current + i].type === "Identifier" && name === tokens[current + i].value)
		);
	}

	function parseText(): StringLiteral {
		return new StringLiteral(expect(TOKEN_TYPES.Text, "Expected text token").value);
	}

	function parseJinjaStatement(): Statement {
		// Consume {% token
		expect(TOKEN_TYPES.OpenStatement, "Expected opening statement token");

		// next token must be Identifier whose .value tells us which statement
		if (tokens[current].type !== TOKEN_TYPES.Identifier) {
			throw new SyntaxError(`Unknown statement, got ${tokens[current].type}`);
		}
		const name = tokens[current].value;
		let result: Statement;
		switch (name) {
			case "set":
				++current;
				result = parseSetStatement();
				break;
			case "if":
				++current;
				result = parseIfStatement();
				// expect {% endif %}
				expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
				expectIdentifier("endif");
				expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
				break;
			case "macro":
				++current;
				result = parseMacroStatement();
				// expect {% endmacro %}
				expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
				expectIdentifier("endmacro");
				expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
				break;
			case "for":
				++current;
				result = parseForStatement();
				// expect {% endfor %}
				expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
				expectIdentifier("endfor");
				expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
				break;
			case "call": {
				++current; // consume 'call'
				let callerArgs: Statement[] | null = null;
				if (is(TOKEN_TYPES.OpenParen)) {
					// Optional caller arguments, e.g. {% call(user) dump_users(...) %}
					callerArgs = parseArgs();
				}
				const callee = parsePrimaryExpression();
				if (callee.type !== "Identifier") {
					throw new SyntaxError(`Expected identifier following call statement`);
				}
				const callArgs = parseArgs();
				expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
				const body: Statement[] = [];
				while (!isStatement("endcall")) {
					body.push(parseAny());
				}
				expect(TOKEN_TYPES.OpenStatement, "Expected '{%'");
				expectIdentifier("endcall");
				expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
				const callExpr = new CallExpression(callee, callArgs);
				result = new CallStatement(callExpr, callerArgs, body);
				break;
			}
			case "break":
				++current;
				expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
				result = new Break();
				break;
			case "continue":
				++current;
				expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
				result = new Continue();
				break;
			case "filter": {
				++current; // consume 'filter'
				let filterNode = parsePrimaryExpression();
				if (filterNode instanceof Identifier && is(TOKEN_TYPES.OpenParen)) {
					filterNode = parseCallExpression(filterNode);
				}
				expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
				const filterBody: Statement[] = [];
				while (!isStatement("endfilter")) {
					filterBody.push(parseAny());
				}
				expect(TOKEN_TYPES.OpenStatement, "Expected '{%'");
				expectIdentifier("endfilter");
				expect(TOKEN_TYPES.CloseStatement, "Expected '%}'");
				result = new FilterStatement(filterNode as Identifier | CallExpression, filterBody);
				break;
			}
			default:
				throw new SyntaxError(`Unknown statement type: ${name}`);
		}

		return result;
	}

	function parseJinjaExpression(): Statement {
		// Consume {{ }} tokens
		expect(TOKEN_TYPES.OpenExpression, "Expected opening expression token");

		const result = parseExpression();

		expect(TOKEN_TYPES.CloseExpression, "Expected closing expression token");
		return result;
	}

	// NOTE: `set` acts as both declaration statement and assignment expression
	function parseSetStatement(): Statement {
		const left = parseExpressionSequence();
		let value: Statement | null = null;
		const body: Statement[] = [];
		if (is(TOKEN_TYPES.Equals)) {
			++current;
			value = parseExpressionSequence();
		} else {
			// parsing multiline set here
			expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
			while (!isStatement("endset")) {
				body.push(parseAny());
			}
			expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
			expectIdentifier("endset");
		}
		expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
		return new SetStatement(left, value, body);
	}

	function parseIfStatement(): If {
		const test = parseExpression();

		expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");

		const body: Statement[] = [];
		const alternate: Statement[] = [];

		// Keep parsing 'if' body until we reach the first {% elif %} or {% else %} or {% endif %}
		while (!isStatement("elif", "else", "endif")) {
			body.push(parseAny());
		}

		// handle {% elif %}
		if (isStatement("elif")) {
			++current; // consume {%
			++current; // consume 'elif'
			const result = parseIfStatement(); // nested If
			alternate.push(result);
		}
		// handle {% else %}
		else if (isStatement("else")) {
			++current; // consume {%
			++current; // consume 'else'
			expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");

			// keep going until we hit {% endif %}
			while (!isStatement("endif")) {
				alternate.push(parseAny());
			}
		}

		return new If(test, body, alternate);
	}

	function parseMacroStatement(): Macro {
		const name = parsePrimaryExpression();
		if (name.type !== "Identifier") {
			throw new SyntaxError(`Expected identifier following macro statement`);
		}
		const args = parseArgs();
		expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");

		// Body of macro
		const body: Statement[] = [];

		// Keep going until we hit {% endmacro
		while (!isStatement("endmacro")) {
			body.push(parseAny());
		}

		return new Macro(name as Identifier, args, body);
	}

	function parseExpressionSequence(primary = false): Statement {
		const fn = primary ? parsePrimaryExpression : parseExpression;
		const expressions = [fn()];
		const isTuple = is(TOKEN_TYPES.Comma);
		while (isTuple) {
			++current; // consume comma
			expressions.push(fn());
			if (!is(TOKEN_TYPES.Comma)) {
				break;
			}
		}
		return isTuple ? new TupleLiteral(expressions) : expressions[0];
	}

	function parseForStatement(): For {
		// e.g., `message` in `for message in messages`
		const loopVariable = parseExpressionSequence(true); // should be an identifier/tuple
		if (!(loopVariable instanceof Identifier || loopVariable instanceof TupleLiteral)) {
			throw new SyntaxError(`Expected identifier/tuple for the loop variable, got ${loopVariable.type} instead`);
		}

		if (!isIdentifier("in")) {
			throw new SyntaxError("Expected `in` keyword following loop variable");
		}
		++current;

		// `messages` in `for message in messages`
		const iterable = parseExpression();

		expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");

		// Body of for loop
		const body: Statement[] = [];

		// Keep going until we hit {% endfor or {% else
		while (!isStatement("endfor", "else")) {
			body.push(parseAny());
		}

		// (Optional) else block
		const alternative: Statement[] = [];
		if (isStatement("else")) {
			++current; // consume {%
			++current; // consume 'else'
			expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
			while (!isStatement("endfor")) {
				alternative.push(parseAny());
			}
		}

		return new For(loopVariable, iterable, body, alternative);
	}

	function parseExpression(): Statement {
		// Choose parse function with lowest precedence
		return parseIfExpression();
	}

	function parseIfExpression(): Statement {
		const a = parseLogicalOrExpression();
		if (isIdentifier("if")) {
			// Ternary expression
			++current; // consume 'if'
			const test = parseLogicalOrExpression();

			if (isIdentifier("else")) {
				// Ternary expression with else
				++current; // consume 'else'
				const falseExpr = parseIfExpression(); // recurse to support chained ternaries
				return new Ternary(test, a, falseExpr);
			} else {
				// Select expression on iterable
				return new SelectExpression(a, test);
			}
		}
		return a;
	}

	function parseLogicalOrExpression(): Statement {
		let left = parseLogicalAndExpression();
		while (isIdentifier("or")) {
			const operator = tokens[current];
			++current;
			const right = parseLogicalAndExpression();
			left = new BinaryExpression(operator, left, right);
		}
		return left;
	}

	function parseLogicalAndExpression(): Statement {
		let left = parseLogicalNegationExpression();
		while (isIdentifier("and")) {
			const operator = tokens[current];
			++current;
			const right = parseLogicalNegationExpression();
			left = new BinaryExpression(operator, left, right);
		}
		return left;
	}

	function parseLogicalNegationExpression(): Statement {
		let right: UnaryExpression | undefined;

		// Try parse unary operators
		while (isIdentifier("not")) {
			// not not ...
			const operator = tokens[current];
			++current;
			const arg = parseLogicalNegationExpression(); // not test.x === not (test.x)
			right = new UnaryExpression(operator, arg);
		}

		return right ?? parseComparisonExpression();
	}

	function parseComparisonExpression(): Statement {
		// NOTE: membership has same precedence as comparison
		// e.g., ('a' in 'apple' == 'b' in 'banana') evaluates as ('a' in ('apple' == ('b' in 'banana')))
		let left = parseAdditiveExpression();
		while (true) {
			let operator: Token;
			if (isIdentifier("not", "in")) {
				operator = new Token("not in", TOKEN_TYPES.Identifier);
				current += 2;
			} else if (isIdentifier("in")) {
				operator = tokens[current++];
			} else if (is(TOKEN_TYPES.ComparisonBinaryOperator)) {
				operator = tokens[current++];
			} else {
				break;
			}
			const right = parseAdditiveExpression();
			left = new BinaryExpression(operator, left, right);
		}
		return left;
	}
	function parseAdditiveExpression(): Statement {
		let left = parseMultiplicativeExpression();
		while (is(TOKEN_TYPES.AdditiveBinaryOperator)) {
			const operator = tokens[current];
			++current;
			const right = parseMultiplicativeExpression();
			left = new BinaryExpression(operator, left, right);
		}
		return left;
	}

	function parseCallMemberExpression(): Statement {
		// Handle member expressions recursively

		const member = parseMemberExpression(parsePrimaryExpression()); // foo.x

		if (is(TOKEN_TYPES.OpenParen)) {
			// foo.x()
			return parseCallExpression(member);
		}
		return member;
	}

	function parseCallExpression(callee: Statement): Statement {
		let expression: Statement = new CallExpression(callee, parseArgs());

		expression = parseMemberExpression(expression); // foo.x().y

		if (is(TOKEN_TYPES.OpenParen)) {
			// foo.x()()
			expression = parseCallExpression(expression);
		}

		return expression;
	}

	function parseArgs(): Statement[] {
		// add (x + 5, foo())
		expect(TOKEN_TYPES.OpenParen, "Expected opening parenthesis for arguments list");

		const args = parseArgumentsList();

		expect(TOKEN_TYPES.CloseParen, "Expected closing parenthesis for arguments list");
		return args;
	}
	function parseArgumentsList(): Statement[] {
		// comma-separated arguments list

		const args = [];
		while (!is(TOKEN_TYPES.CloseParen)) {
			let argument: Statement;

			// unpacking: *expr
			if (tokens[current].type === TOKEN_TYPES.MultiplicativeBinaryOperator && tokens[current].value === "*") {
				++current;
				const expr = parseExpression();
				argument = new SpreadExpression(expr);
			} else {
				argument = parseExpression();
				if (is(TOKEN_TYPES.Equals)) {
					// keyword argument
					// e.g., func(x = 5, y = a or b)
					++current; // consume equals
					if (!(argument instanceof Identifier)) {
						throw new SyntaxError(`Expected identifier for keyword argument`);
					}
					const value = parseExpression();
					argument = new KeywordArgumentExpression(argument as Identifier, value);
				}
			}
			args.push(argument);
			if (is(TOKEN_TYPES.Comma)) {
				++current; // consume comma
			}
		}
		return args;
	}

	function parseMemberExpressionArgumentsList(): Statement {
		// NOTE: This also handles slice expressions colon-separated arguments list
		// e.g., ['test'], [0], [:2], [1:], [1:2], [1:2:3]

		const slices: (Statement | undefined)[] = [];
		let isSlice = false;
		while (!is(TOKEN_TYPES.CloseSquareBracket)) {
			if (is(TOKEN_TYPES.Colon)) {
				// A case where a default is used
				// e.g., [:2] will be parsed as [undefined, 2]
				slices.push(undefined);
				++current; // consume colon
				isSlice = true;
			} else {
				slices.push(parseExpression());
				if (is(TOKEN_TYPES.Colon)) {
					++current; // consume colon after expression, if it exists
					isSlice = true;
				}
			}
		}
		if (slices.length === 0) {
			// []
			throw new SyntaxError(`Expected at least one argument for member/slice expression`);
		}

		if (isSlice) {
			if (slices.length > 3) {
				throw new SyntaxError(`Expected 0-3 arguments for slice expression`);
			}
			return new SliceExpression(...slices);
		}

		return slices[0] as Statement; // normal member expression
	}

	function parseMemberExpression(object: Statement): Statement {
		while (is(TOKEN_TYPES.Dot) || is(TOKEN_TYPES.OpenSquareBracket)) {
			const operator = tokens[current]; // . or [
			++current;
			let property: Statement;
			const computed = operator.type === TOKEN_TYPES.OpenSquareBracket;
			if (computed) {
				// computed (i.e., bracket notation: obj[expr])
				property = parseMemberExpressionArgumentsList();
				expect(TOKEN_TYPES.CloseSquareBracket, "Expected closing square bracket");
			} else {
				// non-computed (i.e., dot notation: obj.expr)
				property = parsePrimaryExpression(); // should be an identifier
				if (property.type !== "Identifier") {
					throw new SyntaxError(`Expected identifier following dot operator`);
				}
			}
			object = new MemberExpression(object, property, computed);
		}
		return object;
	}

	function parseMultiplicativeExpression(): Statement {
		let left = parseTestExpression();

		// Multiplicative operators have higher precedence than test expressions
		// e.g., (4 * 4 is divisibleby(2)) evaluates as (4 * (4 is divisibleby(2)))

		while (is(TOKEN_TYPES.MultiplicativeBinaryOperator)) {
			const operator = tokens[current++];
			const right = parseTestExpression();
			left = new BinaryExpression(operator, left, right);
		}
		return left;
	}

	function parseTestExpression(): Statement {
		let operand = parseFilterExpression();

		while (isIdentifier("is")) {
			// Support chaining tests
			++current; // consume is
			const negate = isIdentifier("not");
			if (negate) {
				++current; // consume not
			}

			const filter = parsePrimaryExpression();
			if (!(filter instanceof Identifier)) {
				throw new SyntaxError(`Expected identifier for the test`);
			}
			// TODO: Add support for non-identifier tests
			operand = new TestExpression(operand, negate, filter);
		}
		return operand;
	}

	function parseFilterExpression(): Statement {
		let operand = parseCallMemberExpression();

		while (is(TOKEN_TYPES.Pipe)) {
			// Support chaining filters
			++current; // consume pipe
			let filter = parsePrimaryExpression(); // should be an identifier
			if (!(filter instanceof Identifier)) {
				throw new SyntaxError(`Expected identifier for the filter`);
			}
			if (is(TOKEN_TYPES.OpenParen)) {
				filter = parseCallExpression(filter);
			}
			operand = new FilterExpression(operand, filter as Identifier | CallExpression);
		}
		return operand;
	}

	function parsePrimaryExpression(): Statement {
		// Primary expression: number, string, identifier, function call, parenthesized expression
		const token = tokens[current++];
		switch (token.type) {
			case TOKEN_TYPES.NumericLiteral: {
				const num = token.value;
				return num.includes(".") ? new FloatLiteral(Number(num)) : new IntegerLiteral(Number(num));
			}
			case TOKEN_TYPES.StringLiteral: {
				let value = token.value;
				while (is(TOKEN_TYPES.StringLiteral)) {
					value += tokens[current++].value;
				}
				return new StringLiteral(value);
			}
			case TOKEN_TYPES.Identifier:
				return new Identifier(token.value);
			case TOKEN_TYPES.OpenParen: {
				const expression = parseExpressionSequence();
				expect(TOKEN_TYPES.CloseParen, "Expected closing parenthesis, got ${tokens[current].type} instead.");
				return expression;
			}
			case TOKEN_TYPES.OpenSquareBracket: {
				const values = [];
				while (!is(TOKEN_TYPES.CloseSquareBracket)) {
					values.push(parseExpression());

					if (is(TOKEN_TYPES.Comma)) {
						++current; // consume comma
					}
				}
				++current; // consume closing square bracket

				return new ArrayLiteral(values);
			}
			case TOKEN_TYPES.OpenCurlyBracket: {
				const values = new Map();
				while (!is(TOKEN_TYPES.CloseCurlyBracket)) {
					const key = parseExpression();
					expect(TOKEN_TYPES.Colon, "Expected colon between key and value in object literal");
					const value = parseExpression();
					values.set(key, value);

					if (is(TOKEN_TYPES.Comma)) {
						++current; // consume comma
					}
				}
				++current; // consume closing curly bracket

				return new ObjectLiteral(values);
			}
			default:
				throw new SyntaxError(`Unexpected token: ${token.type}`);
		}
	}

	while (current < tokens.length) {
		program.body.push(parseAny());
	}

	return program;
}
