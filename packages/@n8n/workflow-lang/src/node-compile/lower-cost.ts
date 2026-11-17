import ts from 'typescript';

const f = ts.factory;

export const PLAIN_LIST = '__plainList';
export const PLAIN_LIST_SAME = `function ${PLAIN_LIST}(list: any): any {\n\treturn list;\n}`;
export const PLAIN_LIST_COLLECTIONS = `function ${PLAIN_LIST}(list: any): any {
	const out: any[] = [];
	for (const value of list) out.push(__plain(value));
	return out;
}`;

export const OUT_FAILED = '__outFailed';
export const OUT_PAIRED = '__outPaired';
const PAIRS = '__pairs';
export const COST_HELPERS: Record<string, string> = {
	[PLAIN_LIST]: '',
	__pushJson: `function __pushJson(out: any, data: any): any {
	const given: any = data;
	if (Array.isArray(given)) {
		const list: any = given;
		for (const json of list) out.push(json !== null && json !== undefined && json.json ? json.json : json);
	} else out.push(given !== null && given !== undefined && given.json ? given.json : given);
}`,
	__pushPaired: `function __pushPaired(out: any, pairs: any, data: any, pair: any): any {
	if (Array.isArray(data)) {
		const list: any = data;
		for (const json of list) {
			out.push(__itemJson(json));
			pairs.push(pair);
		}
	} else {
		out.push(__itemJson(data));
		pairs.push(pair);
	}
}`,
	__itemJson: `function __itemJson(json: any): any {
	if (json === null || json === undefined || !json.json) return json;
	if (json.error !== undefined || json.pairedItem !== undefined || json.binary !== undefined) throw new Error('an item of a response with the fields of an item has no compiled form');
	return json.json;
}`,
	__pairedOut: `function __pairedOut(items: any, paired: any): any {
	const first: any = items[0];
	const error: any = first === null || first === undefined ? undefined : first.error;
	return { items, paired, failed: [], again: error !== undefined && error !== null && error !== false };
}`,
	__pushJsonFailed: `function __pushJsonFailed(out: any, data: any): any {
	const list: any = Array.isArray(data) ? data : [data];
	for (const json of list) {
		if (json === null || json === undefined || !json.json) out.push(json);
		else if (json.error === undefined) out.push(json.json);
		else if (!json.error) throw new Error('an output item with an error that is not an error has no compiled form');
		else out.push({ error: typeof json.error === 'object' ? json.error.message : undefined });
	}
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
const OPTIONAL_ABSENT = new Set([
	'multipart: undefined',
	'json: undefined',
	'basicAuth: undefined',
]);

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
	literal?: ts.ObjectLiteralExpression;
	touched: Set<string>;
	consumers: number;
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
		literal: declared.initializer,
		touched: new Set(),
		consumers: 0,
	};
	const first = keys.get('headers');
	if (first !== undefined && !ts.isObjectLiteralExpression(first)) shape.headersAreObjects = false;
	for (const use of uses.references) {
		const p = use.parent;
		if (isCallOf(p, REQUEST) && p.arguments[0] === use) {
			shape.consumers++;
			continue;
		}
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
		shape.touched.add(key);
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
		touched: new Set(),
		consumers: 1,
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
	const json = flags.constants.json ?? flags.json;
	const parts = flags.legacy && has('formData');
	const form = has('form');
	const lines: string[] = [];
	if (has('auth')) lines.push('const auth = options.auth;');
	const given =
		flags.constants.headers !== undefined
			? `__plain(${flags.constants.headers})`
			: has('headers')
				? '__plain(options.headers ?? {})'
				: '{}';
	const copied = form || !flags.headersAreObjects;
	lines.push(`const headers = ${copied ? `__assign({}, ${given})` : given};`);
	if (parts) lines.push('const parts = __formParts(options, headers);');
	const formTests = [
		...(parts ? ['parts === undefined'] : []),
		...(has('body') ? ['options.body === undefined'] : []),
	];
	if (form)
		lines.push(
			formTests.length === 0
				? 'const form = options.form;'
				: `const form = ${formTests.join(' && ')} ? options.form : undefined;`,
			"if (form !== undefined && form !== null) headers['content-type'] = 'application/x-www-form-urlencoded';",
		);
	const joined =
		form && flags.legacy
			? `${parts ? 'parts === undefined && ' : ''}options.body && options.form !== undefined && options.form !== null ? __assign(options.body, options.form) : options.body`
			: 'options.body';
	const sent = has('body') ? `__plain(__sendBody(${joined}))` : 'undefined';
	const encoded = form
		? `form !== undefined && form !== null ? __form(__plain(form)) : ${sent}`
		: sent;
	const second = flags.constants.url ?? (has('url') ? 'options.url' : undefined);
	const url =
		flags.constants.uri ??
		(has('uri')
			? second === undefined
				? 'options.uri'
				: `options.uri ?? ${second}`
			: (second ?? 'undefined'));
	const method = flags.constants.method ?? (has('method') ? "options.method ?? 'GET'" : "'GET'");
	if (flags.repeats && method !== "'GET'" && method !== '"GET"')
		lines.push(`if ((${method}) !== 'GET') ${REPEATS} = false;`);
	const body = parts ? `parts !== undefined ? undefined : ${encoded}` : encoded;
	const members = [
		`method: ${method}`,
		`url: ${url}`,
		'headers',
		`qs: ${has('qs') ? '__plain(options.qs ?? {})' : '{}'}`,
		`body: ${body}`,
		`multipart: ${parts ? 'parts' : 'undefined'}`,
		`acceptAs: ${flags.legacy ? "'legacy'" : "'request'"}`,
		`json: ${json}`,
		`basicAuth: ${has('auth') ? "auth ? { user: auth.user ?? auth.username ?? '', password: auth.pass ?? auth.password ?? '' } : undefined" : 'undefined'}`,
		`inject: ${flags.wrapped}`,
		'credential',
	].filter((member) => !OPTIONAL_ABSENT.has(member));
	return `async function ${name}(options) {
	${lines.join('\n\t')}
	const response = await ctx.http({
		${members.join(',\n\t\t')},
	});
	if (response.status >= 400${flags.lenient === '' ? '' : ` && !(${flags.lenient})`}) {
		const failure = __httpFailure(response, ${flags.legacy}, (${json}) === true);
		throw ${flags.wrapped === 'true' && !flags.raw ? '__apiError(failure, undefined)' : 'failure'};
	}
	return ${flags.full === '' ? '' : `${flags.full} ? { body: response.body, headers: response.headers, statusCode: response.status } : `}response.body;
}`;
}

interface RequestFlags {
	wrapped: string;
	raw: boolean;
	legacy: boolean;
	headersAreObjects: boolean;
	tokenOptions: boolean;
	lenient: string;
	full: string;
	repeats: boolean;
	json: string;
	constants: RequestConstants;
}

type RequestConstants = Partial<Record<'method' | 'uri' | 'url' | 'headers' | 'json', string>>;
const FORM_READS = new Set<string>([
	...REQUEST_KEYS,
	'json',
	'encoding',
	'simple',
	'resolveWithFullResponse',
	'ignoreHttpStatusErrors',
	'returnFullResponse',
	'json',
]);

function isPlainLiteral(e: ts.Expression): boolean {
	return (
		ts.isStringLiteralLike(e) ||
		ts.isNumericLiteral(e) ||
		e.kind === ts.SyntaxKind.TrueKeyword ||
		e.kind === ts.SyntaxKind.FalseKeyword ||
		e.kind === ts.SyntaxKind.NullKeyword
	);
}

function isConstantHeaders(e: ts.Expression): boolean {
	return (
		ts.isObjectLiteralExpression(e) &&
		e.properties.every(
			(p) =>
				ts.isPropertyAssignment(p) &&
				(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
				p.name.text !== '__proto__' &&
				(ts.isStringLiteralLike(p.initializer) || ts.isNumericLiteral(p.initializer)),
		)
	);
}

function requestTemplate(
	shape: Shape,
	sf: ts.SourceFile,
): { constants: RequestConstants; dead: ts.Node[] } {
	const constants: RequestConstants = {};
	const dead: ts.Node[] = [];
	const literal = shape.literal;
	if (!literal || shape.consumers !== 1) return { constants, dead };
	const count = new Map<string, number>();
	for (const p of literal.properties) {
		const key =
			p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : '';
		count.set(key, (count.get(key) ?? 0) + 1);
	}
	for (const p of literal.properties) {
		if (!ts.isPropertyAssignment(p)) continue;
		if (!ts.isIdentifier(p.name) && !ts.isStringLiteral(p.name)) continue;
		const key = p.name.text;
		if (count.get(key) !== 1 || shape.touched.has(key)) continue;
		const value = p.initializer;
		const text = printer.printNode(ts.EmitHint.Unspecified, value, sf);
		if ((key === 'method' || key === 'uri' || key === 'url') && ts.isStringLiteralLike(value)) {
			constants[key] = text;
			dead.push(p);
		} else if (key === 'headers' && isConstantHeaders(value)) {
			constants.headers = text;
			dead.push(p);
		} else if (
			key === 'json' &&
			(value.kind === ts.SyntaxKind.TrueKeyword || value.kind === ts.SyntaxKind.FalseKeyword)
		) {
			constants.json = text;
			dead.push(p);
		} else if (!FORM_READS.has(key) && isPlainLiteral(value)) dead.push(p);
	}
	return { constants, dead };
}

function textHash(text: string): string {
	let h = 0x811c9dc5;
	for (let k = 0; k < text.length; k++) {
		h ^= text.charCodeAt(k);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(36);
}

const GENERAL_REQUEST_KEYS = ['encoding'];
const REPEATS = '__repeats';

function lowerRequests(sf: ts.SourceFile): string | undefined {
	const changes = new Map<ts.Node, Replacement>();
	const forms = new Map<string, string>();
	let generalCalls = 0;
	let declaration: ts.FunctionDeclaration | undefined;
	const tokenOptions = sf.statements.some(
		(st) => ts.isFunctionDeclaration(st) && st.name?.text === REQUEST && st.parameters.length > 3,
	);
	const general = sf.statements.find(
		(st) => ts.isFunctionDeclaration(st) && st.name?.text === REQUEST,
	);
	const generalText = general ? general.getText(sf) : '';
	const honoursLenient =
		generalText.includes('options.ignoreHttpStatusErrors') ||
		generalText.includes('options.simple');
	const honoursFull =
		generalText.includes('options.returnFullResponse') ||
		generalText.includes('options.resolveWithFullResponse');
	const visit = (n: ts.Node) => {
		if (ts.isFunctionDeclaration(n) && n.name?.text === REQUEST) {
			declaration = n;
			return;
		}
		ts.forEachChild(n, visit);
		if (ts.isIdentifier(n) && n.text === REQUEST && !isName(n)) {
			const p = n.parent;
			if (!ts.isCallExpression(p) || p.expression !== n) generalCalls++;
		}
		if (!isCallOf(n, REQUEST)) return;
		generalCalls++;
		const [options, wrapped, legacy, extra, , raw] = n.arguments;
		const isWrapped = flagOf(wrapped);
		const isLegacy = flagOf(legacy);
		const isRaw = flagOf(raw);
		if (options === undefined || isWrapped === undefined || isLegacy === undefined) return;
		if (isRaw === undefined || n.arguments.length > 6 || n.arguments.some(ts.isSpreadElement))
			return;
		const absent = extra === undefined ? undefined : primitiveOf(extra);
		if (extra !== undefined && !(absent && (absent.value === undefined || absent.value === null)))
			return;
		const shape = ts.isIdentifier(options)
			? shapeOf(options)
			: ts.isObjectLiteralExpression(options)
				? literalShape(options)
				: undefined;
		if (!shape || GENERAL_REQUEST_KEYS.some((key) => shape.maybe.has(key))) return;
		const has = (key: RequestKey) => shape.maybe.has(key);
		if (REQUEST_KEYS.every(has) && !shape.headersAreObjects) return;
		const template = requestTemplate(shape, sf);
		const flags = {
			constants: template.constants,
			wrapped: wrapped === undefined ? 'undefined' : String(isWrapped),
			raw: isRaw,
			legacy: isLegacy,
			headersAreObjects: shape.headersAreObjects,
			tokenOptions,
			repeats: generalText.includes(REPEATS),
			json: template.constants.json ?? (shape.maybe.has('json') ? 'options.json' : 'undefined'),
			lenient: !honoursLenient
				? ''
				: isLegacy
					? shape.maybe.has('simple')
						? 'options.simple === false'
						: ''
					: shape.maybe.has('ignoreHttpStatusErrors')
						? 'options.ignoreHttpStatusErrors'
						: '',
			full: !honoursFull
				? ''
				: isLegacy
					? shape.maybe.has('resolveWithFullResponse')
						? 'options.resolveWithFullResponse'
						: ''
					: shape.maybe.has('returnFullResponse')
						? 'options.returnFullResponse'
						: '',
		};
		const bits = [
			...REQUEST_KEYS.map(has),
			isWrapped,
			wrapped === undefined,
			isLegacy,
			shape.headersAreObjects,
			tokenOptions,
			flags.lenient !== '',
			flags.full !== '',
			flags.json !== 'undefined',
			isRaw,
		];
		const id = bits.reduce((sum, bit, k) => sum + (bit ? 2 ** k : 0), 0).toString(36);
		const fixed = JSON.stringify(template.constants);
		let name = fixed === '{}' ? `${REQUEST}_${id}` : `${REQUEST}_${id}_${textHash(fixed)}`;
		if (!forms.has(name) && forms.size >= MAX_REQUEST_FORMS) {
			name = `${REQUEST}_${id}`;
			flags.constants = {};
			template.dead.length = 0;
			if (!forms.has(name) && forms.size >= MAX_REQUEST_FORMS + 1) return;
		}
		const form = requestForm(name, has, flags);
		if (forms.has(name) && forms.get(name) !== form) return;
		forms.set(name, form);
		for (const property of template.dead) changes.set(property, null);
		generalCalls--;
		changes.set(n, f.createCallExpression(f.createIdentifier(name), undefined, [options]));
		for (const statement of [...shape.copies, ...shape.spares]) changes.set(statement, null);
	};
	visit(sf);
	if (forms.size === 0) return undefined;
	if (declaration && generalCalls === 0) changes.set(declaration, null);
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

function soleProperty(e: ts.Expression, name: string): ts.Expression | undefined {
	if (!ts.isObjectLiteralExpression(e) || e.properties.length !== 1) return undefined;
	const [property] = e.properties;
	if (ts.isShorthandPropertyAssignment(property))
		return property.name.text === name ? f.createIdentifier(name) : undefined;
	return ts.isPropertyAssignment(property) &&
		ts.isIdentifier(property.name) &&
		property.name.text === name
		? property.initializer
		: undefined;
}

function lowerOutput(sf: ts.SourceFile): { code: string; helpers: string[] } | undefined {
	const last = sf.statements[sf.statements.length - 1];
	if (!last || !ts.isReturnStatement(last) || !last.expression) return undefined;
	const failed = isCallOf(last.expression, OUT_FAILED);
	const paired = isCallOf(last.expression, OUT_PAIRED);
	if (paired && usesIn(sf, PAIRS)?.references.length !== 0) return undefined;
	if (!failed && !paired && !isCallOf(last.expression, '__out')) return undefined;
	if (!ts.isCallExpression(last.expression) || last.expression.arguments.length !== 1)
		return undefined;
	const pushJson = failed ? '__pushJsonFailed' : '__pushJson';
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
		if (paired && ts.isObjectLiteralExpression(value)) {
			if (value.properties.length === 0) return undefined;
			const [json, pair, ...more] = value.properties.map((property) =>
				ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)
					? { name: property.name.text, value: property.initializer }
					: ts.isShorthandPropertyAssignment(property)
						? { name: property.name.text, value: f.createIdentifier(property.name.text) }
						: undefined,
			);
			if (json?.name !== 'json' || more.length > 0) return undefined;
			if (value.properties.length === 2 && pair?.name !== 'pairedItem') return undefined;
			const index = pair ? soleProperty(pair.value, 'item') : undefined;
			if (pair) helpers.add(index ? '__pairAt' : '__pairOf');
			const pushTo = (target: string, pushed: ts.Expression) =>
				f.createExpressionStatement(
					f.createCallExpression(
						f.createPropertyAccessExpression(f.createIdentifier(target), 'push'),
						undefined,
						[pushed],
					),
				);
			changes.set(
				statement,
				f.createBlock(
					[
						pushTo(list.text, json.value),
						pushTo(
							PAIRS,
							pair
								? f.createCallExpression(
										f.createIdentifier(index ? '__pairAt' : '__pairOf'),
										undefined,
										[index ?? pair.value],
									)
								: f.createNull(),
						),
					],
					true,
				),
			);
			continue;
		}
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
		const given = array.declarationList.declarations[0].initializer;
		const withPairs =
			paired && given && isCallOf(given, '__withPaired') && given.arguments.length === 2
				? given
				: undefined;
		const from = withPairs ? withPairs.arguments[0] : given;
		if (!from || !isCallOf(from, '__jsonArray') || from.arguments.length !== 1) return undefined;
		const pairOf = (options: ts.Expression): ts.Expression => {
			const itemData = soleProperty(options, 'itemData');
			const index = itemData ? soleProperty(itemData, 'item') : undefined;
			if (index) {
				helpers.add('__pairAt');
				return f.createCallExpression(f.createIdentifier('__pairAt'), undefined, [index]);
			}
			helpers.add('__pairOf');
			return f.createCallExpression(f.createIdentifier('__pairOf'), undefined, [
				itemData ?? f.createPropertyAccessExpression(options, 'itemData'),
			]);
		};
		const block = loop.parent;
		if (!ts.isBlock(block) && !ts.isSourceFile(block)) return undefined;
		const at = block.statements.indexOf(loop);
		if (at < 1 || block.statements[at - 1] !== array) return undefined;
		helpers.add(paired ? '__pushPaired' : pushJson);
		if (paired) helpers.add('__itemJson');
		changes.set(array, null);
		changes.set(
			loop,
			f.createExpressionStatement(
				f.createCallExpression(
					f.createIdentifier(paired ? '__pushPaired' : pushJson),
					undefined,
					paired
						? [
								f.createIdentifier(list.text),
								f.createIdentifier(PAIRS),
								from.arguments[0],
								withPairs ? pairOf(withPairs.arguments[1]) : f.createNull(),
							]
						: [f.createIdentifier(list.text), from.arguments[0]],
				),
			),
		);
	}
	const plain = f.createCallExpression(f.createIdentifier(PLAIN_LIST), undefined, [
		f.createIdentifier(list.text),
	]);
	if (paired) {
		helpers.add('__pairedOut');
		changes.set(declared, [
			declared,
			f.createVariableStatement(
				undefined,
				f.createVariableDeclarationList(
					[
						f.createVariableDeclaration(
							PAIRS,
							undefined,
							undefined,
							f.createArrayLiteralExpression([]),
						),
					],
					ts.NodeFlags.Const,
				),
			),
		]);
	}
	changes.set(
		last,
		f.createReturnStatement(
			paired
				? f.createCallExpression(f.createIdentifier('__pairedOut'), undefined, [
						plain,
						f.createIdentifier(PAIRS),
					])
				: plain,
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

function settleTopConstants(sf: ts.SourceFile, changes: Map<ts.Node, Replacement>): void {
	let early = true;
	for (const statement of sf.statements) {
		if (ts.isFunctionDeclaration(statement)) continue;
		const declared =
			ts.isVariableStatement(statement) && statement.declarationList.declarations.length === 1
				? statement.declarationList.declarations[0]
				: undefined;
		const value = declared?.initializer ? primitiveOf(declared.initializer) : undefined;
		if (!ts.isVariableStatement(statement) || !declared || !value) {
			early = false;
			continue;
		}
		if (!early || !isConst(statement) || !ts.isIdentifier(declared.name)) continue;
		if (typeof value.value === 'number' && !(value.value >= 0)) continue;
		const uses = usesAnywhere(sf, declared.name.text);
		if (uses.declarations.length !== 1 || uses.references.length === 0) continue;
		if (uses.references.some((use) => isTarget(use) || isShorthand(use))) continue;
		for (const use of uses.references) changes.set(use, primitiveNode(value.value));
		changes.set(statement, null);
	}
}

function emptyUse(use: ts.Identifier): { node: ts.Node; to: Replacement } | undefined {
	const p = use.parent;
	if (ts.isSpreadAssignment(p) && ts.isObjectLiteralExpression(p.parent))
		return { node: p, to: null };
	if (!ts.isCallExpression(p)) return undefined;
	if (isObjectCall(p, 'keys') && p.arguments.length === 1 && p.arguments[0] === use)
		return { node: p, to: f.createArrayLiteralExpression([]) };
	const merged =
		isCallOf(p, '__assign') &&
		p.arguments.length === 2 &&
		p.arguments[1] === use &&
		ts.isIdentifier(p.arguments[0]) &&
		ts.isExpressionStatement(p.parent);
	return merged ? { node: p.parent, to: null } : undefined;
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
			if (!ts.isIdentifier(declared.name)) continue;
			const isLet = (statement.declarationList.flags & ts.NodeFlags.Let) !== 0;
			if (!declared.initializer && !isLet) continue;
			const uses = usesIn(scope, declared.name.text);
			if (!uses || uses.declarations.length !== 1) continue;
			const block = statement.parent;
			const inReach = (use: ts.Node) =>
				isAfter(use, statement) &&
				use.getStart() >= block.getStart() &&
				use.getEnd() <= block.getEnd();
			if (!uses.references.every(inReach)) continue;
			const value = declared.initializer ? primitiveOf(declared.initializer) : { value: undefined };
			if (value || !declared.initializer) {
				if (!value || (typeof value.value === 'number' && !(value.value >= 0))) continue;
				if (uses.references.some((use) => isTarget(use) || isShorthand(use))) continue;
				for (const use of uses.references) changes.set(use, primitiveNode(value.value));
				changes.set(statement, null);
				continue;
			}
			const list = declared.initializer;
			if (!isConst(statement)) continue;
			if (isEmptyLiteral(list)) {
				const plans = uses.references.map(emptyUse);
				if (plans.length === 0 || plans.some((plan) => plan === undefined)) continue;
				for (const plan of plans) if (plan) changes.set(plan.node, plan.to);
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

function joinFirstStores(sf: ts.SourceFile, changes: Map<ts.Node, Replacement>): void {
	const visit = (n: ts.Node) => {
		ts.forEachChild(n, visit);
		if (!ts.isBlock(n) && !ts.isSourceFile(n)) return;
		for (const [at, first] of n.statements.entries()) {
			const next = n.statements[at + 1];
			if (!next || !ts.isVariableStatement(first) || isConst(first)) continue;
			if (first.declarationList.declarations.length !== 1) continue;
			if ((first.declarationList.flags & ts.NodeFlags.Let) === 0) continue;
			const declared = first.declarationList.declarations[0];
			if (!ts.isIdentifier(declared.name) || !declared.initializer) continue;
			const name = declared.name.text;
			const start = primitiveOf(declared.initializer);
			if (!start || !ts.isExpressionStatement(next)) continue;
			const store = next.expression;
			if (!ts.isBinaryExpression(store) || store.operatorToken.kind !== ts.SyntaxKind.EqualsToken)
				continue;
			if (!ts.isIdentifier(store.left) || store.left.text !== name) continue;
			const reads: ts.Identifier[] = [];
			let plain = true;
			const scan = (e: ts.Node) => {
				if (ts.isFunctionLike(e)) plain = false;
				if (ts.isIdentifier(e) && e.text === name && !isName(e)) {
					if (isTarget(e) || isShorthand(e) || isDeclarationName(e)) plain = false;
					reads.push(e);
				}
				ts.forEachChild(e, scan);
			};
			scan(store.right);
			if (!plain || changes.has(first) || changes.has(next)) continue;
			if (!usesIn(scopeOf(first), name)) continue;
			const value = ts.visitNode(store.right, function swap(e: ts.Node): ts.Node {
				if (ts.isIdentifier(e) && reads.includes(e)) return primitiveNode(start.value);
				return ts.visitEachChild(e, swap, undefined);
			});
			if (!ts.isExpression(value)) continue;
			changes.set(
				first,
				f.createVariableStatement(
					undefined,
					f.createVariableDeclarationList(
						[f.createVariableDeclaration(name, undefined, undefined, value)],
						ts.NodeFlags.Let,
					),
				),
			);
			changes.set(next, null);
		}
	};
	visit(sf);
}

function joinFirstMembers(sf: ts.SourceFile, changes: Map<ts.Node, Replacement>): void {
	const visit = (n: ts.Node) => {
		ts.forEachChild(n, visit);
		if (!ts.isBlock(n) && !ts.isSourceFile(n)) return;
		for (const [at, first] of n.statements.entries()) {
			const next = n.statements[at + 1];
			if (!next || !ts.isVariableStatement(first) || !ts.isExpressionStatement(next)) continue;
			if (first.declarationList.declarations.length !== 1) continue;
			const declared = first.declarationList.declarations[0];
			const literal = declared.initializer;
			if (!ts.isIdentifier(declared.name) || !literal || !ts.isObjectLiteralExpression(literal))
				continue;
			const name = declared.name.text;
			const keys = plainKeys(literal);
			const store = next.expression;
			if (!keys || !ts.isBinaryExpression(store)) continue;
			if (store.operatorToken.kind !== ts.SyntaxKind.EqualsToken) continue;
			const target = store.left;
			if (!ts.isPropertyAccessExpression(target) || !ts.isIdentifier(target.expression)) continue;
			const key = target.name.text;
			if (target.expression.text !== name || keys.has(key) || key === '__proto__') continue;
			let plain = true;
			const scan = (e: ts.Node) => {
				if (ts.isFunctionLike(e) || (ts.isIdentifier(e) && e.text === name && !isName(e)))
					plain = false;
				ts.forEachChild(e, scan);
			};
			scan(store.right);
			if (!plain || changes.has(first) || changes.has(next)) continue;
			changes.set(
				literal,
				f.updateObjectLiteralExpression(literal, [
					...literal.properties,
					f.createPropertyAssignment(key, store.right),
				]),
			);
			changes.set(next, null);
		}
	};
	visit(sf);
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
		return (
			!isTarget(p) &&
			!ts.isDeleteExpression(p.parent) &&
			!(ts.isCallExpression(p.parent) && p.parent.expression === p)
		);
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

interface EmptyParameter {
	fn: ts.FunctionDeclaration;
	index: number;
	uses: ts.Identifier[];
	needs: string[];
}

const MAX_EMPTY_PARAMETERS = 256;

function calledFunction(
	use: ts.Identifier,
	functions: Map<string, ts.FunctionDeclaration>,
): string | undefined {
	const call = use.parent;
	if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return undefined;
	const at = call.arguments.findIndex((arg) => arg === use);
	const target = functions.get(call.expression.text);
	if (at < 0 || !target || at >= target.parameters.length) return undefined;
	return `${call.expression.text}:${at}`;
}

function enclosingFunction(n: ts.Node): ts.Node {
	let at: ts.Node = n.parent;
	while (!ts.isSourceFile(at) && !ts.isFunctionLike(at)) at = at.parent;
	return at;
}

interface CallSites {
	functions: Map<string, ts.FunctionDeclaration>;
	sites: Map<string, ts.CallExpression[]>;
}

function callSitesOf(sf: ts.SourceFile): CallSites {
	const functions = new Map<string, ts.FunctionDeclaration>();
	const sites = new Map<string, ts.CallExpression[]>();
	for (const fn of sf.statements) {
		if (!ts.isFunctionDeclaration(fn) || !fn.name) continue;
		const calls = usesAnywhere(sf, fn.name.text);
		if (calls.declarations.length !== 1 || calls.references.length === 0) continue;
		const found: ts.CallExpression[] = [];
		for (const use of calls.references) {
			const call = use.parent;
			if (
				ts.isCallExpression(call) &&
				call.expression === use &&
				!call.arguments.some(ts.isSpreadElement)
			)
				found.push(call);
		}
		if (found.length !== calls.references.length) continue;
		functions.set(fn.name.text, fn);
		sites.set(fn.name.text, found);
	}
	return { functions, sites };
}

function settleSameArguments(sf: ts.SourceFile, changes: Map<ts.Node, Replacement>): void {
	const { functions, sites } = callSitesOf(sf);
	for (const [name, fn] of functions) {
		for (const [index, parameter] of fn.parameters.entries()) {
			if (!ts.isIdentifier(parameter.name) || parameter.dotDotDotToken) continue;
			const given = (sites.get(name) ?? []).map((call) =>
				call.arguments[index] === undefined ? undefined : primitiveOf(call.arguments[index]),
			);
			const first = given[0];
			if (!first || given.some((arg) => !arg || arg.value !== first.value)) continue;
			if (first.value === undefined && parameter.initializer) continue;
			if (typeof first.value === 'number' && !(first.value >= 0)) continue;
			const uses = usesIn(fn, parameter.name.text);
			if (!uses || uses.declarations.length !== 1) continue;
			if (uses.references.some((use) => isTarget(use) || isShorthand(use))) continue;
			for (const use of uses.references) changes.set(use, primitiveNode(first.value));
		}
	}
}

function emptyParameters(sf: ts.SourceFile): EmptyParameter[] {
	const { functions, sites } = callSitesOf(sf);
	const candidates = new Map<string, EmptyParameter>();
	for (const [name, fn] of functions) {
		for (const [index, parameter] of fn.parameters.entries()) {
			if (candidates.size >= MAX_EMPTY_PARAMETERS) break;
			if (!ts.isIdentifier(parameter.name) || parameter.dotDotDotToken) continue;
			const uses = usesIn(fn, parameter.name.text);
			if (!uses || uses.declarations.length !== 1) continue;
			const needs: string[] = [];
			let ok = true;
			for (const use of uses.references) {
				if (isReadOfEmpty(use)) continue;
				const passed = calledFunction(use, functions);
				if (passed === undefined) ok = false;
				else needs.push(passed);
			}
			for (const call of sites.get(name) ?? []) {
				const given = call.arguments[index];
				if (given === undefined) {
					if (!isEmptyLiteral(parameter.initializer)) ok = false;
				} else if (ts.isIdentifier(given)) {
					const from = enclosingFunction(call);
					const at =
						ts.isFunctionDeclaration(from) && from.name && functions.get(from.name.text) === from
							? from.parameters.findIndex(
									(q) => ts.isIdentifier(q.name) && q.name.text === given.text,
								)
							: -1;
					const own =
						at >= 0 && ts.isFunctionDeclaration(from) ? usesIn(from, given.text) : undefined;
					if (at < 0 || !own || own.declarations.length !== 1 || !ts.isFunctionDeclaration(from))
						ok = false;
					else needs.push(`${from.name?.text ?? ''}:${at}`);
				} else if (!isEmptyLiteral(given)) ok = false;
			}
			if (ok) candidates.set(`${name}:${index}`, { fn, index, uses: uses.references, needs });
		}
	}
	for (let round = 0; round <= candidates.size; round++) {
		let removed = false;
		for (const [key, candidate] of candidates) {
			if (candidate.needs.every((need) => candidates.has(need))) continue;
			candidates.delete(key);
			removed = true;
		}
		if (!removed) break;
	}
	return [...candidates.values()];
}

function isTested(read: ts.Node): boolean {
	const p = read.parent;
	if (ts.isBinaryExpression(p)) return !isAssignmentOperator(p.operatorToken.kind);
	if (ts.isPrefixUnaryExpression(p)) return p.operator === ts.SyntaxKind.ExclamationToken;
	if (ts.isIfStatement(p)) return p.expression === read;
	return ts.isConditionalExpression(p) && p.condition === read;
}

function settleAbsentArguments(sf: ts.SourceFile, changes: Map<ts.Node, Replacement>): void {
	for (const parameter of emptyParameters(sf)) {
		for (const use of parameter.uses) {
			const count = keyCountOf(use);
			if (count) changes.set(count, primitiveNode(0));
			const read = use.parent;
			if (
				ts.isPropertyAccessExpression(read) &&
				read.expression === use &&
				!(read.name.text in Object.prototype) &&
				isReadOfEmpty(use) &&
				isTested(read)
			)
				changes.set(read, primitiveNode(undefined));
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

const MARKER = '{{$credentials.';

function isMarked(value: Primitive): boolean {
	return typeof value === 'string' && value.includes(MARKER);
}

type Evaluate = (code: string) => unknown;

function replacedText(n: ts.CallExpression, evaluate: Evaluate | undefined): string | undefined {
	const callee = n.expression;
	if (!evaluate || !ts.isPropertyAccessExpression(callee) || callee.questionDotToken)
		return undefined;
	if (callee.name.text !== 'replace' || n.arguments.length !== 2) return undefined;
	const [pattern, value] = n.arguments;
	const text = callee.expression;
	if (!ts.isStringLiteralLike(text) || !ts.isStringLiteralLike(value)) return undefined;
	if (!ts.isRegularExpressionLiteral(pattern) && !ts.isStringLiteralLike(pattern)) return undefined;
	if (isMarked(text.text) || isMarked(value.text) || text.text.length > MAX_FOLDED_TEXT)
		return undefined;
	const given = ts.isRegularExpressionLiteral(pattern)
		? pattern.text
		: JSON.stringify(pattern.text);
	try {
		const out = evaluate(
			`${JSON.stringify(text.text)}.replace(${given}, ${JSON.stringify(value.text)})`,
		);
		return typeof out === 'string' && out.length <= MAX_FOLDED_TEXT ? out : undefined;
	} catch {
		return undefined;
	}
}

function includedInList(n: ts.CallExpression): boolean | undefined {
	const callee = n.expression;
	if (!ts.isPropertyAccessExpression(callee) || callee.questionDotToken) return undefined;
	if (callee.name.text !== 'includes' || n.arguments.length !== 1) return undefined;
	const list = callee.expression;
	const asked = primitiveOf(n.arguments[0]);
	if (!asked || !ts.isArrayLiteralExpression(list)) return undefined;
	const values: Primitive[] = [];
	for (const element of list.elements) {
		const value = primitiveOf(element);
		if (!value) return undefined;
		values.push(value.value);
	}
	return values.some(isMarked) || isMarked(asked.value) ? undefined : values.includes(asked.value);
}

function isEmptyList(e: ts.Expression): boolean {
	return ts.isArrayLiteralExpression(e) && e.elements.length === 0;
}

function joinedTemplate(n: ts.TemplateExpression): ts.Expression | undefined {
	let head = n.head.text;
	const spans: Array<{ expression: ts.Expression; text: string }> = [];
	let joined = false;
	for (const span of n.templateSpans) {
		const value = primitiveOf(span.expression);
		if (value && value.value !== null && value.value !== undefined) {
			joined = true;
			const text = String(value.value) + span.literal.text;
			if (spans.length === 0) head += text;
			else spans[spans.length - 1].text += text;
		} else spans.push({ expression: span.expression, text: span.literal.text });
	}
	if (!joined) return undefined;
	if (spans.length === 0) return f.createStringLiteral(head);
	return f.createTemplateExpression(
		f.createTemplateHead(head),
		spans.map((span, k) =>
			f.createTemplateSpan(
				span.expression,
				k === spans.length - 1
					? f.createTemplateTail(span.text)
					: f.createTemplateMiddle(span.text),
			),
		),
	);
}

function simplify(sf: ts.SourceFile, evaluate?: Evaluate): string | undefined {
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
			if (left && op === ts.SyntaxKind.QuestionQuestionToken)
				return done(left.value === null || left.value === undefined ? n.right : n.left);
			const right = primitiveOf(n.right);
			const same = EQUALITY.get(op);
			if (left && right && same !== undefined && !isMarked(left.value) && !isMarked(right.value))
				return done(primitiveNode((left.value === right.value) === same));
		}
		if (ts.isConditionalExpression(n)) {
			const condition = primitiveOf(n.condition);
			if (condition) return done(condition.value ? n.whenTrue : n.whenFalse);
		}
		if (ts.isCallExpression(n)) {
			const included = includedInList(n);
			if (included !== undefined) return done(primitiveNode(included));
			const replaced = replacedText(n, evaluate);
			if (replaced !== undefined) return done(f.createStringLiteral(replaced));
		}
		if (ts.isTemplateExpression(n)) {
			const joined = joinedTemplate(n);
			if (joined !== undefined) return done(joined);
		}
		if (ts.isIfStatement(n) && isEmptyList(n.expression)) return done(n.thenStatement);
		if (ts.isPropertyAccessExpression(n) && n.name.text === 'length' && isEmptyList(n.expression))
			return done(primitiveNode(0));
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

export function lowerConstants(code: string, evaluate?: Evaluate): string {
	let text = code;
	for (let round = 0; round < MAX_ROUNDS; round++) {
		const sf = parse(text);
		const changes = new Map<ts.Node, Replacement>();
		settleConstants(sf, changes);
		if (changes.size === 0) settleTopConstants(sf, changes);
		if (changes.size === 0) joinFirstStores(sf, changes);
		if (changes.size === 0) joinFirstMembers(sf, changes);
		if (changes.size === 0) settleSameArguments(sf, changes);
		if (changes.size === 0) settleAbsentArguments(sf, changes);
		if (changes.size === 0) dropUnusedFunctions(sf, changes);
		const settled = changes.size > 0 ? rewrite(sf, changes, []) : text;
		const simple = simplify(parse(settled), evaluate);
		if (changes.size === 0 && simple === undefined) break;
		text = simple ?? settled;
	}
	return text;
}

const PATTERN = '__pattern';
const MAX_PATTERNS = 16;
const PATTERN_READERS = new Set(['replace', 'match', 'split', 'search']);

function loopAround(n: ts.Node): ts.IterationStatement | undefined {
	let found: ts.IterationStatement | undefined;
	let at: ts.Node = n.parent;
	while (!ts.isSourceFile(at) && !ts.isFunctionLike(at)) {
		if (ts.isIterationStatement(at, false)) found = at;
		at = at.parent;
	}
	if (!found) return undefined;
	const holder = found.parent;
	return ts.isBlock(holder) || ts.isSourceFile(holder) ? found : undefined;
}

function isPatternRead(n: ts.RegularExpressionLiteral): boolean {
	const p = n.parent;
	if (ts.isPropertyAccessExpression(p) && p.expression === n && p.name.text === 'test')
		return ts.isCallExpression(p.parent) && p.parent.expression === p;
	if (!ts.isCallExpression(p) || p.arguments[0] !== n) return false;
	const callee = p.expression;
	return ts.isPropertyAccessExpression(callee) && PATTERN_READERS.has(callee.name.text);
}

function hoistPatterns(sf: ts.SourceFile): string | undefined {
	const made = new Map<ts.IterationStatement, Map<string, string>>();
	const changes = new Map<ts.Node, ts.Identifier>();
	let count = 0;
	let taken = false;
	const visit = (n: ts.Node) => {
		if (ts.isIdentifier(n) && n.text.startsWith(PATTERN)) taken = true;
		const loop = ts.isRegularExpressionLiteral(n) && isPatternRead(n) ? loopAround(n) : undefined;
		if (ts.isRegularExpressionLiteral(n) && loop) {
			const flags = n.text.slice(n.text.lastIndexOf('/') + 1);
			if (!flags.includes('g') && !flags.includes('y')) {
				const names = made.get(loop) ?? new Map<string, string>();
				made.set(loop, names);
				let name = names.get(n.text);
				if (name === undefined && count < MAX_PATTERNS) {
					name = `${PATTERN}${count++}`;
					names.set(n.text, name);
				}
				if (name !== undefined) changes.set(n, f.createIdentifier(name));
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
	if (taken || count === 0) return undefined;
	const lifted = (loop: ts.IterationStatement, names: Map<string, string>): ts.Node[] => {
		const body = ts.visitNode(loop, function swap(n: ts.Node): ts.Node {
			return changes.get(n) ?? ts.visitEachChild(n, swap, undefined);
		});
		const declared = [...names].map(([text, name]) =>
			f.createVariableStatement(
				undefined,
				f.createVariableDeclarationList(
					[
						f.createVariableDeclaration(
							name,
							undefined,
							undefined,
							f.createRegularExpressionLiteral(text),
						),
					],
					ts.NodeFlags.Const,
				),
			),
		);
		return [...declared, body];
	};
	const outer = new Map<ts.Node, Replacement>();
	for (const [loop, names] of made) outer.set(loop, lifted(loop, names));
	return rewrite(sf, outer, []);
}

export function lowerCost(code: string, holdsBytes: boolean, evaluate?: Evaluate): LoweredCode {
	let text = lowerConstants(code, evaluate);
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
	const hoisted = hoistPatterns(parse(text));
	if (hoisted !== undefined) text = hoisted;
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

export function namesOutsideRequest(code: string, name: string): boolean {
	const walk = (n: ts.Node): boolean => {
		if (ts.isFunctionDeclaration(n) && n.name?.text === REQUEST) return false;
		if ((ts.isIdentifier(n) || ts.isStringLiteralLike(n)) && n.text === name) return true;
		return ts.forEachChild(n, walk) ?? false;
	};
	return walk(parse(code));
}
