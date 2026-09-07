/**
 * AST Interpreter for SDK code.
 * Safely evaluates SDK code by walking the AST instead of using eval/Function.
 */
import type * as ESTree from 'estree';

import {
	InterpreterError,
	UnsupportedNodeError,
	UnknownIdentifierError,
	SecurityError,
	ResourceLimitError,
} from './errors';
import { parseSDKCode } from './parser';
import {
	validateNodeType,
	validateCallExpression,
	validateMemberExpression,
	validateIdentifier,
	isAllowedSDKFunction,
	isAutoRenameableSDKFunction,
	isAllowedMethod,
	allowedMethodNames,
	getSafeJSONMethod,
	getSafeStringMethod,
} from './validators';

/**
 * SDK functions that will be provided to the interpreter.
 * Uses a generic function type to allow any SDK function signature.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SDKFunctions = Record<string, (...args: any[]) => unknown>;

/**
 * Interpreter for SDK code.
 * Walks the AST and evaluates SDK patterns.
 */
class SDKInterpreter {
	private static readonly MAX_EVAL_DEPTH = 500;
	private static readonly MAX_STATEMENT_COUNT = 5_000;
	/** Smallest data budget any program gets, however short it is. */
	private static readonly MIN_ALLOCATED_UNITS = 200_000;
	/** Extra data budget per character of source, on top of that MIN_ALLOCATED_UNITS minimum. */
	private static readonly ALLOCATION_AMPLIFICATION = 20;

	private sdkFunctions: Map<string, (...args: unknown[]) => unknown>;
	private variables: Map<string, unknown>;
	private renamedVariables: Map<string, string> = new Map();
	private sourceCode: string;
	private evalDepth = 0;
	/** Ceiling on the data this program may produce, derived in constructor from the input program length. */
	private readonly maxAllocatedUnits: number;
	/** How much of that ceiling has been used so far. */
	private allocatedUnits = 0;
	/** What each array/object holds, so referencing one can be sized without walking it again. */
	private valueWeights = new WeakMap<object, number>();

	constructor(sdkFunctions: SDKFunctions, sourceCode: string) {
		this.sdkFunctions = new Map(Object.entries(sdkFunctions));
		this.variables = new Map();
		this.sourceCode = sourceCode;
		this.maxAllocatedUnits = Math.max(
			SDKInterpreter.MIN_ALLOCATED_UNITS,
			sourceCode.length * SDKInterpreter.ALLOCATION_AMPLIFICATION,
		);
	}

	private generateSafeName(name: string): string {
		const base = 'my' + name.charAt(0).toUpperCase() + name.slice(1);
		let candidate = base;
		let counter = 1;
		while (this.variables.has(candidate) || this.sdkFunctions.has(candidate)) {
			candidate = `${base}${counter}`;
			counter++;
		}
		return candidate;
	}

	/**
	 * Interpret the AST program and return the result.
	 */
	interpret(ast: ESTree.Program): unknown {
		this.assertAstBodyLengthWithinLimits(ast);

		let result: unknown;

		for (const stmt of ast.body) {
			validateNodeType(stmt, this.sourceCode);

			switch (stmt.type) {
				case 'VariableDeclaration':
					this.visitVariableDeclaration(stmt);
					break;
				case 'ExpressionStatement':
					result = this.evaluate(stmt.expression);
					break;
				case 'ExportDefaultDeclaration':
					return this.evaluate(stmt.declaration as ESTree.Expression);
				default:
					throw new UnsupportedNodeError(stmt.type, stmt.loc ?? undefined, this.sourceCode);
			}
		}

		return result;
	}

	/**
	 * Assert that the AST body length is within the allowed limits.
	 * Throws a ResourceLimitError if the limit is exceeded.
	 * @param ast
	 */
	private assertAstBodyLengthWithinLimits(ast: ESTree.Program): void {
		if (ast.body.length <= SDKInterpreter.MAX_STATEMENT_COUNT) {
			return;
		}

		throw new ResourceLimitError(
			'statement-count',
			ast.loc ?? undefined,
			this.sourceCode,
			`Program has ${ast.body.length} top-level statements; the limit is ${SDKInterpreter.MAX_STATEMENT_COUNT}.`,
		);
	}

