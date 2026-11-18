import { dirname, relative, resolve } from 'node:path';

import ts from 'typescript';

import type { UnitOrigin } from './specialise.ts';

export type Precision = 'construct' | 'candidate' | 'function' | 'file';

export interface NodeDiagnostic {
	code: string;
	message: string;
	file: string;
	line: number;
	column: number;
	function: string;
	precision: Precision;
	remediation: string;
	decided: boolean;
	text: string;
}

type Locate = (scope: ts.Node, match: RegExpExecArray) => ts.Node | undefined;

interface Form {
	pattern: RegExp;
	locate?: Locate;
	remediation?: (match: RegExpExecArray) => string | undefined;
	decided?: (match: RegExpExecArray) => boolean;
	refine?: (match: RegExpExecArray, files: ts.SourceFile[]) => Refined | undefined;
}

export interface Rule {
	code: string;
	title: string;
	why: string;
	remediation: string;
	decided?: 'always' | 'partly';
	forms: Form[];
}

const NATIVE = 'This node needs a native version. Until then it runs in the fallback host.';

function first(scope: ts.Node, test: (node: ts.Node) => boolean): ts.Node | undefined {
	if (test(scope)) return scope;
	return ts.forEachChild(scope, (child) => first(child, test));
}

const isThis = (node: ts.Node | undefined) => node?.kind === ts.SyntaxKind.ThisKeyword;

const member =
	(...names: string[]): Locate =>
	(scope) =>
		first(scope, (n) => ts.isPropertyAccessExpression(n) && names.includes(n.name.text));

const memberNamed =
	(group: number): Locate =>
	(scope, match) =>
		first(scope, (n) => ts.isPropertyAccessExpression(n) && n.name.text === match[group]);

const named =
	(group: number): Locate =>
	(scope, match) =>
		first(scope, (n) => ts.isIdentifier(n) && n.text === match[group] && !isTypeOnly(n));

const identifier =
	(...names: string[]): Locate =>
	(scope) =>
		first(scope, (n) => ts.isIdentifier(n) && names.includes(n.text) && !isTypeOnly(n));

const kind =
	(...kinds: ts.SyntaxKind[]): Locate =>
	(scope) =>
		first(scope, (n) => kinds.includes(n.kind));

function isTypeOnly(node: ts.Node): boolean {
	const parent = node.parent;
	return parent !== undefined && (ts.isTypeNode(parent) || ts.isImportSpecifier(parent));
}

const thisAsValue: Locate = (scope) => {
	const isArgument = (n: ts.Node) => {
		const parent = n.parent;
		return (
			(ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
			(parent.arguments ?? []).some((a) => a === n)
		);
	};
	const stored = first(scope, (n) => {
		if (!isThis(n) || isArgument(n)) return false;
		const parent = n.parent;
		return !ts.isPropertyAccessExpression(parent) && !ts.isElementAccessExpression(parent);
	});
	return (
		stored ??
		first(scope, (n) => {
			if (!isThis(n) || !isArgument(n)) return false;
			const call = n.parent;
			if (ts.isNewExpression(call)) return false;
			const callee = ts.isCallExpression(call) ? call.expression : undefined;
			return (
				callee !== undefined &&
				ts.isPropertyAccessExpression(callee) &&
				!['call', 'apply', 'bind'].includes(callee.name.text)
			);
		})
	);
};

interface Refined {
	code: string;
	node?: ts.Node;
	sf?: ts.SourceFile;
	remediation?: string;
	decided?: boolean;
}

type Refine = (match: RegExpExecArray, files: ts.SourceFile[]) => Refined | undefined;

const refineName: Refine = (match, files) => {
	const name = match[1];
	for (const sf of files) {
		for (const statement of sf.statements) {
			if (!ts.isVariableStatement(statement)) continue;
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) continue;
				let made = declaration.initializer;
				while (made && (ts.isAwaitExpression(made) || ts.isParenthesizedExpression(made)))
					made = made.expression;
				const element = declaration.name.elements.find(
					(e) => ts.isBindingElement(e) && ts.isIdentifier(e.name) && e.name.text === name,
				);
				if (!element || !made || !ts.isCallExpression(made)) continue;
				const factory = made.expression.getText(sf);
				return {
					code: 'NC015',
					node: element,
					sf,
					decided: true,
					remediation: `'${name}' is made by a call of '${factory}' (a closure factory). Restructure as a top-level function: \`export async function ${name}(this: IExecuteFunctions, ...)\`, and pass the options of '${factory}' as arguments or keep them in a top-level \`const\`.`,
				};
			}
		}
	}
	return name in globalThis ? { code: 'NC108' } : undefined;
};

const thisMember: Locate = (scope, match) => {
	const names = match[1].split('.');
	const reads = (onThis: boolean) => (n: ts.Node) => {
		if (!ts.isPropertyAccessExpression(n) || n.name.text !== names[0]) return false;
		if (onThis ? !isThis(n.expression) : !ts.isIdentifier(n.expression)) return false;
		return (
			names.length === 1 ||
			(ts.isPropertyAccessExpression(n.parent) && n.parent.name.text === names[1])
		);
	};
	return first(scope, reads(true)) ?? first(scope, reads(false));
};

const contextCall: Locate = (scope) =>
	first(
		scope,
		(n) =>
			ts.isCallExpression(n) &&
			ts.isPropertyAccessExpression(n.expression) &&
			['call', 'apply', 'bind'].includes(n.expression.name.text) &&
			!ts.isIdentifier(n.expression.expression) &&
			isThis(n.arguments[0]),
	);

function parameterCall(n: ts.Node): n is ts.CallExpression {
	return (
		ts.isCallExpression(n) &&
		ts.isPropertyAccessExpression(n.expression) &&
		n.expression.name.text === 'getNodeParameter'
	);
}

const parameterName: Locate = (scope) =>
	first(
		scope,
		(n) => parameterCall(n) && n.arguments.length > 0 && !ts.isStringLiteralLike(n.arguments[0]),
	);

const parameterOptions: Locate = (scope) =>
	first(scope, (n) => parameterCall(n) && n.arguments.length > 3);

const parameterNamed: Locate = (scope, match) =>
	first(scope, (n) => {
		if (!parameterCall(n)) return false;
		const name = n.arguments[0];
		return name !== undefined && ts.isStringLiteralLike(name) && name.text === match[1];
	});

