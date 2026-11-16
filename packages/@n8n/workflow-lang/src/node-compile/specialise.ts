/**
 * The node compiler: it turns the source of an n8n node into a library module
 * in the workflow subset, specialised for one node of one workflow
 * (docs/compiler-plan.md).
 *
 * 1. Link: start at `execute`, follow each name to its declaration in the
 *    file or in an imported file, and keep only the code that is reached.
 * 2. Bind: a call on `this` (the n8n context) becomes a constant, a read of
 *    `parameters`, or a helper of the module. A parameter that the workflow
 *    gives as a literal is a constant; an expression is read at run time.
 * 3. Fold: constants spread, conditions on constants go away with the
 *    branches that they exclude, and unused values go away.
 *
 * A construct that has no compiled form is an error: the node then does not
 * compile. The node code never reads a credential value: a field of
 * `getCredentials` becomes a credential template that the runtime fills.
 */
import ts from 'typescript';

export interface SpecialiseInput {
	type: string;
	version: number;
	/** The path of the file that holds the node class. */
	entry: string;
	readFile: (path: string) => string | undefined;
	/** The parameters of the node in the workflow. A string that starts with `=` is an expression. */
	parameters: Record<string, unknown>;
	/** Defaults of the node description, by parameter name. */
	defaults?: Record<string, unknown>;
	continueOnFail?: boolean;
	/** Import prefixes that are folders, for example `{ '@utils/': '/repo/nodes-base/utils/' }`. */
	aliases?: Record<string, string>;
}

export interface SpecialiseResult {
	/** The library module. Absent when `errors` is not empty. */
	source?: string;
	errors: string[];
	/** Places where the compiled form is weaker than v1 (for example the text of an error). */
	notes: string[];
	/** The functions and constants that the module holds, in link order. */
	linked: string[];
}

const f = ts.factory;

const GLOBALS = new Set([
	'undefined',
	'NaN',
	'Infinity',
	'Object',
	'JSON',
	'Math',
	'Array',
	'String',
	'Number',
	'Boolean',
	'Date',
	'Error',
	'RegExp',
	'Promise',
	'parseInt',
	'parseFloat',
	'isNaN',
	'encodeURIComponent',
	'decodeURIComponent',
	'encodeURI',
	'btoa',
	'atob',
	'escape',
	'unescape',
	'ctx',
	'parameters',
	'credential',
	'arguments',
]);

const HELPERS: Record<string, string> = {
	__wrap: `function __wrap(items: any): any {
	const out: any[] = [];
	for (const json of items ?? [{}]) out.push({ json });
	return out;
}`,
	__out: `function __out(result: any): any {
	const out: any[] = [];
	for (const item of result[0] ?? []) out.push(item.json);
	return out;
}`,
	__jsonArray: `function __jsonArray(data: any): any {
	const out: any[] = [];
	const list: any = Array.isArray(data) ? data : [data];
	for (const json of list) out.push({ json });
	return out;
}`,
	__assign: `function __assign(target: any, source: any): any {
	if (source !== null && source !== undefined) {
		for (const [key, value] of Object.entries(source)) target[key] = value;
	}
	return target;
}`,
	__omit: `function __omit(value: any, name: string): any {
	const out: any = {};
	for (const [key, member] of Object.entries(value)) {
		if (key !== name) out[key] = member;
	}
	return out;
}`,
	__error: `function __error(cause: any): any {
	if (typeof cause === 'string') return new Error(cause);
	return new Error(String(cause !== null && cause !== undefined && cause.message !== undefined ? cause.message : cause));
}`,
	__request: `async function __request(ctx: NodeCtx, credential: any, options: any): Promise<any> {
	const response: any = await ctx.http({
		method: options.method ?? 'GET',
		url: options.uri ?? options.url,
		headers: options.headers ?? {},
		qs: options.qs ?? {},
		body: options.body,
		credential,
	});
	if (response.status >= 400) throw new Error(\`HTTP status \${response.status}\`);
	return response.body;
}`,
};

/** Constants of n8n packages that node code compares with. */
const PACKAGE_CONSTANTS: Record<string, string | number> = {
	SEND_AND_WAIT_OPERATION: 'sendAndWait',
};

/** The leading parameters of a function that v1 calls with the n8n context as `this`. */
const CONTEXT_PARAMS = ['ctx', 'parameters', 'credential', '__items'];
const REQUEST_HELPERS = new Set([
	'request',
	'httpRequest',
	'requestWithAuthentication',
	'httpRequestWithAuthentication',
	'requestOAuth2',
	'requestOAuth1',
]);

type Literal = string | number | boolean | null | undefined;

function literalOf(node: ts.Expression): { value: Literal } | undefined {
	if (ts.isParenthesizedExpression(node)) return literalOf(node.expression);
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
		return { value: node.text };
	if (ts.isNumericLiteral(node)) return { value: Number(node.text) };
	if (node.kind === ts.SyntaxKind.TrueKeyword) return { value: true };
	if (node.kind === ts.SyntaxKind.FalseKeyword) return { value: false };
	if (node.kind === ts.SyntaxKind.NullKeyword) return { value: null };
	if (ts.isIdentifier(node) && node.text === 'undefined') return { value: undefined };
	if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
		const inner = literalOf(node.operand);
		if (inner && typeof inner.value === 'number') return { value: -inner.value };
	}
	return undefined;
}

/** The syntax of a JSON value. Fresh nodes each time: a node has one parent. */
function expressionOf(value: unknown): ts.Expression {
	if (value === undefined) return f.createIdentifier('undefined');
	if (value === null) return f.createNull();
	if (typeof value === 'string') return f.createStringLiteral(value);
	if (typeof value === 'boolean') return value ? f.createTrue() : f.createFalse();
	if (typeof value === 'number') {
		return value < 0
			? f.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, f.createNumericLiteral(-value))
			: f.createNumericLiteral(value);
	}
	if (Array.isArray(value)) return f.createArrayLiteralExpression(value.map(expressionOf));
	if (typeof value === 'object') {
		return f.createObjectLiteralExpression(
			Object.entries(value).map(([k, v]) =>
				f.createPropertyAssignment(f.createStringLiteral(k), expressionOf(v)),
			),
		);
	}
	throw new Error(`a parameter value of type ${typeof value} has no compiled form`);
}

