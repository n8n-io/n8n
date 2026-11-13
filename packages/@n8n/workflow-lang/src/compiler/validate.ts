import ts from 'typescript';

import {
	GLUE_CTX_METHODS,
	ctxCallMethod,
	findNodeDefinition,
	findWorkflowDefinition,
	isAsyncCall,
	isAsyncFunction,
	isEffectCall,
	isFunctionLike,
	isPromiseAll,
	promiseAllMap,
	propertyName,
	skipOuter,
	stringLiteralValue,
} from './analysis.ts';
import {
	ARRAY_METHODS,
	CONSTANTS,
	LIBRARY_FUNCTIONS,
	NUMBER_METHODS,
	PRELUDE_METHODS,
	STRING_METHODS,
} from './opcodes.ts';
import { checkDates, dateStatic, isDateConstructor, isDateish } from './dates.ts';
import { LIB_FILE, SDK_FILE } from './program.ts';

export interface Diagnostic {
	code: string;
	message: string;
	file: string;
	start: number;
	end: number;
	line: number;
	column: number;
	suggestion: string;
}

export function makeDiagnostic(
	node: ts.Node,
	code: string,
	message: string,
	suggestion: string,
): Diagnostic {
	const sf = node.getSourceFile();
	const start = node.getStart(sf);
	const pos = sf.getLineAndCharacterOfPosition(start);
	return {
		code,
		message,
		file: sf.fileName,
		start,
		end: node.getEnd(),
		line: pos.line + 1,
		column: pos.character + 1,
		suggestion,
	};
}

const ALLOWED_GLOBALS: ReadonlySet<string> = new Set([
	'Math',
	'JSON',
	'Object',
	'Array',
	'Number',
	'String',
	'Boolean',
	'parseInt',
	'parseFloat',
	'isNaN',
	'btoa',
	'atob',
	'encodeURI',
	'encodeURIComponent',
	'decodeURIComponent',
	'escape',
	'unescape',
	'XML',
	'Ascii',
	'Base64',
	'NaN',
	'Infinity',
	'undefined',
	'Error',
	'TypeError',
	'RangeError',
	'Promise',
	'Date',
]);

const GLOBAL_CODES: ReadonlyMap<string, [string, string]> = new Map([
	['setTimeout', ['WL010', 'Use await ctx.wait({ name, duration }).']],
	['setInterval', ['WL010', 'Use a loop with await ctx.wait({ name, duration }).']],
	['setImmediate', ['WL010', 'Remove the timer.']],
	['queueMicrotask', ['WL010', 'Remove the mapper.']],
	['fetch', ['WL012', "Use await ctx.http({ name, method: 'GET', url })."]],
	['require', ['WL012', "Import only from '@n8n/workflow-lang'."]],
	['process', ['WL012', 'Use a credential slot or a trigger value.']],
	['globalThis', ['WL012', 'Remove the global access.']],
	['window', ['WL012', 'Remove the global access.']],
	['eval', ['WL012', 'Remove eval.']],
	['Function', ['WL012', 'Use an arrow function.']],
	['Map', ['WL001', 'Use a plain object.']],
	['Set', ['WL001', 'Use a plain object or an array.']],
	['WeakMap', ['WL001', 'Use a plain object.']],
	['WeakSet', ['WL001', 'Use an array.']],
	['Symbol', ['WL001', 'Use a string key.']],
	['Proxy', ['WL001', 'Use a plain object.']],
	['Reflect', ['WL001', 'Use Object.keys or plain property access.']],
	['arguments', ['WL001', 'Use a rest-free parameter list.']],
	['RegExp', ['WL020', 'Use string methods such as includes, split or replaceAll.']],
]);

/** Kinds of the source file being checked. */
export type FileRole = 'workflow' | 'library';

