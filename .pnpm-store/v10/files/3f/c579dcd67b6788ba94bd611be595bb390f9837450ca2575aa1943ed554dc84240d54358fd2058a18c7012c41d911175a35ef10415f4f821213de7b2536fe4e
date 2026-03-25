'use strict';

/**
 * @implements {IHooks}
 */
class Hooks {
	/**
	 * @callback HookCallback
	 * @this {*|Jsep} this
	 * @param {Jsep} env
	 * @returns: void
	 */
	/**
	 * Adds the given callback to the list of callbacks for the given hook.
	 *
	 * The callback will be invoked when the hook it is registered for is run.
	 *
	 * One callback function can be registered to multiple hooks and the same hook multiple times.
	 *
	 * @param {string|object} name The name of the hook, or an object of callbacks keyed by name
	 * @param {HookCallback|boolean} callback The callback function which is given environment variables.
	 * @param {?boolean} [first=false] Will add the hook to the top of the list (defaults to the bottom)
	 * @public
	 */
	add(name, callback, first) {
		if (typeof arguments[0] != 'string') {
			// Multiple hook callbacks, keyed by name
			for (let name in arguments[0]) {
				this.add(name, arguments[0][name], arguments[1]);
			}
		}
		else {
			(Array.isArray(name) ? name : [name]).forEach(function (name) {
				this[name] = this[name] || [];

				if (callback) {
					this[name][first ? 'unshift' : 'push'](callback);
				}
			}, this);
		}
	}

	/**
	 * Runs a hook invoking all registered callbacks with the given environment variables.
	 *
	 * Callbacks will be invoked synchronously and in the order in which they were registered.
	 *
	 * @param {string} name The name of the hook.
	 * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
	 * @public
	 */
	run(name, env) {
		this[name] = this[name] || [];
		this[name].forEach(function (callback) {
			callback.call(env && env.context ? env.context : env, env);
		});
	}
}

/**
 * @implements {IPlugins}
 */
class Plugins {
	constructor(jsep) {
		this.jsep = jsep;
		this.registered = {};
	}

	/**
	 * @callback PluginSetup
	 * @this {Jsep} jsep
	 * @returns: void
	 */
	/**
	 * Adds the given plugin(s) to the registry
	 *
	 * @param {object} plugins
	 * @param {string} plugins.name The name of the plugin
	 * @param {PluginSetup} plugins.init The init function
	 * @public
	 */
	register(...plugins) {
		plugins.forEach((plugin) => {
			if (typeof plugin !== 'object' || !plugin.name || !plugin.init) {
				throw new Error('Invalid JSEP plugin format');
			}
			if (this.registered[plugin.name]) {
				// already registered. Ignore.
				return;
			}
			plugin.init(this.jsep);
			this.registered[plugin.name] = plugin;
		});
	}
}

//     JavaScript Expression Parser (JSEP) 1.4.0

class Jsep {
	/**
	 * @returns {string}
	 */
	static get version() {
		// To be filled in by the template
		return '1.4.0';
	}

	/**
	 * @returns {string}
	 */
	static toString() {
		return 'JavaScript Expression Parser (JSEP) v' + Jsep.version;
	};

	// ==================== CONFIG ================================
	/**
	 * @method addUnaryOp
	 * @param {string} op_name The name of the unary op to add
	 * @returns {Jsep}
	 */
	static addUnaryOp(op_name) {
		Jsep.max_unop_len = Math.max(op_name.length, Jsep.max_unop_len);
		Jsep.unary_ops[op_name] = 1;
		return Jsep;
	}

	/**
	 * @method jsep.addBinaryOp
	 * @param {string} op_name The name of the binary op to add
	 * @param {number} precedence The precedence of the binary op (can be a float). Higher number = higher precedence
	 * @param {boolean} [isRightAssociative=false] whether operator is right-associative
	 * @returns {Jsep}
	 */
	static addBinaryOp(op_name, precedence, isRightAssociative) {
		Jsep.max_binop_len = Math.max(op_name.length, Jsep.max_binop_len);
		Jsep.binary_ops[op_name] = precedence;
		if (isRightAssociative) {
			Jsep.right_associative.add(op_name);
		}
		else {
			Jsep.right_associative.delete(op_name);
		}
		return Jsep;
	}