function hasExpression(value: unknown): boolean {
	if (typeof value === 'string') return value.startsWith('=');
	if (Array.isArray(value)) return value.some(hasExpression);
	if (typeof value === 'object' && value !== null) return Object.values(value).some(hasExpression);
	return false;
}

function call(name: string, ...args: ts.Expression[]): ts.CallExpression {
	return f.createCallExpression(f.createIdentifier(name), undefined, args);
}

function isThisCall(node: ts.Node, ...path: string[]): node is ts.CallExpression {
	if (!ts.isCallExpression(node)) return false;
	let target: ts.Expression = node.expression;
	for (let k = path.length - 1; k >= 0; k--) {
		if (!ts.isPropertyAccessExpression(target) || target.name.text !== path[k]) return false;
		target = target.expression;
	}
	return target.kind === ts.SyntaxKind.ThisKeyword;
}

/** True for an expression that has no effect, so that an unused value of it can go. */
function isPure(node: ts.Expression): boolean {
	if (literalOf(node) || ts.isIdentifier(node) || ts.isRegularExpressionLiteral(node)) return true;
	if (ts.isPropertyAccessExpression(node)) return isPure(node.expression);
	if (ts.isArrayLiteralExpression(node)) return node.elements.every(isPure);
	if (ts.isObjectLiteralExpression(node)) {
		return node.properties.every(
			(p) =>
				ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name) && isPure(p.initializer),
		);
	}
	if (ts.isBinaryExpression(node)) {
		const op = node.operatorToken.kind;
		return op === ts.SyntaxKind.QuestionQuestionToken && isPure(node.left) && isPure(node.right);
	}
	return false;
}

function ends(node: ts.Statement): boolean {
	if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) return true;
	if (ts.isContinueStatement(node) || ts.isBreakStatement(node)) return true;
	if (ts.isBlock(node))
		return node.statements.length > 0 && ends(node.statements[node.statements.length - 1]);
	return false;
}

function compare(op: ts.SyntaxKind, a: Literal, b: Literal): Literal | typeof NO_FOLD {
	/* eslint-disable eqeqeq */
	switch (op) {
		case ts.SyntaxKind.EqualsEqualsEqualsToken:
			return a === b;
		case ts.SyntaxKind.ExclamationEqualsEqualsToken:
			return a !== b;
		case ts.SyntaxKind.EqualsEqualsToken:
			return a == b;
		case ts.SyntaxKind.ExclamationEqualsToken:
			return a != b;
		default:
	}
	/* eslint-enable eqeqeq */
	if (typeof a !== 'number' || typeof b !== 'number') {
		if (op === ts.SyntaxKind.PlusToken && typeof a === 'string' && typeof b === 'string')
			return a + b;
		return NO_FOLD;
	}
	switch (op) {
		case ts.SyntaxKind.LessThanToken:
			return a < b;
		case ts.SyntaxKind.LessThanEqualsToken:
			return a <= b;
		case ts.SyntaxKind.GreaterThanToken:
			return a > b;
		case ts.SyntaxKind.GreaterThanEqualsToken:
			return a >= b;
		default:
			return NO_FOLD;
	}
}
const NO_FOLD = Symbol('no fold');

interface FileModel {
	path: string;
	sf: ts.SourceFile;
	/** Top-level functions and constants by name. */
	declarations: Map<string, ts.FunctionDeclaration | ts.VariableDeclaration>;
	/** Imported names: the module text and the name in that module. */
	imports: Map<string, { from: string; name: string }>;
}

interface Unit {
	name: string;
	node: ts.FunctionDeclaration | ts.VariableDeclaration | ts.MethodDeclaration;
	file: FileModel;
	withContext: boolean;
}

class Specialiser {
	readonly errors: string[] = [];
	readonly notes: string[] = [];
	readonly helpers = new Set<string>();
	private readonly files = new Map<string, FileModel>();
	private readonly units = new Map<string, Unit>();
	private readonly output: Array<{ name: string; node: ts.Node; sf: ts.SourceFile }> = [];
	private readonly printer = ts.createPrinter({
		removeComments: true,
		newLine: ts.NewLineKind.LineFeed,
	});
	private readonly input: SpecialiseInput;
	private readonly queue: Unit[] = [];
	/** Functions that v1 calls as `helper.call(this, ...)`. */
	private readonly contextCallees = new Set<string>();
	private changed = false;

	constructor(input: SpecialiseInput) {
		this.input = input;
	}

	/** Prints a tree and parses it again, so that every node has a parent and a position. */
	private reparse(node: ts.Node, sf: ts.SourceFile): { node: ts.Node; sf: ts.SourceFile } {
		const text = this.printer.printNode(ts.EmitHint.Unspecified, node, sf);
		const next = ts.createSourceFile(
			'unit.js',
			text,
			ts.ScriptTarget.ES2022,
			true,
			ts.ScriptKind.JS,
		);
		return { node: next.statements[0], sf: next };
	}

	private error(where: string, message: string) {
		const text = `${where}: ${message}`;
		if (!this.errors.includes(text)) this.errors.push(text);
	}

	private note(message: string) {
		if (!this.notes.includes(message)) this.notes.push(message);
	}

	private helper(name: string, ...args: ts.Expression[]): ts.CallExpression {
		this.helpers.add(name);
		return call(name, ...args);
	}

	// ----- link -----