function credentialNames(scope: ts.Node): { whole: Set<string>; fields: Set<string> } {
	const whole = new Set<string>();
	const fields = new Set<string>();
	const reads = (e: ts.Expression | undefined): boolean => {
		if (e === undefined) return false;
		if (ts.isAwaitExpression(e) || ts.isParenthesizedExpression(e) || ts.isAsExpression(e))
			return reads(e.expression);
		return (
			ts.isCallExpression(e) &&
			ts.isPropertyAccessExpression(e.expression) &&
			e.expression.name.text === 'getCredentials'
		);
	};
	const walk = (n: ts.Node) => {
		if (ts.isVariableDeclaration(n) && reads(n.initializer)) {
			if (ts.isIdentifier(n.name)) whole.add(n.name.text);
			else
				for (const element of n.name.elements)
					if (ts.isBindingElement(element) && ts.isIdentifier(element.name))
						fields.add(element.name.text);
		}
		if (
			ts.isParameter(n) &&
			ts.isIdentifier(n.name) &&
			/^credentials?$/i.test(n.name.text) &&
			!isThis(n.name)
		)
			whole.add(n.name.text);
		ts.forEachChild(n, walk);
	};
	walk(scope);
	return { whole, fields };
}

function isDeclarationName(n: ts.Node): boolean {
	const parent = n.parent;
	return (
		(ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent)) &&
		parent.name === n
	);
}

const wholeCredential: Locate = (scope) => {
	const { whole } = credentialNames(scope);
	return first(scope, (n) => {
		if (!ts.isIdentifier(n) || !whole.has(n.text) || isDeclarationName(n)) return false;
		const parent = n.parent;
		if (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent))
			return parent.expression !== n;
		return !ts.isTypeNode(parent);
	});
};

function credentialField(scope: ts.Node, use: (field: ts.Node) => boolean): ts.Node | undefined {
	const { whole, fields } = credentialNames(scope);
	return first(scope, (n) => {
		const direct =
			ts.isPropertyAccessExpression(n) &&
			ts.isIdentifier(n.expression) &&
			whole.has(n.expression.text);
		const picked = ts.isIdentifier(n) && fields.has(n.text) && !isDeclarationName(n);
		return (direct || picked) && use(n);
	});
}

const COMPARISONS = new Set([
	ts.SyntaxKind.EqualsEqualsToken,
	ts.SyntaxKind.EqualsEqualsEqualsToken,
	ts.SyntaxKind.ExclamationEqualsToken,
	ts.SyntaxKind.ExclamationEqualsEqualsToken,
	ts.SyntaxKind.LessThanToken,
	ts.SyntaxKind.GreaterThanToken,
	ts.SyntaxKind.LessThanEqualsToken,
	ts.SyntaxKind.GreaterThanEqualsToken,
	ts.SyntaxKind.AmpersandAmpersandToken,
	ts.SyntaxKind.BarBarToken,
]);

const ARITHMETIC = new Set([
	ts.SyntaxKind.PlusToken,
	ts.SyntaxKind.MinusToken,
	ts.SyntaxKind.AsteriskToken,
	ts.SyntaxKind.SlashToken,
	ts.SyntaxKind.PercentToken,
]);

const branchesOnCredential: Locate = (scope) =>
	credentialField(scope, (n) => {
		const parent = n.parent;
		if (ts.isBinaryExpression(parent)) return COMPARISONS.has(parent.operatorToken.kind);
		if (ts.isPrefixUnaryExpression(parent)) return true;
		if (ts.isIfStatement(parent) || ts.isConditionalExpression(parent))
			return (ts.isIfStatement(parent) ? parent.expression : parent.condition) === n;
		return false;
	});

const callsOnCredential: Locate = (scope) =>
	credentialField(
		scope,
		(n) =>
			ts.isPropertyAccessExpression(n.parent) &&
			n.parent.expression === n &&
			ts.isCallExpression(n.parent.parent) &&
			n.parent.parent.expression === n.parent,
	);

const computesWithCredential: Locate = (scope) =>
	credentialField(scope, (n) => {
		const parent = n.parent;
		if (ts.isBinaryExpression(parent)) return ARITHMETIC.has(parent.operatorToken.kind);
		return ts.isCallExpression(parent) && parent.arguments.some((a) => a === n);
	});

const madeOutsideConst: Locate = (scope, match) =>
	first(scope, (n) => {
		if (!ts.isNewExpression(n) || !ts.isIdentifier(n.expression)) return false;
		if (n.expression.text !== match[1]) return false;
		const parent = n.parent;
		return !(
			ts.isVariableDeclaration(parent) &&
			ts.isVariableDeclarationList(parent.parent) &&
			(parent.parent.flags & ts.NodeFlags.Const) !== 0
		);
	});

const classAsValue: Locate = (scope, match) =>
	first(scope, (n) => {
		if (!ts.isIdentifier(n) || n.text !== match[1] || isTypeOnly(n)) return false;
		const parent = n.parent;
		if (ts.isNewExpression(parent) || ts.isClassDeclaration(parent)) return false;
		if (ts.isExpressionWithTypeArguments(parent) || ts.isImportClause(parent)) return false;
		return !(ts.isPropertyAccessExpression(parent) && parent.expression === n);
	});

const methodAsValue: Locate = (scope, match) =>
	first(
		scope,
		(n) =>
			ts.isPropertyAccessExpression(n) &&
			n.name.text === match[1] &&
			!(ts.isCallExpression(n.parent) && n.parent.expression === n),
	);

