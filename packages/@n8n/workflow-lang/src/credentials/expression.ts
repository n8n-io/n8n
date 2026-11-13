/**
 * Converts the n8n expressions of a credential type's `authenticate` property
 * to the template form of spec section 7: literal text with
 * `{{$credentials.<path>}}` parts.
 */
import ts from 'typescript';

/** True when the code has a syntax error. */
function hasSyntaxErrors(code: string): boolean {
	const { diagnostics } = ts.transpileModule(code, { reportDiagnostics: true });
	return (diagnostics ?? []).length > 0;
}

export type TemplateResult = { ok: true; template: string } | { ok: false; reason: string };

/** One part of a template: literal text or a credential data path. */
type Part = { text: string } | { path: string[] };

const PATH_SEGMENT = /^[A-Za-z_][A-Za-z0-9_-]*$/;

class Unsupported extends Error {}

function render(parts: Part[]): string {
	return parts
		.map((part) => ('text' in part ? part.text : `{{$credentials.${part.path.join('.')}}}`))
		.join('');
}

/** Reads `$credentials.a.b`, `$credentials?.a` and `$credentials["a"]`. */
function credentialPath(node: ts.Expression): string[] | null {
	const path: string[] = [];
	let current: ts.Expression = node;
	for (;;) {
		if (ts.isPropertyAccessExpression(current)) {
			path.unshift(current.name.text);
			current = current.expression;
		} else if (
			ts.isElementAccessExpression(current) &&
			(ts.isStringLiteral(current.argumentExpression) ||
				ts.isNoSubstitutionTemplateLiteral(current.argumentExpression))
		) {
			path.unshift(current.argumentExpression.text);
			current = current.expression;
		} else if (ts.isParenthesizedExpression(current)) {
			current = current.expression;
		} else {
			break;
		}
	}
	if (!ts.isIdentifier(current) || current.text !== '$credentials' || path.length === 0) {
		return null;
	}
	for (const segment of path) {
		if (!PATH_SEGMENT.test(segment)) {
			throw new Unsupported(`the credential field "${segment}" is not a plain name`);
		}
	}
	return path;
}

function isStringish(parts: Part[]): boolean {
	return parts.some((part) => 'text' in part);
}

function convertNode(node: ts.Expression): Part[] {
	if (ts.isParenthesizedExpression(node)) return convertNode(node.expression);
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return [{ text: node.text }];
	}
	if (ts.isNumericLiteral(node)) return [{ text: String(Number(node.text)) }];
	if (ts.isTemplateExpression(node)) {
		const parts: Part[] = [{ text: node.head.text }];
		for (const span of node.templateSpans) {
			parts.push(...convertNode(span.expression), { text: span.literal.text });
		}
		return parts;
	}
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		const left = convertNode(node.left);
		const right = convertNode(node.right);
		// `+` concatenates only when one side is text. Two credential fields could be numbers.
		if (!isStringish(left) && !isStringish(right)) {
			throw new Unsupported('"+" between two credential fields');
		}
		return [...left, ...right];
	}
	const path = credentialPath(node);
	if (path) return [{ path }];
	throw new Unsupported(`the expression "${node.getText()}" is not a credential field`);
}

/** Converts one `{{ ... }}` expression body. */
function convertExpression(code: string): Part[] {
	const sf = ts.createSourceFile('expression.ts', `(${code});`, ts.ScriptTarget.ES2022, true);
	const statement = sf.statements[0];
	if (
		sf.statements.length !== 1 ||
		!statement ||
		!ts.isExpressionStatement(statement) ||
		hasSyntaxErrors(sf.text)
	) {
		throw new Unsupported(`cannot parse the expression "${code.trim()}"`);
	}
	return convertNode(statement.expression);
}

/** Splits an n8n template body (`Bearer {{ $credentials.x }}`) into parts. */
function convertTemplate(body: string): Part[] {
	const parts: Part[] = [];
	let rest = body;
	while (rest.length > 0) {
		const start = rest.indexOf('{{');
		if (start < 0) {
			parts.push({ text: rest });
			break;
		}
		if (start > 0) parts.push({ text: rest.slice(0, start) });
		const end = rest.indexOf('}}', start + 2);
		if (end < 0) throw new Unsupported('an expression has no closing "}}"');
		parts.push(...convertExpression(rest.slice(start + 2, end)));
		rest = rest.slice(end + 2);
	}
	return parts;
}

/**
 * Converts a value of `authenticate.properties` to a template. A value without
 * a leading `=` is literal text. Numbers and booleans become their text.
 */
export function toTemplate(value: unknown): TemplateResult {
	if (typeof value === 'number' || typeof value === 'boolean') {
		return { ok: true, template: String(value) };
	}
	if (typeof value !== 'string') {
		return { ok: false, reason: `the value ${JSON.stringify(value)} is not text` };
	}
	if (!value.startsWith('=')) return { ok: true, template: value };
	try {
		const parts = convertTemplate(value.slice(1));
		return { ok: true, template: render(parts) };
	} catch (error) {
		if (error instanceof Unsupported) return { ok: false, reason: error.message };
		throw error;
	}
}

const TEMPLATE_PART = /\{\{\$credentials\.([A-Za-z0-9_.-]+)\}\}/g;

/**
 * Replaces the templates of `template` with values of `data`, as the runtime
 * does (spec section 7). It returns `undefined` when a path has no value.
 */
export function fillTemplate(template: string, data: Record<string, unknown>): string | undefined {
	let missing = false;
	const out = template.replace(TEMPLATE_PART, (_match, path: string) => {
		let value: unknown = data;
		for (const segment of path.split('.')) {
			value = typeof value === 'object' && value !== null ? Reflect.get(value, segment) : undefined;
		}
		if (value === undefined || value === null) {
			missing = true;
			return '';
		}
		return typeof value === 'string' ? value : JSON.stringify(value);
	});
	return missing ? undefined : out;
}

/** Tells whether a template has a `{{$credentials...}}` part. */
export function hasTemplatePart(template: string): boolean {
	return new RegExp(TEMPLATE_PART.source).test(template);
}