	/**
	 * @method addIdentifierChar
	 * @param {string} char The additional character to treat as a valid part of an identifier
	 * @returns {Jsep}
	 */
	static addIdentifierChar(char) {
		Jsep.additional_identifier_chars.add(char);
		return Jsep;
	}

	/**
	 * @method addLiteral
	 * @param {string} literal_name The name of the literal to add
	 * @param {*} literal_value The value of the literal
	 * @returns {Jsep}
	 */
	static addLiteral(literal_name, literal_value) {
		Jsep.literals[literal_name] = literal_value;
		return Jsep;
	}

	/**
	 * @method removeUnaryOp
	 * @param {string} op_name The name of the unary op to remove
	 * @returns {Jsep}
	 */
	static removeUnaryOp(op_name) {
		delete Jsep.unary_ops[op_name];
		if (op_name.length === Jsep.max_unop_len) {
			Jsep.max_unop_len = Jsep.getMaxKeyLen(Jsep.unary_ops);
		}
		return Jsep;
	}

	/**
	 * @method removeAllUnaryOps
	 * @returns {Jsep}
	 */
	static removeAllUnaryOps() {
		Jsep.unary_ops = {};
		Jsep.max_unop_len = 0;

		return Jsep;
	}

	/**
	 * @method removeIdentifierChar
	 * @param {string} char The additional character to stop treating as a valid part of an identifier
	 * @returns {Jsep}
	 */
	static removeIdentifierChar(char) {
		Jsep.additional_identifier_chars.delete(char);
		return Jsep;
	}

	/**
	 * @method removeBinaryOp
	 * @param {string} op_name The name of the binary op to remove
	 * @returns {Jsep}
	 */
	static removeBinaryOp(op_name) {
		delete Jsep.binary_ops[op_name];

		if (op_name.length === Jsep.max_binop_len) {
			Jsep.max_binop_len = Jsep.getMaxKeyLen(Jsep.binary_ops);
		}
		Jsep.right_associative.delete(op_name);

		return Jsep;
	}

	/**
	 * @method removeAllBinaryOps
	 * @returns {Jsep}
	 */
	static removeAllBinaryOps() {
		Jsep.binary_ops = {};
		Jsep.max_binop_len = 0;

		return Jsep;
	}

	/**
	 * @method removeLiteral
	 * @param {string} literal_name The name of the literal to remove
	 * @returns {Jsep}
	 */
	static removeLiteral(literal_name) {
		delete Jsep.literals[literal_name];
		return Jsep;
	}

	/**
	 * @method removeAllLiterals
	 * @returns {Jsep}
	 */
	static removeAllLiterals() {
		Jsep.literals = {};

		return Jsep;
	}
	// ==================== END CONFIG ============================


	/**
	 * @returns {string}
	 */
	get char() {
		return this.expr.charAt(this.index);
	}

	/**
	 * @returns {number}
	 */
	get code() {
		return this.expr.charCodeAt(this.index);
	};


	/**
	 * @param {string} expr a string with the passed in express
	 * @returns Jsep
	 */
	constructor(expr) {
		// `index` stores the character number we are currently at
		// All of the gobbles below will modify `index` as we move along
		this.expr = expr;
		this.index = 0;
	}

	/**
	 * static top-level parser
	 * @returns {jsep.Expression}
	 */
	static parse(expr) {
		return (new Jsep(expr)).parse();
	}

	/**
	 * Get the longest key length of any object
	 * @param {object} obj
	 * @returns {number}
	 */
	static getMaxKeyLen(obj) {
		return Math.max(0, ...Object.keys(obj).map(k => k.length));
	}

	/**
	 * `ch` is a character code in the next three functions
	 * @param {number} ch
	 * @returns {boolean}
	 */
	static isDecimalDigit(ch) {
		return (ch >= 48 && ch <= 57); // 0...9
	}

