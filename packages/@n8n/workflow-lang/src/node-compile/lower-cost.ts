import ts from 'typescript';

const f = ts.factory;

export const PLAIN_LIST = '__plainList';
export const PLAIN_LIST_SAME = `function ${PLAIN_LIST}(list: any): any {\n\treturn list;\n}`;
export const PLAIN_LIST_COLLECTIONS = `function ${PLAIN_LIST}(list: any): any {
	const out: any[] = [];
	for (const value of list) out.push(__plain(value));
	return out;
}`;

export const COST_HELPERS: Record<string, string> = {
	[PLAIN_LIST]: '',
	__pushJson: `function __pushJson(out: any, data: any): any {
	const given: any = data;
	if (Array.isArray(given)) {
		const list: any = given;
		for (const json of list) out.push(json !== null && json !== undefined && json.json ? json.json : json);
	} else out.push(given !== null && given !== undefined && given.json ? given.json : given);
}`,
};

const ITEMS = '__items';
const COUNT = '__count';
export const COST_GLOBALS = [COUNT, ...Object.keys(COST_HELPERS)];
const ITEMS_WRAPPED = `const ${ITEMS}: Json = __wrap(items0);`;
const ITEMS_COUNTED = `const ${COUNT}: Json = items0 === undefined || items0 === null ? 1 : (Array.isArray(items0) ? items0 : __wrap(items0)).length;`;
const REQUEST = '__request';
const REQUEST_KEYS = [
	'auth',
	'headers',
	'formData',
	'form',
	'body',
	'qs',
	'method',
	'uri',
	'url',
] as const;
type RequestKey = (typeof REQUEST_KEYS)[number];
const MAX_REQUEST_FORMS = 16;

export interface LoweredCode {
	code: string;
	items: string;
	helpers: string[];
}

type Replacement = ts.Node | ts.Node[] | null;
type Scope = ts.SourceFile | ts.FunctionLikeDeclaration;

const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function parse(code: string): ts.SourceFile {
	return ts.createSourceFile('lower.ts', code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

function rewrite(sf: ts.SourceFile, changes: Map<ts.Node, Replacement>, extra: string[]): string {
	const visit = (n: ts.Node): ts.VisitResult<ts.Node | undefined> => {
		const change = changes.get(n);
		if (change === null) return undefined;
		if (change !== undefined) return change;
		return ts.visitEachChild(n, visit, undefined);
	};
	const out: string[] = [];
	for (const statement of sf.statements) {
		const next = visit(statement);
		const list = next === undefined ? [] : Array.isArray(next) ? next : [next];
		for (const node of list) out.push(printer.printNode(ts.EmitHint.Unspecified, node, sf));
	}
	return [...extra, ...out].join('\n');
}

function isName(id: ts.Identifier): boolean {
	const p = id.parent;
	if (ts.isPropertyAccessExpression(p)) return p.name === id;
	if (ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p)) return p.name === id;
	if (ts.isBindingElement(p)) return p.propertyName === id;
	if (ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p)) return true;
	return false;
}

function isDeclarationName(id: ts.Identifier): boolean {
	const p = id.parent;
	if (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p))
		return p.name === id;
	if (ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isClassDeclaration(p))
		return p.name === id;
	return false;
}

function declaresAtTop(fn: ts.FunctionLikeDeclaration, name: string): boolean | undefined {
	let top = false;
	let deep = false;
	const walk = (n: ts.Node, level: number) => {
		if (ts.isIdentifier(n) && n.text === name && isDeclarationName(n)) {
			if (level === 0) top = true;
			else deep = true;
		}
		if (n !== fn && ts.isFunctionLike(n)) {
			if (ts.isFunctionDeclaration(n) && n.name?.text === name) {
				if (level === 0) top = true;
				else deep = true;
			}
			return;
		}
		const block =
			n !== fn.body &&
			(ts.isBlock(n) ||
				ts.isForStatement(n) ||
				ts.isForOfStatement(n) ||
				ts.isForInStatement(n) ||
				ts.isCatchClause(n) ||
				ts.isCaseBlock(n));
		ts.forEachChild(n, (child) => walk(child, block ? level + 1 : level));
	};
	walk(fn, 0);
	if (top) return true;
	return deep ? undefined : false;
}

interface Uses {
	declarations: ts.Identifier[];
	references: ts.Identifier[];
}

function usesIn(scope: Scope, name: string): Uses | undefined {
	const out: Uses = { declarations: [], references: [] };
	let known = true;
	const walk = (n: ts.Node, inner: boolean) => {
		if (!known) return;
		if (n !== scope && ts.isFunctionLike(n)) {
			if (ts.isFunctionDeclaration(n) && n.name?.text === name) out.declarations.push(n.name);
			if (!ts.isFunctionDeclaration(n) && !ts.isFunctionExpression(n) && !ts.isArrowFunction(n)) {
				known = false;
				return;
			}
			const own = declaresAtTop(n, name);
			if (own === undefined) known = false;
			if (own !== false) return;
			ts.forEachChild(n, (child) => walk(child, true));
			return;
		}
		if (ts.isIdentifier(n) && n.text === name && !isName(n)) {
			if (isDeclarationName(n)) out.declarations.push(n);
			else if (inner) known = false;
			else out.references.push(n);
		}
		ts.forEachChild(n, (child) => walk(child, inner));
	};
	ts.forEachChild(scope, (child) => walk(child, false));
	return known ? out : undefined;
}

