import * as acorn from 'acorn';

/**
 * What a lambda's first parameter reads at runtime: the current item, the paginated response, or
 * the fields of a credential.
 */
export type LambdaRoot = '$json' | '$response' | '$credentials';

/** `js` is the rewritten body, for embedding; `expression` is the n8n parameter value. */
export type LambdaResult =
	| { ok: true; js: string; expression: string }
	| { ok: false; error: string };

/** JavaScript globals that n8n expressions can also use. */
const GLOBALS = new Set([
	'JSON',
	'Math',
	'Number',
	'String',
	'Boolean',
	'Array',
	'Object',
	'Date',
	'RegExp',
	'parseInt',
	'parseFloat',
	'isNaN',
	'isFinite',
	'encodeURIComponent',
	'decodeURIComponent',
	'encodeURI',
	'decodeURI',
	'undefined',
	'NaN',
	'Infinity',
]);

/** `$.<key>` in a lambda compiles to this n8n expression text. */
export const BUILTINS: Record<string, string> = {
	now: '$now',
	today: '$today',
	execution: '$execution',
	workflow: '$workflow',
	vars: '$vars',
	date: 'DateTime.fromISO',
};

const ITEM_JSON_ERROR =
	'The item is already the JSON of the node before: write item.field, not item.json.field. For a field named "json", write item["json"]';

/** Reads that the n8n item wrapper has but `$("Node")` already skips. */
const WRAPPER_READS = new Set(['json', 'item']);

interface Replacement {
	start: number;
	end: number;
	text: string;
}

interface Params {
	item?: string;
	/** Destructured item fields: local name → field name. */
	fields: ReadonlyMap<string, string>;
	dollar?: string;
}

export const isAstNode = (value: unknown): value is acorn.AnyNode =>
	typeof value === 'object' &&
	value !== null &&
	'type' in value &&
	typeof value.type === 'string' &&
	'start' in value &&
	typeof value.start === 'number';

export const childNodes = (node: acorn.AnyNode): acorn.AnyNode[] =>
	Object.values(node).flatMap((value: unknown) =>
		Array.isArray(value) ? value.filter(isAstNode) : isAstNode(value) ? [value] : [],
	);

function patternNames(pattern: acorn.AnyNode): string[] {
	switch (pattern.type) {
		case 'Identifier':
			return [pattern.name];
		case 'ObjectPattern':
			return pattern.properties.flatMap((property) =>
				property.type === 'RestElement' ? patternNames(property) : patternNames(property.value),
			);
		case 'ArrayPattern':
			return pattern.elements.flatMap((element) => (element ? patternNames(element) : []));
		case 'RestElement':
			return patternNames(pattern.argument);
		case 'AssignmentPattern':
			return patternNames(pattern.left);
		default:
			return [];
	}
}

function blockDeclarations(block: acorn.BlockStatement): string[] {
	return block.body.flatMap((statement) =>
		statement.type === 'VariableDeclaration'
			? statement.declarations.flatMap((declaration) => patternNames(declaration.id))
			: [],
	);
}

/** The bundle of a sandbox build reads a named import as `import_<module>.<name>`. */
const BUNDLED_IMPORT = /^import_\w+$/;

const freeNameError = (name: string) =>
	`The lambda reads "${name}", which n8n cannot see at runtime. Inline the value or read it with $("Node")${
		name === 'placeholder' ? '. Give placeholder(…) as the whole field value, not in a lambda' : ''
	}`;

function readParams(params: acorn.Pattern[]): Params | string {
	const [item, dollar, ...rest] = params;
	if (rest.length > 0) return 'A lambda takes at most two parameters: (item, $)';
	if (dollar && dollar.type !== 'Identifier')
		return 'Do not destructure $; write $.now or $("Node")';
	const base = { dollar: dollar?.type === 'Identifier' ? dollar.name : undefined };
	if (!item) return { ...base, fields: new Map() };
	if (item.type === 'Identifier') return { ...base, item: item.name, fields: new Map() };
	if (item.type !== 'ObjectPattern') return 'Name the item parameter or destructure its fields';
	const fields = item.properties.flatMap((property) =>
		property.type === 'Property' &&
		!property.computed &&
		property.key.type === 'Identifier' &&
		property.value.type === 'Identifier'
			? [[property.value.name, property.key.name] as const]
			: [],
	);
	if (fields.length !== item.properties.length) return 'Destructure item fields by plain name only';
	if (fields.some(([, field]) => field === 'json')) return ITEM_JSON_ERROR;
	return { ...base, fields: new Map(fields) };
}

class LambdaCompiler {
	readonly replacements: Replacement[] = [];

	readonly errors: string[] = [];

