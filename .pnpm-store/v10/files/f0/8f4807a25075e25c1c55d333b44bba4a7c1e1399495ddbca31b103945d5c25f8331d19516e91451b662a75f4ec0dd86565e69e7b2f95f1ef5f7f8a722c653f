import type {
	StringLiteral,
	FloatLiteral,
	IntegerLiteral,
	ArrayLiteral,
	Statement,
	Program,
	If,
	For,
	SetStatement,
	MemberExpression,
	CallExpression,
	Identifier,
	BinaryExpression,
	FilterExpression,
	TestExpression,
	UnaryExpression,
	SliceExpression,
	KeywordArgumentExpression,
	ObjectLiteral,
	TupleLiteral,
	Macro,
	Expression,
	SelectExpression,
	CallStatement,
	FilterStatement,
	Ternary,
	SpreadExpression,
} from "./ast";
import { range, replace, slice, strftime_now, titleCase } from "./utils";

export type AnyRuntimeValue =
	| IntegerValue
	| FloatValue
	| StringValue
	| BooleanValue
	| ObjectValue
	| ArrayValue
	| FunctionValue
	| NullValue
	| UndefinedValue;

// Control-flow exceptions for loop break/continue
class BreakControl extends Error {}
class ContinueControl extends Error {}

/**
 * Abstract base class for all Runtime values.
 * Should not be instantiated directly.
 */
abstract class RuntimeValue<T> {
	type = "RuntimeValue";
	value: T;

	/**
	 * A collection of built-in functions for this type.
	 */
	builtins = new Map<string, AnyRuntimeValue>();

	/**
	 * Creates a new RuntimeValue.
	 */
	constructor(value: T = undefined as unknown as T) {
		this.value = value;
	}

	/**
	 * Determines truthiness or falsiness of the runtime value.
	 * This function should be overridden by subclasses if it has custom truthiness criteria.
	 * @returns {BooleanValue} BooleanValue(true) if the value is truthy, BooleanValue(false) otherwise.
	 */
	__bool__(): BooleanValue {
		return new BooleanValue(!!this.value);
	}

	toString(): string {
		return String(this.value);
	}
}

/**
 * Represents an integer value at runtime.
 */
export class IntegerValue extends RuntimeValue<number> {
	override type = "IntegerValue";
}

/**
 * Represents a float value at runtime.
 */
export class FloatValue extends RuntimeValue<number> {
	override type = "FloatValue";

	override toString(): string {
		return this.value % 1 === 0 ? this.value.toFixed(1) : this.value.toString();
	}
}

/**
 * Represents a string value at runtime.
 */
export class StringValue extends RuntimeValue<string> {
	override type = "StringValue";

	override builtins = new Map<string, AnyRuntimeValue>([
		[
			"upper",
			new FunctionValue(() => {
				return new StringValue(this.value.toUpperCase());
			}),
		],
		[
			"lower",
			new FunctionValue(() => {
				return new StringValue(this.value.toLowerCase());
			}),
		],
		[
			"strip",
			new FunctionValue(() => {
				return new StringValue(this.value.trim());
			}),
		],
		[
			"title",
			new FunctionValue(() => {
				return new StringValue(titleCase(this.value));
			}),
		],
		[
			"capitalize",
			new FunctionValue(() => {
				return new StringValue(this.value.charAt(0).toUpperCase() + this.value.slice(1));
			}),
		],
		["length", new IntegerValue(this.value.length)],
		[
			"rstrip",
			new FunctionValue(() => {
				return new StringValue(this.value.trimEnd());
			}),
		],
		[
			"lstrip",
			new FunctionValue(() => {
				return new StringValue(this.value.trimStart());
			}),
		],
		[
			"startswith",
			new FunctionValue((args) => {
				if (args.length === 0) {
					throw new Error("startswith() requires at least one argument");
				}
				const pattern = args[0];
				if (pattern instanceof StringValue) {
					return new BooleanValue(this.value.startsWith(pattern.value));
				} else if (pattern instanceof ArrayValue) {
					for (const item of pattern.value) {
						if (!(item instanceof StringValue)) {
							throw new Error("startswith() tuple elements must be strings");
						}
						if (this.value.startsWith(item.value)) {
							return new BooleanValue(true);
						}
					}
					return new BooleanValue(false);
				}
				throw new Error("startswith() argument must be a string or tuple of strings");
			}),
		],
		[
			"endswith",
			new FunctionValue((args) => {
				if (args.length === 0) {
					throw new Error("endswith() requires at least one argument");
				}
				const pattern = args[0];
				if (pattern instanceof StringValue) {
					return new BooleanValue(this.value.endsWith(pattern.value));
				} else if (pattern instanceof ArrayValue) {
					for (const item of pattern.value) {
						if (!(item instanceof StringValue)) {
							throw new Error("endswith() tuple elements must be strings");
						}
						if (this.value.endsWith(item.value)) {
							return new BooleanValue(true);
						}
					}
					return new BooleanValue(false);
				}
				throw new Error("endswith() argument must be a string or tuple of strings");
			}),
		],
		[
			"split",
			// follows Python's `str.split(sep=None, maxsplit=-1)` function behavior
			// https://docs.python.org/3.13/library/stdtypes.html#str.split
			new FunctionValue((args) => {
				const sep = args[0] ?? new NullValue();
				if (!(sep instanceof StringValue || sep instanceof NullValue)) {
					throw new Error("sep argument must be a string or null");
				}
				const maxsplit = args[1] ?? new IntegerValue(-1);
				if (!(maxsplit instanceof IntegerValue)) {
					throw new Error("maxsplit argument must be a number");
				}

				let result = [];
				if (sep instanceof NullValue) {
					// If sep is not specified or is None, runs of consecutive whitespace are regarded as a single separator, and the
					// result will contain no empty strings at the start or end if the string has leading or trailing whitespace.
					// Trailing whitespace may be present when maxsplit is specified and there aren't sufficient matches in the string.
					const text = this.value.trimStart();
					for (const { 0: match, index } of text.matchAll(/\S+/g)) {
						if (maxsplit.value !== -1 && result.length >= maxsplit.value && index !== undefined) {
							result.push(match + text.slice(index + match.length));
							break;
						}
						result.push(match);
					}
				} else {
					// If sep is specified, consecutive delimiters are not grouped together and are deemed to delimit empty strings.
					if (sep.value === "") {
						throw new Error("empty separator");
					}
					result = this.value.split(sep.value);
					if (maxsplit.value !== -1 && result.length > maxsplit.value) {
						// Follow Python's behavior: If maxsplit is given, at most maxsplit splits are done,
						// with any remaining text returned as the final element of the list.
						result.push(result.splice(maxsplit.value).join(sep.value));
					}
				}
				return new ArrayValue(result.map((part) => new StringValue(part)));
			}),
		],
		[
			"replace",
			new FunctionValue((args): StringValue => {
				if (args.length < 2) {
					throw new Error("replace() requires at least two arguments");
				}
				const oldValue = args[0];
				const newValue = args[1];
				if (!(oldValue instanceof StringValue && newValue instanceof StringValue)) {
					throw new Error("replace() arguments must be strings");
				}

				let count: AnyRuntimeValue | undefined;
				if (args.length > 2) {
					if (args[2].type === "KeywordArgumentsValue") {
						count = (args[2] as KeywordArgumentsValue).value.get("count") ?? new NullValue();
					} else {
						count = args[2];
					}
				} else {
					count = new NullValue();
				}
				if (!(count instanceof IntegerValue || count instanceof NullValue)) {
					throw new Error("replace() count argument must be a number or null");
				}
				return new StringValue(replace(this.value, oldValue.value, newValue.value, count.value));
			}),
		],
	]);
}