function scopeOf(n: ts.Node): Scope {
	let at: ts.Node = n.parent;
	while (!ts.isSourceFile(at)) {
		if (ts.isFunctionDeclaration(at) || ts.isFunctionExpression(at) || ts.isArrowFunction(at))
			return at;
		at = at.parent;
	}
	return at;
}

function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
	return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

function isTarget(n: ts.Node): boolean {
	let at: ts.Node = n;
	for (;;) {
		const p = at.parent;
		if (ts.isBinaryExpression(p) && isAssignmentOperator(p.operatorToken.kind))
			return p.left === at;
		if (ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p))
			return (
				p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken
			);
		if ((ts.isForOfStatement(p) || ts.isForInStatement(p)) && p.initializer === at) return true;
		const pattern =
			ts.isArrayLiteralExpression(p) ||
			ts.isObjectLiteralExpression(p) ||
			ts.isPropertyAssignment(p) ||
			ts.isShorthandPropertyAssignment(p) ||
			ts.isSpreadElement(p) ||
			ts.isSpreadAssignment(p) ||
			ts.isParenthesizedExpression(p) ||
			ts.isNonNullExpression(p) ||
			ts.isAsExpression(p);
		if (!pattern) return false;
		at = p;
	}
}

function plainKeys(literal: ts.ObjectLiteralExpression): Map<string, ts.Expression> | undefined {
	const keys = new Map<string, ts.Expression>();
	for (const p of literal.properties) {
		if (ts.isShorthandPropertyAssignment(p) && !p.objectAssignmentInitializer) {
			keys.set(p.name.text, p.name);
			continue;
		}
		if (!ts.isPropertyAssignment(p)) return undefined;
		if (!ts.isIdentifier(p.name) && !ts.isStringLiteral(p.name)) return undefined;
		if (p.name.text === '__proto__') return undefined;
		keys.set(p.name.text, p.initializer);
	}
	return keys;
}

function isCallOf(n: ts.Node, name: string): n is ts.CallExpression {
	return ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === name;
}

function isEmptyLiteral(e: ts.Expression | undefined): boolean {
	return e !== undefined && ts.isObjectLiteralExpression(e) && e.properties.length === 0;
}

function soleDeclaration(id: ts.Identifier): ts.VariableStatement | undefined {
	const declaration = id.parent;
	if (!ts.isVariableDeclaration(declaration)) return undefined;
	const list = declaration.parent;
	if (!ts.isVariableDeclarationList(list) || list.declarations.length !== 1) return undefined;
	return ts.isVariableStatement(list.parent) ? list.parent : undefined;
}

