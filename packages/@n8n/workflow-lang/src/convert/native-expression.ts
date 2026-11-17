/**
 * The second form of a parameter expression: when the compiler rejects the plain form of an
 * expression (a regular expression, `==`, `toString`, `var`, a Set), the translator of
 * native Code nodes (`code-native/translate.ts`) rewrites the constructs that the subset does
 * not have to its helpers, which copy JavaScript.
 *
 * The input is the code that `translateBody` made: the n8n variables are plain variables of
 * the generated source already. The pass does not read an expression that calls a method
 * with the name of an n8n expression extension: v1 calls the extension there, not the
 * JavaScript method.
 */
import ts from 'typescript';

import { MATCHES, translateCode } from './code-native/translate.ts';
import { EXTENSION_HELPER_NAMES } from './extension-helpers.ts';

export type NativeExpression =
	| { ok: true; code: string; helpers: string[]; zones: string[] }
	| { ok: false; blockers: string[] };

/** The names of the expression extensions of n8n (`packages/workflow/src/extensions`). */
export const EXTENSION_METHODS = new Set(
	(
		'hash removeMarkdown removeTags toDate toDateTime toBoolean toDecimalNumber toNumber toFloat toInt ' +
		'toWholeNumber toSentenceCase toSnakeCase toTitleCase urlDecode urlEncode quote replaceSpecialChars ' +
		'length isDomain isEmail isNumeric isUrl isEmpty isNotEmpty toJsonString extractEmail extractDomain ' +
		'extractUrl extractUrlPath parseJson base64Encode base64Decode removeDuplicates unique first last ' +
		'reverse pluck randomItem sum min max average compact smartJoin chunk renameKeys merge ' +
		'mergeIntoObject union difference intersection append ceil floor format round abs isInteger isEven ' +
		'isOdd hasField removeField removeFieldsContaining keepFieldsContaining keys values beginningOf ' +
		'endOfMonth extract isBetween isDst isInLast isWeekend minus plus diffTo diffToNow'
	).split(' '),
);

/** Global objects whose methods v1 calls as they are: no extension has their type. */
const PLAIN_RECEIVERS = new Set(['Math', 'Object', 'JSON', 'Number', 'String', 'Array', 'Date']);

function identifiers(code: string): {
	names: Set<string>;
	/** Names that the code calls as functions. */
	called: Set<string>;
	extension: string | null;
	regexValue: boolean;
} {
	const sf = ts.createSourceFile('e.ts', `(${code}\n)`, ts.ScriptTarget.ES2022, true);
	const names = new Set<string>();
	const called = new Set<string>();
	let extension: string | null = null;
	const visit = (n: ts.Node): void => {
		if (ts.isIdentifier(n)) {
			const p = n.parent;
			const named =
				(ts.isPropertyAccessExpression(p) && p.name === n) ||
				(ts.isPropertyAssignment(p) && p.name === n);
			if (!named) names.add(n.text);
		}
		if (ts.isCallExpression(n)) {
			const callee = n.expression;
			if (ts.isIdentifier(callee)) called.add(callee.text);
			const name = ts.isPropertyAccessExpression(callee)
				? callee.name.text
				: ts.isElementAccessExpression(callee) && ts.isStringLiteral(callee.argumentExpression)
					? callee.argumentExpression.text
					: null;
			const receiver =
				ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)
					? callee.expression
					: null;
			const plain =
				receiver !== null && ts.isIdentifier(receiver) && PLAIN_RECEIVERS.has(receiver.text);
			if (name !== null && EXTENSION_METHODS.has(name) && !plain) extension ??= name;
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
	// The value of the expression itself must not be a regular expression: the native value
	// is a plain object.
	const isRegex = (e: ts.Expression): boolean => {
		if (ts.isParenthesizedExpression(e)) return isRegex(e.expression);
		if (e.kind === ts.SyntaxKind.RegularExpressionLiteral) return true;
		if (ts.isNewExpression(e))
			return ts.isIdentifier(e.expression) && e.expression.text === 'RegExp';
		if (ts.isConditionalExpression(e)) return isRegex(e.whenTrue) || isRegex(e.whenFalse);
		if (
			ts.isBinaryExpression(e) &&
			[
				ts.SyntaxKind.BarBarToken,
				ts.SyntaxKind.AmpersandAmpersandToken,
				ts.SyntaxKind.QuestionQuestionToken,
				ts.SyntaxKind.CommaToken,
			].includes(e.operatorToken.kind)
		) {
			return isRegex(e.left) || isRegex(e.right);
		}
		return false;
	};
	const st = sf.statements[0];
	const regexValue = st !== undefined && ts.isExpressionStatement(st) && isRegex(st.expression);
	return { names, called, extension, regexValue };
}

/**
 * The native form of translated expression code. `original` is the text of the v1
 * expression: a variable of the code that the v1 text does not have is a variable of the
 * generated source.
 */
export function nativeExpression(
	code: string,
	original: string,
	timezone: string | undefined,
): NativeExpression {
	const translated = identifiers(code);
	if (translated.extension !== null) {
		return { ok: false, blockers: [`extension .${translated.extension}()`] };
	}
	if (translated.regexValue) return { ok: false, blockers: ['regular expression as a value'] };
	let own: Set<string>;
	try {
		own = identifiers(original).names;
	} catch {
		return { ok: false, blockers: ['syntax'] };
	}
	const globals = new Set(['$json']);
	for (const name of translated.names) if (!own.has(name)) globals.add(name);
	// The guard of the native form gives null for every error, as v1 does for an error of the
	// JavaScript. An error of the engine (a paired item that is not there) must stop the node,
	// so code that calls a function of the generated source other than a Luxon helper has no
	// native form. The error of an extension helper passes the guard, and `jsonOf` and `fromAi`
	// have no error.
	for (const name of translated.called) {
		const safe =
			name.startsWith('lux') ||
			name === 'jsonOf' ||
			name === 'fromAi' ||
			EXTENSION_HELPER_NAMES.has(name);
		if (globals.has(name) && !safe) {
			return { ok: false, blockers: [`call of ${name}`] };
		}
	}
	const result = translateCode({
		code: `return (${code}\n);`,
		mode: 'all',
		kind: 'code',
		hasNode: () => false,
		expression: { globals },
		timezone,
	});
	if (!result.ok) return { ok: false, blockers: result.blockers.map((b) => b.feature) };
	const t = result.translation;
	// The items of the node and of other nodes are variables already; code that would read
	// them in another way, or that makes requests, is not an expression that `translateBody` made.
	if (t.nodes.length > 0 || t.usesAllNodes || t.usesFirstJson || t.usesHttp) {
		return { ok: false, blockers: ['items'] };
	}
	// An expression can change the item that it reads. The plain form does the same, and the
	// helpers of this form copy JavaScript, so the change is the change of v1.
	const helpers = [...t.helpers];
	const simple = /^return \(([\s\S]*)\n\);$/.exec(t.body);
	let value: string;
	if (simple && !t.usesMatchProps) {
		value = `(${simple[1]})`;
	} else {
		// Hoisted `var` names and the registry of matches are statements before the value.
		const registry = t.usesMatchProps ? `const ${MATCHES}: Json[] = [];\n` : '';
		value = `((): Json => {\n${registry}${t.body}\n})()`;
	}
	// A Set or a Map in the value is `{}` in the JSON of an item, as JSON.stringify writes it.
	if (t.usesCollections) {
		helpers.push('collPlain');
		value = `collPlain(${value})`;
	}
	return { ok: true, code: value, helpers, zones: [...t.zones] };
}