/**
 * Represents a boolean value at runtime.
 */
export class BooleanValue extends RuntimeValue<boolean> {
	override type = "BooleanValue";
}

/**
 * Represents an Object value at runtime.
 */
export class ObjectValue extends RuntimeValue<Map<string, AnyRuntimeValue>> {
	override type = "ObjectValue";

	/**
	 * NOTE: necessary to override since all JavaScript arrays are considered truthy,
	 * while only non-empty Python arrays are consider truthy.
	 *
	 * e.g.,
	 *  - JavaScript:  {} && 5 -> 5
	 *  - Python:      {} and 5 -> {}
	 */
	override __bool__(): BooleanValue {
		return new BooleanValue(this.value.size > 0);
	}

	override builtins: Map<string, AnyRuntimeValue> = new Map<string, AnyRuntimeValue>([
		[
			"get",
			new FunctionValue(([key, defaultValue]) => {
				if (!(key instanceof StringValue)) {
					throw new Error(`Object key must be a string: got ${key.type}`);
				}
				return this.value.get(key.value) ?? defaultValue ?? new NullValue();
			}),
		],
		["items", new FunctionValue(() => this.items())],
		["keys", new FunctionValue(() => this.keys())],
		["values", new FunctionValue(() => this.values())],
	]);

	items(): ArrayValue {
		return new ArrayValue(
			Array.from(this.value.entries()).map(([key, value]) => new ArrayValue([new StringValue(key), value]))
		);
	}
	keys(): ArrayValue {
		return new ArrayValue(Array.from(this.value.keys()).map((key) => new StringValue(key)));
	}
	values(): ArrayValue {
		return new ArrayValue(Array.from(this.value.values()));
	}
}

/**
 * Represents a KeywordArguments value at runtime.
 */
export class KeywordArgumentsValue extends ObjectValue {
	override type = "KeywordArgumentsValue";
}

/**
 * Represents an Array value at runtime.
 */
export class ArrayValue extends RuntimeValue<AnyRuntimeValue[]> {
	override type = "ArrayValue";
	override builtins = new Map<string, AnyRuntimeValue>([["length", new IntegerValue(this.value.length)]]);

	/**
	 * NOTE: necessary to override since all JavaScript arrays are considered truthy,
	 * while only non-empty Python arrays are consider truthy.
	 *
	 * e.g.,
	 *  - JavaScript:  [] && 5 -> 5
	 *  - Python:      [] and 5 -> []
	 */
	override __bool__(): BooleanValue {
		return new BooleanValue(this.value.length > 0);
	}
}

/**
 * Represents a Tuple value at runtime.
 * NOTE: We extend ArrayValue since JavaScript does not have a built-in Tuple type.
 */
export class TupleValue extends ArrayValue {
	override type = "TupleValue";
}

/**
 * Represents a Function value at runtime.
 */
export class FunctionValue extends RuntimeValue<(args: AnyRuntimeValue[], scope: Environment) => AnyRuntimeValue> {
	override type = "FunctionValue";
}

/**
 * Represents a Null value at runtime.
 */
export class NullValue extends RuntimeValue<null> {
	override type = "NullValue";
}

/**
 * Represents an Undefined value at runtime.
 */
export class UndefinedValue extends RuntimeValue<undefined> {
	override type = "UndefinedValue";
}

/**
 * Represents the current environment (scope) at runtime.
 */
export class Environment {
	/**
	 * The variables declared in this environment.
	 */
	variables: Map<string, AnyRuntimeValue> = new Map([
		[
			"namespace",
			new FunctionValue((args) => {
				if (args.length === 0) {
					return new ObjectValue(new Map());
				}
				if (args.length !== 1 || !(args[0] instanceof ObjectValue)) {
					throw new Error("`namespace` expects either zero arguments or a single object argument");
				}
				return args[0];
			}),
		],
	]);

	/**
	 * The tests available in this environment.
	 */
	tests: Map<string, (...value: AnyRuntimeValue[]) => boolean> = new Map([
		["boolean", (operand) => operand.type === "BooleanValue"],
		["callable", (operand) => operand instanceof FunctionValue],
		[
			"odd",
			(operand) => {
				if (!(operand instanceof IntegerValue)) {
					throw new Error(`cannot odd on ${operand.type}`);
				}
				return operand.value % 2 !== 0;
			},
		],
		[
			"even",
			(operand) => {
				if (!(operand instanceof IntegerValue)) {
					throw new Error(`cannot even on ${operand.type}`);
				}
				return operand.value % 2 === 0;
			},
		],
		["false", (operand) => operand.type === "BooleanValue" && !(operand as BooleanValue).value],
		["true", (operand) => operand.type === "BooleanValue" && (operand as BooleanValue).value],
		["none", (operand) => operand.type === "NullValue"],
		["string", (operand) => operand.type === "StringValue"],
		["number", (operand) => operand instanceof IntegerValue || operand instanceof FloatValue],
		["integer", (operand) => operand instanceof IntegerValue],
		["iterable", (operand) => operand.type === "ArrayValue" || operand.type === "StringValue"],
		["mapping", (operand) => operand.type === "ObjectValue"],
		[
			"lower",
			(operand) => {
				const str = (operand as StringValue).value;
				return operand.type === "StringValue" && str === str.toLowerCase();
			},
		],
		[
			"upper",
			(operand) => {
				const str = (operand as StringValue).value;
				return operand.type === "StringValue" && str === str.toUpperCase();
			},
		],
		["none", (operand) => operand.type === "NullValue"],
		["defined", (operand) => operand.type !== "UndefinedValue"],
		["undefined", (operand) => operand.type === "UndefinedValue"],
		["equalto", (a, b) => a.value === b.value],
		["eq", (a, b) => a.value === b.value],
	]);