function isConst(statement: ts.VariableStatement): boolean {
	return (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
}

interface Shape {
	maybe: Set<string>;
	headersAreObjects: boolean;
	copies: ts.Statement[];
	spares: ts.Statement[];
}

function emptyCopy(
	statement: ts.Node,
	name: string,
	scope: Scope,
): { spare: ts.VariableStatement } | undefined {
	if (!ts.isExpressionStatement(statement)) return undefined;
	const e = statement.expression;
	if (!ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.EqualsToken)
		return undefined;
	if (!ts.isIdentifier(e.left) || e.left.text !== name) return undefined;
	const copy = e.right;
	if (!ts.isCallExpression(copy) || copy.arguments.length !== 3) return undefined;
	const callee = copy.expression;
	if (
		!ts.isPropertyAccessExpression(callee) ||
		!ts.isIdentifier(callee.expression) ||
		callee.expression.text !== 'Object' ||
		callee.name.text !== 'assign'
	)
		return undefined;
	const [target, source, added] = copy.arguments;
	if (!isEmptyLiteral(target) || !ts.isIdentifier(source) || source.text !== name) return undefined;
	if (!ts.isIdentifier(added) || added.text === name) return undefined;
	const uses = usesIn(scope, added.text);
	if (!uses || uses.declarations.length !== 1 || uses.references.length !== 1) return undefined;
	const spare = soleDeclaration(uses.declarations[0]);
	if (!spare || !isConst(spare)) return undefined;
	const declared = spare.declarationList.declarations[0];
	return isEmptyLiteral(declared.initializer) && scopeOf(spare) === scope ? { spare } : undefined;
}

function shapeOf(name: ts.Identifier): Shape | undefined {
	const scope = scopeOf(name);
	const uses = usesIn(scope, name.text);
	if (!uses || uses.declarations.length !== 1) return undefined;
	const declared = uses.declarations[0].parent;
	if (!ts.isVariableDeclaration(declared) || !ts.isIdentifier(declared.name)) return undefined;
	if (!declared.initializer || !ts.isObjectLiteralExpression(declared.initializer))
		return undefined;
	if (scopeOf(declared) !== scope) return undefined;
	const keys = plainKeys(declared.initializer);
	if (!keys) return undefined;
	const shape: Shape = {
		maybe: new Set(keys.keys()),
		headersAreObjects: true,
		copies: [],
		spares: [],
	};
	const first = keys.get('headers');
	if (first !== undefined && !ts.isObjectLiteralExpression(first)) shape.headersAreObjects = false;
	for (const use of uses.references) {
		const p = use.parent;
		if (isCallOf(p, REQUEST) && p.arguments[0] === use) continue;
		const statement = ts.isBinaryExpression(p) ? p.parent : p.parent.parent;
		const copy = statement ? emptyCopy(statement, name.text, scope) : undefined;
		if (copy && ts.isStatement(statement)) {
			if (!shape.copies.includes(statement)) {
				shape.copies.push(statement);
				shape.spares.push(copy.spare);
			}
			continue;
		}
		let key: string | undefined;
		if (ts.isPropertyAccessExpression(p) && p.expression === use) key = p.name.text;
		if (
			ts.isElementAccessExpression(p) &&
			p.expression === use &&
			ts.isStringLiteralLike(p.argumentExpression)
		)
			key = p.argumentExpression.text;
		if (key === undefined || key === '__proto__') return undefined;
		const around = p.parent;
		if (ts.isCallExpression(around) && around.expression === p) return undefined;
		if (ts.isTaggedTemplateExpression(around) && around.tag === p) return undefined;
		if (ts.isDeleteExpression(around)) continue;
		if (!isTarget(p)) continue;
		shape.maybe.add(key);
		const plain =
			ts.isBinaryExpression(around) &&
			around.left === p &&
			around.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isObjectLiteralExpression(around.right);
		if (key === 'headers' && !plain) shape.headersAreObjects = false;
	}
	return shape;
}

function literalShape(literal: ts.ObjectLiteralExpression): Shape | undefined {
	const keys = plainKeys(literal);
	if (!keys) return undefined;
	const first = keys.get('headers');
	return {
		maybe: new Set(keys.keys()),
		headersAreObjects: first === undefined || ts.isObjectLiteralExpression(first),
		copies: [],
		spares: [],
	};
}

function flagOf(e: ts.Expression | undefined): boolean | undefined {
	if (e === undefined) return false;
	if (e.kind === ts.SyntaxKind.TrueKeyword) return true;
	if (e.kind === ts.SyntaxKind.FalseKeyword) return false;
	if (ts.isIdentifier(e) && e.text === 'undefined') return false;
	return undefined;
}

function requestForm(name: string, has: (key: RequestKey) => boolean, flags: RequestFlags): string {
	const parts = flags.legacy && has('formData');
	const form = has('form');
	const lines: string[] = [];
	if (has('auth')) lines.push('const auth = options.auth;');
	const given = has('headers') ? '__plain(options.headers ?? {})' : '{}';
	const copied = form || !flags.headersAreObjects;
	lines.push(`const headers = ${copied ? `__assign({}, ${given})` : given};`);
	if (parts) lines.push('const parts = __formParts(options, headers);');
	if (form)
		lines.push(
			`const form = ${parts ? 'parts === undefined ? options.form : undefined' : 'options.form'};`,
			"if (form !== undefined && form !== null) headers['content-type'] = 'application/x-www-form-urlencoded';",
		);
	const sent = has('body') ? '__plain(__sendBody(options.body))' : 'undefined';
	const encoded = form
		? `form !== undefined && form !== null ? __form(__plain(form)) : ${sent}`
		: sent;
	const url = has('uri')
		? has('url')
			? 'options.uri ?? options.url'
			: 'options.uri'
		: has('url')
			? 'options.url'
			: 'undefined';
	return `async function ${name}(options) {
	${lines.join('\n\t')}
	const response = await ctx.http({
		method: ${has('method') ? "options.method ?? 'GET'" : "'GET'"},
		url: ${url},
		headers,
		qs: ${has('qs') ? '__plain(options.qs ?? {})' : '{}'},
		body: ${parts ? `parts !== undefined ? undefined : ${encoded}` : encoded},
		multipart: ${parts ? 'parts' : 'undefined'},
		responseBinary: undefined,
		basicAuth: ${has('auth') ? "auth ? { user: auth.user ?? auth.username ?? '', password: auth.pass ?? auth.password ?? '' } : undefined" : 'undefined'},
		inject: ${flags.wrapped},
		credential,
	});
	if (response.status >= 400) {
		const failure = new Error('Request failed with status code ' + response.status);
		throw ${flags.wrapped === 'true' ? '__apiError(failure, undefined)' : 'failure'};
	}
	return response.body;
}`;
}

interface RequestFlags {
	wrapped: string;
	legacy: boolean;
	headersAreObjects: boolean;
}

function lowerRequests(sf: ts.SourceFile): string | undefined {
	const changes = new Map<ts.Node, Replacement>();
	const forms = new Map<string, string>();
	let general = 0;
	let declaration: ts.FunctionDeclaration | undefined;
	const visit = (n: ts.Node) => {
		if (ts.isFunctionDeclaration(n) && n.name?.text === REQUEST) {
			declaration = n;
			return;
		}
		ts.forEachChild(n, visit);
		if (ts.isIdentifier(n) && n.text === REQUEST && !isName(n)) {
			const p = n.parent;
			if (!ts.isCallExpression(p) || p.expression !== n) general++;
		}
		if (!isCallOf(n, REQUEST)) return;
		general++;
		const [options, wrapped, legacy] = n.arguments;
		const isWrapped = flagOf(wrapped);
		const isLegacy = flagOf(legacy);
		if (options === undefined || isWrapped === undefined || isLegacy === undefined) return;
		if (n.arguments.length > 3) return;
		const shape = ts.isIdentifier(options)
			? shapeOf(options)
			: ts.isObjectLiteralExpression(options)
				? literalShape(options)
				: undefined;
		if (!shape || shape.maybe.has('encoding')) return;
		const has = (key: RequestKey) => shape.maybe.has(key);
		if (REQUEST_KEYS.every(has) && !shape.headersAreObjects) return;
		const flags = {
			wrapped: wrapped === undefined ? 'undefined' : String(isWrapped),
			legacy: isLegacy,
			headersAreObjects: shape.headersAreObjects,
		};
		const bits = [
			...REQUEST_KEYS.map(has),
			isWrapped,
			wrapped === undefined,
			isLegacy,
			shape.headersAreObjects,
		];
		const id = bits.reduce((sum, bit, k) => sum + (bit ? 2 ** k : 0), 0).toString(36);
		const name = `${REQUEST}_${id}`;
		if (!forms.has(name) && forms.size >= MAX_REQUEST_FORMS) return;
		forms.set(name, requestForm(name, has, flags));
		general--;
		changes.set(n, f.createCallExpression(f.createIdentifier(name), undefined, [options]));
		for (const statement of [...shape.copies, ...shape.spares]) changes.set(statement, null);
	};
	visit(sf);
	if (forms.size === 0) return undefined;
	if (declaration && general === 0) changes.set(declaration, null);
	return rewrite(sf, changes, [...forms.values()]);
}

function singleStatement(statement: ts.Statement): ts.Statement | undefined {
	if (!ts.isBlock(statement)) return statement;
	return statement.statements.length === 1 ? statement.statements[0] : undefined;
}

function pushedValue(statement: ts.Statement | undefined, list: string): ts.Expression | undefined {
	if (!statement || !ts.isExpressionStatement(statement)) return undefined;
	const e = statement.expression;
	if (!ts.isCallExpression(e) || e.arguments.length !== 1) return undefined;
	const callee = e.expression;
	if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'push') return undefined;
	if (!ts.isIdentifier(callee.expression) || callee.expression.text !== list) return undefined;
	return ts.isSpreadElement(e.arguments[0]) ? undefined : e.arguments[0];
}