	constructor(
		private readonly params: Params,
		private readonly root: LambdaRoot,
		private readonly nodeNames: ReadonlySet<string>,
	) {}

	private referenceText(name: string): string | undefined {
		if (name === this.params.item) return this.root;
		const field = this.params.fields.get(name);
		if (field === 'binary' && this.root === '$json') return '$binary';
		return field === undefined ? undefined : `${this.root}.${field}`;
	}

	/** The node name of `$("Node")`, or `undefined` after an error. */
	private dollarName(node: acorn.CallExpression): string | undefined {
		const [arg] = node.arguments;
		if (node.arguments.length !== 1 || arg?.type !== 'Literal' || typeof arg.value !== 'string') {
			this.errors.push('$() takes one node name as a string literal, e.g. $("Get tasks")');
			return undefined;
		}
		if (!this.nodeNames.has(arg.value)) {
			this.errors.push(`$("${arg.value}") names no node in this workflow`);
			return undefined;
		}
		return arg.value;
	}

	private isDollarCall(node: acorn.AnyNode): node is acorn.CallExpression {
		return (
			node.type === 'CallExpression' &&
			node.callee.type === 'Identifier' &&
			node.callee.name === this.params.dollar
		);
	}

	private dollarCall(node: acorn.CallExpression): boolean {
		if (!this.isDollarCall(node)) return false;
		const name = this.dollarName(node);
		if (name !== undefined) {
			this.replacements.push({
				start: node.start,
				end: node.end,
				text: `$(${JSON.stringify(name)}).item.json`,
			});
		}
		return true;
	}

	/**
	 * `item.binary` and `$("Node").binary` read the files of an item, which n8n keeps beside
	 * its JSON. A JSON field named `binary` stays readable as `item["binary"]`.
	 */
	private binaryMember(node: acorn.MemberExpression, scope: ReadonlySet<string>): boolean {
		if (node.computed || node.property.type !== 'Identifier' || node.property.name !== 'binary') {
			return false;
		}
		const { object } = node;
		const isItem =
			object.type === 'Identifier' && object.name === this.params.item && !scope.has(object.name);
		if (isItem && this.root === '$json') {
			this.replacements.push({ start: node.start, end: node.end, text: '$binary' });
			return true;
		}
		if (!this.isDollarCall(object)) return false;
		const name = this.dollarName(object);
		if (name !== undefined) {
			this.replacements.push({
				start: node.start,
				end: node.end,
				text: `$(${JSON.stringify(name)}).item.binary`,
			});
		}
		return true;
	}

	/** `item.json` and `$("Node").item`: the lambda reads the n8n item wrapper, not the JSON. */
	private wrapperRead(node: acorn.MemberExpression, scope: ReadonlySet<string>): boolean {
		const key = !node.computed && node.property.type === 'Identifier' ? node.property.name : '';
		const { object } = node;
		if (
			key === 'json' &&
			object.type === 'Identifier' &&
			object.name === this.params.item &&
			!scope.has(object.name)
		) {
			this.errors.push(ITEM_JSON_ERROR);
			return true;
		}
		const isDollarCall =
			object.type === 'CallExpression' &&
			object.callee.type === 'Identifier' &&
			object.callee.name === this.params.dollar &&
			!scope.has(object.callee.name);
		if (isDollarCall && WRAPPER_READS.has(key)) {
			const [arg] = object.arguments;
			const call = `$(${JSON.stringify(arg?.type === 'Literal' ? arg.value : 'Node')})`;
			this.errors.push(
				`${call} is already the JSON of that node's item: write ${call}.field, not ${call}.${key}.field. For a field named "${key}", write ${call}["${key}"]`,
			);
			return true;
		}
		return false;
	}

	private dollarMember(node: acorn.MemberExpression): boolean {
		if (node.object.type !== 'Identifier' || node.object.name !== this.params.dollar) return false;
		const key = !node.computed && node.property.type === 'Identifier' ? node.property.name : '';
		const text = BUILTINS[key];
		if (text === undefined) {
			this.errors.push(`$.${key} does not exist; use ${Object.keys(BUILTINS).join(', ')}`);
			return true;
		}
		this.replacements.push({ start: node.start, end: node.end, text });
		return true;
	}

	private identifier(node: acorn.Identifier, scope: ReadonlySet<string>) {
		if (scope.has(node.name)) return;
		const text = this.referenceText(node.name);
		if (text !== undefined) {
			this.replacements.push({ start: node.start, end: node.end, text });
		} else if (node.name === this.params.dollar) {
			this.errors.push('Use $ as $("Node") or $.now; it is not a value');
		} else if (!GLOBALS.has(node.name)) {
			this.errors.push(freeNameError(node.name));
		}
	}