	constructor(public parent?: Environment) {}

	/**
	 * Set the value of a variable in the current environment.
	 */
	set(name: string, value: unknown): AnyRuntimeValue {
		return this.declareVariable(name, convertToRuntimeValues(value));
	}

	private declareVariable(name: string, value: AnyRuntimeValue): AnyRuntimeValue {
		if (this.variables.has(name)) {
			throw new SyntaxError(`Variable already declared: ${name}`);
		}
		this.variables.set(name, value);
		return value;
	}

	// private assignVariable(name: string, value: AnyRuntimeValue): AnyRuntimeValue {
	// 	const env = this.resolve(name);
	// 	env.variables.set(name, value);
	// 	return value;
	// }

	/**
	 * Set variable in the current scope.
	 * See https://jinja.palletsprojects.com/en/3.0.x/templates/#assignments for more information.
	 */
	setVariable(name: string, value: AnyRuntimeValue): AnyRuntimeValue {
		this.variables.set(name, value);
		return value;
	}

	/**
	 * Resolve the environment in which the variable is declared.
	 * @param {string} name The name of the variable.
	 * @returns {Environment} The environment in which the variable is declared.
	 */
	private resolve(name: string): Environment {
		if (this.variables.has(name)) {
			return this;
		}

		// Traverse scope chain
		if (this.parent) {
			return this.parent.resolve(name);
		}

		throw new Error(`Unknown variable: ${name}`);
	}

	lookupVariable(name: string): AnyRuntimeValue {
		try {
			return this.resolve(name).variables.get(name) ?? new UndefinedValue();
		} catch {
			return new UndefinedValue();
		}
	}
}

export function setupGlobals(env: Environment): void {
	// Declare global variables
	env.set("false", false);
	env.set("true", true);
	env.set("none", null);
	env.set("raise_exception", (args: string) => {
		throw new Error(args);
	});
	env.set("range", range);
	env.set("strftime_now", strftime_now);

	// NOTE: According to the Jinja docs: The special constants true, false, and none are indeed lowercase.
	// Because that caused confusion in the past, (True used to expand to an undefined variable that was considered false),
	// all three can now also be written in title case (True, False, and None). However, for consistency, (all Jinja identifiers are lowercase)
	// you should use the lowercase versions.
	env.set("True", true);
	env.set("False", false);
	env.set("None", null);
}

export class Interpreter {
	global: Environment;

	constructor(env?: Environment) {
		this.global = env ?? new Environment();
	}

	/**
	 * Run the program.
	 */
	run(program: Program): AnyRuntimeValue {
		return this.evaluate(program, this.global);
	}

	/**
	 * Evaluates expressions following the binary operation type.
	 */
	private evaluateBinaryExpression(node: BinaryExpression, environment: Environment): AnyRuntimeValue {
		const left = this.evaluate(node.left, environment);

		// Logical operators
		// NOTE: Short-circuiting is handled by the `evaluate` function
		switch (node.operator.value) {
			case "and":
				return left.__bool__().value ? this.evaluate(node.right, environment) : left;
			case "or":
				return left.__bool__().value ? left : this.evaluate(node.right, environment);
		}

		// Equality operators
		const right = this.evaluate(node.right, environment);
		switch (node.operator.value) {
			case "==":
				return new BooleanValue(left.value == right.value);
			case "!=":
				return new BooleanValue(left.value != right.value);
		}

		if (left instanceof UndefinedValue || right instanceof UndefinedValue) {
			if (right instanceof UndefinedValue && ["in", "not in"].includes(node.operator.value)) {
				// Special case: `anything in undefined` is `false` and `anything not in undefined` is `true`
				return new BooleanValue(node.operator.value === "not in");
			}
			throw new Error(`Cannot perform operation ${node.operator.value} on undefined values`);
		} else if (left instanceof NullValue || right instanceof NullValue) {
			throw new Error("Cannot perform operation on null values");
		} else if (node.operator.value === "~") {
			// toString and concatenation
			return new StringValue(left.value.toString() + right.value.toString());
		} else if (
			(left instanceof IntegerValue || left instanceof FloatValue) &&
			(right instanceof IntegerValue || right instanceof FloatValue)
		) {
			// Evaulate pure numeric operations with binary operators.
			const a = left.value,
				b = right.value;
			switch (node.operator.value) {
				// Arithmetic operators
				case "+":
				case "-":
				case "*": {
					const res = node.operator.value === "+" ? a + b : node.operator.value === "-" ? a - b : a * b;
					const isFloat = left instanceof FloatValue || right instanceof FloatValue;
					return isFloat ? new FloatValue(res) : new IntegerValue(res);
				}
				case "/":
					return new FloatValue(a / b);
				case "%": {
					const rem = a % b;
					const isFloat = left instanceof FloatValue || right instanceof FloatValue;
					return isFloat ? new FloatValue(rem) : new IntegerValue(rem);
				}
				// Comparison operators
				case "<":
					return new BooleanValue(a < b);
				case ">":
					return new BooleanValue(a > b);
				case ">=":
					return new BooleanValue(a >= b);
				case "<=":
					return new BooleanValue(a <= b);
			}
		} else if (left instanceof ArrayValue && right instanceof ArrayValue) {
			// Evaluate array operands with binary operator.
			switch (node.operator.value) {
				case "+":
					return new ArrayValue(left.value.concat(right.value));
			}
		} else if (right instanceof ArrayValue) {
			const member = right.value.find((x) => x.value === left.value) !== undefined;
			switch (node.operator.value) {
				case "in":
					return new BooleanValue(member);
				case "not in":
					return new BooleanValue(!member);
			}
		}

		if (left instanceof StringValue || right instanceof StringValue) {
			// Support string concatenation as long as at least one operand is a string
			switch (node.operator.value) {
				case "+":
					return new StringValue(left.value.toString() + right.value.toString());
			}
		}

		if (left instanceof StringValue && right instanceof StringValue) {
			switch (node.operator.value) {
				case "in":
					return new BooleanValue(right.value.includes(left.value));
				case "not in":
					return new BooleanValue(!right.value.includes(left.value));
			}
		}

		if (left instanceof StringValue && right instanceof ObjectValue) {
			switch (node.operator.value) {
				case "in":
					return new BooleanValue(right.value.has(left.value));
				case "not in":
					return new BooleanValue(!right.value.has(left.value));
			}
		}

		throw new SyntaxError(`Unknown operator "${node.operator.value}" between ${left.type} and ${right.type}`);
	}