const instanceofError: Locate = (scope) =>
	first(
		scope,
		(n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword,
	);

const heritage: Locate = (scope) => first(scope, (n) => ts.isHeritageClause(n));

const generator: Locate = (scope) =>
	first(
		scope,
		(n) =>
			ts.isYieldExpression(n) ||
			((ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) &&
				n.asteriskToken !== undefined),
	);

const promiseUse: Locate = (scope) =>
	first(
		scope,
		(n) =>
			(ts.isIdentifier(n) && n.text === 'Promise' && !isTypeOnly(n)) ||
			(ts.isPropertyAccessExpression(n) &&
				['then', 'catch', 'finally'].includes(n.name.text) &&
				ts.isCallExpression(n.parent)),
	);

const catchClause: Locate = (scope) =>
	first(scope, (n) => ts.isCatchClause(n) && n.variableDeclaration !== undefined);

const objectMethod: Locate = (scope) =>
	first(scope, (n) => ts.isMethodDeclaration(n) && ts.isObjectLiteralExpression(n.parent));

const accessor: Locate = (scope) =>
	first(
		scope,
		(n) => ts.isGetAccessor(n) || ts.isSetAccessor(n) || ts.isClassStaticBlockDeclaration(n),
	);

const oddField: Locate = (scope) =>
	first(
		scope,
		(n) =>
			ts.isPropertyDeclaration(n) &&
			(ts.isComputedPropertyName(n.name) || ts.isPrivateIdentifier(n.name)),
	);

const constructorReturn: Locate = (scope) => {
	const made = first(scope, (n) => ts.isConstructorDeclaration(n));
	return made ? first(made, (n) => ts.isReturnStatement(n)) : undefined;
};

const restParameter: Locate = (scope) =>
	first(scope, (n) => ts.isParameter(n) && n.dotDotDotToken !== undefined);

const varList: Locate = (scope) =>
	first(
		scope,
		(n) =>
			ts.isVariableDeclarationList(n) && (n.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) === 0,
	);

const regularExpression: Locate = (scope) =>
	first(
		scope,
		(n) =>
			n.kind === ts.SyntaxKind.RegularExpressionLiteral ||
			(ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'RegExp'),
	);

const DATABASE_PACKAGES =
	/^(pg|pg-promise|pg-query-stream|pg-cursor|mysql2?|mysql2\/promise|mssql|tedious|mongodb|mongoose|redis|ioredis|oracledb|snowflake-sdk|sqlite3|better-sqlite3|ssh2|ssh2-sftp-client|promise-ftp|basic-ftp|amqplib|kafkajs|mqtt|ldapts|imap|imap-simple|nodemailer|@aws-sdk\/.*|@google-cloud\/.*|pdfjs-dist|xlsx|cheerio|jsdom)$/;
const XML_PACKAGES = /^(xml2js|fast-xml-parser|xmlbuilder2?)$/;
const CRYPTO_PACKAGES = /^(node:)?crypto$/;

function packageAdvice(match: RegExpExecArray): string | undefined {
	const [, name, from] = match;
	if (DATABASE_PACKAGES.test(from))
		return `The package '${from}' opens its own connection or reads a file format. ${NATIVE}`;
	if (XML_PACKAGES.test(from))
		return `XML parsing with '${from}' has no compiled form. ${NATIVE} If the service can answer in JSON, ask for JSON.`;
	if (CRYPTO_PACKAGES.test(from))
		return name === 'randomBytes'
			? `Random bytes for a secret or a nonce have no compiled form. Do not make secrets in node code. ${NATIVE}`
			: `Only \`randomUUID()\` and \`randomInt()\` of 'crypto' have a compiled form. '${name}' has none: the operation stays in the fallback host until the node has a native version.`;
	if (from === 'n8n-workflow' || from.startsWith('@n8n/'))
		return `'${name}' of '${from}' has no compiled form yet. Copy the constant or the small function into a file of the node.`;
	if (/^lodash/.test(from))
		return `Write '${name}' with plain TypeScript (spread, \`Object.keys\`, \`Array\` methods) in a function of the node.`;
	return undefined;
}

export const RULES: Rule[] = [
	{
		code: 'NC001',
		title: 'A package without a compiled form',
		why: 'The compiler reads source code. It cannot read the code of an npm package, and only a short list of packages has a built-in compiled form.',
		remediation:
			'Replace the package call with plain TypeScript in a file of the node, or use `this.helpers.httpRequest` for HTTP. Packages with a compiled form: some `n8n-workflow` helpers, `moment-timezone`, `luxon` (`DateTime`), `change-case`, `uuid` (`v4`).',
		decided: 'partly',
		forms: [
			{
				pattern: /^'([^']+)' comes from the package '([^']+)', which has no compiled form$/,
				locate: named(1),
				remediation: packageAdvice,
				decided: (m) =>
					DATABASE_PACKAGES.test(m[2]) ||
					XML_PACKAGES.test(m[2]) ||
					(CRYPTO_PACKAGES.test(m[2]) && m[1] === 'randomBytes'),
			},
			{
				pattern: /^'([^']+)' of a form of the package 'form-data' has no compiled form$/,
				locate: named(1),
			},
			{
				pattern:
					/^a form of the package 'form-data' has a compiled form only with `append` and as the `formData` of a request$/,
				locate: identifier('FormData'),
			},
		],
	},
	{
		code: 'NC002',
		title: 'A name that the compiler cannot find',
		why: 'The compiler links each name to a function, a class or a constant at the top level of a file of the node.',
		remediation:
			'Declare the name at the top level of a module (a `function`, a `const` or a `class`) and import it with a relative path. Do not read it from a global, a `require` call or a computed import.',
		forms: [
			{
				pattern: /^the name '([^']+)' has no declaration that the compiler can read$/,
				locate: named(1),
				refine: refineName,
			},
			{ pattern: /^no class with an execute method$/ },
			{ pattern: /^the source or the description of the node is not there$/ },
		],
	},
	{
		code: 'NC003',
		title: 'Two declarations with one name',
		why: 'The compiler puts all linked declarations into one module, where each name must be unique.',
		remediation:
			'Rename one of the two declarations. This occurs when two files of the node each declare a top-level function or class with the same name.',
		forms: [{ pattern: /^two declarations have the name '([^']+)'$/, locate: named(1) }],
	},
	{
		code: 'NC004',
		title: 'A compiler limit',
		why: 'The compiler has fixed limits so that one node cannot use unbounded time or memory.',
		remediation:
			'Make the code of the operation smaller: link fewer helper modules from `execute`, and keep credential conditions and token requests few. If the code is already small, report this as a compiler defect.',
		forms: [
			{ pattern: /^more than 2,000 declarations$/ },
			{ pattern: /^the code still changes after \S+ fold rounds$/ },
			{ pattern: /^the node needs more than \S+ conditions on its credential$/ },
			{ pattern: /^the node needs more than \S+ minted tokens$/ },
		],
	},
	{
		code: 'NC010',
		title: '`this` used as a value',
		why: 'The n8n context has a compiled form only as the receiver of a call (`this.helpers...`) or as the `this` of a function that the compiler can see.',
		remediation:
			'Do not store or return `this` (`const self = this`, `{ ctx: this }`). Call `this.method(...)` directly, or pass the context with `helper.call(this, ...)` to a function that is declared at the top level. Use arrow functions for callbacks so that `this` stays the context.',
		decided: 'always',
		forms: [{ pattern: /^`this` as a value has no compiled form$/, locate: thisAsValue }],
	},
	{
		code: 'NC011',
		title: 'A context method without a compiled form',
		why: 'Each `this.*` method of the n8n context needs an equal operation in the compiled engine. Some have none.',
		remediation:
			'Use a context method that has a compiled form: `getNodeParameter`, `getInputData`, `getCredentials`, `getNode`, `continueOnFail`, `helpers.httpRequest`, `helpers.httpRequestWithAuthentication`, `helpers.requestWithAuthentication`, `helpers.returnJsonArray`, `helpers.constructExecutionMetaData`, `helpers.prepareBinaryData`, `helpers.assertBinaryData`. If the operation needs the method, the operation stays in the fallback host.',
		forms: [{ pattern: /^'this\.([\w.]+)' has no compiled form$/, locate: thisMember }],
	},
	{
		code: 'NC012',
		title: 'A context call with an unknown target',
		why: 'The compiler must know which function runs with the n8n context. A function that comes from a table, a parameter or a factory is not known at compile time.',
		remediation:
			'Call a named top-level function: `sendMessage.call(this, body)`. Replace a closure factory (`makeRequester(options).call(this)`) and a computed lookup (`handlers[name].call(this)`) with a `switch` or `if` chain that names each function.',
		decided: 'always',
		forms: [
			{
				pattern: /^a call with the n8n context has a target that is not known at compile time$/,
				locate: contextCall,
			},
		],
	},
	{
		code: 'NC013',
		title: 'A function that gets the context in one call and not in another',
		why: 'The compiler makes one compiled form for each function. The form either takes the n8n context, a credential or an object, or it does not.',
		remediation:
			'Call the function the same way everywhere: always `fn.call(this, ...)` or always `fn(...)`, and pass a credential or an object in the same parameter each time. Split the function into two functions if it has two uses.',
		forms: [
			{
				pattern:
					/^'([^']+)' gets (?:the n8n context|a credential|an object of a class) as an argument after it was compiled without it$/,
				locate: named(1),
			},
			{
				pattern: /^'([^']+)' gets an object of a class and a different value in one parameter$/,
				locate: named(1),
			},
			{
				pattern:
					/^the static method '([^']+)' uses `this`, and a call does not give the n8n context$/,
			},
			{ pattern: /^a constant is called with the n8n context$/ },
			{
				pattern:
					/^the method '([^']+)' of the class '[^']+' gets the object in one call and the n8n context in a different call$/,
				locate: memberNamed(1),
			},
		],
	},
	{
		code: 'NC014',
		title: 'A value of the instance that the caller did not give',
		why: 'The instance id and the workflow time zone become constants of the compiled node. The compiler needs them from the caller.',
		remediation:
			'No change to the node. The caller of the compiler must pass the instance id and the time zone. The linter passes both: if you see this code from the linter, report a defect.',
		forms: [
			{
				pattern: /^the node reads the instance id, and the caller did not give the instance$/,
				locate: member('getInstanceId'),
			},
			{ pattern: /^dates in a time zone need the time zone of the workflow$/ },
		],
	},
	{
		code: 'NC015',
		title: 'A function made by a closure factory',
		why: 'The compiler links a name to a declaration that it can read. A function that a call returns (`const { request } = makeTransport(options)`) exists only at run time.',
		remediation:
			'Restructure as top-level functions: `export async function request(this: IExecuteFunctions, ...)`. Pass the options of the factory as arguments, or keep them in a top-level `const`.',
		decided: 'always',
		forms: [],
	},
	{
		code: 'NC020',
		title: 'A parameter read that is not constant',
		why: 'The compiler replaces each `this.getNodeParameter` call with the value of the parameter. It needs the name as text and no options.',
		remediation:
			"Write the parameter name as a text literal: `this.getNodeParameter('channelId', i)`. Replace a loop over names with one call for each name. Remove the options argument (`extractValue`, `ensureType`) or read the value and convert it in code.",
		forms: [
			{
				pattern: /^the options of 'this\.getNodeParameter' have no compiled form$/,
				locate: parameterOptions,
			},
			{
				pattern:
					/^'this\.getNodeParameter' has no compiled form: the parameter name is not a constant for this node$/,
				locate: parameterName,
			},
			{
				pattern:
					/^the parameter '[^']+' is the value of a resource mapper, and v1 changes or checks the type of its fields: this has no compiled form$/,
				locate: parameterName,
			},
			{
				pattern: /^v1 checks the type of the parameter '[^']+' when the node reads it, and .+$/,
				locate: parameterName,
			},
			{ pattern: /^the list of the parameters for each item is used as a value$/ },
		],
	},
	{
		code: 'NC021',
		title: 'A parameter read with an item index that is not the index of an item',
		why: 'A parameter with an expression has one value for each input item. The compiler must prove that the index is the index of the item in the loop.',
		remediation:
			'Read the parameter inside `for (let i = 0; i < items.length; i++)` with the loop variable as the index: `this.getNodeParameter(name, i)`. Do not compute the index, and do not read with index `0` outside the loop when the value can differ for each item.',
		forms: [
			{
				pattern:
					/^the parameter '([^']+)' has an expression, and the compiler cannot prove that the item index of 'this\.getNodeParameter' is the index of an input item$/,
				locate: parameterNamed,
			},
		],
	},
	{
		code: 'NC022',
		title: 'An expression that the node evaluates from a text that is not known',
		why: 'The converter translates an expression before the run. The compiler must know the text of each expression that the node gives to `this.evaluateExpression`: a constant, or a part of a parameter without an expression that the node finds with `getResolvables`.',
		remediation:
			'Give a text literal, or read the parameter into a variable and loop over `getResolvables(variable)` directly after the read: `for (const part of getResolvables(text)) text = text.replace(part, this.evaluateExpression(part, i))`. Do not change the variable before the loop. When the text comes from an item or from a parameter with an expression, the operation stays in the fallback host.',
		forms: [{ pattern: /^'this\.evaluateExpression' has no compiled form: .+$/ }],
	},
	{
		code: 'NC030',
		title: 'A credential used as a whole value',
		why: 'A compiled node never holds a secret. Each credential field is a marker that the engine fills in when it sends the request. An object of all fields cannot be a marker.',
		remediation:
			'Read single fields and put them into the request: `headers: { Authorization: `Bearer ${credentials.apiKey}` }`. Do not spread, copy, log, return or `JSON.stringify` the credential object. Better: declare `authenticate` on the credential type and call `this.helpers.httpRequestWithAuthentication`.',
		forms: [
			{
				pattern:
					/^the credential (?:'[^']+' )?is used as a whole value: only its fields can go into a request$/,
				locate: wholeCredential,
			},
		],
	},
	{
		code: 'NC031',
		title: 'Node code that reads a credential value',
		why: 'Node code never sees a secret. It can place a credential field in a request, but it cannot compare it, branch on it, compute with it or call a method on it.',
		remediation:
			'Move the logic to the credential type (`authenticate`, or an expression in the credential properties), or make the choice a node parameter or a non-secret credential field with `options` type. Send the field as it is: no `.trim()`, no `if (credentials.token)`, no arithmetic.',
		forms: [
			{
				pattern:
					/^the code compares or branches on a credential field: node code cannot read a credential value$/,
				locate: branchesOnCredential,
			},
			{
				pattern:
					/^the code calls a method on a credential field: node code cannot read a credential value$/,
				locate: callsOnCredential,
			},
			{
				pattern:
					/^the code computes with a credential field: node code cannot read a credential value$/,
				locate: computesWithCredential,
			},
			{
				pattern:
					/^the code reads a credential field in a place that is not a value of a request: node code cannot read a credential value$/,
				locate: computesWithCredential,
			},
		],
	},
	{
		code: 'NC032',
		title: 'A random value in credential code',
		why: 'Credential code runs in the secret store, which must give the same result each time. Random bytes for a secret or a nonce have no compiled form.',
		remediation: `Do not make random bytes, nonces or secrets in \`authenticate\` or in signing code. Use an authentication scheme without a nonce if the service has one. ${NATIVE}`,
		decided: 'always',
		forms: [
			{
				pattern: /^a random value in credential code has no compiled form$/,
				locate: identifier('randomBytes', 'randomUUID', 'randomInt', 'random', 'uuid', 'v4'),
			},
		],
	},
	{
		code: 'NC033',
		title: 'A session or token request in a form that the compiler does not know',
		why: 'The engine gets session tokens and Google service-account tokens itself. It needs the credential type, the service and the scopes as constants.',
		remediation:
			"Name the credential type as text in the request call: `this.helpers.requestWithAuthentication.call(this, 'acmeApi', options)`, with no extra token options. For a Google service account, give the service as a text literal and keep the scopes in a constant table.",
		forms: [
			{
				pattern:
					/^a credential type that gets a session token first has a compiled form only when the request names the type as text$/,
			},
			{
				pattern:
					/^token options of a request with a credential type that gets a session token first have no compiled form$/,
			},
			{ pattern: /^the scopes of '([^']+)' are not a table of constants$/, locate: named(1) },
			{ pattern: /^the Google service '[^']+' has no scopes that are constants$/ },
			{ pattern: /^two token requests have the same name$/ },
			{
				pattern:
					/^the call of '([^']+)' has a service that is not a constant, or the code reads more than the access token$/,
				locate: named(1),
			},
		],
	},
	{
		code: 'NC034',
		title: 'A credential argument that the compiler cannot bind',
		why: 'The engine fills the fields of a credential into the request. The compiler puts each field into the function that gets the credential. It can do this only for a function declaration or an arrow function with a plain parameter.',
		remediation:
			'Pass the credential as a plain parameter: `async function send(this: IExecuteFunctions, credentials: { apiKey: string })`. Do not give the parameter a default value, a rest pattern or a destructured pattern.',
		forms: [
			{
				pattern:
					/^a credential as an argument of a function that is not a declaration with a plain parameter has no compiled form$/,
			},
		],
	},
	{
		code: 'NC040',
		title: 'Class inheritance',
		why: 'The compiler turns a class into plain functions. A parent class would need method lookup at run time.',
		remediation:
			'Restructure as one class without `extends`, or as top-level functions that take the data as parameters. Copy the parent methods that the node uses into the class.',
		decided: 'always',
		forms: [
			{ pattern: /^a class that extends another class has no compiled form$/, locate: heritage },
			{
				pattern: /^`super`, `new\.target` or `arguments` in a class has no compiled form$/,
				locate: (scope) =>
					first(
						scope,
						(n) =>
							n.kind === ts.SyntaxKind.SuperKeyword ||
							ts.isMetaProperty(n) ||
							(ts.isIdentifier(n) && n.text === 'arguments'),
					),
			},
		],
	},
	{
		code: 'NC041',
		title: 'A class feature without a compiled form',
		why: 'The compiler supports plain classes: fields, a constructor that stores its arguments, and methods.',
		remediation:
			'Use plain fields and methods. Replace a getter or setter with a method, a private `#name` field with a normal field, a static block with a top-level `const`, a generator with a function that returns an array. In a method, use arrow functions so that `this` is the object.',
		forms: [
			{
				pattern: /^a constructor with a `return` has no compiled form$/,
				locate: constructorReturn,
			},
			{ pattern: /^a class accessor or static block has no compiled form$/, locate: accessor },
			{
				pattern: /^a computed or private-name class field has no compiled form$/,
				locate: oddField,
			},
			{ pattern: /^a generator method has no compiled form$/, locate: generator },
			{
				pattern: /^`this` in a nested function of a class method has no compiled form$/,
				locate: (scope) =>
					first(
						scope,
						(n) =>
							(ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) &&
							first(n, isThis) !== undefined &&
							first(scope, (c) => ts.isClassLike(c) && first(c, (x) => x === n) !== undefined) !==
								undefined,
					),
			},
			{
				pattern: /^'([^']+)' is not a method of the class '[^']+'$/,
				locate: (scope, m) =>
					first(scope, (n) => ts.isPropertyAccessExpression(n) && n.name.text === m[1]),
			},
		],
	},
	{
		code: 'NC042',
		title: 'An object of a class that is not a constant',
		why: 'The compiler replaces each object of a class with its fields and calls each method as a function. It must know the class of each name at compile time.',
		remediation:
			'Make each object in its own statement and keep it in one name: `const client = new Client(this);`. Do not make an object inside an expression, assign it a second time, or keep it in `let`.',
		forms: [
			{
				pattern: /^an object of the class '([^']+)' is made outside a `const` declaration$/,
				locate: madeOutsideConst,
			},
			{
				pattern: /^the name '([^']+)' holds an object of a class and has more than one binding$/,
				locate: named(1),
			},
		],
	},
	{
		code: 'NC043',
		title: 'An object, a class or a method used as a value',
		why: 'After compilation there is no object: only its fields and functions. An object that goes into a list, a return value or a callback has no compiled form.',
		remediation:
			'Use the object only to call its methods and read its fields: `client.send(body)`. Do not return it, put it in an array or object, or pass a method as a callback (`items.map(client.send)`): write `items.map((item) => client.send(item))`.',
		forms: [
			{
				pattern: /^an object of the class '([^']+)' is used as a whole value$/,
				locate: (scope, m) =>
					first(
						scope,
						(n) =>
							ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === m[1],
					),
			},
			{ pattern: /^the class '([^']+)' is used as a value$/, locate: classAsValue },
			{
				pattern: /^the method '([^']+)' of the class '[^']+' is used as a value$/,
				locate: methodAsValue,
			},
			{
				pattern:
					/^the field '([^']+)' of the class '[^']+' holds an object of a class and is used as a value$/,
				locate: methodAsValue,
			},
			{ pattern: /^a value that is not a function declaration gets an object of a class$/ },
			{ pattern: /^a parameter that gets an object of a class is not a name$/ },
		],
	},
	{
		code: 'NC044',
		title: 'A constructor or a field that the compiler cannot follow',
		why: 'The compiler must see where a class stores the n8n context and its helper objects: in plain statements at the start of the constructor.',
		remediation:
			'Start the constructor with plain stores: `this.context = context; this.api = new Api(context);`. Do not use the object before these stores, do not write the context field again, do not reuse the parameter name, and read the context field only inside the class.',
		forms: [
			{ pattern: /^the constructor uses the object before it stores the n8n context$/ },
			{ pattern: /^the constructor uses the object before it stores the objects of its fields$/ },
			{
				pattern:
					/^the constructor does not store the object of the field '([^']+)' in a plain statement$/,
				locate: memberNamed(1),
			},
			{
				pattern: /^the class binds the name '([^']+)' again, and the name holds the n8n context$/,
				locate: named(1),
			},
			{
				pattern: /^the class writes the field '([^']+)' that holds the n8n context$/,
				locate: memberNamed(1),
			},
			{
				pattern:
					/^code outside the class '[^']+' reads the field '([^']+)', and the field holds the n8n context$/,
				locate: memberNamed(1),
			},
			{ pattern: /^the compiler reached a method before its class '([^']+)'$/, locate: named(1) },
		],
	},
	{
		code: 'NC045',
		title: 'An object picked from a table by a computed key',
		why: 'A table of objects or handlers (`handlers[resource]`) has a compiled form only when the key is a constant for the node instance, so that the compiler can pick the entry.',
		remediation:
			"Index the table with a parameter that is constant for the instance: `const resource = this.getNodeParameter('resource', 0); handlers[resource]`. Do not index with a value from an item or a response. Make sure each entry has the method that the code calls.",
		forms: [
			{ pattern: /^an object is picked from a table by a key that is not a name$/ },
			{
				pattern:
					/^an object is picked from a table by a key that is not a constant, or the object has no such method$/,
			},
		],
	},
	{
		code: 'NC050',
		title: 'A full response read beyond body, headers and status code',
		why: 'The compiled engine keeps the body, the headers and the status code of a response. It does not keep the status message or the request.',
		remediation:
			'Read only `response.body`, `response.headers` and `response.statusCode`. Derive a status text from the status code in the node if you need one.',
		forms: [
			{
				pattern:
					/^the code asks for a full response and reads `statusMessage` or `request`: a full response has only its body, its headers and its status code$/,
				locate: member('statusMessage', 'request'),
			},
		],
	},
	{
		code: 'NC051',
		title: '`instanceof Error` on a value that may not be an error',
		why: 'In compiled code a caught value is data. The compiler can answer `instanceof Error` only when it knows that every thrown value is an error.',
		remediation:
			'Throw only errors (`throw new NodeOperationError(this.getNode(), message)`), never text or plain objects. Or remove the test and read `error.message` directly.',
		forms: [
			{
				pattern:
					/^the code tests a caught value with `instanceof Error`, and it throws a value that is not known to be an error$/,
				locate: instanceofError,
			},
		],
	},
	{
		code: 'NC052',
		title: 'Bytes used in a form that the compiler does not know',
		why: 'File bytes stay in the engine: compiled code holds a reference, not the bytes. Only a few fixed uses have a compiled form.',
		remediation:
			"Use bytes only in these forms: `Buffer.from(text, 'utf8').toString('base64')` (encodings utf8, base64, base64url, hex), an input file as a part of a multipart request body, `buffer.length`, and `this.helpers.prepareBinaryData(response.body, name)` for a response. Do not slice, concatenate or parse bytes in node code.",
		forms: [
			{
				pattern:
					/^file bytes have a compiled form only as a file of a multipart request and with `length`(?:: '([^']+)')?$/,
				locate: (scope, m) =>
					m[1] === undefined
						? identifier('getBinaryDataBuffer', 'Buffer')(scope, m)
						: named(1)(scope, m),
			},
			{
				pattern:
					/^a Buffer has a compiled form only as `Buffer\.from\(text, encoding\)\.toString\(encoding\)` with the encodings utf8, base64, base64url and hex$/,
				locate: identifier('Buffer'),
			},
			{
				pattern:
					/^binary data has a compiled form only from the body of a response: file bytes of an input item cannot become new binary data$/,
				locate: member('prepareBinaryData'),
			},
		],
	},
	{
		code: 'NC053',
		title: 'A date call without a compiled form',
		why: 'The compiled engine has its own date functions. A `moment` call has a compiled form only when its format, its unit and its time zone are constants.',
		remediation:
			"Write the date call as one chain that ends in text or a number, with literal arguments: `moment(value).tz('Europe/Berlin').format('YYYY-MM-DD')`. Do not keep a moment object in a variable, and do not compute the format or the zone.",
		forms: [
			{
				pattern: /^the moment method '([^']+)' with .* has no compiled form$/,
				locate: memberNamed(1),
			},
			{
				pattern: /^the time zone of a moment is not known at compile time$/,
				locate: member('tz'),
			},
			{
				pattern: /^the time zone '[^']+' of a moment has no compiled form$/,
				locate: member('tz'),
			},
			{
				pattern: /^the call 'moment\.(\w+)' with .* has no compiled form$/,
				locate: memberNamed(1),
			},
			{
				pattern: /^(?:a date format|the token '[^']+' of a date format)\b.* has no compiled form$/,
				locate: member('format'),
			},
			{
				pattern: /^a moment\b.* has no compiled form$/,
				locate: identifier('moment'),
			},
		],
	},
	{
		code: 'NC054',
		title: 'Match details of a regular expression',
		why: 'The compiled form of a match is the list of matched texts. It has no `index` and no `groups`.',
		remediation:
			'Read groups by number (`match[1]`) and do not use named groups or `match.index`. Use `text.indexOf(match[0])` if you need the position.',
		forms: [
			{
				pattern: /^the `index` or `groups` of a match has no compiled form in node code yet$/,
				locate: member('index', 'groups'),
			},
			{ pattern: /^match properties \(indices\): /, locate: member('indices') },
		],
	},
	{
		code: 'NC100',
		title: 'A language construct without a compiled form',
		why: 'Compiled node code is a subset of TypeScript: functions, plain objects, arrays, loops and `try`/`catch`.',
		remediation:
			'Rewrite the construct with plain functions and data: a class expression as functions, a getter as a function call, an object method as an arrow function property, a generator as a function that returns an array, a tagged template as a function call. Remove labels and `with`.',
		forms: [
			{
				pattern: /^class: /,
				locate: kind(ts.SyntaxKind.ClassExpression, ts.SyntaxKind.ClassDeclaration),
			},
			{ pattern: /^this \(this\.helpers\): /, locate: thisAsValue },
			{ pattern: /^getter \/ setter: /, locate: accessor },
			{ pattern: /^label: /, locate: kind(ts.SyntaxKind.LabeledStatement) },
			{ pattern: /^generator: /, locate: generator },
			{ pattern: /^tagged template: /, locate: kind(ts.SyntaxKind.TaggedTemplateExpression) },
			{ pattern: /^with: /, locate: kind(ts.SyntaxKind.WithStatement) },
			{
				pattern: /^named function expression: /,
				locate: (scope) => first(scope, (n) => ts.isFunctionExpression(n) && n.name !== undefined),
			},
			{ pattern: /^object method: /, locate: objectMethod },
			{ pattern: /^rest parameter: /, locate: restParameter },
			{ pattern: /^var [a-z ]+: /, locate: varList },
			{
				pattern: /^optional chain: /,
				locate: (scope) =>
					first(
						scope,
						(n) =>
							(ts.isCallExpression(n) || ts.isPropertyAccessExpression(n)) &&
							n.questionDotToken !== undefined,
					),
			},
			{ pattern: /^name of a helper: / },
			{ pattern: /^(?:syntax error|translation syntax): / },
		],
	},
	{
		code: 'NC101',
		title: 'A `catch` block that reads the error',
		why: 'The text of an error from the JavaScript runtime (for example a `TypeError`) can differ in the compiled engine. The compiler allows a read only when it knows where the error comes from.',
		remediation:
			'In the `try` block, call only requests and functions that throw n8n errors. Then `error.message` is exact. Do not read `error.stack` or the message of an error from `JSON.parse` or a property read: test the value before you use it instead.',
		forms: [{ pattern: /^catch reads the error: /, locate: catchClause }],
	},
	{
		code: 'NC102',
		title: '`instanceof` with a class that the compiler does not know',
		why: 'Compiled values are data without a prototype. `instanceof` has an answer only for errors that the compiler tracks.',
		remediation:
			"Test the shape of the value: `typeof value === 'object'`, `Array.isArray(value)`, or a field that marks the kind (`value.kind === 'file'`).",
		forms: [{ pattern: /^instanceof: /, locate: instanceofError }],
	},
	{
		code: 'NC103',
		title: 'Promise callbacks',
		why: 'Compiled code runs each request in order with `await`. Promise chains and `new Promise` have no compiled form.',
		remediation:
			'Use `await` in a `try`/`catch`: `const response = await this.helpers.httpRequest(options);`. Replace `Promise.all(list.map(...))` with a `for` loop that awaits each call.',
		forms: [{ pattern: /^Promise: /, locate: promiseUse }],
	},
	{
		code: 'NC104',
		title: 'Binary data made in code',
		why: 'Compiled code cannot make bytes. Bytes come from a response or from an input item.',
		remediation:
			'Get the file from a response with `encoding: "arraybuffer"` and pass the body to `this.helpers.prepareBinaryData`. See NC052 for the forms that compile.',
		forms: [{ pattern: /^binary data: /, locate: identifier('Buffer', 'Uint8Array', 'Blob') }],
	},
	{
		code: 'NC105',
		title: 'A regular expression form without a compiled form',
		why: 'The engine compiles each regular expression ahead of time. It needs the pattern as a literal and supports a fixed syntax.',
		remediation:
			'Write the pattern as a literal (`/^[a-z]+$/i`), not `new RegExp(variable)`. Do not use the expression as text. Use at most 9 groups with a replace callback.',
		forms: [
			{
				pattern:
					/^(?:regular expression(?: as text| with more than 9 groups)?|RegExp with a computed pattern): /,
				locate: regularExpression,
			},
			{ pattern: /^WL020 /, locate: regularExpression },
		],
	},
	{
		code: 'NC106',
		title: 'Locale or date formatting outside the built-in tables',
		why: 'The engine has tables for a fixed list of locales, time zones and format tokens. A computed locale, zone or format cannot be looked up at compile time.',
		remediation:
			"Use literal arguments: `DateTime.fromISO(value).toFormat('yyyy-MM-dd')`, `value.toLocaleString('en-US')`. Use `DateTime.now`, `fromISO`, `fromMillis`, `fromSeconds`, `fromJSDate`, `fromObject` or `utc`. Call `localeCompare` with one argument.",
		forms: [
			{
				pattern: /^Luxon [A-Za-z]+: /,
				locate: identifier('DateTime', 'toFormat', 'setZone'),
			},
			{ pattern: /^Intl\.\w+: /, locate: identifier('Intl') },
			{ pattern: /^Intl: formatToParts: /, locate: member('formatToParts') },
			{ pattern: /^localeCompare with a locale or options: /, locate: member('localeCompare') },
			{ pattern: /^locale [a-z ]+: / },
			{
				pattern: /^Date: toLocaleString of a value of unknown kind/,
				locate: member('toLocaleString'),
			},
			{
				pattern: /^Date\(\): /,
				locate: identifier('Date'),
			},
			{
				pattern:
					/^Date: (a Date |method of a value |method of a Date |a member of a value |local time |setter )/,
			},
			{ pattern: /^Luxon toJSDate: /, locate: member('toJSDate') },
		],
	},
	{
		code: 'NC107',
		title: 'A name of the Code node in node code',
		why: 'Names such as `$input`, `$node`, `$items`, `$execution`, `$workflow` and `console` values belong to the Code node. Node code reads data through the n8n context.',
		remediation:
			'Use the context: `this.getInputData()`, `this.getWorkflow()`, `this.getNode()`. Remove the `@n8n-host` comment. Do not use the result of a `console` call.',
		forms: [
			{ pattern: /^host pragma: / },
			{ pattern: /^\$[^:]*: / },
			{ pattern: /^console as a value: /, locate: identifier('console') },
			{ pattern: /^[\w$.]+ as a value: / },
		],
	},
	{
		code: 'NC108',
		title: 'A global without a compiled form',
		why: 'Compiled code has no Node.js globals: no `require`, `process`, `fetch`, `setTimeout`, `Buffer` or `crypto` object. Only the n8n context and plain JavaScript values exist.',
		remediation:
			'Use the context instead: `this.helpers.httpRequest` for `fetch`, `sleep` from `n8n-workflow` for `setTimeout`, an `import` at the top of the file for `require`. Build a query string with the `qs` option of the request, not with `URLSearchParams`.',
		forms: [
			{ pattern: /^global ([\w$]+): /, locate: named(1) },
			{ pattern: /^[^:]+: `([\w$]+)` has no native form\.$/, locate: named(1) },
		],
	},
	{
		code: 'NC190',
		title: 'Compiled code that does not pass the workflow-language check',
		why: 'After the node compiler prints the code, the workflow compiler checks it against the language subset. A failure here is a construct that the node compiler passed through without a rewrite.',
		remediation:
			'Read the `WL` code and message: it names the construct. Rewrite that construct with plain functions and data. If the source has no such construct, report a compiler defect.',
		forms: [{ pattern: /^WL\d{3}:? / }],
	},
	{
		code: 'NC999',
		title: 'An error that has no rule yet',
		why: 'The compiler stopped with a message that the catalogue does not know.',
		remediation:
			'Read the message. Report it so that the catalogue gets a rule. The node keeps running in the fallback host.',
		forms: [],
	},
];

