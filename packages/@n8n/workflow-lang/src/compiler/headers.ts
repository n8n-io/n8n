import ts from 'typescript';

/**
 * Proofs that code never reads headers, so the runtime can skip them:
 *
 * - `triggerHeadersUnread`: the workflow never reads `headers` of its
 *   trigger. The module meta then has `"triggerHeaders": false`, and the
 *   runtime decodes the webhook trigger with `headers: {}`.
 * - `httpHeadersUnread`: a library node never reads `headers` of the results
 *   of its `ctx.http` calls. Its steps then get the flag
 *   `result headers unread`, and the runtime gives `headers: {}`.
 * - `httpResultUnread`: one `ctx.http` call of the workflow, whose result is
 *   never read for `headers` or for `body`. Its step gets the flag
 *   `result headers unread` or `result body unread`. Without `body`, the
 *   runtime does not parse the response body.
 *
 * All are conservative: every use of the value must be a property read of
 * another name, or a destructuring pattern without that name and without a
 * rest element. Any other use (an alias, an argument, a return, an element
 * access, a spread) counts as a read.
 */

/** Strips parentheses, `await`, `as`, `!` and `satisfies` around an expression. */
function useSite(node: ts.Node): ts.Node {
	let n = node;
	while (
		n.parent &&
		(ts.isParenthesizedExpression(n.parent) ||
			ts.isAwaitExpression(n.parent) ||
			ts.isAsExpression(n.parent) ||
			ts.isNonNullExpression(n.parent) ||
			ts.isSatisfiesExpression(n.parent))
	) {
		n = n.parent;
	}
	return n;
}

/** True when a binding pattern takes no `member` and has no rest element. */
function patternSkipsHeaders(pattern: ts.ObjectBindingPattern, member = 'headers'): boolean {
	for (const el of pattern.elements) {
		if (el.dotDotDotToken) return false;
		const key = el.propertyName ?? el.name;
		if (ts.isIdentifier(key) || ts.isStringLiteral(key)) {
			if (key.text === member) return false;
		} else {
			// A computed key could name the member.
			return false;
		}
	}
	return true;
}

/** True when the value at `site` is used only as `site.<name>` with name other than `member`. */
function readsOnlyOtherMembers(site: ts.Node, member = 'headers'): boolean {
	const use = useSite(site);
	const parent = use.parent;
	return (
		parent !== undefined &&
		ts.isPropertyAccessExpression(parent) &&
		parent.expression === use &&
		parent.name.text !== member
	);
}

/** True when every reference to `symbol` inside `root` reads a member other than `member`. */
function symbolReadsOnlyOtherMembers(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
	root: ts.Node,
	declName: ts.Identifier,
	member = 'headers',
): boolean {
	let ok = true;
	const visit = (n: ts.Node) => {
		if (!ok) return;
		// A shorthand `{ trigger }` passes the whole value on; the checker gives
		// its property symbol, so it is matched by its value symbol.
		if (
			ts.isShorthandPropertyAssignment(n) &&
			checker.getShorthandAssignmentValueSymbol(n) === symbol
		) {
			ok = false;
			return;
		}
		if (ts.isIdentifier(n) && n !== declName && checker.getSymbolAtLocation(n) === symbol) {
			if (!readsOnlyOtherMembers(n, member)) ok = false;
			return;
		}
		ts.forEachChild(n, visit);
	};
	visit(root);
	return ok;
}

/** True when the workflow never reads `headers` of its trigger (the second parameter of `run`). */
export function triggerHeadersUnread(
	checker: ts.TypeChecker,
	run: ts.FunctionLikeDeclaration,
): boolean {
	const param = run.parameters[1];
	if (!param) return true;
	if (!run.body) return true;
	if (ts.isObjectBindingPattern(param.name)) return patternSkipsHeaders(param.name);
	if (!ts.isIdentifier(param.name)) return false;
	const symbol = checker.getSymbolAtLocation(param.name);
	if (!symbol) return false;
	return symbolReadsOnlyOtherMembers(checker, symbol, run.body, param.name);
}

/** True for a `<x>.http(...)` call whose receiver is a library node context. */
function isNodeHttpCall(checker: ts.TypeChecker, call: ts.CallExpression): boolean {
	const callee = call.expression;
	if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'http') return false;
	const type = checker.getTypeAtLocation(callee.expression);
	return checker.typeToString(type) === 'NodeCtx';
}

/**
 * True when no `ctx.http` result in the library node file `file` can have its
 * `headers` read: each result is read only through other members, directly
 * or through a `const` binding.
 */
export function httpHeadersUnread(checker: ts.TypeChecker, file: ts.SourceFile): boolean {
	let ok = true;
	const visit = (n: ts.Node) => {
		if (!ok) return;
		if (ts.isCallExpression(n) && isNodeHttpCall(checker, n)) {
			ok = httpResultSafe(checker, file, n);
			if (!ok) return;
		}
		ts.forEachChild(n, visit);
	};
	visit(file);
	return ok;
}

function httpResultSafe(
	checker: ts.TypeChecker,
	file: ts.SourceFile,
	call: ts.CallExpression,
	member = 'headers',
): boolean {
	if (readsOnlyOtherMembers(call, member)) return true;
	const use = useSite(call);
	const decl = use.parent;
	if (!decl || !ts.isVariableDeclaration(decl) || decl.initializer !== use) return false;
	// A `let` could be assigned another response, or passed on later: only `const`.
	const list = decl.parent;
	if (!ts.isVariableDeclarationList(list) || (list.flags & ts.NodeFlags.Const) === 0) return false;
	if (ts.isObjectBindingPattern(decl.name)) return patternSkipsHeaders(decl.name, member);
	if (!ts.isIdentifier(decl.name)) return false;
	const symbol = checker.getSymbolAtLocation(decl.name);
	if (!symbol) return false;
	return symbolReadsOnlyOtherMembers(checker, symbol, file, decl.name, member);
}

/**
 * Which members of the result of one workflow `ctx.http` call no code can
 * read. The result is read only through other members, directly or through
 * a `const` binding, in the call's own source file.
 */
export function httpResultUnread(
	checker: ts.TypeChecker,
	call: ts.CallExpression,
): { headers: boolean; body: boolean } {
	const file = call.getSourceFile();
	return {
		headers: httpResultSafe(checker, file, call, 'headers'),
		body: httpResultSafe(checker, file, call, 'body'),
	};
}