function lowerOutput(sf: ts.SourceFile): { code: string; helpers: string[] } | undefined {
	const last = sf.statements[sf.statements.length - 1];
	if (!last || !ts.isReturnStatement(last) || !last.expression) return undefined;
	if (!isCallOf(last.expression, '__out') || last.expression.arguments.length !== 1)
		return undefined;
	const wrapped = last.expression.arguments[0];
	if (!ts.isArrayLiteralExpression(wrapped) || wrapped.elements.length !== 1) return undefined;
	const list = wrapped.elements[0];
	if (!ts.isIdentifier(list)) return undefined;
	const uses = usesIn(sf, list.text);
	if (!uses || uses.declarations.length !== 1) return undefined;
	const declared = soleDeclaration(uses.declarations[0]);
	if (!declared || !isConst(declared) || declared.parent !== sf) return undefined;
	const start = declared.declarationList.declarations[0].initializer;
	if (!start || !ts.isArrayLiteralExpression(start) || start.elements.length !== 0)
		return undefined;
	const changes = new Map<ts.Node, Replacement>();
	const helpers = new Set<string>([PLAIN_LIST]);
	for (const use of uses.references) {
		if (use === list) continue;
		const callee = use.parent;
		const pushed = ts.isPropertyAccessExpression(callee) ? callee.parent : undefined;
		const statement = pushed && ts.isCallExpression(pushed) ? pushed.parent : undefined;
		if (!statement || !ts.isExpressionStatement(statement)) return undefined;
		const value = pushedValue(statement, list.text);
		if (!value) return undefined;
		const single =
			ts.isObjectLiteralExpression(value) && value.properties.length === 1
				? value.properties[0]
				: undefined;
		if (
			single &&
			ts.isPropertyAssignment(single) &&
			ts.isIdentifier(single.name) &&
			single.name.text === 'json'
		) {
			changes.set(value, single.initializer);
			continue;
		}
		const loop = ts.isBlock(statement.parent) ? statement.parent.parent : statement.parent;
		if (!ts.isForOfStatement(loop) || singleStatement(loop.statement) !== statement)
			return undefined;
		const each = loop.initializer;
		if (!ts.isVariableDeclarationList(each) || each.declarations.length !== 1) return undefined;
		const item = each.declarations[0].name;
		if (!ts.isIdentifier(item) || !ts.isIdentifier(value) || value.text !== item.text)
			return undefined;
		const source =
			isCallOf(loop.expression, '__spreadList') && loop.expression.arguments.length === 2
				? loop.expression.arguments[0]
				: loop.expression;
		if (!ts.isIdentifier(source)) return undefined;
		const made = usesIn(sf, source.text);
		if (!made || made.declarations.length !== 1 || made.references.length !== 1) return undefined;
		const array = soleDeclaration(made.declarations[0]);
		if (!array || !isConst(array)) return undefined;
		const from = array.declarationList.declarations[0].initializer;
		if (!from || !isCallOf(from, '__jsonArray') || from.arguments.length !== 1) return undefined;
		const block = loop.parent;
		if (!ts.isBlock(block) && !ts.isSourceFile(block)) return undefined;
		const at = block.statements.indexOf(loop);
		if (at < 1 || block.statements[at - 1] !== array) return undefined;
		helpers.add('__pushJson');
		changes.set(array, null);
		changes.set(
			loop,
			f.createExpressionStatement(
				f.createCallExpression(f.createIdentifier('__pushJson'), undefined, [
					f.createIdentifier(list.text),
					from.arguments[0],
				]),
			),
		);
	}
	changes.set(
		last,
		f.createReturnStatement(
			f.createCallExpression(f.createIdentifier(PLAIN_LIST), undefined, [
				f.createIdentifier(list.text),
			]),
		),
	);
	return { code: rewrite(sf, changes, []), helpers: [...helpers] };
}