	private bundledImport(node: acorn.MemberExpression, scope: ReadonlySet<string>): boolean {
		const { object, property } = node;
		if (
			object.type !== 'Identifier' ||
			!BUNDLED_IMPORT.test(object.name) ||
			scope.has(object.name) ||
			node.computed ||
			property.type !== 'Identifier'
		) {
			return false;
		}
		this.errors.push(freeNameError(property.name));
		return true;
	}

	visit(node: acorn.AnyNode, scope: ReadonlySet<string>): void {
		switch (node.type) {
			case 'Identifier':
				return this.identifier(node, scope);
			case 'CallExpression':
				if (this.dollarCall(node)) return;
				break;
			case 'MemberExpression':
				if (
					this.binaryMember(node, scope) ||
					this.wrapperRead(node, scope) ||
					this.dollarMember(node) ||
					this.bundledImport(node, scope)
				)
					return;
				this.visit(node.object, scope);
				if (node.computed) this.visit(node.property, scope);
				return;
			case 'Property':
				if (node.computed) this.visit(node.key, scope);
				if (node.shorthand && node.value.type === 'Identifier' && !scope.has(node.value.name)) {
					const text = this.referenceText(node.value.name);
					if (text !== undefined) {
						this.replacements.push({
							start: node.start,
							end: node.end,
							text: `${node.value.name}: ${text}`,
						});
						return;
					}
				}
				return this.visit(node.value, scope);
			case 'ArrowFunctionExpression':
			case 'FunctionExpression': {
				const inner = new Set([...scope, ...node.params.flatMap(patternNames)]);
				return this.visit(node.body, inner);
			}
			case 'BlockStatement': {
				const inner = new Set([...scope, ...blockDeclarations(node)]);
				for (const child of node.body) this.visit(child, inner);
				return;
			}
			case 'VariableDeclarator':
				if (node.init) this.visit(node.init, scope);
				return;
			case 'ForStatement':
			case 'ForInStatement':
			case 'ForOfStatement': {
				const head = node.type === 'ForStatement' ? node.init : node.left;
				const inner =
					head?.type === 'VariableDeclaration'
						? new Set([...scope, ...head.declarations.flatMap(({ id }) => patternNames(id))])
						: scope;
				for (const child of childNodes(node)) this.visit(child, inner);
				return;
			}
			case 'LabeledStatement':
			case 'BreakStatement':
			case 'ContinueStatement':
				return;
			default:
				break;
		}
		for (const child of childNodes(node)) this.visit(child, scope);
	}

	rewrite(source: string, node: acorn.AnyNode): string {
		const inside = this.replacements
			.filter(({ start, end }) => start >= node.start && end <= node.end)
			.sort((a, b) => b.start - a.start);
		const text = inside.reduce(
			(acc, { start, end, text: replacement }) =>
				acc.slice(0, start - node.start) + replacement + acc.slice(end - node.start),
			source.slice(node.start, node.end),
		);
		return text;
	}
}

function parseFunction(source: string): acorn.ArrowFunctionExpression | acorn.FunctionExpression {
	const expression = acorn.parseExpressionAt(source, 0, { ecmaVersion: 'latest' });
	if (expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression') {
		return expression;
	}
	throw new Error('not a function expression');
}

function bodyExpression(fn: acorn.Function): acorn.Expression | undefined {
	if (fn.body.type !== 'BlockStatement') return fn.body;
	const [only] = fn.body.body;
	return fn.body.body.length === 1 && only?.type === 'ReturnStatement' && only.argument
		? only.argument
		: undefined;
}

/**
 * Compile a lambda to an n8n expression. A template literal body becomes mixed text
 * (`=Hi {{ $json.name }}`) if n8n can read its text as text; any other body becomes `={{ … }}`.
 * The code has no `{{` or `}}`, so n8n reads it whole. The lambda runs per item in
 * n8n, so it may read only its parameters and JavaScript globals.
 */
export function compileLambda(
	fn: (...args: never[]) => unknown,
	nodeNames: ReadonlySet<string>,
	root: LambdaRoot = '$json',
): LambdaResult {
	return compileLambdaSource(fn.toString(), nodeNames, root);
}