	/**
	 * Process a variable declaration.
	 */
	private visitVariableDeclaration(node: ESTree.VariableDeclaration): void {
		// Only allow const declarations
		if (node.kind !== 'const') {
			throw new SecurityError(
				node.kind,
				node.loc ?? undefined,
				this.sourceCode,
				`'${node.kind}' declarations are not allowed. Use 'const' only.`,
			);
		}

		for (const declarator of node.declarations) {
			if (declarator.id.type !== 'Identifier') {
				throw new UnsupportedNodeError(
					'Destructuring in variable declaration',
					declarator.loc ?? undefined,
					this.sourceCode,
				);
			}

			const name = declarator.id.name;

			// Check for SDK function name collisions
			if (isAllowedSDKFunction(name)) {
				if (isAutoRenameableSDKFunction(name)) {
					// Auto-rename subnode variables that collide with SDK function names
					const safeName = this.generateSafeName(name);
					const value = declarator.init ? this.evaluate(declarator.init) : undefined;
					this.renamedVariables.set(name, safeName);
					this.variables.set(safeName, value);
					continue;
				}
				throw new SecurityError(
					name,
					declarator.loc ?? undefined,
					this.sourceCode,
					`'${name}' is a reserved SDK function name and cannot be used as a variable name. ` +
						`Use a different name like 'my${name.charAt(0).toUpperCase() + name.slice(1)}'.`,
				);
			}

			const value = declarator.init ? this.evaluate(declarator.init) : undefined;
			this.variables.set(name, value);
		}
	}

	/**
	 * Evaluate an expression and return its value.
	 */
	private evaluate(node: ESTree.Expression | ESTree.SpreadElement | null): unknown {
		if (node === null) {
			return undefined;
		}

		this.assertDepthWithinLimits(node);

		this.evalDepth++;
		try {
			return this.evaluateNode(node);
		} finally {
			this.evalDepth--;
		}
	}

	/**
	 * Run a recursive helper under the same nesting-depth guard as `evaluate()`,
	 * for helpers that walk the AST directly instead of calling `evaluate()`.
	 */
	private withDepthGuard<T>(node: { loc?: ESTree.SourceLocation | null }, fn: () => T): T {
		// Assert the depth on every node visit, not just on the initial evaluate() call, to catch cycles in method chains.
		this.assertDepthWithinLimits(node);

		this.evalDepth++;
		try {
			return fn();
		} finally {
			this.evalDepth--;
		}
	}

	/**
	 * Assert that the current evaluation depth is within the allowed limits.
	 * Throws a ResourceLimitError if the limit is exceeded.
	 * @param node
	 */
	private assertDepthWithinLimits(node: { loc?: ESTree.SourceLocation | null }): void {
		if (this.evalDepth < SDKInterpreter.MAX_EVAL_DEPTH) {
			return;
		}

		throw new ResourceLimitError(
			'nesting-depth',
			node.loc ?? undefined,
			this.sourceCode,
			'Expression nesting too deep (possible cycle in method chain)',
		);
	}

	private chargeBudget(units: number, location?: ESTree.SourceLocation): void {
		if (units <= 0) {
			return;
		}

		if (this.allocatedUnits + units <= this.maxAllocatedUnits) {
			this.allocatedUnits += units;
			return;
		}

		throw new ResourceLimitError(
			'allocation-budget',
			location,
			this.sourceCode,
			'SDK code produced or traversed too much data. Limit is ' +
				`${this.maxAllocatedUnits} total elements/characters.`,
		);
	}