function isLengthRead(use: ts.Identifier): boolean {
	const p = use.parent;
	return (
		ts.isPropertyAccessExpression(p) &&
		p.expression === use &&
		p.name.text === 'length' &&
		!isTarget(p) &&
		!ts.isDeleteExpression(p.parent)
	);
}

function lowerItems(sf: ts.SourceFile): string | undefined {
	let taken = false;
	const scan = (n: ts.Node) => {
		if (ts.isIdentifier(n) && n.text === COUNT) taken = true;
		ts.forEachChild(n, scan);
	};
	scan(sf);
	if (taken) return undefined;
	const changes = new Map<ts.Node, Replacement>();
	const count = () => f.createIdentifier(COUNT);
	let ok = true;
	const visit = (n: ts.Node) => {
		if (!ok) return;
		ts.forEachChild(n, visit);
		if (!ts.isIdentifier(n) || n.text !== ITEMS || isName(n)) return;
		if (isLengthRead(n)) {
			changes.set(n.parent, count());
			return;
		}
		const declared = n.parent;
		const named =
			ts.isVariableDeclaration(declared) &&
			declared.initializer === n &&
			ts.isIdentifier(declared.name)
				? declared.name
				: undefined;
		const alias = named ? soleDeclaration(named) : undefined;
		if (!named || !alias || !isConst(alias)) {
			ok = false;
			return;
		}
		const uses = usesIn(scopeOf(alias), named.text);
		if (!uses || uses.declarations.length !== 1 || !uses.references.every(isLengthRead)) {
			ok = false;
			return;
		}
		for (const use of uses.references) changes.set(use.parent, count());
		changes.set(alias, null);
	};
	visit(sf);
	return ok ? rewrite(sf, changes, []) : undefined;
}

type Primitive = string | number | boolean | null | undefined;

function primitiveOf(e: ts.Node): { value: Primitive } | undefined {
	if (ts.isStringLiteralLike(e)) return { value: e.text };
	if (ts.isNumericLiteral(e)) return { value: Number(e.text) };
	if (e.kind === ts.SyntaxKind.TrueKeyword) return { value: true };
	if (e.kind === ts.SyntaxKind.FalseKeyword) return { value: false };
	if (e.kind === ts.SyntaxKind.NullKeyword) return { value: null };
	if (ts.isIdentifier(e) && e.text === 'undefined') return { value: undefined };
	return undefined;
}

function primitiveNode(value: Primitive): ts.Expression {
	if (value === undefined) return f.createIdentifier('undefined');
	if (value === null) return f.createNull();
	if (typeof value === 'string') return f.createStringLiteral(value);
	if (typeof value === 'boolean') return value ? f.createTrue() : f.createFalse();
	return f.createNumericLiteral(value);
}

function isAfter(use: ts.Node, declaration: ts.Node): boolean {
	return use.getStart() >= declaration.getEnd();
}

function isShorthand(use: ts.Identifier): boolean {
	return ts.isShorthandPropertyAssignment(use.parent);
}

function scopesOf(sf: ts.SourceFile): Scope[] {
	const scopes: Scope[] = [sf];
	const walk = (n: ts.Node) => {
		if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n))
			scopes.push(n);
		ts.forEachChild(n, walk);
	};
	walk(sf);
	return scopes;
}

function ownStatements(scope: Scope): ts.VariableStatement[] {
	const found: ts.VariableStatement[] = [];
	const walk = (n: ts.Node) => {
		if (n !== scope && ts.isFunctionLike(n)) return;
		if (ts.isVariableStatement(n) && n.declarationList.declarations.length === 1) found.push(n);
		ts.forEachChild(n, walk);
	};
	walk(scope);
	return found;
}