	/**
	 * Returns the precedence of a binary operator or `0` if it isn't a binary operator. Can be float.
	 * @param {string} op_val
	 * @returns {number}
	 */
	static binaryPrecedence(op_val) {
		return Jsep.binary_ops[op_val] || 0;
	}

	/**
	 * Looks for start of identifier
	 * @param {number} ch
	 * @returns {boolean}
	 */
	static isIdentifierStart(ch) {
		return  (ch >= 65 && ch <= 90) || // A...Z
			(ch >= 97 && ch <= 122) || // a...z
			(ch >= 128 && !Jsep.binary_ops[String.fromCharCode(ch)]) || // any non-ASCII that is not an operator
			(Jsep.additional_identifier_chars.has(String.fromCharCode(ch))); // additional characters
	}

	/**
	 * @param {number} ch
	 * @returns {boolean}
	 */
	static isIdentifierPart(ch) {
		return Jsep.isIdentifierStart(ch) || Jsep.isDecimalDigit(ch);
	}

	/**
	 * throw error at index of the expression
	 * @param {string} message
	 * @throws
	 */
	throwError(message) {
		const error = new Error(message + ' at character ' + this.index);
		error.index = this.index;
		error.description = message;
		throw error;
	}

	/**
	 * Run a given hook
	 * @param {string} name
	 * @param {jsep.Expression|false} [node]
	 * @returns {?jsep.Expression}
	 */
	runHook(name, node) {
		if (Jsep.hooks[name]) {
			const env = { context: this, node };
			Jsep.hooks.run(name, env);
			return env.node;
		}
		return node;
	}

	/**
	 * Runs a given hook until one returns a node
	 * @param {string} name
	 * @returns {?jsep.Expression}
	 */
	searchHook(name) {
		if (Jsep.hooks[name]) {
			const env = { context: this };
			Jsep.hooks[name].find(function (callback) {
				callback.call(env.context, env);
				return env.node;
			});
			return env.node;
		}
	}

	/**
	 * Push `index` up to the next non-space character
	 */
	gobbleSpaces() {
		let ch = this.code;
		// Whitespace
		while (ch === Jsep.SPACE_CODE
		|| ch === Jsep.TAB_CODE
		|| ch === Jsep.LF_CODE
		|| ch === Jsep.CR_CODE) {
			ch = this.expr.charCodeAt(++this.index);
		}
		this.runHook('gobble-spaces');
	}

	/**
	 * Top-level method to parse all expressions and returns compound or single node
	 * @returns {jsep.Expression}
	 */
	parse() {
		this.runHook('before-all');
		const nodes = this.gobbleExpressions();

		// If there's only one expression just try returning the expression
		const node = nodes.length === 1
		  ? nodes[0]
			: {
				type: Jsep.COMPOUND,
				body: nodes
			};
		return this.runHook('after-all', node);
	}

	/**
	 * top-level parser (but can be reused within as well)
	 * @param {number} [untilICode]
	 * @returns {jsep.Expression[]}
	 */
	gobbleExpressions(untilICode) {
		let nodes = [], ch_i, node;

		while (this.index < this.expr.length) {
			ch_i = this.code;

			// Expressions can be separated by semicolons, commas, or just inferred without any
			// separators
			if (ch_i === Jsep.SEMCOL_CODE || ch_i === Jsep.COMMA_CODE) {
				this.index++; // ignore separators
			}
			else {
				// Try to gobble each expression individually
				if (node = this.gobbleExpression()) {
					nodes.push(node);
					// If we weren't able to find a binary expression and are out of room, then
					// the expression passed in probably has too much
				}
				else if (this.index < this.expr.length) {
					if (ch_i === untilICode) {
						break;
					}
					this.throwError('Unexpected "' + this.char + '"');
				}
			}
		}

		return nodes;
	}

	/**
	 * The main parsing function.
	 * @returns {?jsep.Expression}
	 */
	gobbleExpression() {
		const node = this.searchHook('gobble-expression') || this.gobbleBinaryExpression();
		this.gobbleSpaces();

		return this.runHook('after-expression', node);
	}