	/** How much data a value holds: a string's length, an array/object's tracked total, otherwise 1. */
	private sizeOf(value: unknown): number {
		if (value !== null && typeof value === 'object') {
			return Math.max(this.valueWeights.get(value) ?? 1, 1);
		}

		if (typeof value === 'string') {
			return Math.max(value.length, 1);
		}

		return 1;
	}

	private assertValueSizeWithinLimits(size: number, location?: ESTree.SourceLocation): void {
		if (size <= this.maxAllocatedUnits) {
			return;
		}

		throw new ResourceLimitError(
			'allocation-budget',
			location,
			this.sourceCode,
			`A single value grew to ${size} elements/characters; the limit is ${this.maxAllocatedUnits}.`,
		);
	}

	/**
	 * Spaces JSON.stringify adds per level of nesting, which it never passes to
	 * the replacer. It caps both forms at ten, so charging has to cap them too.
	 */
	private calculateIndentationWidth(space: unknown): number {
		const maxCap = 10;
		if (typeof space === 'number') {
			return Math.max(Math.min(Math.trunc(space), maxCap), 0);
		}

		if (typeof space === 'string') {
			return Math.min(space.length, maxCap);
		}

		return 0;
	}

	/**
	 * Serializing a POJO into JSON writes every repeated reference out in full, so the output can
	 * be much bigger than its input.
	 */
	private safeJSONStringify(
		value: unknown,
		space: unknown,
		location?: ESTree.SourceLocation,
	): string | undefined {
		this.assertValueSizeWithinLimits(this.sizeOf(value), location);

		const indentWidth = this.calculateIndentationWidth(space);
		const depths = new WeakMap<object, number>();
		const charge = (units: number) => this.chargeBudget(units, location);

		/**
		 * The replacer is the only hook into the walk, so it is where an oversized value
		 * can be stopped before the whole string exists.
		 */
		const replacer = function (this: unknown, key: string, val: unknown) {
			// `this` is the array or object holding this node, and a holder is always
			// reached before its members, so its depth is already recorded.
			const depth = key === '' ? 0 : (depths.get(this as object) ?? 0) + 1;
			if (val !== null && typeof val === 'object') {
				depths.set(val, depth);
			}

			charge(key.length + depth * indentWidth + (typeof val === 'string' ? val.length : 1));
			return val;
		};

		const result = JSON.stringify(value, replacer, space as string | number | undefined);

		if (typeof result === 'string') {
			this.chargeBudget(result.length, location);
		}

		return result;
	}

	private evaluateNode(node: ESTree.Expression | ESTree.SpreadElement): unknown {
		validateNodeType(node, this.sourceCode);

		switch (node.type) {
			case 'CallExpression':
				return this.visitCallExpression(node);
			case 'MemberExpression':
				return this.visitMemberExpression(node);
			case 'ObjectExpression':
				return this.visitObjectExpression(node);
			case 'ArrayExpression':
				return this.visitArrayExpression(node);
			case 'Identifier':
				return this.visitIdentifier(node);
			case 'Literal':
				return node.value;
			case 'TemplateLiteral':
				return this.visitTemplateLiteral(node);
			case 'SpreadElement':
				return this.visitSpreadElement(node);
			case 'UnaryExpression':
				return this.visitUnaryExpression(node);
			case 'BinaryExpression':
				return this.visitBinaryExpression(node);
			case 'LogicalExpression':
				return this.visitLogicalExpression(node);
			case 'ConditionalExpression':
				return this.visitConditionalExpression(node);
			case 'AssignmentExpression':
				return this.visitAssignmentExpression(node);
			default:
				throw new UnsupportedNodeError(node.type, node.loc ?? undefined, this.sourceCode);
		}
	}