/** Compile lambda source text, as `compileLambda` does with the text of a function. */
export function compileLambdaSource(
	source: string,
	nodeNames: ReadonlySet<string>,
	root: LambdaRoot = '$json',
): LambdaResult {
	const parsed = (() => {
		try {
			return parseFunction(source);
		} catch {
			return undefined;
		}
	})();
	if (!parsed) return { ok: false, error: 'Write the lambda as an arrow function: (item) => …' };
	if (parsed.async || parsed.generator) {
		return { ok: false, error: 'A lambda cannot be async or a generator' };
	}
	const params = readParams(parsed.params);
	if (typeof params === 'string') return { ok: false, error: params };
	// n8n evaluates an expression, so a block body runs as a function that the expression calls.
	const body = bodyExpression(parsed) ?? parsed.body;

	const compiler = new LambdaCompiler(params, root, nodeNames);
	compiler.visit(body, new Set());
	if (compiler.errors.length > 0) return { ok: false, error: compiler.errors.join('; ') };

	const rewritten = compiler.rewrite(source, body);
	const js = splitBraces(
		body.type === 'BlockStatement'
			? `(() => ${rewritten})()`
			: body.type === 'ObjectExpression'
				? `(${rewritten})`
				: rewritten,
	);
	const text =
		body.type === 'TemplateLiteral'
			? mixedText(body, (expression) => splitBraces(compiler.rewrite(source, expression)))
			: undefined;
	return { ok: true, js, expression: text ?? `={{ ${js} }}` };
}

/**
 * n8n ends the code of an expression at the first `}}`, also in a string, and reads `{{` in
 * text as the start of code. Separate each pair of equal braces: with a space in code, and with
 * an escape in a string, template or regular expression, which keeps its value.
 */
function splitBraces(js: string): string {
	const literals: Array<readonly [number, number]> = [];
	const collect = (node: acorn.AnyNode): void => {
		if (node.type === 'Literal' || node.type === 'TemplateElement') {
			literals.push([node.start, node.end]);
		} else {
			childNodes(node).forEach(collect);
		}
	};
	collect(acorn.parseExpressionAt(js, 0, { ecmaVersion: 'latest' }));
	const inLiteral = (index: number) =>
		literals.some(([start, end]) => index >= start && index < end);
	return js
		.split('')
		.reduce(
			(acc, char, index) =>
				(char === '{' || char === '}') && acc.endsWith(char)
					? `${acc}${inLiteral(index) ? '\\' : ' '}${char}`
					: acc + char,
			'',
		);
}

/**
 * The mixed text (`=Hi {{ $json.name }}`) of a template literal body, or `undefined` when n8n
 * would read its text in another way: text with `{{`, or text before code that has `\\` or
 * ends with `{` or `\`.
 */
function mixedText(
	body: acorn.TemplateLiteral,
	code: (expression: acorn.Expression) => string,
): string | undefined {
	const parts = body.quasis.map((quasi, index) => ({
		literal: quasi.value.cooked ?? quasi.value.raw,
		expression: body.expressions[index],
	}));
	const isPlain = parts.every(
		({ literal, expression }) =>
			!literal.includes('{{') && !(expression && /\\\\|[{\\]$/.test(literal)),
	);
	if (!isPlain) return undefined;
	const text = parts
		.map(({ literal, expression }) =>
			expression ? `${literal}{{ ${code(expression)} }}` : literal,
		)
		.join('');
	return `=${text}`;
}

const BINARY_KEY_ERROR =
	'A binary field takes a binary of the input item, e.g. (item) => item.binary.data';

/** The key of `item.binary.<key>` or `item.binary["<key>"]`, or `undefined` for another read. */
function binaryKeyOf(node: acorn.Expression, params: Params): string | undefined {
	if (node.type !== 'MemberExpression') return undefined;
	const { object, property } = node;
	const key = node.computed
		? property.type === 'Literal' && typeof property.value === 'string'
			? property.value
			: undefined
		: property.type === 'Identifier'
			? property.name
			: undefined;
	const readsBinary =
		object.type === 'MemberExpression'
			? !object.computed &&
				object.object.type === 'Identifier' &&
				object.object.name === params.item &&
				object.property.type === 'Identifier' &&
				object.property.name === 'binary'
			: object.type === 'Identifier' && params.fields.get(object.name) === 'binary';
	return readsBinary ? key : undefined;
}

/**
 * Compile the lambda of a binary field to the key of a binary of the input item:
 * `(item) => item.binary.data` becomes `data`, the value that n8n stores for a binary field.
 */
export function compileBinaryKey(
	fn: (...args: never[]) => unknown,
): { ok: true; key: string } | { ok: false; error: string } {
	const parsed = (() => {
		try {
			return parseFunction(fn.toString());
		} catch {
			return undefined;
		}
	})();
	const params = parsed && readParams(parsed.params);
	const body = parsed && bodyExpression(parsed);
	const key =
		body && params && typeof params !== 'string' && !parsed.async && !parsed.generator
			? binaryKeyOf(body, params)
			: undefined;
	return key ? { ok: true, key } : { ok: false, error: BINARY_KEY_ERROR };
}