	private evaluateArguments(
		args: Expression[],
		environment: Environment
	): [AnyRuntimeValue[], Map<string, AnyRuntimeValue>] {
		// Accumulate args and kwargs
		const positionalArguments: AnyRuntimeValue[] = [];
		const keywordArguments = new Map<string, AnyRuntimeValue>();

		for (const argument of args) {
			// TODO: Lazy evaluation of arguments
			if (argument.type === "SpreadExpression") {
				const spreadNode = argument as SpreadExpression;
				const val = this.evaluate(spreadNode.argument, environment);
				if (!(val instanceof ArrayValue)) {
					throw new Error(`Cannot unpack non-iterable type: ${val.type}`);
				}
				for (const item of val.value) {
					positionalArguments.push(item);
				}
			} else if (argument.type === "KeywordArgumentExpression") {
				const kwarg = argument as KeywordArgumentExpression;
				keywordArguments.set(kwarg.key.value, this.evaluate(kwarg.value, environment));
			} else {
				if (keywordArguments.size > 0) {
					throw new Error("Positional arguments must come before keyword arguments");
				}
				positionalArguments.push(this.evaluate(argument, environment));
			}
		}
		return [positionalArguments, keywordArguments];
	}

	private applyFilter(operand: AnyRuntimeValue, filterNode: Identifier | CallExpression, environment: Environment) {
		// For now, we only support the built-in filters
		// TODO: Add support for non-identifier filters
		//   e.g., functions which return filters: {{ numbers | select("odd") }}
		// TODO: Add support for user-defined filters
		//   const filter = environment.lookupVariable(node.filter.value);
		//   if (!(filter instanceof FunctionValue)) {
		//     throw new Error(`Filter must be a function: got ${filter.type}`);
		//   }
		//   return filter.value([operand], environment);

		// https://jinja.palletsprojects.com/en/3.0.x/templates/#list-of-builtin-filters

		if (filterNode.type === "Identifier") {
			const filter = filterNode as Identifier;

			if (filter.value === "tojson") {
				return new StringValue(toJSON(operand));
			}

			if (operand instanceof ArrayValue) {
				switch (filter.value) {
					case "list":
						return operand;
					case "first":
						return operand.value[0];
					case "last":
						return operand.value[operand.value.length - 1];
					case "length":
						return new IntegerValue(operand.value.length);
					case "reverse":
						return new ArrayValue(operand.value.reverse());
					case "sort":
						return new ArrayValue(
							operand.value.sort((a, b) => {
								if (a.type !== b.type) {
									throw new Error(`Cannot compare different types: ${a.type} and ${b.type}`);
								}
								switch (a.type) {
									case "IntegerValue":
									case "FloatValue":
										return (a as IntegerValue | FloatValue).value - (b as IntegerValue | FloatValue).value;
									case "StringValue":
										return (a as StringValue).value.localeCompare((b as StringValue).value);
									default:
										throw new Error(`Cannot compare type: ${a.type}`);
								}
							})
						);
					case "join":
						return new StringValue(operand.value.map((x) => x.value).join(""));
					case "string":
						return new StringValue(toJSON(operand));
					case "unique": {
						const seen = new Set();
						const output: AnyRuntimeValue[] = [];
						for (const item of operand.value) {
							if (!seen.has(item.value)) {
								seen.add(item.value);
								output.push(item);
							}
						}
						return new ArrayValue(output);
					}
					default:
						throw new Error(`Unknown ArrayValue filter: ${filter.value}`);
				}
			} else if (operand instanceof StringValue) {
				switch (filter.value) {
					// Filters that are also built-in functions
					case "length":
					case "upper":
					case "lower":
					case "title":
					case "capitalize": {
						const builtin = operand.builtins.get(filter.value);
						if (builtin instanceof FunctionValue) {
							return builtin.value(/* no arguments */ [], environment);
						} else if (builtin instanceof IntegerValue) {
							return builtin;
						} else {
							throw new Error(`Unknown StringValue filter: ${filter.value}`);
						}
					}
					case "trim":
						return new StringValue(operand.value.trim());
					case "indent":
						return new StringValue(
							operand.value
								.split("\n")
								.map((x, i) =>
									// By default, don't indent the first line or empty lines
									i === 0 || x.length === 0 ? x : "    " + x
								)
								.join("\n")
						);
					case "join":
					case "string":
						return operand; // no-op
					case "int": {
						const val = parseInt(operand.value, 10);
						return new IntegerValue(isNaN(val) ? 0 : val);
					}
					case "float": {
						const val = parseFloat(operand.value);
						return new FloatValue(isNaN(val) ? 0.0 : val);
					}
					default:
						throw new Error(`Unknown StringValue filter: ${filter.value}`);
				}
			} else if (operand instanceof IntegerValue || operand instanceof FloatValue) {
				switch (filter.value) {
					case "abs":
						return operand instanceof IntegerValue
							? new IntegerValue(Math.abs(operand.value))
							: new FloatValue(Math.abs(operand.value));
					case "int":
						return new IntegerValue(Math.floor(operand.value));
					case "float":
						return new FloatValue(operand.value);
					default:
						throw new Error(`Unknown NumericValue filter: ${filter.value}`);
				}
			} else if (operand instanceof ObjectValue) {
				switch (filter.value) {
					case "items":
						return new ArrayValue(
							Array.from(operand.value.entries()).map(([key, value]) => new ArrayValue([new StringValue(key), value]))
						);
					case "length":
						return new IntegerValue(operand.value.size);
					default:
						throw new Error(`Unknown ObjectValue filter: ${filter.value}`);
				}
			} else if (operand instanceof BooleanValue) {
				switch (filter.value) {
					case "bool":
						return new BooleanValue(operand.value);
					case "int":
						return new IntegerValue(operand.value ? 1 : 0);
					case "float":
						return new FloatValue(operand.value ? 1.0 : 0.0);
					case "string":
						return new StringValue(operand.value ? "true" : "false");
					default:
						throw new Error(`Unknown BooleanValue filter: ${filter.value}`);
				}
			}
			throw new Error(`Cannot apply filter "${filter.value}" to type: ${operand.type}`);
		} else if (filterNode.type === "CallExpression") {
			const filter = filterNode as CallExpression;

			if (filter.callee.type !== "Identifier") {
				throw new Error(`Unknown filter: ${filter.callee.type}`);
			}
			const filterName = (filter.callee as Identifier).value;

			if (filterName === "tojson") {
				const [, kwargs] = this.evaluateArguments(filter.args, environment);
				const indent = kwargs.get("indent") ?? new NullValue();
				if (!(indent instanceof IntegerValue || indent instanceof NullValue)) {
					throw new Error("If set, indent must be a number");
				}
				return new StringValue(toJSON(operand, indent.value));
			} else if (filterName === "join") {
				let value;
				if (operand instanceof StringValue) {
					// NOTE: string.split('') breaks for unicode characters
					value = Array.from(operand.value);
				} else if (operand instanceof ArrayValue) {
					value = operand.value.map((x) => x.value);
				} else {
					throw new Error(`Cannot apply filter "${filterName}" to type: ${operand.type}`);
				}
				const [args, kwargs] = this.evaluateArguments(filter.args, environment);

				const separator = args.at(0) ?? kwargs.get("separator") ?? new StringValue("");
				if (!(separator instanceof StringValue)) {
					throw new Error("separator must be a string");
				}

				return new StringValue(value.join(separator.value));
			} else if (filterName === "int" || filterName === "float") {
				const [args, kwargs] = this.evaluateArguments(filter.args, environment);
				const defaultValue =
					args.at(0) ?? kwargs.get("default") ?? (filterName === "int" ? new IntegerValue(0) : new FloatValue(0.0));

				if (operand instanceof StringValue) {
					const val = filterName === "int" ? parseInt(operand.value, 10) : parseFloat(operand.value);
					return isNaN(val) ? defaultValue : filterName === "int" ? new IntegerValue(val) : new FloatValue(val);
				} else if (operand instanceof IntegerValue || operand instanceof FloatValue) {
					return operand;
				} else if (operand instanceof BooleanValue) {
					return filterName === "int"
						? new IntegerValue(operand.value ? 1 : 0)
						: new FloatValue(operand.value ? 1.0 : 0.0);
				} else {
					throw new Error(`Cannot apply filter "${filterName}" to type: ${operand.type}`);
				}
			} else if (filterName === "default") {
				const [args, kwargs] = this.evaluateArguments(filter.args, environment);
				const defaultValue = args[0] ?? new StringValue("");
				const booleanValue = args[1] ?? kwargs.get("boolean") ?? new BooleanValue(false);
				if (!(booleanValue instanceof BooleanValue)) {
					throw new Error("`default` filter flag must be a boolean");
				}
				if (operand instanceof UndefinedValue || (booleanValue.value && !operand.__bool__().value)) {
					return defaultValue;
				}
				return operand;
			}

			if (operand instanceof ArrayValue) {
				switch (filterName) {
					case "selectattr":
					case "rejectattr": {
						const select = filterName === "selectattr";

						if (operand.value.some((x) => !(x instanceof ObjectValue))) {
							throw new Error(`\`${filterName}\` can only be applied to array of objects`);
						}
						if (filter.args.some((x) => x.type !== "StringLiteral")) {
							throw new Error(`arguments of \`${filterName}\` must be strings`);
						}

						const [attr, testName, value] = filter.args.map((x) => this.evaluate(x, environment)) as StringValue[];

						let testFunction: (...x: AnyRuntimeValue[]) => boolean;
						if (testName) {
							// Get the test function from the environment
							const test = environment.tests.get(testName.value);
							if (!test) {
								throw new Error(`Unknown test: ${testName.value}`);
							}
							testFunction = test;
						} else {
							// Default to truthiness of first argument
							testFunction = (...x: AnyRuntimeValue[]) => x[0].__bool__().value;
						}

						// Filter the array using the test function
						const filtered = (operand.value as ObjectValue[]).filter((item) => {
							const a = item.value.get(attr.value);
							const result = a ? testFunction(a, value) : false;
							return select ? result : !result;
						});

						return new ArrayValue(filtered);
					}
					case "map": {
						// Accumulate kwargs
						const [, kwargs] = this.evaluateArguments(filter.args, environment);

						if (kwargs.has("attribute")) {
							// Mapping on attributes
							const attr = kwargs.get("attribute");
							if (!(attr instanceof StringValue)) {
								throw new Error("attribute must be a string");
							}
							const defaultValue = kwargs.get("default");
							const mapped = operand.value.map((item) => {
								if (!(item instanceof ObjectValue)) {
									throw new Error("items in map must be an object");
								}
								return item.value.get(attr.value) ?? defaultValue ?? new UndefinedValue();
							});
							return new ArrayValue(mapped);
						} else {
							throw new Error("`map` expressions without `attribute` set are not currently supported.");
						}
					}
				}
				throw new Error(`Unknown ArrayValue filter: ${filterName}`);
			} else if (operand instanceof StringValue) {
				switch (filterName) {
					case "indent": {
						// https://jinja.palletsprojects.com/en/3.1.x/templates/#jinja-filters.indent
						// Return a copy of the string with each line indented by 4 spaces. The first line and blank lines are not indented by default.
						// Parameters:
						//  - width: Number of spaces, or a string, to indent by.
						//  - first: Don't skip indenting the first line.
						//  - blank: Don't skip indenting empty lines.

						const [args, kwargs] = this.evaluateArguments(filter.args, environment);

						const width = args.at(0) ?? kwargs.get("width") ?? new IntegerValue(4);
						if (!(width instanceof IntegerValue)) {
							throw new Error("width must be a number");
						}
						const first = args.at(1) ?? kwargs.get("first") ?? new BooleanValue(false);
						const blank = args.at(2) ?? kwargs.get("blank") ?? new BooleanValue(false);

						const lines = operand.value.split("\n");
						const indent = " ".repeat(width.value);
						const indented = lines.map((x, i) =>
							(!first.value && i === 0) || (!blank.value && x.length === 0) ? x : indent + x
						);
						return new StringValue(indented.join("\n"));
					}
					case "replace": {
						const replaceFn = operand.builtins.get("replace");
						if (!(replaceFn instanceof FunctionValue)) {
							throw new Error("replace filter not available");
						}
						const [args, kwargs] = this.evaluateArguments(filter.args, environment);
						return replaceFn.value([...args, new KeywordArgumentsValue(kwargs)], environment);
					}
				}
				throw new Error(`Unknown StringValue filter: ${filterName}`);
			} else {
				throw new Error(`Cannot apply filter "${filterName}" to type: ${operand.type}`);
			}
		}
		throw new Error(`Unknown filter: ${filterNode.type}`);
	}