function includedValue(
	use: ts.Identifier,
): { call: ts.CallExpression; value: Primitive } | undefined {
	const member = use.parent;
	if (!ts.isPropertyAccessExpression(member) || member.expression !== use) return undefined;
	if (member.name.text !== 'includes' || member.questionDotToken) return undefined;
	const call = member.parent;
	if (!ts.isCallExpression(call) || call.expression !== member || call.arguments.length !== 1)
		return undefined;
	const value = primitiveOf(call.arguments[0]);
	return value ? { call, value: value.value } : undefined;
}

function isObjectSpread(n: ts.Node): boolean {
	return ts.isSpreadAssignment(n) && ts.isObjectLiteralExpression(n.parent);
}

function literalMembers(literal: ts.ObjectLiteralExpression): Map<string, Primitive> | undefined {
	const members = new Map<string, Primitive>();
	for (const p of literal.properties) {
		if (!ts.isPropertyAssignment(p)) return undefined;
		if (!ts.isIdentifier(p.name) && !ts.isStringLiteral(p.name)) return undefined;
		const value = primitiveOf(p.initializer);
		if (!value || p.name.text === '__proto__') return undefined;
		members.set(p.name.text, value.value);
	}
	return members;
}

function memberRead(
	use: ts.Identifier,
	members: Map<string, Primitive> | undefined,
): { node: ts.Node; value: Primitive } | undefined {
	const p = use.parent;
	let key: string | undefined;
	if (ts.isPropertyAccessExpression(p) && p.expression === use) key = p.name.text;
	if (
		ts.isElementAccessExpression(p) &&
		p.expression === use &&
		ts.isStringLiteralLike(p.argumentExpression)
	)
		key = p.argumentExpression.text;
	if (key === undefined || !members?.has(key)) return undefined;
	if (isTarget(p) || ts.isDeleteExpression(p.parent)) return undefined;
	if (ts.isCallExpression(p.parent) && p.parent.expression === p) return undefined;
	return { node: p, value: members.get(key) };
}

function settleConstants(sf: ts.SourceFile, changes: Map<ts.Node, Replacement>): void {
	for (const scope of scopesOf(sf)) {
		for (const statement of ownStatements(scope)) {
			const declared = statement.declarationList.declarations[0];
			if (!ts.isIdentifier(declared.name) || !declared.initializer) continue;
			const uses = usesIn(scope, declared.name.text);
			if (!uses || uses.declarations.length !== 1) continue;
			const block = statement.parent;
			const inReach = (use: ts.Node) =>
				isAfter(use, statement) &&
				use.getStart() >= block.getStart() &&
				use.getEnd() <= block.getEnd();
			if (!uses.references.every(inReach)) continue;
			const value = primitiveOf(declared.initializer);
			if (value) {
				if (typeof value.value === 'number' && !(value.value >= 0)) continue;
				if (uses.references.some((use) => isTarget(use) || isShorthand(use))) continue;
				for (const use of uses.references) changes.set(use, primitiveNode(value.value));
				changes.set(statement, null);
				continue;
			}
			const list = declared.initializer;
			if (!isConst(statement)) continue;
			if (isEmptyLiteral(list)) {
				const spreads = uses.references.map((use) => use.parent);
				if (spreads.length === 0 || !spreads.every(isObjectSpread)) continue;
				for (const spread of spreads) changes.set(spread, null);
				changes.set(statement, null);
				continue;
			}
			if (ts.isObjectLiteralExpression(list)) {
				const members = literalMembers(list);
				const reads = uses.references.map((use) => memberRead(use, members));
				if (!members || reads.some((read) => read === undefined)) continue;
				for (const read of reads) if (read) changes.set(read.node, primitiveNode(read.value));
				changes.set(statement, null);
				continue;
			}
			if (!ts.isArrayLiteralExpression(list)) continue;
			const members = list.elements.map(primitiveOf);
			const values: Primitive[] = [];
			for (const member of members) if (member) values.push(member.value);
			if (values.length !== members.length) continue;
			const asked = uses.references.map(includedValue);
			if (asked.some((ask) => ask === undefined)) continue;
			for (const ask of asked)
				if (ask) changes.set(ask.call, primitiveNode(values.includes(ask.value)));
			changes.set(statement, null);
		}
	}
}

function isObjectCall(call: ts.CallExpression, method: string): boolean {
	const callee = call.expression;
	return (
		ts.isPropertyAccessExpression(callee) &&
		ts.isIdentifier(callee.expression) &&
		callee.expression.text === 'Object' &&
		callee.name.text === method
	);
}

function isReadOfEmpty(use: ts.Identifier): boolean {
	const p = use.parent;
	if (ts.isPropertyAccessExpression(p) && p.expression === use)
		return !isTarget(p) && !ts.isDeleteExpression(p.parent) && !ts.isCallExpression(p.parent);
	if (!ts.isCallExpression(p)) return false;
	const at = p.arguments.findIndex((arg) => arg === use);
	if (isCallOf(p, '__assign')) return at === 1;
	if (isObjectCall(p, 'keys')) return at === 0;
	return isObjectCall(p, 'assign') && at >= 1;
}