	private load(path: string): FileModel | undefined {
		const known = this.files.get(path);
		if (known) return known;
		const text = this.input.readFile(path);
		if (text === undefined) return undefined;
		// Types go first: the subset code is typed `any` at the end.
		const js = ts.transpileModule(text, {
			compilerOptions: {
				target: ts.ScriptTarget.ES2022,
				module: ts.ModuleKind.ESNext,
				removeComments: true,
			},
		}).outputText;
		const sf = ts.createSourceFile(path, js, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
		const model: FileModel = { path, sf, declarations: new Map(), imports: new Map() };
		for (const st of sf.statements) {
			if (ts.isFunctionDeclaration(st) && st.name) model.declarations.set(st.name.text, st);
			if (ts.isVariableStatement(st)) {
				for (const d of st.declarationList.declarations) {
					if (ts.isIdentifier(d.name)) model.declarations.set(d.name.text, d);
				}
			}
			if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
				const from = st.moduleSpecifier.text;
				const clause = st.importClause;
				if (clause?.name) model.imports.set(clause.name.text, { from, name: 'default' });
				const named = clause?.namedBindings;
				if (named && ts.isNamedImports(named)) {
					for (const e of named.elements) {
						model.imports.set(e.name.text, { from, name: (e.propertyName ?? e.name).text });
					}
				}
			}
		}
		this.files.set(path, model);
		return model;
	}

	private resolveModule(from: FileModel, spec: string): FileModel | undefined {
		let base: string | undefined;
		if (spec.startsWith('.')) {
			const parts = from.path.split('/').slice(0, -1);
			for (const part of spec.split('/')) {
				if (part === '..') parts.pop();
				else if (part !== '.') parts.push(part);
			}
			base = parts.join('/');
		} else {
			for (const [prefix, folder] of Object.entries(this.input.aliases ?? {})) {
				if (spec.startsWith(prefix)) base = folder + spec.slice(prefix.length);
			}
		}
		if (base === undefined) return undefined;
		return this.load(`${base}.ts`) ?? this.load(`${base}/index.ts`) ?? this.load(base);
	}

	/** Finds the declaration of a free name and queues it. */
	private need(name: string, file: FileModel, withContext: boolean, where: string) {
		let home: FileModel | undefined = file;
		let found = name;
		for (let hops = 0; hops < 8 && home && !home.declarations.has(found); hops++) {
			const imported: { from: string; name: string } | undefined = home.imports.get(found);
			if (!imported) {
				this.error(where, `the name '${name}' has no declaration that the compiler can read`);
				return;
			}
			const next = this.resolveModule(home, imported.from);
			if (!next) {
				this.error(
					where,
					`'${name}' comes from the package '${imported.from}', which has no compiled form`,
				);
				return;
			}
			home = next;
			found = imported.name;
		}
		const node = home?.declarations.get(found);
		if (!home || !node) {
			this.error(where, `the name '${name}' has no declaration that the compiler can read`);
			return;
		}
		const known = this.units.get(name);
		if (known) {
			if (known.node !== node) this.error(where, `two declarations have the name '${name}'`);
			return;
		}
		const unit: Unit = { name, node, file: home, withContext };
		this.units.set(name, unit);
		this.queue.push(unit);
	}

	// ----- bind -----

	private parameter(node: ts.CallExpression): ts.Expression {
		const [nameArg, , fallback, options] = node.arguments;
		if (!nameArg || !ts.isStringLiteral(nameArg)) {
			return node; // `this` stays, and the check after folding reports it
		}
		if (options) return node;
		const path = nameArg.text.split('.');
		let value: unknown = this.input.parameters;
		for (const key of path) {
			value =
				typeof value === 'object' && value !== null
					? (value as Record<string, unknown>)[key]
					: undefined;
		}
		const top = this.input.parameters[path[0]];
		if (hasExpression(top)) {
			// The converter evaluates the expression for each item and passes the value.
			let read: ts.Expression = f.createIdentifier('parameters');
			for (const key of path)
				read = f.createPropertyAccessChain(
					read,
					f.createToken(ts.SyntaxKind.QuestionDotToken),
					key,
				);
			const or = fallback ?? (path.length === 1 ? this.defaultOf(path[0]) : undefined);
			return or
				? f.createParenthesizedExpression(
						f.createBinaryExpression(read, ts.SyntaxKind.QuestionQuestionToken, or),
					)
				: read;
		}
		if (value !== undefined) return expressionOf(value);
		if (path.length === 1 && this.input.defaults && path[0] in this.input.defaults) {
			return expressionOf(this.input.defaults[path[0]]);
		}
		return fallback ?? f.createIdentifier('undefined');
	}

	private defaultOf(name: string): ts.Expression | undefined {
		const defaults = this.input.defaults;
		return defaults && name in defaults ? expressionOf(defaults[name]) : undefined;
	}