	/**
	 * Search for the operation portion of the string (e.g. `+`, `===`)
	 * Start by taking the longest possible binary operations (3 characters: `===`, `!==`, `>>>`)
	 * and move down from 3 to 2 to 1 character until a matching binary operation is found
	 * then, return that binary operation
	 * @returns {string|boolean}
	 */
	gobbleBinaryOp() {
		this.gobbleSpaces();
		let to_check = this.expr.substr(this.index, Jsep.max_binop_len);
		let tc_len = to_check.length;

		while (tc_len > 0) {
			// Don't accept a binary op when it is an identifier.
			// Binary ops that start with a identifier-valid character must be followed
			// by a non identifier-part valid character
			if (Jsep.binary_ops.hasOwnProperty(to_check) && (
				!Jsep.isIdentifierStart(this.code) ||
				(this.index + to_check.length < this.expr.length && !Jsep.isIdentifierPart(this.expr.charCodeAt(this.index + to_check.length)))
			)) {
				this.index += tc_len;
				return to_check;
			}
			to_check = to_check.substr(0, --tc_len);
		}
		return false;
	}

	/**
	 * This function is responsible for gobbling an individual expression,
	 * e.g. `1`, `1+2`, `a+(b*2)-Math.sqrt(2)`
	 * @returns {?jsep.BinaryExpression}
	 */
	gobbleBinaryExpression() {
		let node, biop, prec, stack, biop_info, left, right, i, cur_biop;

		// First, try to get the leftmost thing
		// Then, check to see if there's a binary operator operating on that leftmost thing
		// Don't gobbleBinaryOp without a left-hand-side
		left = this.gobbleToken();
		if (!left) {
			return left;
		}
		biop = this.gobbleBinaryOp();

		// If there wasn't a binary operator, just return the leftmost node
		if (!biop) {
			return left;
		}

		// Otherwise, we need to start a stack to properly place the binary operations in their
		// precedence structure
		biop_info = { value: biop, prec: Jsep.binaryPrecedence(biop), right_a: Jsep.right_associative.has(biop) };

		right = this.gobbleToken();

		if (!right) {
			this.throwError("Expected expression after " + biop);
		}

		stack = [left, biop_info, right];

		// Properly deal with precedence using [recursive descent](http://www.engr.mun.ca/~theo/Misc/exp_parsing.htm)
		while ((biop = this.gobbleBinaryOp())) {
			prec = Jsep.binaryPrecedence(biop);

			if (prec === 0) {
				this.index -= biop.length;
				break;
			}

			biop_info = { value: biop, prec, right_a: Jsep.right_associative.has(biop) };

			cur_biop = biop;

			// Reduce: make a binary expression from the three topmost entries.
			const comparePrev = prev => biop_info.right_a && prev.right_a
				? prec > prev.prec
				: prec <= prev.prec;
			while ((stack.length > 2) && comparePrev(stack[stack.length - 2])) {
				right = stack.pop();
				biop = stack.pop().value;
				left = stack.pop();
				node = {
					type: Jsep.BINARY_EXP,
					operator: biop,
					left,
					right
				};
				stack.push(node);
			}

			node = this.gobbleToken();

			if (!node) {
				this.throwError("Expected expression after " + cur_biop);
			}

			stack.push(biop_info, node);
		}

		i = stack.length - 1;
		node = stack[i];

		while (i > 1) {
			node = {
				type: Jsep.BINARY_EXP,
				operator: stack[i - 1].value,
				left: stack[i - 2],
				right: node
			};
			i -= 2;
		}

		return node;
	}