	/**
	 * Evaluates expressions following the filter operation type.
	 */
	private evaluateFilterExpression(node: FilterExpression, environment: Environment): AnyRuntimeValue {
		const operand = this.evaluate(node.operand, environment);
		return this.applyFilter(operand, node.filter, environment);
	}

	/**
	 * Evaluates expressions following the test operation type.
	 */
	private evaluateTestExpression(node: TestExpression, environment: Environment): BooleanValue {
		// For now, we only support the built-in tests
		// https://jinja.palletsprojects.com/en/3.0.x/templates/#list-of-builtin-tests
		//
		// TODO: Add support for non-identifier tests. e.g., divisibleby(number)
		const operand = this.evaluate(node.operand, environment);

		const test = environment.tests.get(node.test.value);
		if (!test) {
			throw new Error(`Unknown test: ${node.test.value}`);
		}
		const result = test(operand);
		return new BooleanValue(node.negate ? !result : result);
	}

	/**
	 * Evaluates expressions following the select operation type.
	 */
	private evaluateSelectExpression(node: SelectExpression, environment: Environment): AnyRuntimeValue {
		const predicate = this.evaluate(node.test, environment);
		if (!predicate.__bool__().value) {
			return new UndefinedValue();
		}
		return this.evaluate(node.lhs, environment);
	}

