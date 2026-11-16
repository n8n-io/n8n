import ts from 'typescript';

import { CODE_HELPERS } from '../convert/code-native/helpers.ts';
import { translateCode } from '../convert/code-native/translate.ts';
import { commonJsToModule, isCommonJs } from './commonjs.ts';

export interface SpecialiseInput {
	type: string;
	version: number;

	entry: string;
	readFile: (path: string) => string | undefined;

	parameters: Record<string, unknown>;

	defaults?: Record<string, unknown>;
	continueOnFail?: boolean;

	instanceId?: string | null;

	credentialFields?: Record<string, Record<string, unknown>>;

	moduleType?: string;

	evaluate?: (code: string) => unknown;

	aliases?: Record<string, string>;
}

export interface SpecialiseResult {
	source?: string;
	errors: string[];

	notes: string[];

	linked: string[];
}

const f = ts.factory;

const REQUEST_SOURCE = `async function __request(options, wrapped) {
	const response = await ctx.http({
		method: options.method ?? 'GET',
		url: options.uri ?? options.url,
		headers: __plain(options.headers ?? {}),
		qs: __plain(options.qs ?? {}),
		body: __plain(options.body),
		credential,
	});
	if (response.status >= 400) {
		const failure = new Error('Request failed with status code ' + response.status);
		throw wrapped ? __apiError(failure) : failure;
	}
	return response.body;
}`;

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
	'Set',
	'Map',
	'isFinite',
	'console',
]);