	/**
	 * An individual part of a binary expression:
	 * e.g. `foo.bar(baz)`, `1`, `"abc"`, `(a % 2)` (because it's in parenthesis)
	 * @returns {boolean|jsep.Expression}
	 */
	gobbleToken() {
		let ch, to_check, tc_len, node;

		this.gobbleSpaces();
		node = this.searchHook('gobble-token');
		if (node) {
			return this.runHook('after-token', node);
		}

		ch = this.code;

		if (Jsep.isDecimalDigit(ch) || ch === Jsep.PERIOD_CODE) {
			// Char code 46 is a dot `.` which can start off a numeric literal
			return this.gobbleNumericLiteral();
		}

		if (ch === Jsep.SQUOTE_CODE || ch === Jsep.DQUOTE_CODE) {
			// Single or double quotes
			node = this.gobbleStringLiteral();
		}
		else if (ch === Jsep.OBRACK_CODE) {
			node = this.gobbleArray();
		}
		else {
			to_check = this.expr.substr(this.index, Jsep.max_unop_len);
			tc_len = to_check.length;

			while (tc_len > 0) {
				// Don't accept an unary op when it is an identifier.
				// Unary ops that start with a identifier-valid character must be followed
				// by a non identifier-part valid character
				if (Jsep.unary_ops.hasOwnProperty(to_check) && (
					!Jsep.isIdentifierStart(this.code) ||
					(this.index + to_check.length < this.expr.length && !Jsep.isIdentifierPart(this.expr.charCodeAt(this.index + to_check.length)))
				)) {
					this.index += tc_len;
					const argument = this.gobbleToken();
					if (!argument) {
						this.throwError('missing unaryOp argument');
					}
					return this.runHook('after-token', {
						type: Jsep.UNARY_EXP,
						operator: to_check,
						argument,
						prefix: true
					});
				}

				to_check = to_check.substr(0, --tc_len);
			}

			if (Jsep.isIdentifierStart(ch)) {
				node = this.gobbleIdentifier();
				if (Jsep.literals.hasOwnProperty(node.name)) {
					node = {
						type: Jsep.LITERAL,
						value: Jsep.literals[node.name],
						raw: node.name,
					};
				}
				else if (node.name === Jsep.this_str) {
					node = { type: Jsep.THIS_EXP };
				}
			}
			else if (ch === Jsep.OPAREN_CODE) { // open parenthesis
				node = this.gobbleGroup();
			}
		}

		if (!node) {
			return this.runHook('after-token', false);
		}

		node = this.gobbleTokenProperty(node);
		return this.runHook('after-token', node);
	}

	/**
	 * Gobble properties of of identifiers/strings/arrays/groups.
	 * e.g. `foo`, `bar.baz`, `foo['bar'].baz`
	 * It also gobbles function calls:
	 * e.g. `Math.acos(obj.angle)`
	 * @param {jsep.Expression} node
	 * @returns {jsep.Expression}
	 */
	gobbleTokenProperty(node) {
		this.gobbleSpaces();

		let ch = this.code;
		while (ch === Jsep.PERIOD_CODE || ch === Jsep.OBRACK_CODE || ch === Jsep.OPAREN_CODE || ch === Jsep.QUMARK_CODE) {
			let optional;
			if (ch === Jsep.QUMARK_CODE) {
				if (this.expr.charCodeAt(this.index + 1) !== Jsep.PERIOD_CODE) {
					break;
				}
				optional = true;
				this.index += 2;
				this.gobbleSpaces();
				ch = this.code;
			}
			this.index++;

			if (ch === Jsep.OBRACK_CODE) {
				node = {
					type: Jsep.MEMBER_EXP,
					computed: true,
					object: node,
					property: this.gobbleExpression()
				};
				if (!node.property) {
					this.throwError('Unexpected "' + this.char + '"');
				}
				this.gobbleSpaces();
				ch = this.code;
				if (ch !== Jsep.CBRACK_CODE) {
					this.throwError('Unclosed [');
				}
				this.index++;
			}
			else if (ch === Jsep.OPAREN_CODE) {
				// A function call is being made; gobble all the arguments
				node = {
					type: Jsep.CALL_EXP,
					'arguments': this.gobbleArguments(Jsep.CPAREN_CODE),
					callee: node
				};
			}
			else if (ch === Jsep.PERIOD_CODE || optional) {
				if (optional) {
					this.index--;
				}
				this.gobbleSpaces();
				node = {
					type: Jsep.MEMBER_EXP,
					computed: false,
					object: node,
					property: this.gobbleIdentifier(),
				};
			}

			if (optional) {
				node.optional = true;
			} // else leave undefined for compatibility with esprima

			this.gobbleSpaces();
			ch = this.code;
		}

		return node;
	}