	/**
	 * Evaluates expressions following the unary operation type.
	 */
	private evaluateUnaryExpression(node: UnaryExpression, environment: Environment): AnyRuntimeValue {
		const argument = this.evaluate(node.argument, environment);

		switch (node.operator.value) {
			case "not":
				return new BooleanValue(!argument.value);
			default:
				throw new SyntaxError(`Unknown operator: ${node.operator.value}`);
		}
	}

	private evaluateTernaryExpression(node: Ternary, environment: Environment): AnyRuntimeValue {
		const cond = this.evaluate(node.condition, environment);
		return cond.__bool__().value
			? this.evaluate(node.trueExpr, environment)
			: this.evaluate(node.falseExpr, environment);
	}

	private evalProgram(program: Program, environment: Environment): StringValue {
		return this.evaluateBlock(program.body, environment);
	}

	private evaluateBlock(statements: Statement[], environment: Environment): StringValue {
		// Jinja templates always evaluate to a String,
		// so we accumulate the result of each statement into a final string

		let result = "";
		for (const statement of statements) {
			const lastEvaluated: AnyRuntimeValue = this.evaluate(statement, environment);

			if (lastEvaluated.type !== "NullValue" && lastEvaluated.type !== "UndefinedValue") {
				result += lastEvaluated.toString();
			}
		}

		return new StringValue(result);
	}

	private evaluateIdentifier(node: Identifier, environment: Environment): AnyRuntimeValue {
		return environment.lookupVariable(node.value);
	}

	private evaluateCallExpression(expr: CallExpression, environment: Environment): AnyRuntimeValue {
		// Accumulate all keyword arguments into a single object, which will be
		// used as the final argument in the call function.
		const [args, kwargs] = this.evaluateArguments(expr.args, environment);

		if (kwargs.size > 0) {
			args.push(new KeywordArgumentsValue(kwargs));
		}

		const fn = this.evaluate(expr.callee, environment);
		if (fn.type !== "FunctionValue") {
			throw new Error(`Cannot call something that is not a function: got ${fn.type}`);
		}
		return (fn as FunctionValue).value(args, environment);
	}

	private evaluateSliceExpression(
		object: AnyRuntimeValue,
		expr: SliceExpression,
		environment: Environment
	): ArrayValue | StringValue {
		if (!(object instanceof ArrayValue || object instanceof StringValue)) {
			throw new Error("Slice object must be an array or string");
		}

		const start = this.evaluate(expr.start, environment);
		const stop = this.evaluate(expr.stop, environment);
		const step = this.evaluate(expr.step, environment);

		// Validate arguments
		if (!(start instanceof IntegerValue || start instanceof UndefinedValue)) {
			throw new Error("Slice start must be numeric or undefined");
		}
		if (!(stop instanceof IntegerValue || stop instanceof UndefinedValue)) {
			throw new Error("Slice stop must be numeric or undefined");
		}
		if (!(step instanceof IntegerValue || step instanceof UndefinedValue)) {
			throw new Error("Slice step must be numeric or undefined");
		}

		if (object instanceof ArrayValue) {
			return new ArrayValue(slice(object.value, start.value, stop.value, step.value));
		} else {
			return new StringValue(slice(Array.from(object.value), start.value, stop.value, step.value).join(""));
		}
	}

	private evaluateMemberExpression(expr: MemberExpression, environment: Environment): AnyRuntimeValue {
		const object = this.evaluate(expr.object, environment);

		let property;
		if (expr.computed) {
			if (expr.property.type === "SliceExpression") {
				return this.evaluateSliceExpression(object, expr.property as SliceExpression, environment);
			} else {
				property = this.evaluate(expr.property, environment);
			}
		} else {
			property = new StringValue((expr.property as Identifier).value);
		}

		let value;
		if (object instanceof ObjectValue) {
			if (!(property instanceof StringValue)) {
				throw new Error(`Cannot access property with non-string: got ${property.type}`);
			}
			value = object.value.get(property.value) ?? object.builtins.get(property.value);
		} else if (object instanceof ArrayValue || object instanceof StringValue) {
			if (property instanceof IntegerValue) {
				value = object.value.at(property.value);
				if (object instanceof StringValue) {
					value = new StringValue(object.value.at(property.value));
				}
			} else if (property instanceof StringValue) {
				value = object.builtins.get(property.value);
			} else {
				throw new Error(`Cannot access property with non-string/non-number: got ${property.type}`);
			}
		} else {
			if (!(property instanceof StringValue)) {
				throw new Error(`Cannot access property with non-string: got ${property.type}`);
			}
			value = object.builtins.get(property.value);
		}

		return value instanceof RuntimeValue ? value : new UndefinedValue();
	}

	private evaluateSet(node: SetStatement, environment: Environment): NullValue {
		const rhs = node.value ? this.evaluate(node.value, environment) : this.evaluateBlock(node.body, environment);
		if (node.assignee.type === "Identifier") {
			const variableName = (node.assignee as Identifier).value;
			environment.setVariable(variableName, rhs);
		} else if (node.assignee.type === "TupleLiteral") {
			const tuple = node.assignee as TupleLiteral;
			if (!(rhs instanceof ArrayValue)) {
				throw new Error(`Cannot unpack non-iterable type in set: ${rhs.type}`);
			}
			const arr = rhs.value;
			if (arr.length !== tuple.value.length) {
				throw new Error(`Too ${tuple.value.length > arr.length ? "few" : "many"} items to unpack in set`);
			}
			for (let i = 0; i < tuple.value.length; ++i) {
				const elem = tuple.value[i];
				if (elem.type !== "Identifier") {
					throw new Error(`Cannot unpack to non-identifier in set: ${elem.type}`);
				}
				environment.setVariable((elem as Identifier).value, arr[i]);
			}
		} else if (node.assignee.type === "MemberExpression") {
			const member = node.assignee as MemberExpression;

			const object = this.evaluate(member.object, environment);
			if (!(object instanceof ObjectValue)) {
				throw new Error("Cannot assign to member of non-object");
			}
			if (member.property.type !== "Identifier") {
				throw new Error("Cannot assign to member with non-identifier property");
			}
			object.value.set((member.property as Identifier).value, rhs);
		} else {
			throw new Error(`Invalid LHS inside assignment expression: ${JSON.stringify(node.assignee)}`);
		}

		return new NullValue();
	}