function keyCountOf(use: ts.Identifier): ts.PropertyAccessExpression | undefined {
	const keys = use.parent;
	if (!ts.isCallExpression(keys) || !isObjectCall(keys, 'keys')) return undefined;
	const count = keys.parent;
	if (!ts.isPropertyAccessExpression(count) || count.expression !== keys) return undefined;
	return count.name.text === 'length' && !isTarget(count) ? count : undefined;
}

function usesAnywhere(sf: ts.SourceFile, name: string): Uses {
	const out: Uses = { declarations: [], references: [] };
	const walk = (n: ts.Node) => {
		if (ts.isIdentifier(n) && n.text === name && !isName(n))
			(isDeclarationName(n) ? out.declarations : out.references).push(n);
		ts.forEachChild(n, walk);
	};
	walk(sf);
	return out;
}

function settleAbsentArguments(sf: ts.SourceFile, changes: Map<ts.Node, Replacement>): void {
	for (const fn of sf.statements) {
		if (!ts.isFunctionDeclaration(fn) || !fn.name) continue;
		const calls = usesAnywhere(sf, fn.name.text);
		if (calls.declarations.length !== 1 || calls.references.length === 0) continue;
		let known = true;
		let most = 0;
		for (const use of calls.references) {
			const call = use.parent;
			if (!ts.isCallExpression(call) || call.expression !== use) known = false;
			else if (call.arguments.some(ts.isSpreadElement)) known = false;
			else most = Math.max(most, call.arguments.length);
		}
		if (!known) continue;
		for (const [index, parameter] of fn.parameters.entries()) {
			if (index < most || !ts.isIdentifier(parameter.name) || parameter.dotDotDotToken) continue;
			if (!isEmptyLiteral(parameter.initializer)) continue;
			const uses = usesIn(fn, parameter.name.text);
			if (!uses || uses.declarations.length !== 1 || !uses.references.every(isReadOfEmpty))
				continue;
			for (const use of uses.references) {
				const count = keyCountOf(use);
				if (count) changes.set(count, primitiveNode(0));
			}
		}
	}
}

function dropUnusedFunctions(sf: ts.SourceFile, changes: Map<ts.Node, Replacement>): void {
	for (const fn of sf.statements) {
		if (!ts.isFunctionDeclaration(fn) || !fn.name) continue;
		const name = fn.name.text;
		let used = false;
		const walk = (n: ts.Node) => {
			if (n === fn || used) return;
			if (ts.isIdentifier(n) && n.text === name && !isName(n)) used = true;
			ts.forEachChild(n, walk);
		};
		walk(sf);
		if (!used) changes.set(fn, null);
	}
}

const EQUALITY = new Map<ts.SyntaxKind, boolean>([
	[ts.SyntaxKind.EqualsEqualsEqualsToken, true],
	[ts.SyntaxKind.ExclamationEqualsEqualsToken, false],
]);

function endsFlow(statement: ts.Statement): boolean {
	return (
		ts.isReturnStatement(statement) ||
		ts.isThrowStatement(statement) ||
		ts.isBreakOrContinueStatement(statement)
	);
}

function hasVar(root: ts.Node): boolean {
	let found = false;
	const walk = (n: ts.Node) => {
		if (found || (n !== root && ts.isFunctionLike(n))) return;
		if (ts.isVariableDeclarationList(n) && (n.flags & ts.NodeFlags.BlockScoped) === 0) found = true;
		ts.forEachChild(n, walk);
	};
	walk(root);
	return found;
}

function declares(statement: ts.Statement): boolean {
	return (
		ts.isVariableStatement(statement) ||
		ts.isFunctionDeclaration(statement) ||
		ts.isClassDeclaration(statement)
	);
}

function settleStatements(statements: readonly ts.Statement[]): ts.Statement[] | undefined {
	const out: ts.Statement[] = [];
	let changed = false;
	let ended = false;
	const add = (statement: ts.Statement) => {
		const kept = declares(statement) || hasVar(statement);
		if ((ended && !kept) || ts.isEmptyStatement(statement)) {
			changed = true;
			return;
		}
		if (ts.isBlock(statement) && !statement.statements.some(declares)) {
			changed = true;
			for (const inner of statement.statements) add(inner);
			return;
		}
		out.push(statement);
		if (endsFlow(statement)) ended = true;
	};
	for (const statement of statements) add(statement);
	return changed ? out : undefined;
}