	/** Rewrites the calls on the n8n context and the forms that the subset does not have. */
	private bind(root: ts.Node, unit: Unit, isExecute: boolean): ts.Node {
		const localNames = bindingsOf(root);
		const regexes = new Map<string, ts.RegularExpressionLiteral>();
		const collect = (n: ts.Node) => {
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				n.initializer &&
				ts.isRegularExpressionLiteral(n.initializer)
			) {
				if (localNames.get(n.name.text) === 1) regexes.set(n.name.text, n.initializer);
			}
			ts.forEachChild(n, collect);
		};
		collect(root);
		const toLet = new Set<string>();
		const declaredHere = new Set<string>();
		const noteDeclared = (n: ts.Node) => {
			if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) declaredHere.add(n.name.text);
			ts.forEachChild(n, noteDeclared);
		};
		noteDeclared(root);
		let depth = 0;

		const visit = (node: ts.Node): ts.Node | ts.Node[] | undefined => {
			// A nested function declaration or expression has its own `this` and its own `return`.
			const nested =
				node !== root && (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node));
			const arrow = node !== root && ts.isArrowFunction(node);
			if (nested || arrow) depth++;
			const out = rewrite(node);
			if (nested || arrow) depth--;
			return out;
		};
		const each = <T extends ts.Node>(node: T): T => ts.visitEachChild(node, visit, undefined);
		// The arguments only: the callee holds `this`, which has no compiled form of its own.
		const args = (node: ts.CallExpression | ts.NewExpression, from = 0): ts.Expression[] =>
			(node.arguments ?? []).slice(from).map((a) => ts.visitNode(a, visit) as ts.Expression);

		const rewrite = (node: ts.Node): ts.Node | ts.Node[] | undefined => {
			if (ts.isAwaitExpression(node) && isThisCall(node.expression, 'getCredentials'))
				return f.createIdentifier('__CREDENTIAL');
			if (isThisCall(node, 'getCredentials')) return f.createIdentifier('__CREDENTIAL');
			if (isThisCall(node, 'getNodeParameter'))
				return this.parameter(f.updateCallExpression(node, node.expression, undefined, args(node)));
			if (isThisCall(node, 'getInputData')) return f.createIdentifier('__items');
			if (isThisCall(node, 'continueOnFail'))
				return this.input.continueOnFail ? f.createTrue() : f.createFalse();
			if (isThisCall(node, 'getInstanceId')) {
				return f.createPropertyAccessExpression(f.createIdentifier('parameters'), 'instanceId');
			}
			if (isThisCall(node, 'getNode')) {
				return expressionOf({
					name: 'Node',
					type: this.input.type,
					typeVersion: this.input.version,
				});
			}
			if (isThisCall(node, 'helpers', 'returnJsonArray'))
				return this.helper('__jsonArray', ...args(node));
			if (isThisCall(node, 'helpers', 'constructExecutionMetaData')) return args(node)[0];
			if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
				const { expression: target, name } = node.expression;
				// this.helpers.request(options), and this.helpers.requestX.call(this, type, options).
				const direct = isThisCall(node, 'helpers', name.text) && REQUEST_HELPERS.has(name.text);
				const viaCall =
					name.text === 'call' &&
					ts.isPropertyAccessExpression(target) &&
					REQUEST_HELPERS.has(target.name.text) &&
					ts.isPropertyAccessExpression(target.expression) &&
					target.expression.name.text === 'helpers';
				if (direct || viaCall) {
					const options = args(node, node.arguments.length - 1)[0];
					this.note(
						'An HTTP error status throws `HTTP status <n>`, not the NodeApiError text of v1.',
					);
					return this.helper(
						'__request',
						f.createIdentifier('ctx'),
						f.createIdentifier('credential'),
						options,
					);
				}
				// helper.call(this, a, b): the helper gets the context as leading parameters.
				if (
					name.text === 'call' &&
					ts.isIdentifier(target) &&
					node.arguments[0]?.kind === ts.SyntaxKind.ThisKeyword
				) {
					this.contextCallees.add(target.text);
					return call(
						target.text,
						...CONTEXT_PARAMS.map((p) => f.createIdentifier(p)),
						...args(node, 1),
					);
				}
				// regex.test(text)
				if (name.text === 'test' && node.arguments.length === 1) {
					const re = ts.isRegularExpressionLiteral(target)
						? target
						: ts.isIdentifier(target)
							? regexes.get(target.text)
							: undefined;
					if (re) {
						const end = re.text.lastIndexOf('/');
						const text = call('String', args(node)[0]);
						const exec = f.createCallExpression(
							f.createPropertyAccessExpression(f.createIdentifier('RegExp'), 'exec'),
							undefined,
							[
								f.createStringLiteral(re.text.slice(1, end)),
								f.createStringLiteral(re.text.slice(end + 1)),
								text,
								f.createNumericLiteral(0),
							],
						);
						return f.createParenthesizedExpression(
							f.createBinaryExpression(
								exec,
								ts.SyntaxKind.ExclamationEqualsEqualsToken,
								f.createNull(),
							),
						);
					}
				}
			}
			if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
				const cls = node.expression.text;
				if (cls === 'NodeApiError' || cls === 'NodeOperationError') {
					this.note(
						`${cls} is an Error with the message of its cause: the description and the HTTP code of v1 are not there.`,
					);
					return this.helper('__error', args(node)[1] ?? f.createStringLiteral(cls));
				}
			}
			if (ts.isExpressionStatement(node)) {
				const e = node.expression;
				// Object.assign(target, source): the subset has it only into a new object.
				if (
					ts.isCallExpression(e) &&
					ts.isPropertyAccessExpression(e.expression) &&
					ts.isIdentifier(e.expression.expression) &&
					e.expression.expression.text === 'Object' &&
					e.expression.name.text === 'assign' &&
					e.arguments.length >= 2 &&
					!ts.isObjectLiteralExpression(e.arguments[0])
				) {
					const [target, ...sources] = args(e);
					return sources.map((source, k) =>
						f.createExpressionStatement(
							this.helper(
								'__assign',
								k === 0 ? target : (ts.visitNode(e.arguments[0], visit) as ts.Expression),
								source,
							),
						),
					);
				}
				// delete local.name: the subset has no delete, so the local gets a copy without the key.
				if (ts.isDeleteExpression(e)) {
					const target = e.expression;
					const key = ts.isPropertyAccessExpression(target)
						? f.createStringLiteral(target.name.text)
						: ts.isElementAccessExpression(target)
							? target.argumentExpression
							: undefined;
					const owner =
						ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)
							? target.expression
							: undefined;
					if (
						key &&
						owner &&
						ts.isIdentifier(owner) &&
						declaredHere.has(owner.text) &&
						localNames.get(owner.text) === 1
					) {
						toLet.add(owner.text);
						this.note(
							'`delete` on a local object makes a copy without the key: another reference to the object keeps the key.',
						);
						return f.createExpressionStatement(
							f.createAssignment(
								f.createIdentifier(owner.text),
								this.helper('__omit', f.createIdentifier(owner.text), key),
							),
						);
					}
				}
				// list.push(...more)
				if (
					ts.isCallExpression(e) &&
					ts.isPropertyAccessExpression(e.expression) &&
					e.expression.name.text === 'push' &&
					e.arguments.length === 1 &&
					ts.isSpreadElement(e.arguments[0])
				) {
					const list = each(e.expression).expression;
					const more = each(e.arguments[0]).expression;
					return f.createForOfStatement(
						undefined,
						f.createVariableDeclarationList(
							[f.createVariableDeclaration('__more')],
							ts.NodeFlags.Const,
						),
						more,
						f.createExpressionStatement(
							f.createCallExpression(f.createPropertyAccessExpression(list, 'push'), undefined, [
								f.createIdentifier('__more'),
							]),
						),
					);
				}
			}
			if (isExecute && depth === 0 && ts.isReturnStatement(node) && node.expression) {
				return f.createReturnStatement(
					this.helper('__out', each(node).expression as ts.Expression),
				);
			}
			if (
				ts.isIdentifier(node) &&
				isValueUse(node) &&
				node.text in PACKAGE_CONSTANTS &&
				unit.file.imports.has(node.text) &&
				!localNames.has(node.text)
			) {
				return expressionOf(PACKAGE_CONSTANTS[node.text]);
			}
			return each(node);
		};
		let out = ts.visitNode(root, visit) as ts.Node;
		if (toLet.size > 0) {
			const relax = (n: ts.Node): ts.Node => {
				if (
					ts.isVariableDeclarationList(n) &&
					n.declarations.some((d) => ts.isIdentifier(d.name) && toLet.has(d.name.text))
				) {
					return f.createVariableDeclarationList(
						ts.visitNodes(n.declarations, relax) as ts.NodeArray<ts.VariableDeclaration>,
						ts.NodeFlags.Let,
					);
				}
				return ts.visitEachChild(n, relax, undefined);
			};
			out = relax(out);
		}
		return out;
	}

	/** Reports what is left after folding and has no compiled form. */
	private check(root: ts.Node, where: string) {
		const walk = (node: ts.Node) => {
			if (node.kind === ts.SyntaxKind.ThisKeyword) {
				const parent = node.parent;
				const member = parent && ts.isPropertyAccessExpression(parent) ? parent.name.text : '';
				const inner =
					member === 'helpers' && ts.isPropertyAccessExpression(parent.parent)
						? `.${parent.parent.name.text}`
						: '';
				this.error(
					where,
					member
						? `'this.${member}${inner}' has no compiled form`
						: '`this` as a value has no compiled form',
				);
			}
			if (ts.isRegularExpressionLiteral(node))
				this.error(where, 'a regular expression is supported only as `pattern.test(text)`');
			if (ts.isDeleteExpression(node))
				this.error(where, '`delete` is supported only as a statement on a local variable');
			if (
				ts.isNewExpression(node) &&
				ts.isIdentifier(node.expression) &&
				node.expression.text !== 'Error' &&
				node.expression.text !== 'Date'
			) {
				this.error(where, `'new ${node.expression.text}' has no compiled form`);
			}
			ts.forEachChild(node, walk);
		};
		walk(root);
	}

	// ----- fold -----

	private fold(start: { node: ts.Node; sf: ts.SourceFile }, where: string) {
		let cur = start;
		for (let round = 0; round < 40; round++) {
			this.changed = false;
			cur = this.reparse(this.propagate(cur.node, where), cur.sf);
			cur = this.reparse(this.flow(cur.node), cur.sf);
			cur = this.reparse(this.reduce(cur.node), cur.sf);
			if (!this.changed) break;
		}
		return cur;
	}

	/** Spreads constants, turns credential fields into templates, and drops unused values. */
	private propagate(root: ts.Node, where: string): ts.Node {
		const counts = bindingsOf(root);
		const uses = new Map<string, number>();
		const count = (n: ts.Node) => {
			if (ts.isIdentifier(n) && isValueUse(n)) uses.set(n.text, (uses.get(n.text) ?? 0) + 1);
			ts.forEachChild(n, count);
		};
		count(root);
		const constants = new Map<string, Literal>();
		const credentials = new Set<string>();
		const unused = new Set<string>();
		const scan = (n: ts.Node) => {
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				n.initializer &&
				counts.get(n.name.text) === 1
			) {
				const list = n.parent;
				const isConst =
					ts.isVariableDeclarationList(list) && (list.flags & ts.NodeFlags.Const) !== 0;
				const inLoopHead =
					ts.isVariableDeclarationList(list) &&
					(!ts.isVariableStatement(list.parent) || list.parent === root);
				const lit = literalOf(n.initializer);
				if (inLoopHead) {
					// The variable of a loop stays, and so does a constant that is the unit itself.
				} else if (ts.isIdentifier(n.initializer) && n.initializer.text === '__CREDENTIAL') {
					credentials.add(n.name.text);
				} else if (isConst && lit) {
					constants.set(n.name.text, lit.value);
				} else if (!uses.get(n.name.text) && isPure(n.initializer)) {
					unused.add(n.name.text);
				}
			}
			ts.forEachChild(n, scan);
		};
		scan(root);
		if (constants.size + credentials.size + unused.size === 0) return root;
		this.changed = true;
		const visit = (n: ts.Node): ts.Node | undefined => {
			if (ts.isVariableStatement(n)) {
				const kept = n.declarationList.declarations.filter((d) => {
					const name = ts.isIdentifier(d.name) ? d.name.text : '';
					return !constants.has(name) && !credentials.has(name) && !unused.has(name);
				});
				if (kept.length === 0) return undefined;
				if (kept.length !== n.declarationList.declarations.length) {
					return ts.visitEachChild(
						f.updateVariableStatement(
							n,
							undefined,
							f.updateVariableDeclarationList(n.declarationList, kept),
						),
						visit,
						undefined,
					);
				}
			}
			if (
				ts.isPropertyAccessExpression(n) &&
				ts.isIdentifier(n.expression) &&
				credentials.has(n.expression.text)
			) {
				return f.createStringLiteral(`{{$credentials.${n.name.text}}}`);
			}
			if (ts.isShorthandPropertyAssignment(n) && constants.has(n.name.text)) {
				return f.createPropertyAssignment(n.name.text, expressionOf(constants.get(n.name.text)));
			}
			if (ts.isIdentifier(n) && isValueUse(n)) {
				if (constants.has(n.text)) return expressionOf(constants.get(n.text));
				if (credentials.has(n.text)) {
					this.error(
						where,
						`the credential '${n.text}' is used as a whole value: only its fields can go into a request`,
					);
				}
			}
			return ts.visitEachChild(n, visit, undefined);
		};
		return ts.visitNode(root, visit) as ts.Node;
	}

	/**
	 * Follows `let` variables through straight-line code: after `x = 'a'`, a read
	 * of `x` is `'a'` until a statement that can assign `x` on some path.
	 */
	private flow(root: ts.Node): ts.Node {
		if (!ts.isFunctionDeclaration(root) || !root.body) return root;
		const counts = bindingsOf(root);
		const fixed = new Set<string>(
			root.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : '')),
		);
		const targetOf = (n: ts.Node): string | undefined => {
			if (
				ts.isBinaryExpression(n) &&
				n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
				n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
			) {
				return ts.isIdentifier(n.left) ? n.left.text : undefined;
			}
			if (
				(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
				ts.isIdentifier(n.operand)
			) {
				const op = n.operator;
				if (op === ts.SyntaxKind.PlusPlusToken || op === ts.SyntaxKind.MinusMinusToken)
					return n.operand.text;
			}
			return undefined;
		};
		// A variable that a nested function assigns can change at any call.
		const mark = (n: ts.Node, inner: boolean) => {
			const name = targetOf(n);
			if (name && inner) fixed.add(name);
			ts.forEachChild(n, (c) => mark(c, inner || (c !== root && ts.isFunctionLike(c))));
		};
		mark(root, false);
		const assignedIn = (n: ts.Node, out = new Set<string>()): Set<string> => {
			const name = targetOf(n);
			if (name) out.add(name);
			ts.forEachChild(n, (c) => {
				assignedIn(c, out);
			});
			return out;
		};
		const tracked = (name: string) => counts.get(name) === 1 && !fixed.has(name);
		type Env = Map<string, Literal>;
		const substitute = <T extends ts.Node>(node: T, env: Env): T => {
			if (env.size === 0) return node;
			const visit = (n: ts.Node): ts.Node => {
				if (ts.isFunctionLike(n)) return n;
				if (ts.isIdentifier(n) && env.has(n.text) && isValueUse(n)) {
					const p = n.parent;
					const written =
						p && targetOf(p) === n.text && (ts.isBinaryExpression(p) ? p.left === n : true);
					if (!written && !(p && ts.isShorthandPropertyAssignment(p))) {
						this.changed = true;
						return expressionOf(env.get(n.text));
					}
				}
				return ts.visitEachChild(n, visit, undefined);
			};
			return ts.visitNode(node, visit) as T;
		};
		const without = (env: Env, names: Set<string>): Env => {
			const out: Env = new Map(env);
			for (const name of names) out.delete(name);
			return out;
		};
		const branch = (st: ts.Statement, env: Env): ts.Statement =>
			ts.isBlock(st) ? f.updateBlock(st, block(st.statements, env)) : block([st], env)[0];
		const block = (statements: readonly ts.Statement[], env: Env): ts.Statement[] =>
			statements.map((st) => {
				const assigned = assignedIn(st);
				let out: ts.Statement;
				if (ts.isBlock(st)) {
					return f.updateBlock(st, block(st.statements, env));
				} else if (ts.isIfStatement(st)) {
					out = f.updateIfStatement(
						st,
						substitute(st.expression, env),
						branch(st.thenStatement, new Map(env)),
						st.elseStatement ? branch(st.elseStatement, new Map(env)) : undefined,
					);
				} else if (
					ts.isForStatement(st) ||
					ts.isForOfStatement(st) ||
					ts.isForInStatement(st) ||
					ts.isWhileStatement(st) ||
					ts.isDoStatement(st)
				) {
					const body = branch(st.statement, new Map());
					out = ts.visitEachChild(st, (c) => (c === st.statement ? body : c), undefined);
				} else if (ts.isTryStatement(st)) {
					const tried = f.updateBlock(
						st.tryBlock,
						block(st.tryBlock.statements, without(env, assigned)),
					);
					const caught = st.catchClause
						? f.updateCatchClause(
								st.catchClause,
								st.catchClause.variableDeclaration,
								f.updateBlock(
									st.catchClause.block,
									block(st.catchClause.block.statements, new Map()),
								),
							)
						: undefined;
					const last = st.finallyBlock
						? f.updateBlock(st.finallyBlock, block(st.finallyBlock.statements, new Map()))
						: undefined;
					out = f.updateTryStatement(st, tried, caught, last);
				} else {
					out = substitute(st, without(env, assigned));
				}
				for (const name of assigned) env.delete(name);
				// The statement itself can set a value: `let x = 'a'` and `x = 'a'`.
				if (ts.isVariableStatement(out)) {
					for (const d of out.declarationList.declarations) {
						const lit = d.initializer ? literalOf(d.initializer) : undefined;
						if (
							ts.isIdentifier(d.name) &&
							lit &&
							tracked(d.name.text) &&
							!(out.declarationList.flags & ts.NodeFlags.Const)
						) {
							env.set(d.name.text, lit.value);
						}
					}
				} else if (ts.isExpressionStatement(out)) {
					const e = out.expression;
					if (
						ts.isBinaryExpression(e) &&
						e.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
						ts.isIdentifier(e.left)
					) {
						const lit = literalOf(e.right);
						if (lit && tracked(e.left.text)) env.set(e.left.text, lit.value);
					}
				}
				return out;
			});
		return f.updateFunctionDeclaration(
			root,
			root.modifiers,
			root.asteriskToken,
			root.name,
			root.typeParameters,
			root.parameters,
			root.type,
			f.updateBlock(root.body, block(root.body.statements, new Map())),
		);
	}

	/** Computes operations on constants and removes the branches that a constant excludes. */
	private reduce(root: ts.Node): ts.Node {
		const visit = (input: ts.Node): ts.Node | ts.Node[] | undefined => {
			const n = ts.visitEachChild(input, visit, undefined);
			const done = <T>(value: T): T => {
				this.changed = true;
				return value;
			};
			if (ts.isParenthesizedExpression(n) && literalOf(n.expression)) return done(n.expression);
			if (ts.isBinaryExpression(n)) {
				const op = n.operatorToken.kind;
				const left = literalOf(n.left);
				if (left && op === ts.SyntaxKind.AmpersandAmpersandToken)
					return done(left.value ? n.right : n.left);
				if (left && op === ts.SyntaxKind.BarBarToken) return done(left.value ? n.left : n.right);
				if (left && op === ts.SyntaxKind.QuestionQuestionToken) {
					return done(left.value === null || left.value === undefined ? n.right : n.left);
				}
				const right = literalOf(n.right);
				if (left && right) {
					const value = compare(op, left.value, right.value);
					if (value !== NO_FOLD) return done(expressionOf(value));
				}
			}
			if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) {
				const operand = literalOf(n.operand);
				if (operand) return done(expressionOf(!operand.value));
			}
			if (ts.isConditionalExpression(n)) {
				const condition = literalOf(n.condition);
				if (condition) return done(condition.value ? n.whenTrue : n.whenFalse);
			}
			if (ts.isTemplateExpression(n)) {
				// Joins constant parts: a URL with credential templates becomes one string.
				let head = n.head.text;
				const spans: Array<{ expression: ts.Expression; text: string }> = [];
				let joined = false;
				for (const span of n.templateSpans) {
					const lit = literalOf(span.expression);
					if (lit && lit.value !== undefined && lit.value !== null) {
						joined = true;
						if (spans.length === 0) head += String(lit.value) + span.literal.text;
						else spans[spans.length - 1].text += String(lit.value) + span.literal.text;
					} else {
						spans.push({ expression: span.expression, text: span.literal.text });
					}
				}
				if (joined) {
					if (spans.length === 0) return done(f.createStringLiteral(head));
					return done(
						f.createTemplateExpression(
							f.createTemplateHead(head),
							spans.map((s, k) =>
								f.createTemplateSpan(
									s.expression,
									k === spans.length - 1
										? f.createTemplateTail(s.text)
										: f.createTemplateMiddle(s.text),
								),
							),
						),
					);
				}
			}
			if (ts.isPropertyAccessExpression(n) && ts.isObjectLiteralExpression(n.expression)) {
				for (const p of n.expression.properties) {
					if (!ts.isPropertyAssignment(p) || !literalOf(p.initializer)) continue;
					const key =
						ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
					if (key === n.name.text) return done(p.initializer);
				}
			}
			if (ts.isIfStatement(n)) {
				const condition = literalOf(n.expression);
				if (condition)
					return done(
						condition.value ? n.thenStatement : (n.elseStatement ?? f.createEmptyStatement()),
					);
			}
			if (ts.isExpressionStatement(n) && literalOf(n.expression))
				return done(f.createEmptyStatement());
			if (ts.isSwitchStatement(n)) {
				const on = literalOf(n.expression);
				const clauses = n.caseBlock.clauses;
				if (on && clauses.every((c) => ts.isDefaultClause(c) || literalOf(c.expression))) {
					const hit =
						clauses.find(
							(c) => ts.isCaseClause(c) && literalOf(c.expression)?.value === on.value,
						) ?? clauses.find((c) => ts.isDefaultClause(c));
					if (!hit) return done(f.createEmptyStatement());
					const body = [...hit.statements];
					const last = body[body.length - 1];
					const closed = last && (ts.isBreakStatement(last) || ends(last));
					const inner = body.some((s) => s !== last && containsBreak(s));
					if (closed && !inner) {
						if (ts.isBreakStatement(last)) body.pop();
						return done(f.createBlock(body, true));
					}
				}
			}
			if (ts.isBlock(n) || ts.isSourceFile(n) || ts.isCaseClause(n) || ts.isDefaultClause(n)) {
				const statements = n.statements;
				const cut = statements.findIndex(ends);
				const dead = cut >= 0 && cut < statements.length - 1;
				const isEmpty = (s: ts.Statement) =>
					ts.isEmptyStatement(s) || (ts.isBlock(s) && s.statements.length === 0);
				const empty = statements.some(isEmpty);
				if ((dead || empty) && ts.isBlock(n)) {
					const kept = (dead ? statements.slice(0, cut + 1) : [...statements]).filter(
						(s) => !isEmpty(s),
					);
					return done(f.updateBlock(n, kept));
				}
			}
			return n;
		};
		return ts.visitNode(root, visit) as ts.Node;
	}

	// ----- drive -----

	private process(unit: Unit, isExecute: boolean) {
		const source = unit.node;
		const statement = ts.isMethodDeclaration(source)
			? f.createFunctionDeclaration(
					[f.createModifier(ts.SyntaxKind.AsyncKeyword)],
					undefined,
					'execute',
					undefined,
					[],
					undefined,
					source.body,
				)
			: ts.isVariableDeclaration(source)
				? f.createVariableStatement(
						undefined,
						f.createVariableDeclarationList([source], ts.NodeFlags.Const),
					)
				: source;
		let cur = this.reparse(statement, unit.file.sf);
		cur = this.reparse(this.bind(cur.node, unit, isExecute), cur.sf);
		cur = this.fold(cur, unit.name);
		const node = cur.node;
		this.check(node, unit.name);
		const bound = bindingsOf(node);
		const free = new Set<string>();
		const find = (n: ts.Node) => {
			if (
				ts.isIdentifier(n) &&
				isValueUse(n) &&
				!bound.has(n.text) &&
				!GLOBALS.has(n.text) &&
				!n.text.startsWith('__')
			) {
				free.add(n.text);
			}
			ts.forEachChild(n, find);
		};
		find(node);
		free.delete(unit.name);
		for (const name of free) {
			if (!this.units.has(name))
				this.need(name, unit.file, this.contextCallees.has(name), unit.name);
		}
		this.output.push({ name: unit.name, node, sf: cur.sf });
	}

	run(): SpecialiseResult {
		const entry = this.load(this.input.entry);
		let execute: ts.MethodDeclaration | undefined;
		entry?.sf.forEachChild((st) => {
			if (!ts.isClassDeclaration(st)) return;
			for (const m of st.members) {
				if (ts.isMethodDeclaration(m) && ts.isIdentifier(m.name) && m.name.text === 'execute')
					execute = m;
			}
		});
		if (!entry || !execute) {
			return {
				errors: [`${this.input.entry}: no class with an execute method`],
				notes: [],
				linked: [],
			};
		}
		this.process({ name: 'execute', node: execute, file: entry, withContext: true }, true);
		for (let k = 0; k < this.queue.length; k++) {
			if (k > 2000) {
				this.error('link', 'more than 2,000 declarations');
				break;
			}
			this.process(this.queue[k], false);
		}
		const linked = this.output.map((o) => o.name);
		if (this.errors.length > 0) return { errors: this.errors, notes: this.notes, linked };
		return { source: this.print(), errors: [], notes: this.notes, linked };
	}

	// ----- print -----

	private print(): string {
		const parts: string[] = [];
		// A function that makes requests must be inside `run`: the subset allows `ctx.http` only there (WL090).
		const inner: string[] = [];
		// The text is not indented again: a template literal can hold line breaks.
		let body = '{}';
		for (const { name, node, sf } of this.output) {
			const unit = this.units.get(name);
			const text = (n: ts.Node) => this.printer.printNode(ts.EmitHint.Unspecified, typed(n), sf);
			if (!ts.isFunctionDeclaration(node)) {
				if (unit?.withContext) this.error(name, 'a constant is called with the n8n context');
				parts.push(text(node));
			} else if (name === 'execute') {
				if (node.body) body = text(node.body);
			} else {
				const lead = unit?.withContext
					? CONTEXT_PARAMS.map((p) => f.createParameterDeclaration(undefined, undefined, p))
					: [];
				const fn = f.updateFunctionDeclaration(
					node,
					node.modifiers?.filter((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
					node.asteriskToken,
					node.name,
					undefined,
					[...lead, ...node.parameters],
					undefined,
					node.body,
				);
				(unit?.withContext ? inner : parts).push(text(fn).replace('ctx: any', 'ctx: NodeCtx'));
			}
		}
		this.helpers.add('__wrap');
		const names = [...this.helpers].sort();
		const helpers = names.filter((h) => h !== '__request').map((h) => HELPERS[h]);
		if (this.helpers.has('__request')) inner.unshift(HELPERS.__request);
		return `// Generated by the node compiler from the source of ${this.input.type}. Do not edit.
import { defineNode, type NodeCtx } from '@n8n/workflow-lang';

${[...helpers, ...parts].join('\n\n')}

export default defineNode<any>({
	type: ${JSON.stringify(this.input.type)},
	version: ${this.input.version},
	async run(ctx, parameters0, items0, credential) {
		const parameters: any = parameters0 ?? {};
		const __items: any = __wrap(items0);
		${[...inner, body].join('\n')}
	},
});
`;
	}
}

/** How many times each name is bound in a tree: variables, parameters, functions, catch variables. */
function bindingsOf(root: ts.Node): Map<string, number> {
	const counts = new Map<string, number>();
	const add = (name: ts.BindingName) => {
		if (ts.isIdentifier(name)) counts.set(name.text, (counts.get(name.text) ?? 0) + 1);
		else for (const e of name.elements) if (!ts.isOmittedExpression(e)) add(e.name);
	};
	const walk = (n: ts.Node) => {
		if (ts.isVariableDeclaration(n) || ts.isParameter(n)) add(n.name);
		if ((ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) && n.name) add(n.name);
		ts.forEachChild(n, walk);
	};
	walk(root);
	return counts;
}

/** True when an identifier reads a value: not a declared name, a member name or a key. */
function isValueUse(n: ts.Identifier): boolean {
	const p = n.parent;
	if (!p) return true;
	if (ts.isPropertyAccessExpression(p)) return p.expression === n;
	if (ts.isPropertyAssignment(p)) return p.initializer === n;
	if (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p))
		return p.initializer === n;
	if (ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isMethodDeclaration(p))
		return false;
	if (ts.isLabeledStatement(p) || ts.isBreakStatement(p) || ts.isContinueStatement(p)) return false;
	if (ts.isPropertyDeclaration(p) || ts.isImportSpecifier(p) || ts.isExportSpecifier(p))
		return false;
	return true;
}