	private evaluateIf(node: If, environment: Environment): StringValue {
		const test = this.evaluate(node.test, environment);
		return this.evaluateBlock(test.__bool__().value ? node.body : node.alternate, environment);
	}

	private evaluateFor(node: For, environment: Environment): StringValue {
		// Scope for the for loop
		const scope = new Environment(environment);

		let test, iterable;
		if (node.iterable.type === "SelectExpression") {
			const select = node.iterable as SelectExpression;
			iterable = this.evaluate(select.lhs, scope);
			test = select.test;
		} else {
			iterable = this.evaluate(node.iterable, scope);
		}

		if (!(iterable instanceof ArrayValue || iterable instanceof ObjectValue)) {
			throw new Error(`Expected iterable or object type in for loop: got ${iterable.type}`);
		}

		if (iterable instanceof ObjectValue) {
			iterable = iterable.keys();
		}

		const items: Expression[] = [];
		const scopeUpdateFunctions: ((scope: Environment) => void)[] = [];
		for (let i = 0; i < iterable.value.length; ++i) {
			const loopScope = new Environment(scope);

			const current = iterable.value[i];

			let scopeUpdateFunction;
			if (node.loopvar.type === "Identifier") {
				scopeUpdateFunction = (scope: Environment) => scope.setVariable((node.loopvar as Identifier).value, current);
			} else if (node.loopvar.type === "TupleLiteral") {
				const loopvar = node.loopvar as TupleLiteral;
				if (current.type !== "ArrayValue") {
					throw new Error(`Cannot unpack non-iterable type: ${current.type}`);
				}
				const c = current as ArrayValue;

				// check if too few or many items to unpack
				if (loopvar.value.length !== c.value.length) {
					throw new Error(`Too ${loopvar.value.length > c.value.length ? "few" : "many"} items to unpack`);
				}

				scopeUpdateFunction = (scope: Environment) => {
					for (let j = 0; j < loopvar.value.length; ++j) {
						if (loopvar.value[j].type !== "Identifier") {
							throw new Error(`Cannot unpack non-identifier type: ${loopvar.value[j].type}`);
						}
						scope.setVariable((loopvar.value[j] as Identifier).value, c.value[j]);
					}
				};
			} else {
				throw new Error(`Invalid loop variable(s): ${node.loopvar.type}`);
			}

			if (test) {
				scopeUpdateFunction(loopScope);

				const testValue = this.evaluate(test, loopScope);
				if (!testValue.__bool__().value) {
					continue;
				}
			}

			items.push(current);
			scopeUpdateFunctions.push(scopeUpdateFunction);
		}

		let result = "";

		let noIteration = true;
		for (let i = 0; i < items.length; ++i) {
			// Update the loop variable
			// TODO: Only create object once, then update value?
			const loop = new Map([
				["index", new IntegerValue(i + 1)],
				["index0", new IntegerValue(i)],
				["revindex", new IntegerValue(items.length - i)],
				["revindex0", new IntegerValue(items.length - i - 1)],
				["first", new BooleanValue(i === 0)],
				["last", new BooleanValue(i === items.length - 1)],
				["length", new IntegerValue(items.length)],
				["previtem", i > 0 ? items[i - 1] : new UndefinedValue()],
				["nextitem", i < items.length - 1 ? items[i + 1] : new UndefinedValue()],
			] as [string, AnyRuntimeValue][]);

			scope.setVariable("loop", new ObjectValue(loop));

			// Update scope for this iteration
			scopeUpdateFunctions[i](scope);

			try {
				// Evaluate the body of the for loop
				const evaluated = this.evaluateBlock(node.body, scope);
				result += evaluated.value;
			} catch (err) {
				if (err instanceof ContinueControl) {
					continue;
				}
				if (err instanceof BreakControl) {
					break;
				}
				throw err;
			}

			// At least one iteration took place
			noIteration = false;
		}

		// no iteration took place, so we render the default block
		if (noIteration) {
			const defaultEvaluated = this.evaluateBlock(node.defaultBlock, scope);
			result += defaultEvaluated.value;
		}

		return new StringValue(result);
	}

	/**
	 * See https://jinja.palletsprojects.com/en/3.1.x/templates/#macros for more information.
	 */
	private evaluateMacro(node: Macro, environment: Environment): NullValue {
		environment.setVariable(
			node.name.value,
			new FunctionValue((args, scope) => {
				const macroScope = new Environment(scope);

				args = args.slice(); // Make a copy of the arguments

				// Separate positional and keyword arguments
				let kwargs;
				if (args.at(-1)?.type === "KeywordArgumentsValue") {
					kwargs = args.pop() as KeywordArgumentsValue;
				}

				// Assign values to all arguments defined by the node
				for (let i = 0; i < node.args.length; ++i) {
					const nodeArg = node.args[i];
					const passedArg = args[i];
					if (nodeArg.type === "Identifier") {
						const identifier = nodeArg as Identifier;
						if (!passedArg) {
							throw new Error(`Missing positional argument: ${identifier.value}`);
						}
						macroScope.setVariable(identifier.value, passedArg);
					} else if (nodeArg.type === "KeywordArgumentExpression") {
						const kwarg = nodeArg as KeywordArgumentExpression;
						const value =
							passedArg ?? // Try positional arguments first
							kwargs?.value.get(kwarg.key.value) ?? // Look in user-passed kwargs
							this.evaluate(kwarg.value, macroScope); // Use the default defined by the node
						macroScope.setVariable(kwarg.key.value, value);
					} else {
						throw new Error(`Unknown argument type: ${nodeArg.type}`);
					}
				}
				return this.evaluateBlock(node.body, macroScope);
			})
		);

		// Macros are not evaluated immediately, so we return null
		return new NullValue();
	}

