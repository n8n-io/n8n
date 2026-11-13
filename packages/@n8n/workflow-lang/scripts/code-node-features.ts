/**
 * Classifies the JavaScript of a Code node by the features that it uses, for
 * `scripts/code-node-coverage.ts`. The classification reads the syntax tree
 * only: it does not run or compile the code.
 */
import ts from 'typescript';

/** Feature groups, for the tables. */
export const FEATURE_GROUPS: Record<string, string[]> = {
	'n8n globals': [
		'$input.all()',
		'$input.first()',
		'$input.last()',
		'$input.item',
		'$json',
		'items',
		'item',
		"$('Node')",
		'$node',
		'$items()',
		'$itemIndex',
		'$now / $today',
		'DateTime / Luxon',
		'$jmespath',
		'$env',
		'$vars',
		'$execution',
		'$workflow',
		'$getWorkflowStaticData',
		'this (this.helpers)',
		'binary data',
		'$runIndex / $prevNode',
	],
	'JavaScript features': [
		'require',
		'regular expression',
		'async / await',
		'Promise',
		'class',
		'generator',
		'getter / setter',
		'prototype',
		'new Date()',
		'Date.now()',
		'Math',
		'Math.random()',
		'JSON',
		'crypto',
		'Buffer',
		'fetch',
		'console',
		'var',
		'== / != (not null)',
		'instanceof',
		'Set / Map',
		'Object.fromEntries',
		'Array.from',
		'toLocaleString / Intl',
		'encodeURIComponent',
		'spread (...)',
		'destructuring',
		'template literal',
		'optional chaining (?.)',
		'arrow function',
		'.toString()',
	],
	'Control flow': [
		'for loop',
		'for...of',
		'for...in',
		'while / do',
		'try / catch',
		'catch reads the error',
		'label',
		'switch',
		'throw',
	],
};

function stringArg(call: ts.CallExpression): boolean {
	const a = call.arguments[0];
	return a !== undefined && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a));
}