function simplify(sf: ts.SourceFile): string | undefined {
	let changed = false;
	const done = <T>(value: T): T => {
		changed = true;
		return value;
	};
	const visit = (input: ts.Node): ts.Node => {
		const n = ts.visitEachChild(input, visit, undefined);
		if (ts.isParenthesizedExpression(n) && primitiveOf(n.expression)) return done(n.expression);
		if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) {
			const operand = primitiveOf(n.operand);
			if (operand) return done(primitiveNode(!operand.value));
		}
		if (ts.isBinaryExpression(n)) {
			const left = primitiveOf(n.left);
			const op = n.operatorToken.kind;
			if (left && op === ts.SyntaxKind.BarBarToken) return done(left.value ? n.left : n.right);
			if (left && op === ts.SyntaxKind.AmpersandAmpersandToken)
				return done(left.value ? n.right : n.left);
			const right = primitiveOf(n.right);
			const same = EQUALITY.get(op);
			if (left && right && same !== undefined)
				return done(primitiveNode((left.value === right.value) === same));
		}
		if (ts.isConditionalExpression(n)) {
			const condition = primitiveOf(n.condition);
			if (condition) return done(condition.value ? n.whenTrue : n.whenFalse);
		}
		if (ts.isIfStatement(n)) {
			const condition = primitiveOf(n.expression);
			if (condition)
				return done(
					condition.value ? n.thenStatement : (n.elseStatement ?? f.createEmptyStatement()),
				);
		}
		if (ts.isBlock(n)) {
			const settled = settleStatements(n.statements);
			if (settled) return done(f.updateBlock(n, settled));
		}
		return n;
	};
	const statements: ts.Statement[] = [];
	for (const statement of sf.statements) {
		const next = visit(statement);
		if (ts.isStatement(next)) statements.push(next);
	}
	const settled = settleStatements(statements);
	if (!changed && !settled) return undefined;
	return (settled ?? statements)
		.map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, sf))
		.join('\n');
}

const MAX_ROUNDS = 8;

function lowerConstants(code: string): string {
	let text = code;
	for (let round = 0; round < MAX_ROUNDS; round++) {
		const sf = parse(text);
		const changes = new Map<ts.Node, Replacement>();
		settleConstants(sf, changes);
		if (changes.size === 0) settleAbsentArguments(sf, changes);
		if (changes.size === 0) dropUnusedFunctions(sf, changes);
		const settled = changes.size > 0 ? rewrite(sf, changes, []) : text;
		const simple = simplify(parse(settled));
		if (changes.size === 0 && simple === undefined) break;
		text = simple ?? settled;
	}
	return text;
}

export function lowerCost(code: string, holdsBytes: boolean): LoweredCode {
	let text = lowerConstants(code);
	const helpers = new Set<string>();
	const requests = lowerRequests(parse(text));
	if (requests !== undefined) text = requests;
	const output = holdsBytes ? undefined : lowerOutput(parse(text));
	if (output) {
		text = output.code;
		for (const helper of output.helpers) helpers.add(helper);
	}
	const counted = lowerItems(parse(text));
	if (counted !== undefined) text = counted;
	return {
		code: text,
		items: counted === undefined ? ITEMS_WRAPPED : ITEMS_COUNTED,
		helpers: [...helpers],
	};
}

export function reachableHelpers(roots: string[], sources: Record<string, string>): Set<string> {
	const reached = new Set<string>();
	const pending = [...roots];
	const names = Object.keys(sources);
	for (let k = 0; k < pending.length && k <= names.length + roots.length; k++) {
		const words = new Set(pending[k].match(/[A-Za-z_$][\w$]*/g) ?? []);
		for (const name of names) {
			if (reached.has(name) || !words.has(name)) continue;
			reached.add(name);
			pending.push(sources[name]);
		}
	}
	return reached;
}

const TEXT_METHODS = new Set([
	'startsWith',
	'endsWith',
	'includes',
	'indexOf',
	'lastIndexOf',
	'slice',
	'substring',
	'trim',
	'trimStart',
	'trimEnd',
	'toLowerCase',
	'toUpperCase',
	'charAt',
]);
const MAX_FOLDED_TEXT = 4096;

export function foldTextMethod(
	text: string,
	method: string,
	args: unknown[],
): { value: string | number | boolean } | undefined {
	if (!TEXT_METHODS.has(method) || text.length > MAX_FOLDED_TEXT) return undefined;
	if (!args.every((arg) => typeof arg === 'string' || typeof arg === 'number')) return undefined;
	const member: unknown = Reflect.get(String.prototype, method);
	if (typeof member !== 'function') return undefined;
	const value: unknown = Reflect.apply(member, text, args);
	if (typeof value === 'string' || typeof value === 'boolean') return { value };
	return typeof value === 'number' && Number.isFinite(value) ? { value } : undefined;
}

export function literalKeyCount(e: ts.Expression): number | undefined {
	if (!ts.isPropertyAccessExpression(e) || e.name.text !== 'length') return undefined;
	const keys = e.expression;
	if (!ts.isCallExpression(keys) || keys.arguments.length !== 1) return undefined;
	const callee = keys.expression;
	if (
		!ts.isPropertyAccessExpression(callee) ||
		!ts.isIdentifier(callee.expression) ||
		callee.expression.text !== 'Object' ||
		callee.name.text !== 'keys'
	)
		return undefined;
	const literal = keys.arguments[0];
	if (!ts.isObjectLiteralExpression(literal)) return undefined;
	const names = new Set<string>();
	for (const p of literal.properties) {
		if (!ts.isPropertyAssignment(p)) return undefined;
		if (!ts.isIdentifier(p.name) && !ts.isStringLiteral(p.name)) return undefined;
		if (p.name.text === '__proto__') return undefined;
		const value = p.initializer;
		if (!ts.isStringLiteralLike(value) && !ts.isNumericLiteral(value)) return undefined;
		names.add(p.name.text);
	}
	return names.size;
}