	/**
	 * Parse simple numeric literals: `12`, `3.4`, `.5`. Do this by using a string to
	 * keep track of everything in the numeric literal and then calling `parseFloat` on that string
	 * @returns {jsep.Literal}
	 */
	gobbleNumericLiteral() {
		let number = '', ch, chCode;

		while (Jsep.isDecimalDigit(this.code)) {
			number += this.expr.charAt(this.index++);
		}

		if (this.code === Jsep.PERIOD_CODE) { // can start with a decimal marker
			number += this.expr.charAt(this.index++);

			while (Jsep.isDecimalDigit(this.code)) {
				number += this.expr.charAt(this.index++);
			}
		}

		ch = this.char;

		if (ch === 'e' || ch === 'E') { // exponent marker
			number += this.expr.charAt(this.index++);
			ch = this.char;

			if (ch === '+' || ch === '-') { // exponent sign
				number += this.expr.charAt(this.index++);
			}

			while (Jsep.isDecimalDigit(this.code)) { // exponent itself
				number += this.expr.charAt(this.index++);
			}

			if (!Jsep.isDecimalDigit(this.expr.charCodeAt(this.index - 1)) ) {
				this.throwError('Expected exponent (' + number + this.char + ')');
			}
		}

		chCode = this.code;

		// Check to make sure this isn't a variable name that start with a number (123abc)
		if (Jsep.isIdentifierStart(chCode)) {
			this.throwError('Variable names cannot start with a number (' +
				number + this.char + ')');
		}
		else if (chCode === Jsep.PERIOD_CODE || (number.length === 1 && number.charCodeAt(0) === Jsep.PERIOD_CODE)) {
			this.throwError('Unexpected period');
		}

		return {
			type: Jsep.LITERAL,
			value: parseFloat(number),
			raw: number
		};
	}

	/**
	 * Parses a string literal, staring with single or double quotes with basic support for escape codes
	 * e.g. `"hello world"`, `'this is\nJSEP'`
	 * @returns {jsep.Literal}
	 */
	gobbleStringLiteral() {
		let str = '';
		const startIndex = this.index;
		const quote = this.expr.charAt(this.index++);
		let closed = false;

		while (this.index < this.expr.length) {
			let ch = this.expr.charAt(this.index++);

			if (ch === quote) {
				closed = true;
				break;
			}
			else if (ch === '\\') {
				// Check for all of the common escape codes
				ch = this.expr.charAt(this.index++);

				switch (ch) {
					case 'n': str += '\n'; break;
					case 'r': str += '\r'; break;
					case 't': str += '\t'; break;
					case 'b': str += '\b'; break;
					case 'f': str += '\f'; break;
					case 'v': str += '\x0B'; break;
					default : str += ch;
				}
			}
			else {
				str += ch;
			}
		}

		if (!closed) {
			this.throwError('Unclosed quote after "' + str + '"');
		}

		return {
			type: Jsep.LITERAL,
			value: str,
			raw: this.expr.substring(startIndex, this.index),
		};
	}

	/**
	 * Gobbles only identifiers
	 * e.g.: `foo`, `_value`, `$x1`
	 * Also, this function checks if that identifier is a literal:
	 * (e.g. `true`, `false`, `null`) or `this`
	 * @returns {jsep.Identifier}
	 */
	gobbleIdentifier() {
		let ch = this.code, start = this.index;

		if (Jsep.isIdentifierStart(ch)) {
			this.index++;
		}
		else {
			this.throwError('Unexpected ' + this.char);
		}

		while (this.index < this.expr.length) {
			ch = this.code;

			if (Jsep.isIdentifierPart(ch)) {
				this.index++;
			}
			else {
				break;
			}
		}
		return {
			type: Jsep.IDENTIFIER,
			name: this.expr.slice(start, this.index),
		};
	}