	/**
	 * Visit a call expression.
	 */
	private visitCallExpression(node: ESTree.CallExpression): unknown {
		validateCallExpression(node, this.sourceCode);

		// Get the function to call
		let func: unknown;
		let thisArg: unknown;

		if (node.callee.type === 'Identifier') {
			// Direct function call: workflow(...), node(...), etc.
			const name = node.callee.name;

			if (this.sdkFunctions.has(name)) {
				func = this.sdkFunctions.get(name);
			} else {
				// Check variables, including auto-renamed ones
				const resolvedName = this.renamedVariables.get(name) ?? name;
				if (this.variables.has(resolvedName)) {
					func = this.variables.get(resolvedName);
				} else {
					throw new UnknownIdentifierError(name, node.callee.loc ?? undefined, this.sourceCode);
				}
			}
		} else if (node.callee.type === 'MemberExpression') {
			// Method call: wf.add(...), node.to(...), etc.
			const memberExpr = node.callee;
			validateMemberExpression(memberExpr, this.sourceCode);

			// Handle Super type (super keyword) - not supported in SDK code
			if (memberExpr.object.type === 'Super') {
				throw new UnsupportedNodeError(
					'super keyword is not supported in SDK code',
					memberExpr.object.loc ?? undefined,
					this.sourceCode,
				);
			}

			// Get method name
			let methodName: string;
			if (memberExpr.property.type === 'Identifier') {
				methodName = memberExpr.property.name;
			} else if (
				memberExpr.property.type === 'Literal' &&
				typeof memberExpr.property.value === 'string'
			) {
				methodName = memberExpr.property.value;
			} else {
				throw new UnsupportedNodeError(
					'Dynamic method name',
					memberExpr.property.loc ?? undefined,
					this.sourceCode,
				);
			}

			// Handle safe global methods (e.g. JSON.stringify, JSON.parse)
			// Must check before evaluating the object, since the global itself is blocked
			if (memberExpr.object.type === 'Identifier') {
				const safeMethod = getSafeJSONMethod(memberExpr.object.name, methodName);
				if (safeMethod) {
					const args = node.arguments.map((arg) => this.evaluate(arg));
					if (methodName === 'stringify') {
						// The replacer slot is reserved for the size guard below.
						if (args[1] !== undefined && args[1] !== null) {
							throw new UnsupportedNodeError(
								'JSON.stringify replacer',
								node.loc ?? undefined,
								this.sourceCode,
							);
						}
						return this.safeJSONStringify(args[0], args[2], node.loc ?? undefined);
					}
					return safeMethod(...args);
				}
			}

			thisArg = this.evaluate(memberExpr.object);

			// Handle safe string methods (e.g. "abc".repeat(3))
			const safeStringMethod = getSafeStringMethod(thisArg, methodName);
			if (safeStringMethod) {
				const args = node.arguments.map((arg) => this.evaluate(arg));
				if (methodName === 'repeat' && typeof thisArg === 'string') {
					// Coerce like native String.prototype.repeat does, so a numeric
					// string (e.g. "1e9") can't dodge the charge below.
					const coercedCount = Number(args[0]);
					const count = Number.isFinite(coercedCount) && coercedCount > 0 ? coercedCount : 0;
					this.chargeBudget(thisArg.length * count, node.loc ?? undefined);
				}
				return safeStringMethod(...args);
			}

			// Validate method name against allowlist
			if (!isAllowedMethod(methodName)) {
				throw new SecurityError(
					methodName,
					memberExpr.property.loc ?? undefined,
					this.sourceCode,
					`Method '${methodName}' is not an allowed SDK method. ` +
						`Allowed methods: ${allowedMethodNames().join(', ')}. ` +
						'Native array/string methods are not available in SDK code; ' +
						'use a Code node or an n8n expression for runtime logic.',
				);
			}

			if (thisArg && typeof thisArg === 'object') {
				func = (thisArg as Record<string, unknown>)[methodName];
			}
		} else {
			throw new UnsupportedNodeError(
				`Callee type ${node.callee.type}`,
				node.callee.loc ?? undefined,
				this.sourceCode,
			);
		}

		if (typeof func !== 'function') {
			throw new InterpreterError(
				'Cannot call non-function',
				node.loc ?? undefined,
				this.sourceCode,
			);
		}

		// Evaluate arguments
		const args = node.arguments.map((arg) => this.evaluate(arg));

		// Call the function
		return func.apply(thisArg, args);
	}