/** Checks the subset rules on one source file (spec section 1.1). */
export function validateFile(
	checker: ts.TypeChecker,
	sf: ts.SourceFile,
	role: FileRole,
): Diagnostic[] {
	const out: Diagnostic[] = [];
	const report = (node: ts.Node, code: string, message: string, suggestion: string) =>
		out.push(makeDiagnostic(node, code, message, suggestion));

	// Module level.
	for (const st of sf.statements) {
		if (ts.isImportDeclaration(st)) {
			const spec = stringLiteralValue(
				ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier : undefined,
			);
			if (spec !== '@n8n/workflow-lang') {
				report(
					st,
					'WL012',
					`Import from "${spec ?? '?'}" is not allowed.`,
					"Import only from '@n8n/workflow-lang'.",
				);
			}
		} else if (ts.isVariableStatement(st)) {
			const flags = st.declarationList.flags;
			if ((flags & ts.NodeFlags.Const) === 0) {
				if ((flags & ts.NodeFlags.Let) === 0) {
					report(st, 'WL002', '`var` is not allowed.', 'Use const.');
				} else {
					report(
						st,
						'WL003',
						'Module-level mutable state is not allowed.',
						'Use const, or move the variable into run.',
					);
				}
			}
		} else if (
			ts.isInterfaceDeclaration(st) ||
			ts.isTypeAliasDeclaration(st) ||
			ts.isFunctionDeclaration(st) ||
			ts.isExportAssignment(st)
		) {
			// Allowed.
		} else if (ts.isClassDeclaration(st)) {
			// Reported by the walk below.
		} else if (ts.isEnumDeclaration(st) || ts.isModuleDeclaration(st)) {
			report(
				st,
				'WL001',
				'Enums and namespaces are not allowed.',
				'Use a const object of string values.',
			);
		} else {
			report(
				st,
				'WL003',
				'Module-level statements are not allowed.',
				'Move the statement into run.',
			);
		}
	}
	const definition = role === 'workflow' ? findWorkflowDefinition(sf) : findNodeDefinition(sf);
	if (role === 'workflow' && !definition) {
		report(
			sf,
			'WL040',
			'The file has no `export default workflow({ triggers, run })`.',
			"export default workflow({ triggers: [webhook({ path: 'x' })], async run(ctx, trigger) {} })",
		);
	}

	const stepNames = new Map<string, ts.Node>();

	const isGlobalSymbol = (symbol: ts.Symbol | undefined) =>
		!symbol || (symbol.declarations ?? []).every((d) => d.getSourceFile().fileName === LIB_FILE);

	const checkStep = (call: ts.CallExpression) => {
		const method = ctxCallMethod(checker, call);
		const arg = call.arguments[0];
		const options = arg ? skipOuter(arg) : undefined;
		if (!options || !ts.isObjectLiteralExpression(options)) {
			report(
				call,
				'WL030',
				`ctx.${method} needs an object literal argument.`,
				`ctx.${method}({ name: 'My step', ... })`,
			);
			return;
		}
		const isLibraryHttp = role === 'library';
		if (isLibraryHttp) return;
		const nameProp = options.properties.find(
			(p): p is ts.PropertyAssignment =>
				ts.isPropertyAssignment(p) && propertyName(p.name) === 'name',
		);
		const name = stringLiteralValue(nameProp?.initializer);
		if (name === null) {
			report(
				nameProp ?? options,
				'WL030',
				'A step name must be a string literal.',
				"name: 'Check stock'",
			);
			return;
		}
		const idProp = options.properties.find(
			(p): p is ts.PropertyAssignment =>
				ts.isPropertyAssignment(p) && propertyName(p.name) === 'id',
		);
		if (idProp && stringLiteralValue(idProp.initializer) === null) {
			report(idProp, 'WL030', 'A step id must be a string literal.', "id: 'check-stock'");
		}
		for (const p of options.properties) {
			if (ts.isSpreadAssignment(p)) {
				report(
					p,
					'WL030',
					'Spread in step options is not allowed.',
					'Write each option as a property.',
				);
			}
		}
		const prev = stepNames.get(name);
		if (prev) {
			report(
				nameProp ?? call,
				'WL031',
				`The step name "${name}" is not unique.`,
				`name: '${name} 2'`,
			);
		} else {
			stepNames.set(name, call);
		}
	};

	/** True when `call` is an element of `Promise.all([...])`. */
	const isPromiseAllElement = (node: ts.Node) => {
		const parent = node.parent;
		return (
			parent !== undefined &&
			ts.isArrayLiteralExpression(parent) &&
			parent.parent !== undefined &&
			isPromiseAll(parent.parent)
		);
	};

	const awaited = (node: ts.Node) => {
		let p = node.parent;
		while (
			p &&
			(ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p))
		)
			p = p.parent;
		return p !== undefined && ts.isAwaitExpression(p);
	};

	const visit = (node: ts.Node): void => {
		switch (node.kind) {
			case ts.SyntaxKind.ClassDeclaration:
			case ts.SyntaxKind.ClassExpression:
				report(node, 'WL001', 'Classes are not allowed.', 'Use plain objects and functions.');
				return;
			case ts.SyntaxKind.ThisKeyword:
				report(node, 'WL001', '`this` is not allowed.', 'Pass the value as a parameter.');
				return;
			case ts.SyntaxKind.GetAccessor:
			case ts.SyntaxKind.SetAccessor:
				report(node, 'WL001', 'Getters and setters are not allowed.', 'Use a plain property.');
				return;
			case ts.SyntaxKind.DebuggerStatement:
				report(node, 'WL001', '`debugger` is not allowed.', 'Remove the statement.');
				return;
			case ts.SyntaxKind.LabeledStatement:
				report(
					node,
					'WL004',
					'Labels are not allowed.',
					'Use a flag variable or a function with return.',
				);
				return;
			case ts.SyntaxKind.ForInStatement:
				report(
					node,
					'WL005',
					'`for...in` is not allowed.',
					'Use for (const key of Object.keys(obj)).',
				);
				return;
			case ts.SyntaxKind.YieldExpression:
				report(node, 'WL006', 'Generators are not allowed.', 'Return an array.');
				return;
			case ts.SyntaxKind.RegularExpressionLiteral:
				report(
					node,
					'WL020',
					'Regular expressions are not allowed.',
					'Use string methods such as includes, split or replaceAll.',
				);
				return;
			case ts.SyntaxKind.TaggedTemplateExpression:
				report(
					node,
					'WL001',
					'Tagged templates are not allowed.',
					'Use a template string or a function call.',
				);
				return;
			case ts.SyntaxKind.MetaProperty:
				report(
					node,
					'WL012',
					'`import.meta` and `new.target` are not allowed.',
					'Remove the access.',
				);
				return;
			case ts.SyntaxKind.EnumDeclaration:
			case ts.SyntaxKind.ModuleDeclaration:
				return;
			case ts.SyntaxKind.OmittedExpression:
				if (ts.isArrayLiteralExpression(node.parent) && !isAssignmentPattern(node.parent)) {
					report(node, 'WL001', 'Array holes are not allowed.', 'Write undefined.');
				}
				return;
			case ts.SyntaxKind.InterfaceDeclaration:
			case ts.SyntaxKind.TypeAliasDeclaration:
				return;
			default:
				break;
		}

		if (ts.isVariableDeclarationList(node)) {
			if ((node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) === 0) {
				report(node, 'WL002', '`var` is not allowed.', 'Use const or let.');
			}
		}
		if (isFunctionLike(node) && node.asteriskToken) {
			report(node, 'WL006', 'Generators are not allowed.', 'Return an array.');
		}
		if (ts.isNewExpression(node)) {
			const callee = node.expression;
			const ok =
				isDateConstructor(checker, node) ||
				(ts.isIdentifier(callee) &&
					['Error', 'TypeError', 'RangeError'].includes(callee.text) &&
					(node.arguments?.length ?? 0) <= 1);
			if (!ok) {
				report(
					node,
					'WL001',
					'`new` is allowed only as `new Error(message)`.',
					'Use an object literal.',
				);
			}
		}
		if (ts.isBinaryExpression(node)) {
			const op = node.operatorToken.kind;
			if (op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) {
				const isNullish = (e: ts.Expression) => {
					const s = skipOuter(e);
					return (
						s.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(s) && s.text === 'undefined')
					);
				};
				if (!isNullish(node.left) && !isNullish(node.right)) {
					const strict = op === ts.SyntaxKind.EqualsEqualsToken ? '===' : '!==';
					report(
						node.operatorToken,
						'WL007',
						'Loose equality is allowed only against null.',
						`Use ${strict}.`,
					);
				}
			}
			if (op === ts.SyntaxKind.InstanceOfKeyword) {
				report(
					node,
					'WL001',
					'`instanceof` is not allowed.',
					'Check a property, for example typeof x.name === "string".',
				);
			}
		}
		if (ts.isArrayLiteralExpression(node) || ts.isCallExpression(node)) {
			// Spread in call arguments cannot map to a fixed register window.
			if (ts.isCallExpression(node)) {
				for (const a of node.arguments) {
					if (ts.isSpreadElement(a)) {
						report(
							a,
							'WL020',
							'Spread arguments are not allowed.',
							'Pass the array, or use reduce, for example arr.reduce((m, x) => Math.max(m, x), -Infinity).',
						);
					}
				}
			}
		}
		if (ts.isAwaitExpression(node)) {
			const operand = skipOuter(node.expression);
			const ok =
				isEffectCall(checker, operand) ||
				isAsyncCall(checker, operand) ||
				(isPromiseAll(operand) && checkPromiseAll(operand));
			if (!ok && !isPromiseAll(operand)) {
				report(
					node,
					'WL010',
					'`await` is allowed only on a ctx call, a call of a local async function, or Promise.all.',
					'await ctx.http({ name, method, url })',
				);
			}
		}
		if (ts.isCallExpression(node)) {
			const method = ctxCallMethod(checker, node);
			if (method && !GLUE_CTX_METHODS.has(method)) {
				checkStep(node);
				if (!awaited(node) && !isPromiseAllElement(node)) {
					report(node, 'WL010', `ctx.${method} must be awaited.`, `await ctx.${method}(...)`);
				}
			}
			// Library polls keep their cursor in the workflow static data (spec 9.8).
			if (
				role === 'library' &&
				method &&
				method !== 'http' &&
				method !== 'service' &&
				method !== 'staticData'
			) {
				report(
					node,
					'WL012',
					'A library node can use only ctx.http, ctx.service and ctx.staticData.',
					'Use ctx.http.',
				);
			}
			if (isAsyncCall(checker, node) && !awaited(node) && !isPromiseAllElement(node)) {
				report(
					node,
					'WL010',
					'A call of an async function must be awaited.',
					'await the call, or use Promise.all([...]).',
				);
			}
			checkCallee(node);
		}
		if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && isAsyncFunction(node)) {
			const parent = node.parent;
			const okDecl = ts.isVariableDeclaration(parent) && parent.initializer === node;
			const okMap =
				ts.isCallExpression(parent) &&
				parent.parent !== undefined &&
				isPromiseAll(parent.parent) &&
				promiseAllMap(parent.parent)?.mapper === node;
			const okRun = ts.isPropertyAssignment(parent) && propertyName(parent.name) === 'run';
			if (!okDecl && !okMap && !okRun) {
				report(
					node,
					'WL010',
					'An async mapper is allowed only in Promise.all(arr.map(async (x) => ...)).',
					'Use a for...of loop with await.',
				);
			}
			if (okMap && node.parameters.length > 1) {
				report(
					node,
					'WL010',
					'The async map mapper can take only one parameter.',
					'Remove the index parameter.',
				);
			}
		}
		if (ts.isIdentifier(node)) checkIdentifier(node);
		if (ts.isPropertyAccessExpression(node)) checkGlobalMember(node);
		ts.forEachChild(node, visit);
	};

	const checkPromiseAll = (call: ts.CallExpression): boolean => {
		const arg = call.arguments[0];
		if (call.arguments.length === 1 && arg && ts.isArrayLiteralExpression(arg)) {
			let ok = true;
			for (const el of arg.elements) {
				const e = skipOuter(el);
				if (!isEffectCall(checker, e) && !isAsyncCall(checker, e)) {
					report(
						el,
						'WL010',
						'A Promise.all element must be a ctx call or a call of a local async function.',
						'ctx.http({ name, method, url })',
					);
					ok = false;
				}
			}
			return ok;
		}
		if (call.arguments.length === 1 && promiseAllMap(call)) return true;
		report(
			call,
			'WL010',
			'Promise.all takes an array literal of calls or arr.map(async (x) => ...).',
			'await Promise.all(items.map(async (item) => ...))',
		);
		return false;
	};

	const checkIdentifier = (id: ts.Identifier) => {
		const parent = id.parent;
		// Skip names that are not value references.
		if (
			(ts.isPropertyAccessExpression(parent) && parent.name === id) ||
			(ts.isPropertyAssignment(parent) && parent.name === id) ||
			(ts.isMethodDeclaration(parent) && parent.name === id) ||
			(ts.isBindingElement(parent) && parent.propertyName === id) ||
			ts.isTypeReferenceNode(parent) ||
			ts.isQualifiedName(parent) ||
			ts.isImportSpecifier(parent) ||
			ts.isTypeAliasDeclaration(parent) ||
			ts.isInterfaceDeclaration(parent) ||
			ts.isPropertySignature(parent) ||
			ts.isTypeParameterDeclaration(parent) ||
			ts.isExpressionWithTypeArguments(parent) ||
			ts.isTypeQueryNode(parent)
		) {
			return;
		}
		if (isInTypeContext(id)) return;
		const text = id.text;
		const symbol = checker.getSymbolAtLocation(id);
		if (!isGlobalSymbol(symbol)) return;
		// `RegExp.exec(...)` is a library function (spec section 4.6); other uses of RegExp are not.
		if (
			text === 'RegExp' &&
			ts.isPropertyAccessExpression(parent) &&
			LIBRARY_FUNCTIONS.has(`RegExp.${parent.name.text}`)
		) {
			return;
		}
		const special = GLOBAL_CODES.get(text);
		if (special) {
			report(id, special[0], `\`${text}\` is not allowed.`, special[1]);
			return;
		}
		if (!ALLOWED_GLOBALS.has(text)) {
			report(
				id,
				'WL020',
				`\`${text}\` is not in the workflow library.`,
				'Use a function from spec section 4.3.',
			);
			return;
		}
		if (text === 'Promise') {
			const pa = parent;
			if (
				!(ts.isPropertyAccessExpression(pa) && pa.name.text === 'all' && isPromiseAll(pa.parent))
			) {
				report(id, 'WL010', 'Only Promise.all is allowed.', 'await Promise.all([...])');
			}
		}
	};

	const checkGlobalMember = (pa: ts.PropertyAccessExpression) => {
		if (!ts.isIdentifier(pa.expression)) return;
		const base = pa.expression.text;
		if (
			![
				'Math',
				'JSON',
				'Object',
				'Array',
				'Number',
				'String',
				'Promise',
				'RegExp',
				'XML',
				'Ascii',
				'Base64',
			].includes(base)
		)
			return;
		if (!isGlobalSymbol(checker.getSymbolAtLocation(pa.expression))) return;
		const full = `${base}.${pa.name.text}`;
		if (full === 'Promise.all') return;
		if (full === 'Math.random') {
			report(pa, 'WL011', '`Math.random` is not allowed.', 'Use ctx.random().');
			return;
		}
		if (LIBRARY_FUNCTIONS.has(full) || CONSTANTS.has(full)) {
			if (
				LIBRARY_FUNCTIONS.has(full) &&
				!(ts.isCallExpression(pa.parent) && pa.parent.expression === pa)
			) {
				report(pa, 'WL020', `\`${full}\` can only be called.`, `Wrap it: (x) => ${full}(x)`);
			}
			return;
		}
		report(
			pa,
			'WL020',
			`\`${full}\` is not in the workflow library.`,
			'Use a function from spec section 4.3.',
		);
	};

	const checkCallee = (call: ts.CallExpression) => {
		const callee = skipOuter(call.expression);
		if (ts.isIdentifier(callee)) {
			if (['Number', 'String', 'Boolean', 'parseInt', 'parseFloat', 'isNaN'].includes(callee.text))
				return;
			return;
		}
		if (!ts.isPropertyAccessExpression(callee) && !ts.isElementAccessExpression(callee)) return;
		if (ts.isElementAccessExpression(callee)) return;
		// Date methods and statics: checkDates owns their rules.
		if (dateStatic(checker, callee) !== null || isDateish(checker, callee.expression)) return;
		const name = callee.name.text;
		const recv = callee.expression;
		if (ctxCallMethod(checker, call)) return;
		if (isPromiseAll(call)) return;
		if (ts.isIdentifier(recv) && isGlobalSymbol(checker.getSymbolAtLocation(recv))) {
			const full = `${recv.text}.${name}`;
			if (full === 'Object.assign') {
				const first = call.arguments[0];
				if (!first || !ts.isObjectLiteralExpression(skipOuter(first))) {
					report(
						call,
						'WL020',
						'Object.assign must copy into a new object.',
						'Object.assign({}, a, b)',
					);
				}
			}
			return;
		}
		const propSymbol = checker.getSymbolAtLocation(callee.name);
		const fromLib = (propSymbol?.declarations ?? []).some(
			(d) => d.getSourceFile().fileName === LIB_FILE,
		);
		const userDefined =
			propSymbol !== undefined &&
			!fromLib &&
			(propSymbol.declarations ?? []).length > 0 &&
			(propSymbol.declarations ?? []).every((d) => d.getSourceFile().fileName !== SDK_FILE);
		if (userDefined) return;
		const recvType = checker.getTypeAtLocation(recv);
		const isString = (recvType.flags & ts.TypeFlags.StringLike) !== 0;
		const isNumber = (recvType.flags & ts.TypeFlags.NumberLike) !== 0;
		const isArray = checker.isArrayType(recvType) || checker.isTupleType(recvType);
		const known =
			STRING_METHODS.has(name) ||
			ARRAY_METHODS.has(name) ||
			NUMBER_METHODS.has(name) ||
			PRELUDE_METHODS.has(name);
		let allowed: boolean;
		if (isString) allowed = STRING_METHODS.has(name);
		else if (isNumber) allowed = NUMBER_METHODS.has(name);
		else if (isArray) allowed = ARRAY_METHODS.has(name) || PRELUDE_METHODS.has(name);
		else allowed = known && name !== 'toString';
		if (!allowed) {
			report(
				callee.name,
				'WL020',
				`The method \`${name}\` is not in the workflow library.`,
				'Use a method from spec section 4.4.',
			);
			return;
		}
		if (PRELUDE_METHODS.has(name)) {
			const max = name === 'reduce' ? 2 : 1;
			if (call.arguments.length > max) {
				report(
					call,
					'WL020',
					`\`${name}\` does not take a this argument.`,
					`Remove the extra argument of ${name}.`,
				);
			}
		}
	};

	ts.forEachChild(sf, visit);
	checkDates(checker, sf, report);
	return out;
}

function isAssignmentPattern(node: ts.Node): boolean {
	let p: ts.Node = node;
	while (
		ts.isArrayLiteralExpression(p.parent) ||
		ts.isObjectLiteralExpression(p.parent) ||
		ts.isPropertyAssignment(p.parent)
	) {
		p = p.parent;
	}
	return (
		ts.isBinaryExpression(p.parent) &&
		p.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
		p.parent.left === p
	);
}

function isInTypeContext(node: ts.Node): boolean {
	let p: ts.Node | undefined = node.parent;
	while (p) {
		if (ts.isTypeNode(p) && !ts.isExpressionWithTypeArguments(p)) return true;
		if (ts.isStatement(p) || ts.isExpression(p)) return false;
		p = p.parent;
	}
	return false;
}