function containsBreak(n: ts.Node): boolean {
	if (ts.isBreakStatement(n)) return true;
	if (
		ts.isForStatement(n) ||
		ts.isForOfStatement(n) ||
		ts.isForInStatement(n) ||
		ts.isWhileStatement(n) ||
		ts.isDoStatement(n)
	)
		return false;
	if (ts.isSwitchStatement(n) || ts.isFunctionLike(n)) return false;
	return ts.forEachChild(n, containsBreak) ?? false;
}

/** Types every variable and parameter `any`: the source lost its types, and the subset checker is strict. */
function typed(root: ts.Node): ts.Node {
	const anyType = () => f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
	const visit = (n: ts.Node): ts.Node => {
		const out = ts.visitEachChild(n, visit, undefined);
		if (ts.isParameter(out) && !out.type) {
			return f.updateParameterDeclaration(
				out,
				out.modifiers,
				out.dotDotDotToken,
				out.name,
				out.questionToken,
				anyType(),
				out.initializer,
			);
		}
		if (ts.isVariableDeclaration(out) && !out.type) {
			const list = n.parent;
			const loopHead =
				list &&
				ts.isVariableDeclarationList(list) &&
				(ts.isForOfStatement(list.parent) || ts.isForInStatement(list.parent));
			if (!loopHead)
				return f.updateVariableDeclaration(
					out,
					out.name,
					out.exclamationToken,
					anyType(),
					out.initializer,
				);
		}
		return out;
	};
	return ts.visitNode(root, visit);
}

/** Compiles the source of a node into a library module for one node of a workflow. */
export function specialiseNode(input: SpecialiseInput): SpecialiseResult {
	return new Specialiser(input).run();
}