const UNKNOWN = RULES[RULES.length - 1];

export interface Classified {
	rule: Rule;
	form?: Form;
	match?: RegExpExecArray;
	where?: string;
	message: string;
}

export function classify(text: string): Classified {
	const prefixed = /^([A-Za-z_$][\w$]*): ([\s\S]*)$/.exec(text);
	const candidates: Array<{ where?: string; message: string }> = [];
	if (prefixed) candidates.push({ where: prefixed[1], message: prefixed[2] });
	candidates.push({ message: text });
	for (const { where, message } of candidates) {
		for (const rule of RULES) {
			for (const form of rule.forms) {
				const match = form.pattern.exec(message);
				if (match) return { rule, form, match, where, message };
			}
		}
	}
	return { rule: UNKNOWN, where: prefixed?.[1], message: prefixed?.[2] ?? text };
}

const MAX_SOURCES = 64;
const SOURCES = new Map<string, { text: string; sf: ts.SourceFile }>();

function sourceOf(path: string, readFile: (path: string) => string | undefined) {
	const text = readFile(path);
	if (text === undefined) return undefined;
	const kept = SOURCES.get(path);
	if (kept && kept.text === text) return kept.sf;
	const sf = ts.createSourceFile(path, text, ts.ScriptTarget.ES2022, true);
	SOURCES.delete(path);
	if (SOURCES.size >= MAX_SOURCES) {
		for (const oldest of SOURCES.keys()) {
			SOURCES.delete(oldest);
			break;
		}
	}
	SOURCES.set(path, { text, sf });
	return sf;
}