	private evaluateCallStatement(node: CallStatement, environment: Environment): AnyRuntimeValue {
		const callerFn = new FunctionValue((callerArgs: AnyRuntimeValue[], callerEnv: Environment) => {
			const callBlockEnv = new Environment(callerEnv);
			if (node.callerArgs) {
				for (let i = 0; i < node.callerArgs.length; ++i) {
					const param = node.callerArgs[i];
					if (param.type !== "Identifier") {
						throw new Error(`Caller parameter must be an identifier, got ${param.type}`);
					}
					callBlockEnv.setVariable((param as Identifier).value, callerArgs[i] ?? new UndefinedValue());
				}
			}
			return this.evaluateBlock(node.body, callBlockEnv);
		});

		const [macroArgs, macroKwargs] = this.evaluateArguments(node.call.args, environment);
		macroArgs.push(new KeywordArgumentsValue(macroKwargs));
		const fn = this.evaluate(node.call.callee, environment);
		if (fn.type !== "FunctionValue") {
			throw new Error(`Cannot call something that is not a function: got ${fn.type}`);
		}
		const newEnv = new Environment(environment);
		newEnv.setVariable("caller", callerFn);
		return (fn as FunctionValue).value(macroArgs, newEnv);
	}

	private evaluateFilterStatement(node: FilterStatement, environment: Environment): AnyRuntimeValue {
		const rendered = this.evaluateBlock(node.body, environment);
		return this.applyFilter(rendered, node.filter, environment);
	}

	evaluate(statement: Statement | undefined, environment: Environment): AnyRuntimeValue {
		if (!statement) return new UndefinedValue();

		switch (statement.type) {
			// Program
			case "Program":
				return this.evalProgram(statement as Program, environment);

			// Statements
			case "Set":
				return this.evaluateSet(statement as SetStatement, environment);
			case "If":
				return this.evaluateIf(statement as If, environment);
			case "For":
				return this.evaluateFor(statement as For, environment);
			case "Macro":
				return this.evaluateMacro(statement as Macro, environment);
			case "CallStatement":
				return this.evaluateCallStatement(statement as CallStatement, environment);

			case "Break":
				throw new BreakControl();
			case "Continue":
				throw new ContinueControl();

			// Expressions
			case "IntegerLiteral":
				return new IntegerValue((statement as IntegerLiteral).value);
			case "FloatLiteral":
				return new FloatValue((statement as FloatLiteral).value);
			case "StringLiteral":
				return new StringValue((statement as StringLiteral).value);
			case "ArrayLiteral":
				return new ArrayValue((statement as ArrayLiteral).value.map((x) => this.evaluate(x, environment)));
			case "TupleLiteral":
				return new TupleValue((statement as TupleLiteral).value.map((x) => this.evaluate(x, environment)));
			case "ObjectLiteral": {
				const mapping = new Map();
				for (const [key, value] of (statement as ObjectLiteral).value) {
					const evaluatedKey = this.evaluate(key, environment);
					if (!(evaluatedKey instanceof StringValue)) {
						throw new Error(`Object keys must be strings: got ${evaluatedKey.type}`);
					}
					mapping.set(evaluatedKey.value, this.evaluate(value, environment));
				}
				return new ObjectValue(mapping);
			}
			case "Identifier":
				return this.evaluateIdentifier(statement as Identifier, environment);
			case "CallExpression":
				return this.evaluateCallExpression(statement as CallExpression, environment);
			case "MemberExpression":
				return this.evaluateMemberExpression(statement as MemberExpression, environment);

			case "UnaryExpression":
				return this.evaluateUnaryExpression(statement as UnaryExpression, environment);
			case "BinaryExpression":
				return this.evaluateBinaryExpression(statement as BinaryExpression, environment);
			case "FilterExpression":
				return this.evaluateFilterExpression(statement as FilterExpression, environment);
			case "FilterStatement":
				return this.evaluateFilterStatement(statement as FilterStatement, environment);
			case "TestExpression":
				return this.evaluateTestExpression(statement as TestExpression, environment);
			case "SelectExpression":
				return this.evaluateSelectExpression(statement as SelectExpression, environment);
			case "Ternary":
				return this.evaluateTernaryExpression(statement as Ternary, environment);
			case "Comment":
				return new NullValue();
			default:
				throw new SyntaxError(`Unknown node type: ${statement.type}`);
		}
	}
}

/**
 * Helper function to convert JavaScript values to runtime values.
 */
function convertToRuntimeValues(input: unknown): AnyRuntimeValue {
	switch (typeof input) {
		case "number":
			return Number.isInteger(input) ? new IntegerValue(input) : new FloatValue(input);
		case "string":
			return new StringValue(input);
		case "boolean":
			return new BooleanValue(input);
		case "undefined":
			return new UndefinedValue();
		case "object":
			if (input === null) {
				return new NullValue();
			} else if (Array.isArray(input)) {
				return new ArrayValue(input.map(convertToRuntimeValues));
			} else {
				return new ObjectValue(
					new Map(Object.entries(input).map(([key, value]) => [key, convertToRuntimeValues(value)]))
				);
			}
		case "function":
			// Wrap the user's function in a runtime function
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			return new FunctionValue((args, _scope) => {
				// NOTE: `_scope` is not used since it's in the global scope
				const result = input(...args.map((x) => x.value)) ?? null; // map undefined -> null
				return convertToRuntimeValues(result);
			});
		default:
			throw new Error(`Cannot convert to runtime value: ${input}`);
	}
}

/**
 * Helper function to convert runtime values to JSON
 * @param {AnyRuntimeValue} input The runtime value to convert
 * @param {number|null} [indent] The number of spaces to indent, or null for no indentation
 * @param {number} [depth] The current depth of the object
 * @returns {string} JSON representation of the input
 */
function toJSON(input: AnyRuntimeValue, indent?: number | null, depth?: number): string {
	const currentDepth = depth ?? 0;
	switch (input.type) {
		case "NullValue":
		case "UndefinedValue": // JSON.stringify(undefined) -> undefined
			return "null";
		case "IntegerValue":
		case "FloatValue":
		case "StringValue":
		case "BooleanValue":
			return JSON.stringify(input.value);
		case "ArrayValue":
		case "ObjectValue": {
			const indentValue = indent ? " ".repeat(indent) : "";
			const basePadding = "\n" + indentValue.repeat(currentDepth);
			const childrenPadding = basePadding + indentValue; // Depth + 1

			if (input.type === "ArrayValue") {
				const core = (input as ArrayValue).value.map((x) => toJSON(x, indent, currentDepth + 1));
				return indent
					? `[${childrenPadding}${core.join(`,${childrenPadding}`)}${basePadding}]`
					: `[${core.join(", ")}]`;
			} else {
				// ObjectValue
				const core = Array.from((input as ObjectValue).value.entries()).map(([key, value]) => {
					const v = `"${key}": ${toJSON(value, indent, currentDepth + 1)}`;
					return indent ? `${childrenPadding}${v}` : v;
				});
				return indent ? `{${core.join(",")}${basePadding}}` : `{${core.join(", ")}}`;
			}
		}
		default:
			// e.g., FunctionValue
			throw new Error(`Cannot convert to JSON: ${input.type}`);
	}
}