const HELPERS: Record<string, string> = {
	__apiError: `function __apiError(cause: any): any {
	const text: string = cause !== null && cause !== undefined && typeof cause.message === 'string' ? cause.message : String(cause);
	const prefix = 'Request failed with status code ';
	if (!text.startsWith(prefix)) return new Error(text);
	const code: string = text.slice(prefix.length);
	const known: any = {
		'400': 'Bad request - please check your parameters',
		'401': 'Authorization failed - please check your credentials',
		'402': 'Payment required - perhaps check your payment details?',
		'403': 'Forbidden - perhaps check your credentials?',
		'404': 'The resource you are requesting could not be found',
		'405': 'Method not allowed - please check you are using the right HTTP method',
		'429': 'The service is receiving too many requests from you',
		'500': 'The service was not able to process your request',
		'502': 'Bad gateway - the service failed to handle your request',
		'503': 'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)',
		'504': 'Gateway timed out - perhaps try again later?',
	};
	if (known[code] !== undefined) return new Error(known[code]);
	if (code.charAt(0) === '4') return new Error('Your request is invalid or could not be processed by the service');
	if (code.charAt(0) === '5') return new Error('The service failed to process your request');
	return new Error(text);
}`,
	__plain: '',
	__wrap: `function __wrap(items: any): any {
	const out: any[] = [];
	for (const json of items ?? [{}]) out.push({ json });
	return out;
}`,
	__out: `function __out(result: any): any {
	const out: any[] = [];
	for (const item of result[0] ?? []) out.push(__plain(item.json));
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
	__error: `function __error(cause: any): any {
	if (typeof cause === 'string') return new Error(cause);
	return new Error(String(cause !== null && cause !== undefined && cause.message !== undefined ? cause.message : cause));
}`,
	__isEmpty: `function __isEmpty(value: any): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	return true;
}`,
	__jsonParse: `function __jsonParse(text: any, options: any): any {
	try {
		return JSON.parse(text);
	} catch (error) {
		if (options !== null && options !== undefined && options.fallbackValue !== undefined) return options.fallbackValue;
		throw error;
	}
}`,
	__deepCopy: `function __deepCopy(value: any): any {
	return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}`,
	__get: `function __get(value: any, keys: any, whole: string, fallback: any): any {
	if (value === null || value === undefined) return fallback;
	if (keys.length > 1 && Object.keys(value).includes(whole)) {
		const direct: any = value[whole];
		return direct === undefined ? fallback : direct;
	}
	let current: any = value;
	for (const key of keys) {
		if (current === null || current === undefined) return fallback;
		current = current[key];
	}
	return current === undefined ? fallback : current;
}`,
};

const PURE_GLOBALS = new Set([
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
	'parseInt',
	'parseFloat',
	'isNaN',
	'isFinite',
	'encodeURIComponent',
	'decodeURIComponent',
	'encodeURI',
]);
const PURE_CALLS = new Set([
	'encodeURIComponent',
	'decodeURIComponent',
	'encodeURI',
	'String',
	'Number',
	'Boolean',
	'parseInt',
	'parseFloat',
]);

const GENERIC_ERRORS = new Set([
	'UserError',
	'ApplicationError',
	'OperationalError',
	'UnexpectedError',
]);

const PACKAGE_HELPERS: Record<string, Record<string, string>> = {
	lodash: { isEmpty: '__isEmpty', get: '__get' },
	'n8n-workflow': { jsonParse: '__jsonParse', deepCopy: '__deepCopy' },
};

function packageHelper(imported: { from: string; name: string }): string | undefined {
	const slash = imported.from.indexOf('/');
	const pkg =
		imported.from.startsWith('lodash') && slash > 0 ? imported.from.slice(0, slash) : imported.from;
	const name =
		imported.name === 'default'
			? imported.from.slice(imported.from.lastIndexOf('/') + 1)
			: imported.name;
	const table = PACKAGE_HELPERS[pkg];
	return table && Object.hasOwn(table, name) ? table[name] : undefined;
}

const PACKAGE_CONSTANTS: Record<string, string | number> = {
	SEND_AND_WAIT_OPERATION: 'sendAndWait',
};

const CREDENTIAL_PREFIX = '__CREDENTIAL_';

function credentialTypeOf(e: ts.Expression | undefined): string {
	const callExpression = e && ts.isAwaitExpression(e) ? e.expression : e;
	const first =
		callExpression && ts.isCallExpression(callExpression) ? callExpression.arguments[0] : undefined;
	return first && ts.isStringLiteral(first) && /^[A-Za-z0-9_]+$/.test(first.text) ? first.text : '';
}

const CONTEXT_PARAMS: string[] = [];
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

export function hasExpression(value: unknown): boolean {
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

function looseEquals(a: Literal, b: Literal): boolean {
	const nullish = (v: Literal) => v === null || v === undefined;
	if (nullish(a) || nullish(b)) return nullish(a) && nullish(b);
	if (typeof a === typeof b) return a === b;
	return Number(a) === Number(b);
}

function compare(op: ts.SyntaxKind, a: Literal, b: Literal): Literal | typeof NO_FOLD {
	switch (op) {
		case ts.SyntaxKind.EqualsEqualsEqualsToken:
			return a === b;
		case ts.SyntaxKind.ExclamationEqualsEqualsToken:
			return a !== b;
		case ts.SyntaxKind.EqualsEqualsToken:
			return looseEquals(a, b);
		case ts.SyntaxKind.ExclamationEqualsToken:
			return !looseEquals(a, b);
		default:
	}

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
const UNKNOWN = Symbol('unknown');

interface FileModel {
	path: string;
	sf: ts.SourceFile;

	declarations: Map<string, ts.FunctionDeclaration | ts.VariableDeclaration>;

	imports: Map<string, { from: string; name: string }>;

	namespaces: Map<string, string>;

	exportLocal: Map<string, string>;

	exportFrom: Map<string, { from: string; name: string }>;

	exportStar: string[];
}

interface Resolved {
	file: FileModel;
	node?: ts.FunctionDeclaration | ts.VariableDeclaration;
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

	private readonly contextCallees = new Set<string>();
	private changed = false;

	constructor(input: SpecialiseInput) {
		this.input = input;
	}

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

	private helper(name: string, ...args: ts.Expression[]): ts.CallExpression {
		this.helpers.add(name);
		return call(name, ...args);
	}

	private credentialField(type: string, name: string): ts.Expression {
		const fields = this.input.credentialFields?.[type];
		if (fields && Object.hasOwn(fields, name)) return expressionOf(fields[name]);
		return call('__CREDFIELD', f.createStringLiteral(name));
	}

	private load(path: string): FileModel | undefined {
		const known = this.files.get(path);
		if (known) return known;
		const text = this.input.readFile(path);
		if (text === undefined) return undefined;

		let js = text;
		if (path.endsWith('.ts')) {
			js = ts.transpileModule(text, {
				compilerOptions: {
					target: ts.ScriptTarget.ES2022,
					module: ts.ModuleKind.ESNext,
					removeComments: true,
				},
			}).outputText;
		} else if (isCommonJs(text)) {
			js = commonJsToModule(text, (spec) => this.isLocal(spec));
		}
		const sf = ts.createSourceFile(path, js, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
		const model: FileModel = {
			path,
			sf,
			declarations: new Map(),
			imports: new Map(),
			namespaces: new Map(),
			exportLocal: new Map(),
			exportFrom: new Map(),
			exportStar: [],
		};
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
		for (const st of sf.statements) {
			if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
				const named = st.importClause?.namedBindings;
				if (named && ts.isNamespaceImport(named))
					model.namespaces.set(named.name.text, st.moduleSpecifier.text);
			}
			if (!ts.isExportDeclaration(st)) continue;
			const from =
				st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)
					? st.moduleSpecifier.text
					: undefined;
			const clause = st.exportClause;
			if (!clause) {
				if (from !== undefined) model.exportStar.push(from);
			} else if (ts.isNamespaceExport(clause)) {
				if (from !== undefined) model.exportFrom.set(clause.name.text, { from, name: '*' });
			} else {
				for (const e of clause.elements) {
					const local = (e.propertyName ?? e.name).text;
					if (from !== undefined) model.exportFrom.set(e.name.text, { from, name: local });
					else model.exportLocal.set(e.name.text, local);
				}
			}
		}
		this.files.set(path, model);
		return model;
	}

	private isLocal(spec: string): boolean {
		return (
			spec.startsWith('.') ||
			Object.keys(this.input.aliases ?? {}).some((prefix) => spec.startsWith(prefix))
		);
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
		for (const candidate of [
			`${base}.ts`,
			`${base}/index.ts`,
			`${base}.js`,
			`${base}/index.js`,
			base,
		]) {
			const found = this.load(candidate);
			if (found) return found;
		}
		return undefined;
	}

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

	private parameter(node: ts.CallExpression): ts.Expression {
		const [nameArg, , fallback, options] = node.arguments;
		if (!nameArg || !ts.isStringLiteral(nameArg)) {
			return node;
		}

		let extract = false;
		if (options) {
			const only =
				ts.isObjectLiteralExpression(options) && options.properties.length === 1
					? options.properties[0]
					: undefined;
			extract =
				!!only &&
				ts.isPropertyAssignment(only) &&
				only.name.getText() === 'extractValue' &&
				only.initializer.kind === ts.SyntaxKind.TrueKeyword;
			if (!extract) return node;
		}
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
			let read: ts.Expression = f.createIdentifier('parameters');
			for (const key of path)
				read = f.createPropertyAccessChain(
					read,
					f.createToken(ts.SyntaxKind.QuestionDotToken),
					key,
				);
			const or = fallback ?? (path.length === 1 ? this.defaultOf(path[0]) : undefined);

			return this.helper(
				'__deepCopy',
				or ? f.createBinaryExpression(read, ts.SyntaxKind.QuestionQuestionToken, or) : read,
			);
		}
		if (extract) {
			const locator =
				typeof value === 'object' && value !== null
					? (value as Record<string, unknown>)
					: undefined;
			if (hasExpression(top)) return node;
			if (locator?.__rl === true) {
				if (locator.mode !== 'id' && locator.mode !== 'list') return node;
				return expressionOf(locator.value);
			}
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

	private bind(root: ts.Node, unit: Unit, isExecute: boolean): ts.Node {
		const localNames = bindingsOf(root);
		const regexConstants = new Map<string, string>();
		const collectRegex = (n: ts.Node) => {
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				n.initializer &&
				ts.isRegularExpressionLiteral(n.initializer)
			) {
				const flags = n.initializer.text.slice(n.initializer.text.lastIndexOf('/') + 1);
				if (localNames.get(n.name.text) === 1 && !/[gy]/.test(flags))
					regexConstants.set(n.name.text, n.initializer.text);
			}
			ts.forEachChild(n, collectRegex);
		};
		collectRegex(root);
		let depth = 0;

		const visit = (node: ts.Node): ts.Node | ts.Node[] | undefined => {
			const nested =
				node !== root && (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node));
			const arrow = node !== root && ts.isArrowFunction(node);
			if (nested || arrow) depth++;
			const out = rewrite(node);
			if (nested || arrow) depth--;
			return out;
		};
		const each = <T extends ts.Node>(node: T): T => ts.visitEachChild(node, visit, undefined);

		const args = (node: ts.CallExpression | ts.NewExpression, from = 0): ts.Expression[] =>
			(node.arguments ?? []).slice(from).map((a) => ts.visitNode(a, visit) as ts.Expression);

		const rewrite = (node: ts.Node): ts.Node | ts.Node[] | undefined => {
			const credentialCall = (e: ts.Expression) =>
				isThisCall(e, 'getCredentials') ||
				(ts.isAwaitExpression(e) && isThisCall(e.expression, 'getCredentials'));

			if (
				ts.isVariableDeclaration(node) &&
				ts.isObjectBindingPattern(node.name) &&
				node.initializer &&
				credentialCall(node.initializer)
			) {
				const plain = node.name.elements.every(
					(e) =>
						ts.isIdentifier(e.name) &&
						!e.initializer &&
						!e.dotDotDotToken &&
						(!e.propertyName || ts.isIdentifier(e.propertyName)),
				);
				if (plain) {
					return node.name.elements.map((e) =>
						f.createVariableDeclaration(
							(e.name as ts.Identifier).text,
							undefined,
							undefined,
							this.credentialField(
								credentialTypeOf(node.initializer),
								((e.propertyName ?? e.name) as ts.Identifier).text,
							),
						),
					);
				}
			}

			if (ts.isPropertyAccessExpression(node)) {
				const inner = ts.isParenthesizedExpression(node.expression)
					? node.expression.expression
					: node.expression;
				if (credentialCall(inner))
					return this.credentialField(credentialTypeOf(inner), node.name.text);
			}
			if (ts.isAwaitExpression(node) && isThisCall(node.expression, 'getCredentials')) {
				return f.createIdentifier(CREDENTIAL_PREFIX + credentialTypeOf(node));
			}
			if (isThisCall(node, 'getCredentials'))
				return f.createIdentifier(CREDENTIAL_PREFIX + credentialTypeOf(node));
			if (isThisCall(node, 'getNodeParameter'))
				return this.parameter(f.updateCallExpression(node, node.expression, undefined, args(node)));
			if (isThisCall(node, 'getInputData')) return f.createIdentifier('__items');
			if (isThisCall(node, 'continueOnFail'))
				return this.input.continueOnFail ? f.createTrue() : f.createFalse();
			if (isThisCall(node, 'getInstanceId')) {
				const id = this.input.instanceId;
				return id === undefined
					? f.createIdentifier('__INSTANCE_ID')
					: expressionOf(id ?? undefined);
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

				const direct = isThisCall(node, 'helpers', name.text) && REQUEST_HELPERS.has(name.text);
				const viaCall =
					name.text === 'call' &&
					ts.isPropertyAccessExpression(target) &&
					REQUEST_HELPERS.has(target.name.text) &&
					ts.isPropertyAccessExpression(target.expression) &&
					target.expression.name.text === 'helpers';
				if (direct || viaCall) {
					const options = args(node, node.arguments.length - 1)[0];

					const wrapped =
						name.text !== 'request' &&
						name.text !== 'httpRequest' &&
						!(
							viaCall &&
							ts.isPropertyAccessExpression(target) &&
							(target.name.text === 'request' || target.name.text === 'httpRequest')
						);
					this.helpers.add('__apiError');
					return this.helper('__request', options, wrapped ? f.createTrue() : f.createFalse());
				}

				if (
					name.text === 'call' &&
					!ts.isIdentifier(target) &&
					node.arguments[0]?.kind === ts.SyntaxKind.ThisKeyword
				) {
					return call('__CTXCALL', ts.visitNode(target, visit) as ts.Expression, ...args(node, 1));
				}
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
			}
			if (
				ts.isCallExpression(node) &&
				ts.isPropertyAccessExpression(node.expression) &&
				node.expression.name.text === 'test' &&
				ts.isIdentifier(node.expression.expression)
			) {
				const pattern = regexConstants.get(node.expression.expression.text);
				if (pattern !== undefined) {
					return f.updateCallExpression(
						node,
						f.createPropertyAccessExpression(f.createRegularExpressionLiteral(pattern), 'test'),
						undefined,
						args(node),
					);
				}
			}
			if (
				ts.isCallExpression(node) &&
				ts.isIdentifier(node.expression) &&
				!localNames.has(node.expression.text)
			) {
				const imported = unit.file.imports.get(node.expression.text);
				const helper = imported ? packageHelper(imported) : undefined;
				if (helper === '__get') {
					const path = node.arguments[1];
					const text = path && ts.isStringLiteral(path) ? path.text : '';

					if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(text)) {
						const [value, , fallback] = args(node);
						return this.helper(
							'__get',
							value,
							expressionOf(text.split('.')),
							f.createStringLiteral(text),
							fallback ?? f.createIdentifier('undefined'),
						);
					}
				} else if (helper) return this.helper(helper, ...args(node));
			}
			if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
				const cls = node.expression.text;
				if (GENERIC_ERRORS.has(cls))
					return this.helper('__error', args(node)[0] ?? f.createStringLiteral(cls));

				if (cls === 'NodeApiError' && node.arguments?.length === 2)
					return this.helper('__apiError', args(node)[1]);

				if (cls === 'NodeOperationError' && (node.arguments?.length ?? 0) >= 2)
					return this.helper('__error', args(node)[1]);
			}
			if (ts.isExpressionStatement(node)) {
				const e = node.expression;

				if (
					ts.isCallExpression(e) &&
					ts.isPropertyAccessExpression(e.expression) &&
					ts.isPropertyAccessExpression(e.expression.expression) &&
					e.expression.expression.name.text === 'logger' &&
					e.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword
				) {
					return f.createEmptyStatement();
				}

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

				if (
					ts.isCallExpression(e) &&
					ts.isPropertyAccessExpression(e.expression) &&
					e.expression.name.text === 'apply' &&
					ts.isPropertyAccessExpression(e.expression.expression) &&
					e.expression.expression.name.text === 'push' &&
					e.arguments.length === 2
				) {
					const [list, more] = args(e);
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
		return ts.visitNode(root, visit) as ts.Node;
	}

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
			if (ts.isIdentifier(node) && node.text.startsWith(CREDENTIAL_PREFIX)) {
				this.error(
					where,
					'the credential is used as a whole value: only its fields can go into a request',
				);
			}
			if (ts.isIdentifier(node) && node.text === '__CTXCALL') {
				this.error(
					where,
					'a call with the n8n context has a target that is not known at compile time',
				);
			}
			if (ts.isIdentifier(node) && node.text === '__INSTANCE_ID') {
				this.error(
					where,
					'the node reads the instance id, and the caller did not give the instance',
				);
			}
			ts.forEachChild(node, walk);
		};
		walk(root);
	}

	private checkCredentials() {
		const params = new Map<string, Set<number>>();
		const returns = new Set<string>();
		const analyse = (name: string, node: ts.Node, report: boolean): boolean => {
			let changed = false;
			const fn = ts.isFunctionDeclaration(node) ? node : undefined;
			const tainted = new Set<string>();
			for (const k of params.get(name) ?? []) {
				const p = fn?.parameters[k];
				if (p && ts.isIdentifier(p.name)) tainted.add(p.name.text);
			}
			const holds = (e: ts.Node): boolean => {
				if (
					ts.isIdentifier(e) &&
					(e.text === '__CREDFIELD' || (tainted.has(e.text) && isValueUse(e)))
				)
					return true;
				if (
					ts.isCallExpression(e) &&
					ts.isIdentifier(e.expression) &&
					returns.has(e.expression.text)
				)
					return true;
				return ts.forEachChild(e, holds) ?? false;
			};
			const rootOf = (e: ts.Expression): string | undefined => {
				let cur = e;
				while (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur))
					cur = cur.expression;
				return ts.isIdentifier(cur) ? cur.text : undefined;
			};
			for (let round = 0; round < 8; round++) {
				const before = tainted.size;
				const collect = (n: ts.Node) => {
					if (
						ts.isVariableDeclaration(n) &&
						ts.isIdentifier(n.name) &&
						n.initializer &&
						holds(n.initializer)
					)
						tainted.add(n.name.text);

					if (
						ts.isBinaryExpression(n) &&
						n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
						holds(n.right)
					) {
						const target = rootOf(n.left);
						if (target) tainted.add(target);
					}
					if (
						ts.isCallExpression(n) &&
						ts.isIdentifier(n.expression) &&
						n.expression.text === '__assign' &&
						n.arguments.length === 2 &&
						holds(n.arguments[1])
					) {
						const target = rootOf(n.arguments[0]);
						if (target) tainted.add(target);
					}
					ts.forEachChild(n, collect);
				};
				collect(node);
				if (tainted.size === before) break;
			}
			const walk = (n: ts.Node) => {
				if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
					const callee = this.units.get(n.expression.text);
					const offset = callee?.withContext ? CONTEXT_PARAMS.length : 0;
					n.arguments.forEach((arg, k) => {
						if (!callee || k < offset || !holds(arg)) return;
						const set = params.get(callee.name) ?? new Set<number>();
						if (!set.has(k - offset)) changed = true;
						set.add(k - offset);
						params.set(callee.name, set);
					});
				}
				if (
					ts.isReturnStatement(n) &&
					n.expression &&
					name !== 'execute' &&
					holds(n.expression) &&
					!returns.has(name)
				) {
					returns.add(name);
					changed = true;
				}
				if (report) {
					const field =
						ts.isCallExpression(n) &&
						ts.isIdentifier(n.expression) &&
						n.expression.text === '__CREDFIELD';
					const variable = ts.isIdentifier(n) && tainted.has(n.text) && isValueUse(n);
					const p = n.parent;
					if ((field || variable) && p) {
						const op = ts.isBinaryExpression(p) ? p.operatorToken.kind : undefined;
						const decides =
							(op !== undefined &&
								op !== ts.SyntaxKind.PlusToken &&
								op !== ts.SyntaxKind.EqualsToken &&
								op !== ts.SyntaxKind.CommaToken) ||
							ts.isPrefixUnaryExpression(p) ||
							ts.isTypeOfExpression(p) ||
							((ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isSwitchStatement(p)) &&
								p.expression === n) ||
							(ts.isConditionalExpression(p) && p.condition === n);
						if (decides)
							this.error(
								name,
								'the code compares or branches on a credential field: node code cannot read a credential value',
							);
					}
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
			return changed;
		};

		for (let round = 0; round < 16; round++) {
			let changed = false;
			for (const { name, node } of this.output) changed = analyse(name, node, false) || changed;
			if (!changed) break;
		}
		for (const { name, node } of this.output) analyse(name, node, true);
	}

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

	private propagate(root: ts.Node, where: string): ts.Node {
		const counts = bindingsOf(root);
		const uses = new Map<string, number>();
		const count = (n: ts.Node) => {
			if (ts.isIdentifier(n) && isValueUse(n)) uses.set(n.text, (uses.get(n.text) ?? 0) + 1);
			ts.forEachChild(n, count);
		};
		count(root);
		const constants = new Map<string, Literal>();

		const credentials = new Map<string, string>();
		const unused = new Set<string>();

		const objects = new Map<string, Map<string, Literal>>();
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
				} else if (
					ts.isIdentifier(n.initializer) &&
					n.initializer.text.startsWith(CREDENTIAL_PREFIX)
				) {
					credentials.set(n.name.text, n.initializer.text.slice(CREDENTIAL_PREFIX.length));
				} else if (isConst && lit) {
					constants.set(n.name.text, lit.value);
				} else if (
					isConst &&
					ts.isObjectLiteralExpression(n.initializer) &&
					n.initializer.properties.length > 0
				) {
					const members = new Map<string, Literal>();
					for (const p of n.initializer.properties) {
						const value = ts.isPropertyAssignment(p) ? literalOf(p.initializer) : undefined;
						const key =
							ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
								? p.name.text
								: undefined;
						if (!value || key === undefined) {
							members.clear();
							break;
						}
						members.set(key, value.value);
					}
					if (members.size > 0) objects.set(n.name.text, members);
				} else if (!uses.get(n.name.text) && isPure(n.initializer)) {
					unused.add(n.name.text);
				}
			}
			ts.forEachChild(n, scan);
		};
		scan(root);
		const readsOnly = (n: ts.Node) => {
			if (ts.isIdentifier(n) && objects.has(n.text) && isValueUse(n)) {
				const p = n.parent;
				const read =
					ts.isPropertyAccessExpression(p) &&
					p.expression === n &&
					objects.get(n.text)?.has(p.name.text);
				const up = read ? p.parent : undefined;
				const written =
					up &&
					((ts.isBinaryExpression(up) &&
						up.left === p &&
						up.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
						up.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
						ts.isDeleteExpression(up) ||
						ts.isPrefixUnaryExpression(up) ||
						ts.isPostfixUnaryExpression(up));
				if (!read || written) objects.delete(n.text);
			}
			ts.forEachChild(n, readsOnly);
		};
		readsOnly(root);
		if (constants.size + credentials.size + unused.size + objects.size === 0) return root;
		this.changed = true;
		const visit = (n: ts.Node): ts.Node | undefined => {
			if (ts.isVariableStatement(n)) {
				const kept = n.declarationList.declarations.filter((d) => {
					const name = ts.isIdentifier(d.name) ? d.name.text : '';
					return (
						!constants.has(name) &&
						!credentials.has(name) &&
						!unused.has(name) &&
						!objects.has(name)
					);
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
				return this.credentialField(credentials.get(n.expression.text) ?? '', n.name.text);
			}
			if (
				ts.isPropertyAccessExpression(n) &&
				ts.isIdentifier(n.expression) &&
				objects.has(n.expression.text)
			) {
				return expressionOf(objects.get(n.expression.text)?.get(n.name.text));
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

	private flow(root: ts.Node): ts.Node {
		if (!ts.isFunctionDeclaration(root) || !root.body) return root;
		const counts = bindingsOf(root);
		const fixed = new Set<string>(
			root.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : '')),
		);
		const captured = new Set<string>();
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
		const mark = (n: ts.Node, inner: boolean) => {
			const name = targetOf(n);
			if (name && inner) fixed.add(name);
			if (inner && ts.isIdentifier(n)) captured.add(n.text);
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
		const holdsObject = (name: string) =>
			counts.get(name) === 1 && !fixed.has(name) && !captured.has(name);

		interface Obj {
			props: Map<string, Literal | typeof UNKNOWN>;
		}
		interface Env {
			scalars: Map<string, Literal>;
			vars: Map<string, Obj>;
		}
		const empty = (): Env => ({ scalars: new Map(), vars: new Map() });
		const copy = (env: Env): Env => {
			const copies = new Map<Obj, Obj>();
			const vars = new Map<string, Obj>();
			for (const [name, obj] of env.vars) {
				const twin = copies.get(obj) ?? { props: new Map(obj.props) };
				copies.set(obj, twin);
				vars.set(name, twin);
			}
			return { scalars: new Map(env.scalars), vars };
		};
		const drop = (env: Env, obj: Obj) => {
			for (const [name, held] of [...env.vars]) if (held === obj) env.vars.delete(name);
		};
		const isWritten = (access: ts.Node): boolean => {
			const p = access.parent;
			if (!p) return false;
			if (
				ts.isBinaryExpression(p) &&
				p.left === access &&
				p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
				p.operatorToken.kind <= ts.SyntaxKind.LastAssignment
			)
				return true;
			if (ts.isDeleteExpression(p)) return true;
			if (
				(ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) &&
				(p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken)
			)
				return true;
			return ts.isCallExpression(p) && p.expression === access;
		};
		const keysArgument = (n: ts.Identifier): boolean => {
			const p = n.parent;
			return (
				ts.isCallExpression(p) &&
				ts.isPropertyAccessExpression(p.expression) &&
				ts.isIdentifier(p.expression.expression) &&
				p.expression.expression.text === 'Object' &&
				['keys', 'values', 'entries'].includes(p.expression.name.text)
			);
		};
		const escaping = (node: ts.Node, env: Env, exempt: Set<ts.Node>): Set<Obj> => {
			const out = new Set<Obj>();
			const walk = (n: ts.Node, inner: boolean) => {
				if (ts.isIdentifier(n) && isValueUse(n) && !exempt.has(n)) {
					const obj = env.vars.get(n.text);
					const p = n.parent;
					const member =
						(ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) &&
						p.expression === n;
					if (obj && (inner || !((member && !isWritten(p)) || keysArgument(n)))) out.add(obj);
				}
				ts.forEachChild(n, (c) => walk(c, inner || ts.isFunctionLike(c)));
			};
			walk(node, false);
			return out;
		};
		const mentioned = (node: ts.Node, env: Env) => {
			const walk = (n: ts.Node) => {
				if (ts.isIdentifier(n)) {
					const obj = env.vars.get(n.text);
					if (obj) drop(env, obj);
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
		};
		const substitute = <T extends ts.Node>(node: T, env: Env): T => {
			if (env.scalars.size === 0 && env.vars.size === 0) return node;
			const visit = (n: ts.Node): ts.Node => {
				if (ts.isFunctionLike(n)) return n;
				if (
					ts.isPropertyAccessExpression(n) &&
					n.name.text === 'length' &&
					ts.isCallExpression(n.expression)
				) {
					const [only] = n.expression.arguments;
					if (
						only &&
						ts.isIdentifier(only) &&
						keysArgument(only) &&
						n.expression.arguments.length === 1
					) {
						const obj = env.vars.get(only.text);
						const callee = n.expression.expression;
						if (obj && ts.isPropertyAccessExpression(callee) && callee.name.text === 'keys') {
							this.changed = true;
							return f.createNumericLiteral(obj.props.size);
						}
					}
				}
				if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && !isWritten(n)) {
					const obj = env.vars.get(n.expression.text);
					const value = obj?.props.get(n.name.text);
					if (obj && value !== UNKNOWN) {
						this.changed = true;
						return expressionOf(value);
					}
				}
				if (ts.isIdentifier(n) && env.scalars.has(n.text) && isValueUse(n)) {
					const p = n.parent;
					const written =
						p && targetOf(p) === n.text && (ts.isBinaryExpression(p) ? p.left === n : true);
					if (!written && !(p && ts.isShorthandPropertyAssignment(p))) {
						this.changed = true;
						return expressionOf(env.scalars.get(n.text));
					}
				}
				return ts.visitEachChild(n, visit, undefined);
			};
			return ts.visitNode(node, visit) as T;
		};
		const objectOf = (literal: ts.ObjectLiteralExpression): Obj | undefined => {
			const props = new Map<string, Literal | typeof UNKNOWN>();
			for (const p of literal.properties) {
				if (ts.isShorthandPropertyAssignment(p)) {
					props.set(p.name.text, UNKNOWN);
					continue;
				}
				if (!ts.isPropertyAssignment(p) || !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)))
					return undefined;
				const value = literalOf(p.initializer);
				props.set(p.name.text, value ? value.value : UNKNOWN);
			}
			return { props };
		};
		const bind = (env: Env, name: string, value: ts.Expression | undefined) => {
			env.vars.delete(name);
			if (!value || !holdsObject(name)) return;
			if (ts.isObjectLiteralExpression(value)) {
				const obj = objectOf(value);
				if (obj) env.vars.set(name, obj);
			} else if (ts.isIdentifier(value)) {
				const obj = env.vars.get(value.text);
				if (obj) env.vars.set(name, obj);
			}
		};
		const effect = (original: ts.Statement, out: ts.Statement, env: Env) => {
			const exempt = new Set<ts.Node>();
			const expression = ts.isExpressionStatement(original) ? original.expression : undefined;
			const after = ts.isExpressionStatement(out) ? out.expression : undefined;
			const single =
				ts.isVariableStatement(original) && original.declarationList.declarations.length === 1
					? original.declarationList.declarations[0]
					: undefined;
			if (single?.initializer && ts.isIdentifier(single.initializer))
				exempt.add(single.initializer);
			if (
				expression &&
				ts.isBinaryExpression(expression) &&
				expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
			) {
				if (ts.isIdentifier(expression.right)) exempt.add(expression.right);
				const left = expression.left;
				if (
					(ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) &&
					ts.isIdentifier(left.expression)
				)
					exempt.add(left.expression);
			}
			if (expression && ts.isDeleteExpression(expression)) {
				const target = expression.expression;
				if (ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression))
					exempt.add(target.expression);
			}
			const merge =
				expression &&
				ts.isCallExpression(expression) &&
				ts.isIdentifier(expression.expression) &&
				expression.expression.text === '__assign' &&
				expression.arguments.length === 2
					? expression
					: undefined;
			if (merge) for (const a of merge.arguments) if (ts.isIdentifier(a)) exempt.add(a);
			for (const obj of escaping(original, env, exempt)) drop(env, obj);

			if (single && ts.isIdentifier(single.name) && ts.isVariableStatement(out)) {
				bind(env, single.name.text, out.declarationList.declarations[0]?.initializer);
			} else if (
				after &&
				ts.isBinaryExpression(after) &&
				after.operatorToken.kind === ts.SyntaxKind.EqualsToken
			) {
				const left = after.left;
				if (ts.isIdentifier(left)) bind(env, left.text, after.right);
				else if (ts.isPropertyAccessExpression(left) && ts.isIdentifier(left.expression)) {
					const value = literalOf(after.right);
					env.vars
						.get(left.expression.text)
						?.props.set(left.name.text, value ? value.value : UNKNOWN);
				} else if (ts.isElementAccessExpression(left) && ts.isIdentifier(left.expression)) {
					const obj = env.vars.get(left.expression.text);
					const key = left.argumentExpression;
					const value = literalOf(after.right);
					if (obj && ts.isStringLiteral(key))
						obj.props.set(key.text, value ? value.value : UNKNOWN);
					else if (obj) drop(env, obj);
				}
			} else if (after && ts.isDeleteExpression(after)) {
				const target = after.expression;
				if (ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression)) {
					env.vars.get(target.expression.text)?.props.delete(target.name.text);
				}
			} else if (merge) {
				const [to, from] = merge.arguments;
				const target = ts.isIdentifier(to) ? env.vars.get(to.text) : undefined;
				const source = ts.isIdentifier(from) ? env.vars.get(from.text) : undefined;
				if (target && source) for (const [key, value] of source.props) target.props.set(key, value);
				else if (target) drop(env, target);
			}
		};
		const branch = (st: ts.Statement, env: Env): ts.Statement =>
			ts.isBlock(st) ? f.updateBlock(st, block(st.statements, env)) : block([st], env)[0];
		const block = (statements: readonly ts.Statement[], env: Env): ts.Statement[] =>
			statements.map((st) => {
				const assigned = assignedIn(st);
				let out: ts.Statement;
				if (ts.isBlock(st)) return f.updateBlock(st, block(st.statements, env));
				if (ts.isIfStatement(st)) {
					out = f.updateIfStatement(
						st,
						substitute(st.expression, env),
						branch(st.thenStatement, copy(env)),
						st.elseStatement ? branch(st.elseStatement, copy(env)) : undefined,
					);
					mentioned(st, env);
				} else if (
					ts.isForStatement(st) ||
					ts.isForOfStatement(st) ||
					ts.isForInStatement(st) ||
					ts.isWhileStatement(st) ||
					ts.isDoStatement(st)
				) {
					const body = branch(st.statement, empty());
					out = ts.visitEachChild(st, (c) => (c === st.statement ? body : c), undefined);
					mentioned(st, env);
				} else if (ts.isTryStatement(st)) {
					const inside = copy(env);
					for (const name of assigned) inside.scalars.delete(name);
					const tried = f.updateBlock(st.tryBlock, block(st.tryBlock.statements, inside));
					const caught = st.catchClause
						? f.updateCatchClause(
								st.catchClause,
								st.catchClause.variableDeclaration,
								f.updateBlock(
									st.catchClause.block,
									block(st.catchClause.block.statements, empty()),
								),
							)
						: undefined;
					const last = st.finallyBlock
						? f.updateBlock(st.finallyBlock, block(st.finallyBlock.statements, empty()))
						: undefined;
					out = f.updateTryStatement(st, tried, caught, last);
					mentioned(st, env);
				} else {
					const reading = copy(env);
					for (const name of assigned) reading.scalars.delete(name);
					out = substitute(st, reading);
					effect(st, out, env);
				}
				for (const name of assigned) env.scalars.delete(name);
				if (ts.isVariableStatement(out)) {
					for (const d of out.declarationList.declarations) {
						const lit = d.initializer ? literalOf(d.initializer) : undefined;
						if (
							ts.isIdentifier(d.name) &&
							lit &&
							tracked(d.name.text) &&
							!(out.declarationList.flags & ts.NodeFlags.Const)
						) {
							env.scalars.set(d.name.text, lit.value);
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
						if (lit && tracked(e.left.text)) env.scalars.set(e.left.text, lit.value);
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
			f.updateBlock(root.body, block(root.body.statements, empty())),
		);
	}

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
			if (
				this.input.evaluate &&
				ts.isCallExpression(n) &&
				n.arguments.length === 1 &&
				ts.isPropertyAccessExpression(n.expression) &&
				n.expression.name.text === 'test' &&
				ts.isRegularExpressionLiteral(n.expression.expression)
			) {
				const subject = literalOf(n.arguments[0]);
				if (subject && typeof subject.value === 'string') {
					try {
						const result = this.input.evaluate(
							`${n.expression.expression.text}.test(${JSON.stringify(subject.value)})`,
						);
						if (typeof result === 'boolean') return done(expressionOf(result));
					} catch {
						return n;
					}
				}
			}
			if (ts.isConditionalExpression(n)) {
				const condition = literalOf(n.condition);
				if (condition) return done(condition.value ? n.whenTrue : n.whenFalse);
			}
			if (ts.isTemplateExpression(n)) {
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

	private member(file: FileModel, name: string, hops = 0): Resolved | undefined {
		if (hops > 12) return undefined;
		const node = file.declarations.get(name);
		if (node) return { file, node };
		const space = file.namespaces.get(name);
		if (space !== undefined) {
			const target = this.resolveModule(file, space);
			return target ? { file: target } : undefined;
		}
		const imported = file.imports.get(name);
		if (!imported) return undefined;
		const target = this.resolveModule(file, imported.from);
		return target ? this.exported(target, imported.name, hops + 1) : undefined;
	}

	private exported(file: FileModel, name: string, hops = 0): Resolved | undefined {
		if (hops > 12) return undefined;
		const local = file.exportLocal.get(name);
		if (local !== undefined) return this.member(file, local, hops + 1);
		const from = file.exportFrom.get(name);
		if (from) {
			const target = this.resolveModule(file, from.from);
			if (!target) return undefined;
			return from.name === '*' ? { file: target } : this.exported(target, from.name, hops + 1);
		}
		const node = file.declarations.get(name);
		if (node) return { file, node };
		for (const star of file.exportStar) {
			const target = this.resolveModule(file, star);
			const found = target ? this.exported(target, name, hops + 1) : undefined;
			if (found) return found;
		}
		return undefined;
	}

	private resolveChains(root: ts.Node, unit: Unit): ts.Node {
		const bound = bindingsOf(root);
		const target = (e: ts.Expression, withContext: boolean): string | undefined => {
			const keys: string[] = [];
			let cur = e;
			for (;;) {
				if (ts.isPropertyAccessExpression(cur)) {
					keys.unshift(cur.name.text);
					cur = cur.expression;
				} else if (
					ts.isElementAccessExpression(cur) &&
					ts.isStringLiteral(cur.argumentExpression)
				) {
					keys.unshift(cur.argumentExpression.text);
					cur = cur.expression;
				} else break;
			}
			if (!ts.isIdentifier(cur) || keys.length === 0 || bound.has(cur.text)) return undefined;
			let found = this.member(unit.file, cur.text);
			for (const key of keys)
				found = found && !found.node ? this.exported(found.file, key) : undefined;
			if (!found?.node) return undefined;
			const alias = [cur.text, ...keys].join('_');
			if (!this.units.has(alias)) {
				const next: Unit = { name: alias, node: found.node, file: found.file, withContext };
				this.units.set(alias, next);
				this.queue.push(next);
			}
			return alias;
		};
		const visit = (n: ts.Node): ts.Node => {
			const out = ts.visitEachChild(n, visit, undefined);
			if (!ts.isCallExpression(out)) return out;
			if (ts.isIdentifier(out.expression) && out.expression.text === '__CTXCALL') {
				const alias = out.arguments.length > 0 ? target(out.arguments[0], true) : undefined;
				if (!alias) return out;
				return call(
					alias,
					...CONTEXT_PARAMS.map((p) => f.createIdentifier(p)),
					...out.arguments.slice(1),
				);
			}
			const alias = target(out.expression, false);
			return alias ? call(alias, ...out.arguments) : out;
		};
		return ts.visitNode(root, visit);
	}

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
						f.createVariableDeclarationList(
							[
								f.updateVariableDeclaration(
									source,
									f.createIdentifier(unit.name),
									source.exclamationToken,
									source.type,
									source.initializer,
								),
							],
							ts.NodeFlags.Const,
						),
					)
				: f.updateFunctionDeclaration(
						source,
						source.modifiers,
						source.asteriskToken,
						f.createIdentifier(unit.name),
						source.typeParameters,
						source.parameters,
						source.type,
						source.body,
					);
		let cur = this.reparse(statement, unit.file.sf);
		cur = this.reparse(this.bind(cur.node, unit, isExecute), cur.sf);
		cur = this.fold(cur, unit.name);
		cur = this.reparse(this.resolveChains(cur.node, unit), cur.sf);
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

	private optimise() {
		for (let round = 0; round < 6; round++) {
			const specialised = this.specialiseParameters();
			const folded = this.foldPureCalls();
			const inlined = this.inlineCalls();
			if (!specialised && !folded && !inlined) break;
		}
		const reached = new Set<string>(['execute']);
		for (let k = 0; k < this.output.length + 1; k++) {
			const before = reached.size;
			for (const { name, node } of this.output) {
				if (!reached.has(name)) continue;
				const walk = (n: ts.Node) => {
					if (ts.isIdentifier(n) && this.units.has(n.text)) reached.add(n.text);
					ts.forEachChild(n, walk);
				};
				walk(node);
			}
			if (reached.size === before) break;
		}
		for (let k = this.output.length - 1; k >= 0; k--) {
			if (!reached.has(this.output[k].name)) this.output.splice(k, 1);
		}
	}

	private inlineCount = 0;

	private inlineCalls(): boolean {
		const sites = new Map<string, number>();
		for (const { node } of this.output) {
			const walk = (n: ts.Node) => {
				if (ts.isIdentifier(n) && this.units.has(n.text) && isValueUse(n)) {
					const p = n.parent;
					const called = ts.isCallExpression(p) && p.expression === n;
					if (!ts.isFunctionDeclaration(p))
						sites.set(n.text, (sites.get(n.text) ?? 0) + (called ? 1 : 2));
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
		}
		const simple = (
			callee: ts.FunctionDeclaration,
			name: string,
			callerBound: Map<string, number>,
		): boolean => {
			if (
				callee.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ||
				callee.asteriskToken
			)
				return false;
			if (!callee.parameters.every((p) => ts.isIdentifier(p.name) && !p.dotDotDotToken))
				return false;
			const bound = bindingsOf(callee);
			let ok = true;
			const walk = (n: ts.Node, inner: boolean) => {
				if (ts.isReturnStatement(n) && !inner) ok = false;
				if (n.kind === ts.SyntaxKind.ThisKeyword || ts.isAwaitExpression(n)) ok = false;
				if (ts.isIdentifier(n) && isValueUse(n)) {
					if (n.text === 'arguments' || n.text === name) ok = false;
					if (!bound.has(n.text) && callerBound.has(n.text)) ok = false;
				}
				if (ok) ts.forEachChild(n, (c) => walk(c, inner || ts.isFunctionLike(c)));
			};
			if (callee.body) walk(callee.body, false);
			return ok;
		};
		let changed = false;
		for (const entry of this.output) {
			for (let round = 0; round < 32; round++) {
				const text = this.printer.printNode(ts.EmitHint.Unspecified, entry.node, entry.sf);
				const sf = ts.createSourceFile(
					'unit.js',
					text,
					ts.ScriptTarget.ES2022,
					true,
					ts.ScriptKind.JS,
				);
				const caller = sf.statements[0];
				if (!caller || !ts.isFunctionDeclaration(caller)) break;
				const callerBound = bindingsOf(caller);
				let replacement: { pos: number; end: number; text: string } | undefined;
				const find = (n: ts.Node) => {
					if (replacement) return;
					if (
						ts.isExpressionStatement(n) &&
						ts.isCallExpression(n.expression) &&
						ts.isIdentifier(n.expression.expression)
					) {
						const name = n.expression.expression.text;
						const unit = this.output.find((o) => o.name === name);
						const callee = unit?.node;
						const args = n.expression.arguments;
						if (
							unit &&
							callee &&
							ts.isFunctionDeclaration(callee) &&
							callee.body &&
							name !== entry.name &&
							sites.get(name) === 1 &&
							args.length <= callee.parameters.length &&
							simple(callee, name, callerBound)
						) {
							const k = this.inlineCount++;
							const print = (x: ts.Node) =>
								this.printer.printNode(ts.EmitHint.Unspecified, x, unit.sf);
							const written = new Set<string>();
							const noteWrites = (x: ts.Node) => {
								if (
									ts.isBinaryExpression(x) &&
									x.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
									x.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
									ts.isIdentifier(x.left)
								) {
									written.add(x.left.text);
								}
								if (
									(ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) &&
									ts.isIdentifier(x.operand)
								)
									written.add(x.operand.text);
								ts.forEachChild(x, noteWrites);
							};
							noteWrites(callee.body);
							const locals = bindingsOf(callee);
							const fresh = (id: string) => `${id}_${k}`;
							const rename = (x: ts.Node): ts.Node => {
								if (ts.isShorthandPropertyAssignment(x) && locals.has(x.name.text)) {
									return f.createPropertyAssignment(
										x.name.text,
										f.createIdentifier(fresh(x.name.text)),
									);
								}
								if (ts.isIdentifier(x) && locals.has(x.text)) {
									const parent = x.parent;
									const declared =
										parent &&
										(ts.isVariableDeclaration(parent) ||
											ts.isParameter(parent) ||
											ts.isBindingElement(parent) ||
											ts.isFunctionDeclaration(parent)) &&
										parent.name === x;
									if (declared || isValueUse(x)) return f.createIdentifier(fresh(x.text));
								}
								return ts.visitEachChild(x, rename, undefined);
							};
							const inner = callee.parameters.map((param, i) => {
								const id = ts.isIdentifier(param.name)
									? fresh(param.name.text)
									: `__unused${k}_${i}`;
								const given = args[i] ? args[i].getText(sf) : 'undefined';
								const value = param.initializer
									? `((v) => v === undefined ? ${print(ts.visitNode(param.initializer, rename))} : v)(${given})`
									: given;
								return `${written.has(ts.isIdentifier(param.name) ? param.name.text : '') ? 'let' : 'const'} ${id} = ${value};`;
							});
							const body = callee.body.statements.map((st) => print(ts.visitNode(st, rename)));
							replacement = {
								pos: n.getStart(sf),
								end: n.getEnd(),
								text: `{ ${inner.join(' ')}\n${body.join('\n')} }`,
							};
							return;
						}
					}
					ts.forEachChild(n, find);
				};
				find(caller);
				if (!replacement) break;
				changed = true;
				const next =
					text.slice(0, replacement.pos) + replacement.text + text.slice(replacement.end);
				const parsed = ts.createSourceFile(
					'unit.js',
					next,
					ts.ScriptTarget.ES2022,
					true,
					ts.ScriptKind.JS,
				);
				const cur = this.fold({ node: parsed.statements[0], sf: parsed }, entry.name);
				entry.node = cur.node;
				entry.sf = cur.sf;
			}
		}
		return changed;
	}

	private refold(entry: { name: string; node: ts.Node; sf: ts.SourceFile }, node: ts.Node) {
		const cur = this.fold(this.reparse(node, entry.sf), entry.name);
		entry.node = cur.node;
		entry.sf = cur.sf;
	}

	private specialiseParameters(): boolean {
		const sites = new Map<string, ts.CallExpression[]>();
		const escaped = new Set<string>();
		for (const { node } of this.output) {
			const walk = (n: ts.Node) => {
				if (ts.isIdentifier(n) && this.units.has(n.text) && isValueUse(n)) {
					const p = n.parent;
					if (ts.isCallExpression(p) && p.expression === n)
						sites.set(n.text, [...(sites.get(n.text) ?? []), p]);
					else if (!ts.isFunctionDeclaration(p)) escaped.add(n.text);
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
		}
		let changed = false;
		for (const entry of this.output) {
			const fn = entry.node;
			const calls = sites.get(entry.name);
			if (
				!ts.isFunctionDeclaration(fn) ||
				!fn.body ||
				!calls ||
				escaped.has(entry.name) ||
				entry.name === 'execute'
			)
				continue;
			const written = new Set<string>();
			const noteWrites = (n: ts.Node) => {
				if (
					ts.isBinaryExpression(n) &&
					n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
					n.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
					ts.isIdentifier(n.left)
				) {
					written.add(n.left.text);
				}
				if (
					(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
					ts.isIdentifier(n.operand)
				)
					written.add(n.operand.text);
				ts.forEachChild(n, noteWrites);
			};
			noteWrites(fn.body);
			const constants: ts.Statement[] = [];
			const parameters = fn.parameters.map((p, k) => {
				if (
					!ts.isIdentifier(p.name) ||
					p.dotDotDotToken ||
					p.name.text.startsWith('__p') ||
					written.has(p.name.text)
				)
					return p;
				const given = calls.map((c) => c.arguments[k]);
				const values = given.map((a) => (a === undefined ? { value: undefined } : literalOf(a)));
				const first = values[0];
				if (!first || !values.every((v) => v !== undefined && v.value === first.value)) return p;
				const value =
					first.value === undefined && p.initializer ? p.initializer : expressionOf(first.value);
				constants.push(
					f.createVariableStatement(
						undefined,
						f.createVariableDeclarationList(
							[f.createVariableDeclaration(p.name.text, undefined, undefined, value)],
							ts.NodeFlags.Const,
						),
					),
				);
				return f.createParameterDeclaration(undefined, undefined, `__p${k}`);
			});
			if (constants.length === 0) continue;
			changed = true;
			this.refold(
				entry,
				f.updateFunctionDeclaration(
					fn,
					fn.modifiers,
					fn.asteriskToken,
					fn.name,
					fn.typeParameters,
					parameters,
					fn.type,
					f.updateBlock(fn.body, [...constants, ...fn.body.statements]),
				),
			);
		}
		return changed;
	}

	private foldPureCalls(): boolean {
		const evaluate = this.input.evaluate;
		if (!evaluate) return false;
		const pure = new Set<string>();
		const isPure = (name: string, fn: ts.FunctionDeclaration): boolean => {
			if (fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || fn.asteriskToken)
				return false;
			const bound = bindingsOf(fn);
			let ok = true;
			const walk = (n: ts.Node) => {
				if (
					n.kind === ts.SyntaxKind.ThisKeyword ||
					ts.isAwaitExpression(n) ||
					ts.isNewExpression(n)
				)
					ok = false;
				if (
					ts.isPropertyAccessExpression(n) &&
					ts.isIdentifier(n.expression) &&
					n.expression.text === 'Math' &&
					n.name.text === 'random'
				)
					ok = false;
				if (
					ts.isIdentifier(n) &&
					isValueUse(n) &&
					!bound.has(n.text) &&
					n.text !== name &&
					!PURE_GLOBALS.has(n.text) &&
					!pure.has(n.text)
				)
					ok = false;
				if (ok) ts.forEachChild(n, walk);
			};
			walk(fn);
			return ok;
		};
		for (let round = 0; round < this.output.length + 1; round++) {
			const before = pure.size;
			for (const { name, node } of this.output) {
				if (
					!pure.has(name) &&
					name !== 'execute' &&
					ts.isFunctionDeclaration(node) &&
					isPure(name, node)
				)
					pure.add(name);
			}
			if (pure.size === before) break;
		}
		const sources = this.output
			.filter((o) => pure.has(o.name))
			.map((o) => this.printer.printNode(ts.EmitHint.Unspecified, o.node, o.sf))
			.join('\n');
		const literalJson = (e: ts.Expression): boolean =>
			literalOf(e) !== undefined ||
			(ts.isArrayLiteralExpression(e) && e.elements.every(literalJson)) ||
			(ts.isObjectLiteralExpression(e) &&
				e.properties.every(
					(p) =>
						ts.isPropertyAssignment(p) &&
						(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
						literalJson(p.initializer),
				));
		let changed = false;
		for (const entry of this.output) {
			let replaced = false;
			const visit = (input: ts.Node): ts.Node => {
				const n = ts.visitEachChild(input, visit, undefined);
				if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return n;
				const callee = n.expression.text;
				if (
					!(pure.has(callee) || PURE_CALLS.has(callee)) ||
					callee === entry.name ||
					!n.arguments.every(literalJson)
				)
					return n;
				const text = this.printer.printNode(ts.EmitHint.Unspecified, n, entry.sf);
				let raw: unknown;
				try {
					raw = evaluate(
						`${sources}\n;(() => { const r = ${text}; return r === undefined ? 'u' : typeof r === 'number' && !Number.isFinite(r) ? 'n' : JSON.stringify([r]); })()`,
					);
				} catch {
					return n;
				}
				if (typeof raw !== 'string' || raw === 'n') return n;
				const parsed: unknown = raw === 'u' ? [undefined] : JSON.parse(raw);
				const value: unknown = Array.isArray(parsed) ? parsed[0] : n;
				const simple =
					value === undefined ||
					value === null ||
					typeof value === 'string' ||
					typeof value === 'boolean' ||
					(typeof value === 'number' && Number.isFinite(value));
				if (!simple) return n;
				replaced = true;
				return expressionOf(value);
			};
			const next = ts.visitNode(entry.node, visit);
			if (replaced) {
				changed = true;
				this.refold(entry, next);
			}
		}
		return changed;
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
		this.optimise();
		this.checkCredentials();
		const linked = this.output.map((o) => o.name);
		if (this.errors.length > 0) return { errors: this.errors, notes: this.notes, linked };
		const source = this.print();
		if (this.errors.length > 0) return { errors: this.errors, notes: this.notes, linked };
		return { source, errors: [], notes: this.notes, linked };
	}

	private print(): string {
		const code: string[] = [];
		let body = '';
		for (const { name, node, sf } of this.output) {
			const unit = this.units.get(name);
			const text = (n: ts.Node) => this.printer.printNode(ts.EmitHint.Unspecified, finish(n), sf);
			if (!ts.isFunctionDeclaration(node)) {
				if (unit?.withContext) this.error(name, 'a constant is called with the n8n context');
				code.push(text(node));
			} else if (name === 'execute') {
				body = (node.body?.statements ?? []).map(text).join('\n');
			} else {
				const lead = unit?.withContext
					? CONTEXT_PARAMS.map((p) => f.createParameterDeclaration(undefined, undefined, p))
					: [];
				code.push(
					text(
						f.updateFunctionDeclaration(
							node,
							node.modifiers?.filter((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
							node.asteriskToken,
							node.name,
							undefined,
							[...lead, ...node.parameters],
							undefined,
							node.body,
						),
					),
				);
			}
		}
		if (this.helpers.has('__request')) code.unshift(REQUEST_SOURCE);
		this.helpers.delete('__request');
		for (const always of ['__wrap', '__plain']) this.helpers.add(always);

		const globals = new Set([
			'ctx',
			'parameters',
			'credential',
			'__items',
			'__request',
			...Object.keys(HELPERS),
		]);
		const translated = translateCode({
			code: [...code, body].join('\n'),
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
			nodeCode: { globals },
		});
		if (!translated.ok) {
			for (const b of translated.blockers) this.error('code', `${b.feature}: ${b.message}`);
			return '';
		}
		const t = translated.translation;
		if (t.zones.size > 0)
			this.error('code', 'dates in a time zone have no compiled form in node code yet');
		if (t.usesMatchProps)
			this.error(
				'code',
				'the `index` or `groups` of a match has no compiled form in node code yet',
			);

		const names: string[] = [];
		const add = (name: string) => {
			if (names.includes(name) || !Object.hasOwn(CODE_HELPERS, name)) return;
			names.push(name);
			for (const used of CODE_HELPERS[name].uses) add(used);
		};
		for (const name of t.helpers) add(name);
		if (t.usesCollections) add('collPlain');

		const plain = t.usesCollections
			? 'function __plain(value: Json): Json {\n\treturn collPlain(value);\n}'
			: 'function __plain(value: Json): Json {\n\treturn value;\n}';
		const own = [...this.helpers].sort().map((h) => (h === '__plain' ? plain : HELPERS[h]));
		return `import { defineNode } from '@n8n/workflow-lang';

type Json = any;

${[...names.map((n) => CODE_HELPERS[n].source), ...own].join('\n\n')}

export default defineNode<Json>({
	type: ${JSON.stringify(this.input.moduleType ?? this.input.type)},
	version: ${this.input.version},
	async run(ctx, parameters0, items0, credential) {
		const parameters: Json = parameters0 ?? {};
		const __items: Json = __wrap(items0);
${t.body}
	},
});
`;
	}
}

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

function finish(root: ts.Node): ts.Node {
	const visit = (n: ts.Node): ts.Node => {
		const out = ts.visitEachChild(n, visit, undefined);
		if (
			ts.isCallExpression(out) &&
			ts.isIdentifier(out.expression) &&
			out.expression.text === '__CREDFIELD'
		) {
			const field = out.arguments[0];
			return f.createStringLiteral(
				`{{$credentials.${ts.isStringLiteral(field) ? field.text : ''}}}`,
			);
		}
		return out;
	};
	return ts.visitNode(root, visit);
}

export function specialiseNode(input: SpecialiseInput): SpecialiseResult {
	try {
		return new Specialiser(input).run();
	} catch (error) {
		return {
			errors: [error instanceof Error ? error.message : String(error)],
			notes: [],
			linked: [],
		};
	}
}