function declarationOf(sf: ts.SourceFile, origin: UnitOrigin): ts.Node | undefined {
	const nameIs = (name: ts.Node | undefined) =>
		name !== undefined && name.getText(sf) === origin.declared;
	const isMethod = (n: ts.Node) =>
		ts.isMethodDeclaration(n) &&
		nameIs(n.name) &&
		(origin.owner === undefined ||
			(ts.isClassLike(n.parent) && n.parent.name?.text === origin.owner));
	const isOther = (n: ts.Node) =>
		(ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n) || ts.isClassDeclaration(n)) &&
		nameIs(n.name);
	return origin.owner === undefined
		? (first(sf, isOther) ?? first(sf, isMethod))
		: (first(sf, isMethod) ?? first(sf, isOther));
}

function nameOf(node: ts.Node): ts.Node {
	if (
		(ts.isFunctionDeclaration(node) ||
			ts.isMethodDeclaration(node) ||
			ts.isClassDeclaration(node) ||
			ts.isVariableDeclaration(node)) &&
		node.name
	)
		return node.name;
	return node;
}

export interface DiagnoseInput {
	errors: string[];
	origins?: UnitOrigin[];
	entry: string;
	readFile: (path: string) => string | undefined;
}

export function diagnose(input: DiagnoseInput): NodeDiagnostic[] {
	const origins = input.origins ?? [];
	const scopes = new Map<string, { node: ts.Node; sf: ts.SourceFile } | undefined>();
	const scopeOf = (origin: UnitOrigin) => {
		if (scopes.has(origin.unit)) return scopes.get(origin.unit);
		const sf = sourceOf(origin.file, input.readFile);
		const node = sf ? declarationOf(sf, origin) : undefined;
		const scope = sf && node ? { node, sf } : undefined;
		scopes.set(origin.unit, scope);
		return scope;
	};
	const at = (node: ts.Node, sf: ts.SourceFile) => {
		const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
		return { file: sf.fileName, line: line + 1, column: character + 1 };
	};
	let files: ts.SourceFile[] | undefined;
	const allFiles = () => {
		files ??= [...new Set(origins.map((o) => o.file))]
			.slice(0, MAX_SOURCES)
			.flatMap((file) => sourceOf(file, input.readFile) ?? []);
		return files;
	};
	const importedFile = (from: string, name: string): ts.SourceFile | undefined => {
		const sf = sourceOf(from, input.readFile);
		for (const statement of sf?.statements ?? []) {
			if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
				continue;
			const bindings = statement.importClause?.namedBindings;
			if (!bindings || !ts.isNamedImports(bindings)) continue;
			if (!bindings.elements.some((e) => e.name.text === name)) continue;
			const spec = statement.moduleSpecifier.text;
			if (!spec.startsWith('.')) return undefined;
			const target = resolve(dirname(from), spec);
			for (const candidate of [`${target}.ts`, `${target}/index.ts`, `${target}.js`]) {
				const found = sourceOf(candidate, input.readFile);
				if (found) return found;
			}
		}
		return undefined;
	};
	const whole = new Set(
		input.errors.flatMap(
			(text) => /: the credential '([^']+)' is used as a whole value/.exec(text)?.[1] ?? [],
		),
	);
	const echoes = (text: string) => {
		const name = /: the name '([^']+)' has no declaration that the compiler can read$/.exec(text);
		return name !== null && whole.has(name[1]);
	};
	return input.errors
		.filter((text) => !echoes(text))
		.map((text): NodeDiagnostic => {
			const { rule: first, form, match, where, message } = classify(text);
			const home = origins.find((o) => o.unit === where);
			const execute = origins.find((o) => o.unit === 'execute');
			const order = [...(home ? [home] : []), ...origins.filter((o) => o !== home)];
			const imported =
				home && match?.[1] !== undefined ? importedFile(home.file, match[1]) : undefined;
			const refined =
				match && form?.refine
					? form.refine(match, [...(imported ? [imported] : []), ...allFiles()])
					: undefined;
			const rule = RULES.find((r) => r.code === refined?.code) ?? first;
			const common = {
				code: rule.code,
				message,
				remediation:
					refined?.remediation ??
					(refined ? undefined : match && form?.remediation?.(match)) ??
					rule.remediation,
				decided:
					refined?.decided === true ||
					rule.decided === 'always' ||
					(match !== undefined && form?.decided?.(match) === true),
				text,
			};
			if (refined?.node && refined.sf) {
				return {
					...common,
					...at(refined.node, refined.sf),
					function: where ?? '',
					precision: 'construct',
				};
			}
			if (form?.locate && match) {
				for (const origin of order) {
					const scope = scopeOf(origin);
					const found = scope ? form.locate(scope.node, match) : undefined;
					if (scope && found) {
						return {
							...common,
							...at(found, scope.sf),
							function: origin.unit,
							precision: origin === home ? 'construct' : 'candidate',
						};
					}
				}
			}
			const fallback = home ?? execute;
			const scope = fallback ? scopeOf(fallback) : undefined;
			if (fallback && scope) {
				return {
					...common,
					...at(nameOf(scope.node), scope.sf),
					function: fallback.unit,
					precision: 'function',
				};
			}
			return {
				...common,
				file: input.entry,
				line: 1,
				column: 1,
				function: where ?? '',
				precision: 'file',
			};
		});
}

export function shortPath(file: string, relativeTo: string): string {
	const short = relative(relativeTo, file);
	return short === '' || short.startsWith('../../..') ? file : short;
}

export function formatDiagnostic(d: NodeDiagnostic, relativeTo?: string): string {
	const file = relativeTo === undefined ? d.file : shortPath(d.file, relativeTo);
	return `${file}:${d.line}:${d.column} ${d.code} ${d.message}`;
}