	/**
	 * Gobbles a list of arguments within the context of a function call
	 * or array literal. This function also assumes that the opening character
	 * `(` or `[` has already been gobbled, and gobbles expressions and commas
	 * until the terminator character `)` or `]` is encountered.
	 * e.g. `foo(bar, baz)`, `my_func()`, or `[bar, baz]`
	 * @param {number} termination
	 * @returns {jsep.Expression[]}
	 */
	gobbleArguments(termination) {
		const args = [];
		let closed = false;
		let separator_count = 0;

		while (this.index < this.expr.length) {
			this.gobbleSpaces();
			let ch_i = this.code;

			if (ch_i === termination) { // done parsing
				closed = true;
				this.index++;

				if (termination === Jsep.CPAREN_CODE && separator_count && separator_count >= args.length){
					this.throwError('Unexpected token ' + String.fromCharCode(termination));
				}

				break;
			}
			else if (ch_i === Jsep.COMMA_CODE) { // between expressions
				this.index++;
				separator_count++;

				if (separator_count !== args.length) { // missing argument
					if (termination === Jsep.CPAREN_CODE) {
						this.throwError('Unexpected token ,');
					}
					else if (termination === Jsep.CBRACK_CODE) {
						for (let arg = args.length; arg < separator_count; arg++) {
							args.push(null);
						}
					}
				}
			}
			else if (args.length !== separator_count && separator_count !== 0) {
				// NOTE: `&& separator_count !== 0` allows for either all commas, or all spaces as arguments
				this.throwError('Expected comma');
			}
			else {
				const node = this.gobbleExpression();

				if (!node || node.type === Jsep.COMPOUND) {
					this.throwError('Expected comma');
				}

				args.push(node);
			}
		}

		if (!closed) {
			this.throwError('Expected ' + String.fromCharCode(termination));
		}

		return args;
	}

	/**
	 * Responsible for parsing a group of things within parentheses `()`
	 * that have no identifier in front (so not a function call)
	 * This function assumes that it needs to gobble the opening parenthesis
	 * and then tries to gobble everything within that parenthesis, assuming
	 * that the next thing it should see is the close parenthesis. If not,
	 * then the expression probably doesn't have a `)`
	 * @returns {boolean|jsep.Expression}
	 */
	gobbleGroup() {
		this.index++;
		let nodes = this.gobbleExpressions(Jsep.CPAREN_CODE);
		if (this.code === Jsep.CPAREN_CODE) {
			this.index++;
			if (nodes.length === 1) {
				return nodes[0];
			}
			else if (!nodes.length) {
				return false;
			}
			else {
				return {
					type: Jsep.SEQUENCE_EXP,
					expressions: nodes,
				};
			}
		}
		else {
			this.throwError('Unclosed (');
		}
	}

	/**
	 * Responsible for parsing Array literals `[1, 2, 3]`
	 * This function assumes that it needs to gobble the opening bracket
	 * and then tries to gobble the expressions as arguments.
	 * @returns {jsep.ArrayExpression}
	 */
	gobbleArray() {
		this.index++;

		return {
			type: Jsep.ARRAY_EXP,
			elements: this.gobbleArguments(Jsep.CBRACK_CODE)
		};
	}
}

