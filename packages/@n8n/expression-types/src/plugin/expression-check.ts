// The n8n expressions of a source file for the language service: TypeScript 6 finds the spans,
// `check` builds the shadow and decides what counts. An expression is a `'={{ … }}'` literal in a
// field that also takes a function or whose type the call infers from its value, or a call with
// one `'{{ … }}'` literal in such a field (e.g. `expr()`). The check knows no flow SDK API: the
// field's own type says that it takes an expression.
import type ts from 'typescript';

import {
	EXPRESSION_BRAND,
	findingOf,
	resultMismatchMessage,
	SANDBOX_RULE,
	sandboxRuleIssues,
	type ExpressionScope,
	type ExpressionSpan,
	type Shadow,
} from '../check';
import { codeScopeGlobals, itemScopeGlobals } from '../globals';

type Ts = typeof ts;

const SOURCE = 'n8n-expression';

/** `$json` is the first parameter of the field's function. Other node data stays loose. */
export const itemScope = (typesEntry: string): ExpressionScope => ({
	globals: { item: itemScopeGlobals, code: codeScopeGlobals },
	trailer: `import type { NodeParameterContext as __N8nContext } from '${typesEntry}';
declare function __n8nExpression<A extends unknown[], T>(args: A, body: (scope: __N8nContext<{ input: { json: A[0] } }>) => T): T;
`,
});

/**
 * A field takes an expression when its contextual type has a call signature, or when the call
 * infers the field's type from its value: a call there returns a branded value, or a literal is
 * a property of an object whose type the call infers from that object.
 */
function takesExpression(typescript: Ts, checker: ts.TypeChecker, node: ts.Expression): boolean {
	const contextual = checker.getContextualType(node);
	if (!contextual) return false;
	const parts = contextual.isUnion() ? contextual.types : [contextual];
	if (
		parts.some(
			(part) => checker.getSignaturesOfType(part, typescript.SignatureKind.Call).length > 0,
		)
	) {
		return true;
	}
	if (typescript.isCallExpression(node)) {
		return checker.getPropertyOfType(contextual, EXPRESSION_BRAND) !== undefined;
	}
	const { parent } = node;
	if (!typescript.isPropertyAssignment(parent)) return false;
	const symbol = checker.getContextualType(parent.parent)?.getSymbol();
	return symbol !== undefined && (symbol.flags & typescript.SymbolFlags.ObjectLiteral) !== 0;
}

/** The expressions of a file in fields that take an expression. */
export function expressionSpans(
	typescript: Ts,
	source: ts.SourceFile,
	checker: ts.TypeChecker,
): ExpressionSpan[] {
	if (!source.text.includes('{{')) return [];
	const spans: ExpressionSpan[] = [];
	const spanOf = (node: ts.Expression, literal: ts.StringLiteralLike): ExpressionSpan => {
		const { parent } = node;
		const named = typescript.isPropertyAssignment(parent) && parent.initializer === node;
		return {
			start: node.getStart(source),
			end: node.end,
			literalStart: literal.getStart(source),
			literalEnd: literal.end,
			text: literal.text,
			...(named ? { propertyName: parent.name.getStart(source) } : {}),
		};
	};
	const visit = (node: ts.Node): void => {
		if (typescript.isStringLiteralLike(node) && node.text.includes('{{')) {
			const { parent } = node;
			if (node.text.startsWith('=') && takesExpression(typescript, checker, node)) {
				spans.push(spanOf(node, node));
				return;
			}
			if (
				typescript.isCallExpression(parent) &&
				parent.arguments.length === 1 &&
				parent.arguments[0] === node &&
				takesExpression(typescript, checker, parent)
			) {
				spans.push(spanOf(parent, node));
				return;
			}
		}
		typescript.forEachChild(node, visit);
	};
	typescript.forEachChild(source, visit);
	return spans;
}

/** The deepest messages of a diagnostic chain. */
const reasonsOf = (message: string | ts.DiagnosticMessageChain): string[] =>
	typeof message === 'string'
		? [message]
		: message.next?.length
			? message.next.flatMap(reasonsOf)
			: [message.messageText];

/**
 * The errors of the shadow file that belong to an expression, at their place in the source, and
 * the sandbox rule errors. An error in the trailer means the check cannot run: it shows once, at
 * the file start.
 */
export function expressionDiagnostics(
	typescript: Ts,
	source: ts.SourceFile,
	shadow: Shadow,
	shadowSource: ts.SourceFile,
	diagnostics: readonly ts.Diagnostic[],
): ts.Diagnostic[] {
	const typeErrors = diagnostics.flatMap((diagnostic): ts.Diagnostic[] => {
		const pos = diagnostic.start ?? -1;
		// Related places in the checked file have shadow offsets.
		const relatedInformation = diagnostic.relatedInformation?.filter(
			(related) => related.file?.fileName !== source.fileName,
		);
		const base = { ...diagnostic, file: source, source: SOURCE, relatedInformation };
		if (pos >= shadow.trailerStart) return [{ ...base, start: 0, length: 0 }];
		const found = findingOf(shadow, { pos, code: diagnostic.code }, new Set());
		if (!found) return [];
		const { start, inBody, replacement } = found;
		return [
			inBody
				? { ...base, start, length: Math.max(1, diagnostic.length ?? 1) }
				: {
						...base,
						start,
						length: replacement.span.end - start,
						messageText: resultMismatchMessage(reasonsOf(diagnostic.messageText)),
					},
		];
	});
	const ruleErrors = sandboxRuleIssues<ts.Node>(typescript, shadowSource, shadow).map(
		({ start, message }): ts.Diagnostic => ({
			category: typescript.DiagnosticCategory.Error,
			code: 0,
			file: source,
			start,
			length: 1,
			messageText: `${SANDBOX_RULE}: ${message}`,
			source: SOURCE,
		}),
	);
	return [...typeErrors, ...ruleErrors];
}