	/**
	 * Visit a member expression (for property access, not method calls).
	 */
	private visitMemberExpression(node: ESTree.MemberExpression): unknown {
		validateMemberExpression(node, this.sourceCode);

		// Handle Super type (super keyword) - not supported in SDK code
		if (node.object.type === 'Super') {
			throw new UnsupportedNodeError(
				'super keyword is not supported in SDK code',
				node.object.loc ?? undefined,
				this.sourceCode,
			);
		}

		const obj = this.evaluate(node.object);

		if (obj === null || obj === undefined) {
			throw new InterpreterError(
				`Cannot access property on ${obj}`,
				node.loc ?? undefined,
				this.sourceCode,
			);
		}

		// Get property name
		let propName: string | number;
		if (node.property.type === 'Identifier' && !node.computed) {
			propName = node.property.name;
		} else if (node.property.type === 'Literal') {
			propName = node.property.value as string | number;
		} else {
			throw new UnsupportedNodeError(
				'Dynamic property access',
				node.property.loc ?? undefined,
				this.sourceCode,
			);
		}

		return (obj as Record<string | number, unknown>)[propName];
	}

	/**
	 * Visit an object expression.
	 */
	private visitObjectExpression(node: ESTree.ObjectExpression): Record<string, unknown> {
		const result: Record<string, unknown> = {};
		let weight = 0;

		for (const prop of node.properties) {
			if (prop.type === 'SpreadElement') {
				// Handle spread: { ...obj }
				const spreadValue = this.evaluate(prop.argument);
				if (spreadValue && typeof spreadValue === 'object') {
					for (const key of Object.keys(spreadValue)) {
						const value = (spreadValue as Record<string, unknown>)[key];
						this.chargeBudget(1, prop.loc ?? undefined);
						result[key] = value;

						weight += this.sizeOf(value);
					}
				}
			} else if (prop.type === 'Property') {
				// Get key
				let key: string;
				if (prop.key.type === 'Identifier') {
					key = prop.key.name;
				} else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
					key = prop.key.value;
				} else if (prop.key.type === 'Literal' && typeof prop.key.value === 'number') {
					key = String(prop.key.value);
				} else {
					throw new UnsupportedNodeError(
						`Object key type ${prop.key.type}`,
						prop.key.loc ?? undefined,
						this.sourceCode,
					);
				}

				// Get value (handle shorthand: { name } === { name: name })
				const value = this.evaluate(prop.value as ESTree.Expression);
				this.chargeBudget(1, prop.loc ?? undefined);
				result[key] = value;
				weight += this.sizeOf(value);
			}
		}