// Static fields:
const hooks = new Hooks();
Object.assign(Jsep, {
	hooks,
	plugins: new Plugins(Jsep),

	// Node Types
	// ----------
	// This is the full set of types that any JSEP node can be.
	// Store them here to save space when minified
	COMPOUND:        'Compound',
	SEQUENCE_EXP:    'SequenceExpression',
	IDENTIFIER:      'Identifier',
	MEMBER_EXP:      'MemberExpression',
	LITERAL:         'Literal',
	THIS_EXP:        'ThisExpression',
	CALL_EXP:        'CallExpression',
	UNARY_EXP:       'UnaryExpression',
	BINARY_EXP:      'BinaryExpression',
	ARRAY_EXP:       'ArrayExpression',

	TAB_CODE:    9,
	LF_CODE:     10,
	CR_CODE:     13,
	SPACE_CODE:  32,
	PERIOD_CODE: 46, // '.'
	COMMA_CODE:  44, // ','
	SQUOTE_CODE: 39, // single quote
	DQUOTE_CODE: 34, // double quotes
	OPAREN_CODE: 40, // (
	CPAREN_CODE: 41, // )
	OBRACK_CODE: 91, // [
	CBRACK_CODE: 93, // ]
	QUMARK_CODE: 63, // ?
	SEMCOL_CODE: 59, // ;
	COLON_CODE:  58, // :


	// Operations
	// ----------
	// Use a quickly-accessible map to store all of the unary operators
	// Values are set to `1` (it really doesn't matter)
	unary_ops: {
		'-': 1,
		'!': 1,
		'~': 1,
		'+': 1
	},

	// Also use a map for the binary operations but set their values to their
	// binary precedence for quick reference (higher number = higher precedence)
	// see [Order of operations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence)
	binary_ops: {
		'||': 1, '??': 1,
		'&&': 2, '|': 3, '^': 4, '&': 5,
		'==': 6, '!=': 6, '===': 6, '!==': 6,
		'<': 7, '>': 7, '<=': 7, '>=': 7,
		'<<': 8, '>>': 8, '>>>': 8,
		'+': 9, '-': 9,
		'*': 10, '/': 10, '%': 10,
		'**': 11,
	},

	// sets specific binary_ops as right-associative
	right_associative: new Set(['**']),

	// Additional valid identifier chars, apart from a-z, A-Z and 0-9 (except on the starting char)
	additional_identifier_chars: new Set(['$', '_']),

	// Literals
	// ----------
	// Store the values to return for the various literals we may encounter
	literals: {
		'true': true,
		'false': false,
		'null': null
	},

	// Except for `this`, which is special. This could be changed to something like `'self'` as well
	this_str: 'this',
});
Jsep.max_unop_len = Jsep.getMaxKeyLen(Jsep.unary_ops);
Jsep.max_binop_len = Jsep.getMaxKeyLen(Jsep.binary_ops);

// Backward Compatibility:
const jsep = expr => (new Jsep(expr)).parse();
const stdClassProps = Object.getOwnPropertyNames(class Test{});
Object.getOwnPropertyNames(Jsep)
	.filter(prop => !stdClassProps.includes(prop) && jsep[prop] === undefined)
	.forEach((m) => {
		jsep[m] = Jsep[m];
	});
jsep.Jsep = Jsep; // allows for const { Jsep } = require('jsep');

const CONDITIONAL_EXP = 'ConditionalExpression';

var ternary = {
	name: 'ternary',

	init(jsep) {
		// Ternary expression: test ? consequent : alternate
		jsep.hooks.add('after-expression', function gobbleTernary(env) {
			if (env.node && this.code === jsep.QUMARK_CODE) {
				this.index++;
				const test = env.node;
				const consequent = this.gobbleExpression();

				if (!consequent) {
					this.throwError('Expected expression');
				}

				this.gobbleSpaces();

				if (this.code === jsep.COLON_CODE) {
					this.index++;
					const alternate = this.gobbleExpression();

					if (!alternate) {
						this.throwError('Expected expression');
					}
					env.node = {
						type: CONDITIONAL_EXP,
						test,
						consequent,
						alternate,
					};

					// check for operators of higher priority than ternary (i.e. assignment)
					// jsep sets || at 1, and assignment at 0.9, and conditional should be between them
					if (test.operator && jsep.binary_ops[test.operator] <= 0.9) {
						let newTest = test;
						while (newTest.right.operator && jsep.binary_ops[newTest.right.operator] <= 0.9) {
							newTest = newTest.right;
						}
						env.node.test = newTest.right;
						newTest.right = env.node;
						env.node = test;
					}
				}
				else {
					this.throwError('Expected :');
				}
			}
		});
	},
};

// Add default plugins:

jsep.plugins.register(ternary);

module.exports = jsep;
//# sourceMappingURL=jsep.cjs.js.map