/** The features of the code, and the names of the methods it calls. */
export function features(code: string): { features: Set<string>; methods: Set<string> } {
	const out = new Set<string>();
	const methods = new Set<string>();
	const sf = ts.createSourceFile(
		'/c.js',
		`async function __f() {\n${code}\n}`,
		ts.ScriptTarget.ES2022,
		true,
		ts.ScriptKind.JS,
	);
	const declared = new Set<string>();
	const collect = (n: ts.Node): void => {
		if (
			(ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isFunctionDeclaration(n)) &&
			n.name &&
			ts.isIdentifier(n.name)
		) {
			declared.add(n.name.text);
		}
		ts.forEachChild(n, collect);
	};
	collect(sf);
	const add = (f: string) => out.add(f);
	const visit = (n: ts.Node): void => {
		switch (n.kind) {
			case ts.SyntaxKind.RegularExpressionLiteral:
				add('regular expression');
				break;
			case ts.SyntaxKind.ClassDeclaration:
			case ts.SyntaxKind.ClassExpression:
				add('class');
				break;
			case ts.SyntaxKind.ThisKeyword:
				add('this (this.helpers)');
				break;
			case ts.SyntaxKind.GetAccessor:
			case ts.SyntaxKind.SetAccessor:
				add('getter / setter');
				break;
			case ts.SyntaxKind.YieldExpression:
				add('generator');
				break;
			case ts.SyntaxKind.AwaitExpression:
				add('async / await');
				break;
			case ts.SyntaxKind.LabeledStatement:
				add('label');
				break;
			case ts.SyntaxKind.ForStatement:
				add('for loop');
				break;
			case ts.SyntaxKind.ForOfStatement:
				add('for...of');
				break;
			case ts.SyntaxKind.ForInStatement:
				add('for...in');
				break;
			case ts.SyntaxKind.WhileStatement:
			case ts.SyntaxKind.DoStatement:
				add('while / do');
				break;
			case ts.SyntaxKind.TryStatement:
				add('try / catch');
				break;
			case ts.SyntaxKind.SwitchStatement:
				add('switch');
				break;
			case ts.SyntaxKind.ThrowStatement:
				add('throw');
				break;
			case ts.SyntaxKind.SpreadElement:
			case ts.SyntaxKind.SpreadAssignment:
				add('spread (...)');
				break;
			case ts.SyntaxKind.ObjectBindingPattern:
			case ts.SyntaxKind.ArrayBindingPattern:
				add('destructuring');
				break;
			case ts.SyntaxKind.TemplateExpression:
				add('template literal');
				break;
			case ts.SyntaxKind.ArrowFunction:
				add('arrow function');
				break;
			default:
				break;
		}
		if (ts.isFunctionLike(n) && 'asteriskToken' in n && n.asteriskToken) add('generator');
		if (
			ts.isCatchClause(n) &&
			n.variableDeclaration &&
			ts.isIdentifier(n.variableDeclaration.name)
		) {
			const name = n.variableDeclaration.name.text;
			let used = false;
			const find = (m: ts.Node): void => {
				if (ts.isIdentifier(m) && m.text === name && m !== n.variableDeclaration?.name) used = true;
				if (!used) ts.forEachChild(m, find);
			};
			find(n.block);
			if (used) add('catch reads the error');
		}
		if (ts.isPropertyAccessExpression(n) && n.questionDotToken) add('optional chaining (?.)');
		if (ts.isCallExpression(n) && n.questionDotToken) add('optional chaining (?.)');
		if (ts.isVariableDeclarationList(n) && (n.flags & ts.NodeFlags.BlockScoped) === 0) add('var');
		if (ts.isBinaryExpression(n)) {
			const op = n.operatorToken.kind;
			if (op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken) {
				const nullish = (e: ts.Expression) =>
					e.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined');
				if (!nullish(n.left) && !nullish(n.right)) add('== / != (not null)');
			}
			if (op === ts.SyntaxKind.InstanceOfKeyword) add('instanceof');
		}
		if (ts.isNewExpression(n) && ts.isIdentifier(n.expression)) {
			const c = n.expression.text;
			if (c === 'Date') add('new Date()');
			if (c === 'RegExp') add('regular expression');
			if (c === 'Set' || c === 'Map') add('Set / Map');
			if (c === 'Promise') add('Promise');
		}
		if (ts.isPropertyAccessExpression(n)) {
			const name = n.name.text;
			if (name === 'prototype' || name === '__proto__') add('prototype');
			if (name === 'binary' || name === 'getBinaryDataBuffer' || name === 'prepareBinaryData')
				add('binary data');
			if (ts.isCallExpression(n.parent) && n.parent.expression === n) {
				const recv = n.expression;
				if (ts.isIdentifier(recv) && !declared.has(recv.text)) {
					const g = recv.text;
					if (g === 'Object' && name === 'fromEntries') add('Object.fromEntries');
					if (g === 'Array' && name === 'from') add('Array.from');
					if (g === 'Date' && name === 'now') add('Date.now()');
					if (g === 'Math' && name === 'random') add('Math.random()');
					if (g === 'Promise') add('Promise');
					if (g === 'console') add('console');
					if (
						['Math', 'JSON', 'Object', 'Array', 'Number', 'String', 'Date', 'console'].includes(g)
					)
						methods.add(`${g}.${name}`);
					else methods.add(`.${name}`);
				} else {
					methods.add(`.${name}`);
				}
				if (name === 'toString') add('.toString()');
				if (
					name === 'toLocaleString' ||
					name === 'toLocaleDateString' ||
					name === 'toLocaleTimeString'
				)
					add('toLocaleString / Intl');
				if (name === 'then') add('Promise');
			}
		}
		if (ts.isIdentifier(n) && !declared.has(n.text)) {
			const p = n.parent;
			const isName =
				(ts.isPropertyAccessExpression(p) && p.name === n) ||
				(ts.isPropertyAssignment(p) && p.name === n);
			if (!isName) {
				switch (n.text) {
					case '$input': {
						const m = ts.isPropertyAccessExpression(p) ? p.name.text : '';
						if (m === 'all') add('$input.all()');
						else if (m === 'first') add('$input.first()');
						else if (m === 'last') add('$input.last()');
						else if (m === 'item') add('$input.item');
						break;
					}
					case '$json':
						add('$json');
						break;
					case 'items':
						add('items');
						break;
					case 'item':
						add('item');
						break;
					case '$':
						if (ts.isCallExpression(p) && stringArg(p)) add("$('Node')");
						else add("$('Node')");
						break;
					case '$node':
						add('$node');
						break;
					case '$items':
						add('$items()');
						break;
					case '$itemIndex':
						add('$itemIndex');
						break;
					case '$now':
					case '$today':
						add('$now / $today');
						break;
					case 'DateTime':
					case 'Duration':
					case 'Interval':
						add('DateTime / Luxon');
						break;
					case '$jmespath':
						add('$jmespath');
						break;
					case '$env':
						add('$env');
						break;
					case '$vars':
						add('$vars');
						break;
					case '$execution':
						add('$execution');
						break;
					case '$workflow':
						add('$workflow');
						break;
					case '$getWorkflowStaticData':
						add('$getWorkflowStaticData');
						break;
					case '$binary':
						add('binary data');
						break;
					case '$runIndex':
					case '$prevNode':
						add('$runIndex / $prevNode');
						break;
					case 'require':
						add('require');
						break;
					case 'Buffer':
						add('Buffer');
						break;
					case 'crypto':
						add('crypto');
						break;
					case 'fetch':
						add('fetch');
						break;
					case 'Math':
						add('Math');
						break;
					case 'JSON':
						add('JSON');
						break;
					case 'Intl':
						add('toLocaleString / Intl');
						break;
					case 'encodeURIComponent':
					case 'decodeURIComponent':
					case 'encodeURI':
						add('encodeURIComponent');
						break;
					case 'Set':
					case 'Map':
						add('Set / Map');
						break;
					case 'Promise':
						add('Promise');
						break;
					default:
						break;
				}
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
	return { features: out, methods };
}