		this.assertValueSizeWithinLimits(weight, node.loc ?? undefined);
		this.valueWeights.set(result, weight);
		return result;
	}

	/**
	 * Visit an array expression.
	 */
	private visitArrayExpression(node: ESTree.ArrayExpression): unknown[] {
		const result: unknown[] = [];
		let weight = 0;

		for (const element of node.elements) {
			if (element === null) {
				result.push(undefined);
				weight += 1;
			} else if (element.type === 'SpreadElement') {
				const spreadValue = this.evaluate(element.argument);
				if (Array.isArray(spreadValue)) {
					for (const item of spreadValue) {
						this.chargeBudget(1, element.loc ?? undefined);
						result.push(item);
						weight += this.sizeOf(item);
					}
				}
			} else {
				const value = this.evaluate(element);
				this.chargeBudget(1, element.loc ?? undefined);
				result.push(value);
				weight += this.sizeOf(value);
			}
		}

		this.assertValueSizeWithinLimits(weight, node.loc ?? undefined);
		this.valueWeights.set(result, weight);
		return result;
	}

	/**
	 * Visit an identifier.
	 */
	private visitIdentifier(node: ESTree.Identifier): unknown {
		const name = node.name;

		// Locally declared variables shadow the dangerous-globals blocklist,
		// so a user-declared `const fetch = node(...)` resolves to their value
		// rather than being rejected as access to the real `fetch` global.
		const resolvedName = this.renamedVariables.get(name) ?? name;
		if (this.variables.has(resolvedName)) {
			return this.variables.get(resolvedName);
		}

		// Check for dangerous globals (only when not shadowed by a local)
		validateIdentifier(name, this.getVariableNames(), node, this.sourceCode);

		// Check if it's an SDK function
		if (this.sdkFunctions.has(name)) {
			return this.sdkFunctions.get(name);
		}

		// Allow certain safe built-ins
		if (name === 'undefined') return undefined;
		if (name === 'null') return null;
		if (name === 'true') return true;
		if (name === 'false') return false;
		if (name === 'NaN') return NaN;
		if (name === 'Infinity') return Infinity;

		throw new UnknownIdentifierError(name, node.loc ?? undefined, this.sourceCode);
	}

	/**
	 * Visit a template literal.
	 * Handles n8n runtime variables by preserving them as escaped strings.
	 */
	private visitTemplateLiteral(node: ESTree.TemplateLiteral): string {
		let result = '';

		for (let i = 0; i < node.quasis.length; i++) {
			const quasi = node.quasis[i];
			// Use cooked value (with escape sequences processed), or raw if cooked is null
			result += quasi.value.cooked ?? quasi.value.raw;

			// If there's an expression after this quasi
			if (i < node.expressions.length) {
				const expr = node.expressions[i];
				const value = this.evaluateTemplateExpression(expr);
				// charge 1 unit to the budget for each character in the evaluated expression to avoid huge template literal output
				this.chargeBudget(value.length, expr.loc ?? undefined);
				result += value;
			}
		}

		return result;
	}

	/**
	 * Evaluate a template expression.
	 * For n8n runtime variables, return them as literal ${...} strings.
	 */
	private evaluateTemplateExpression(expr: ESTree.Expression): string {
		// Check if this looks like an n8n runtime variable (starts with $)
		if (this.isN8nRuntimeVariable(expr)) {
			// Return as escaped literal string: ${$json.name} becomes literal string "${$json.name}"

			return '${' + this.expressionToString(expr) + '}';
		}

		// Otherwise evaluate the expression
		const value = this.evaluate(expr);
		return String(value);
	}

	/**
	 * Check if an expression is an n8n runtime variable.
	 * These start with $ like $json, $today, $input, etc.
	 */
	private isN8nRuntimeVariable(expr: ESTree.Expression): boolean {
		return this.withDepthGuard(expr, () => {
			if (expr.type === 'Identifier') {
				return expr.name.startsWith('$');
			}

			if (expr.type === 'MemberExpression') {
				return this.isN8nRuntimeVariable(expr.object as ESTree.Expression);
			}

			if (expr.type === 'CallExpression') {
				if (expr.callee.type === 'Identifier') {
					return expr.callee.name.startsWith('$');
				}

				if (expr.callee.type === 'MemberExpression') {
					return this.isN8nRuntimeVariable(expr.callee.object as ESTree.Expression);
				}
			}

			return false;
		});
	}

	/**
	 * Convert an expression back to its source string representation.
	 * Used for preserving n8n runtime variables in template literals.
	 */
	private expressionToString(expr: ESTree.Expression): string {
		return this.withDepthGuard(expr, () => {
			if (expr.type === 'Identifier') {
				return expr.name;
			}

			if (expr.type === 'MemberExpression') {
				const obj = this.expressionToString(expr.object as ESTree.Expression);

				if (expr.computed) {
					if (expr.property.type === 'Literal') {
						return `${obj}[${JSON.stringify(expr.property.value)}]`;
					}
					return `${obj}[${this.expressionToString(expr.property as ESTree.Expression)}]`;
				}

				const prop = expr.property.type === 'Identifier' ? expr.property.name : '';
				return `${obj}.${prop}`;
			}

			if (expr.type === 'CallExpression') {
				const callee = this.expressionToString(expr.callee as ESTree.Expression);
				const args = expr.arguments
					.map((arg) => {
						if (arg.type === 'SpreadElement') {
							return '...' + this.expressionToString(arg.argument);
						}
						return this.expressionToString(arg);
					})
					.join(', ');

				return `${callee}(${args})`;
			}

			if (expr.type === 'Literal') {
				if (typeof expr.value === 'string') {
					return JSON.stringify(expr.value);
				}
				return String(expr.value);
			}

			if (expr.type === 'BinaryExpression' || expr.type === 'LogicalExpression') {
				const left = this.expressionToString(expr.left as ESTree.Expression);
				const right = this.expressionToString(expr.right);

				return `${left} ${expr.operator} ${right}`;
			}

			if (expr.type === 'ConditionalExpression') {
				const test = this.expressionToString(expr.test);
				const consequent = this.expressionToString(expr.consequent);
				const alternate = this.expressionToString(expr.alternate);

				return `${test} ? ${consequent} : ${alternate}`;
			}

			if (expr.type === 'UnaryExpression') {
				const unary = expr;
				const arg = this.expressionToString(unary.argument);

				return unary.prefix ? `${unary.operator}${arg}` : `${arg}${unary.operator}`;
			}

			// Fallback: extract from source code if we have location info
			if (expr.loc && this.sourceCode) {
				const lines = this.sourceCode.split('\n');
				const startLine = expr.loc.start.line - 1;
				const endLine = expr.loc.end.line - 1;

				if (startLine === endLine) {
					return lines[startLine].slice(expr.loc.start.column, expr.loc.end.column);
				}
			}

			return '';
		});
	}

	/**
	 * Visit a spread element.
	 */
	private visitSpreadElement(node: ESTree.SpreadElement): unknown {
		return this.evaluate(node.argument);
	}

	/**
	 * Visit a unary expression.
	 */
	private visitUnaryExpression(node: ESTree.UnaryExpression): unknown {
		const arg = this.evaluate(node.argument);

		switch (node.operator) {
			case '-':
				return -(arg as number);
			case '+':
				return +(arg as number);
			case '!':
				return !arg;
			case 'typeof':
				return typeof arg;
			case 'void':
				return undefined;
			default:
				throw new UnsupportedNodeError(
					`Unary operator ${node.operator}`,
					node.loc ?? undefined,
					this.sourceCode,
				);
		}
	}

	/**
	 * Visit a binary expression.
	 */
	private visitBinaryExpression(node: ESTree.BinaryExpression): unknown {
		const left = this.evaluate(node.left as ESTree.Expression);
		const right = this.evaluate(node.right);

		switch (node.operator) {
			case '+':
				if (typeof left === 'string' || typeof right === 'string') {
					// Only the appended part is new; charging the whole result would
					// make an n-piece chain cost O(n^2) for linear output.
					this.chargeBudget(String(right).length, node.loc ?? undefined);
					return String(left) + String(right);
				}
				return (left as number) + (right as number);
			case '-':
				return (left as number) - (right as number);
			case '*':
				return (left as number) * (right as number);
			case '/':
				return (left as number) / (right as number);
			case '%':
				return (left as number) % (right as number);
			case '**':
				return (left as number) ** (right as number);
			case '==':
				// eslint-disable-next-line eqeqeq
				return left == right;
			case '!=':
				// eslint-disable-next-line eqeqeq
				return left != right;
			case '===':
				return left === right;
			case '!==':
				return left !== right;
			case '<':
				return (left as number) < (right as number);
			case '<=':
				return (left as number) <= (right as number);
			case '>':
				return (left as number) > (right as number);
			case '>=':
				return (left as number) >= (right as number);
			default:
				throw new UnsupportedNodeError(
					`Binary operator ${node.operator}`,
					node.loc ?? undefined,
					this.sourceCode,
				);
		}
	}

	/**
	 * Visit a logical expression.
	 */
	private visitLogicalExpression(node: ESTree.LogicalExpression): unknown {
		const left = this.evaluate(node.left);

		switch (node.operator) {
			case '&&':
				return left ? this.evaluate(node.right) : left;
			case '||':
				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Implementing JS || semantics
				return left ? left : this.evaluate(node.right);
			case '??':
				return left ?? this.evaluate(node.right);
			default:
				throw new UnsupportedNodeError(
					`Logical operator ${String(node.operator)}`,
					node.loc ?? undefined,
					this.sourceCode,
				);
		}
	}

	/**
	 * Visit a conditional expression (ternary).
	 */
	private visitConditionalExpression(node: ESTree.ConditionalExpression): unknown {
		const test = this.evaluate(node.test);
		return test ? this.evaluate(node.consequent) : this.evaluate(node.alternate);
	}

	/**
	 * Visit an assignment expression.
	 * Only allows simple property assignment (obj.prop = value).
	 */
	private visitAssignmentExpression(node: ESTree.AssignmentExpression): unknown {
		if (node.operator !== '=') {
			throw new UnsupportedNodeError(
				`Assignment operator '${node.operator}' is not allowed. Only '=' is permitted.`,
				node.loc ?? undefined,
				this.sourceCode,
			);
		}

		if (node.left.type !== 'MemberExpression') {
			throw new UnsupportedNodeError(
				'Only property assignment (e.g., obj.prop = value) is allowed. Variable reassignment is not permitted.',
				node.loc ?? undefined,
				this.sourceCode,
			);
		}

		validateMemberExpression(node.left, this.sourceCode);

		if (node.left.object.type === 'Super') {
			throw new UnsupportedNodeError(
				'super keyword is not supported in SDK code',
				node.left.object.loc ?? undefined,
				this.sourceCode,
			);
		}

		const obj = this.evaluate(node.left.object);

		if (obj === null || obj === undefined) {
			throw new InterpreterError(
				`Cannot assign property on ${String(obj)}`,
				node.loc ?? undefined,
				this.sourceCode,
			);
		}

		let propName: string | number;
		if (node.left.property.type === 'Identifier' && !node.left.computed) {
			propName = node.left.property.name;
		} else if (node.left.property.type === 'Literal') {
			propName = node.left.property.value as string | number;
		} else {
			throw new UnsupportedNodeError(
				'Dynamic property assignment',
				node.left.property.loc ?? undefined,
				this.sourceCode,
			);
		}

		const value = this.evaluate(node.right);
		this.chargeBudget(1, node.loc ?? undefined);
		(obj as Record<string | number, unknown>)[propName] = value;

		// Assigning grows the target, so its recorded size has to grow with it or
		// every later check reads the size it had when it was built. An overwrite
		// is counted as an addition, which overstates it in the safe direction.
		const grown = this.sizeOf(obj) + this.sizeOf(value);
		this.assertValueSizeWithinLimits(grown, node.loc ?? undefined);
		this.valueWeights.set(obj as object, grown);

		return value;
	}

	/**
	 * Get set of declared variable names.
	 */
	private getVariableNames(): Set<string> {
		return new Set(this.variables.keys());
	}
}

/**
 * Interpret SDK code with the provided SDK functions.
 *
 * @param code - The SDK code to interpret
 * @param sdkFunctions - The SDK functions to provide to the interpreter
 * @returns The result of executing the code
 */
export function interpretSDKCode(code: string, sdkFunctions: SDKFunctions): unknown {
	const ast = parseSDKCode(code);
	const interpreter = new SDKInterpreter(sdkFunctions, code);
	return interpreter.interpret(ast);
}
