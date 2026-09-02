import { ASTUtils, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'escapeQueryValue';
type Options = [];

/** A template literal reaching one of these is treated as a query being assembled. */
const QUERY_SINKS = new Set([
	'$filter',
	'$search',
	'filter',
	'jql',
	'q',
	'query',
	'sql',
	'sysparm_query',
	'where',
]);

/** Names of arrays whose entries are joined into a query. */
const QUERY_PART_SINKS = new Set(['conditions', 'filterString', 'filters', 'query']);

/**
 * The sanctioned escapers, by name. A prefix pattern such as `/^escape/` would
 * accept any similarly named function, including one for a different query
 * language or one that escapes identifiers rather than values — so a new dialect
 * helper has to be added here deliberately.
 *
 * `encodeURI`/`encodeURIComponent` are absent on purpose: neither encodes a
 * quote, so neither keeps a value inside its literal.
 */
const ESCAPERS = new Set([
	'escapeBackslashQuotedValue',
	'escapeCognitoFilterValue',
	'escapeSgqlLikeValue',
	'escapeFilterValue',
	'escapeODataSearchValue',
	'escapeODataValue',
	'escapeSoqlString',
	'escapeSqlString',
]);

// Deliberately absent: `escapeSqlIdentifier`, which escapes a backtick. That
// makes a value safe as an identifier, not inside a quoted string literal.

/** How far to follow `const` bindings back to their initialiser. */
const MAX_BINDING_DEPTH = 5;

function calleeName(callee: TSESTree.Expression): string | undefined {
	if (callee.type === 'Identifier') return callee.name;
	if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
		return callee.property.name;
	}
	return undefined;
}

type OpenLiteral = "'" | '"' | null;

/**
 * Counting each quote character independently would be wrong: query languages
 * use both (OData `$filter` quotes with `'`, `$search` with `"`), and a `'`
 * inside a `"…"` literal is data, not a delimiter.
 *
 * Reads the cooked text, because that is what the query language receives — a
 * `\'` written in the template source is a plain quote by then, and a backslash
 * the query language itself should treat as an escape is written `\\'`.
 */
function scanLiteral(text: string, open: OpenLiteral): OpenLiteral {
	for (let i = 0; i < text.length; i++) {
		const char = text[i];

		if (open !== null && char === '\\') {
			i++; // an escaped character cannot close the literal
		} else if (open === null) {
			if (char === "'" || char === '"') open = char;
		} else if (char === open) {
			open = null;
		}
	}

	return open;
}

function isNeutralised(
	node: TSESTree.Node,
	getScope: (
		node: TSESTree.Node,
	) => ReturnType<RuleContext<MessageIds, Options>['sourceCode']['getScope']>,
	depth = 0,
): boolean {
	// Report rather than pass when the chain gets too long to follow: an unread
	// value is not a safe one.
	if (depth >= MAX_BINDING_DEPTH) return false;

	switch (node.type) {
		// A literal written in source contributes no runtime value.
		case 'Literal':
			return true;

		case 'CallExpression': {
			const name = calleeName(node.callee as TSESTree.Expression);
			if (name === undefined || !ESCAPERS.has(name)) return false;

			// Only a bare call to the imported helper counts. A member access such as
			// `helpers.escapeODataValue(x)` carries an approved name but proves nothing
			// about what it calls, so it is not accepted.
			if (node.callee.type !== 'Identifier') return false;

			const variable = ASTUtils.findVariable(getScope(node.callee), node.callee.name);
			return variable?.defs.some((definition) => definition.type === 'ImportBinding') ?? false;
		}

		// Assumed fixed at build time. Proving it would need cross-file analysis, so
		// an import initialised from a runtime call is accepted here — same
		// assumption as no-dynamic-regexp.
		case 'MemberExpression':
			return !node.computed && isNeutralised(node.object, getScope, depth + 1);

		case 'Identifier': {
			const variable = ASTUtils.findVariable(getScope(node), node.name);
			if (!variable || variable.defs.length !== 1) return false;

			const [definition] = variable.defs;
			if (definition.type === 'ImportBinding') return true;
			if (definition.type !== 'Variable' || definition.parent.kind !== 'const') return false;

			const init = definition.node.type === 'VariableDeclarator' ? definition.node.init : null;
			return init !== null && isNeutralised(init, getScope, depth + 1);
		}

		case 'ConditionalExpression':
			return (
				isNeutralised(node.consequent, getScope, depth + 1) &&
				isNeutralised(node.alternate, getScope, depth + 1)
			);

		case 'LogicalExpression':
			return (
				isNeutralised(node.left, getScope, depth + 1) &&
				isNeutralised(node.right, getScope, depth + 1)
			);

		// TypeScript-only wrappers that do not change the runtime value.
		case 'TSAsExpression':
		case 'TSNonNullExpression':
		case 'TSSatisfiesExpression':
			return isNeutralised(node.expression, getScope, depth + 1);

		default:
			return false;
	}
}

function propertyName(node: TSESTree.MemberExpression): string | undefined {
	if (!node.computed && node.property.type === 'Identifier') return node.property.name;
	if (
		node.computed &&
		node.property.type === 'Literal' &&
		typeof node.property.value === 'string'
	) {
		return node.property.value;
	}
	return undefined;
}

/**
 * Climbs past expressions that only choose between values, so a query reached
 * through one — `q: filter ? \`...\` : undefined` — is still recognised.
 */
function effectiveParent(node: TSESTree.Node): TSESTree.Node | undefined {
	let parent: TSESTree.Node | undefined = node.parent;

	while (
		parent?.type === 'ConditionalExpression' ||
		parent?.type === 'LogicalExpression' ||
		parent?.type === 'TSAsExpression' ||
		parent?.type === 'TSNonNullExpression' ||
		parent?.type === 'TSSatisfiesExpression'
	) {
		parent = parent.parent;
	}

	return parent;
}

function isQuerySink(node: TSESTree.TemplateLiteral): boolean {
	const parent = effectiveParent(node);
	if (!parent) return false;

	switch (parent.type) {
		// `{ query: `...` }`
		case 'Property':
			return (
				(parent.key.type === 'Identifier' && QUERY_SINKS.has(parent.key.name)) ||
				(parent.key.type === 'Literal' &&
					typeof parent.key.value === 'string' &&
					QUERY_SINKS.has(parent.key.value))
			);

		// `qs.$filter = `...`` / `qs.$filter += `...``
		case 'AssignmentExpression': {
			if (parent.left.type !== 'MemberExpression') return false;
			const name = propertyName(parent.left);
			return name !== undefined && QUERY_SINKS.has(name);
		}

		// `const q = `...``
		case 'VariableDeclarator':
			return (
				parent.id.type === 'Identifier' &&
				(QUERY_SINKS.has(parent.id.name) || QUERY_PART_SINKS.has(parent.id.name))
			);

		// `query.push(`...`)`
		case 'CallExpression':
			return (
				parent.callee.type === 'MemberExpression' &&
				propertyName(parent.callee) === 'push' &&
				parent.callee.object.type === 'Identifier' &&
				QUERY_PART_SINKS.has(parent.callee.object.name)
			);

		default:
			return false;
	}
}

export const RequireEscapedQueryValuesRule = ESLintUtils.RuleCreator.withoutDocs<
	Options,
	MessageIds
>({
	meta: {
		type: 'problem',
		docs: {
			// Coverage boundary, so this is not mistaken for a complete gate: the rule
			// only inspects a template literal that lands directly in a recognised
			// sink, and only proves safety from the interpolated expression itself. It
			// does not see a template passed as a call argument (a query inside a URL
			// path), returned from a helper, built by string concatenation, assembled
			// as `.map()` fragments joined later, or assigned to a `let`. Nor does it
			// know about a guard on an earlier statement, such as
			// `assertNoQueryDelimiters`. Those need a test, not this rule.
			description:
				"Require values interpolated into a quoted literal of a third-party query language to go through that language's escape helper.",
		},
		schema: [],
		messages: {
			escapeQueryValue:
				'A value interpolated into a quoted query literal must go through the escape helper for that query language (@utils/query-escaping). Disable this rule on the line if the value provably cannot contain a quote.',
		},
	},
	defaultOptions: [],
	create(context) {
		const sourceCode = context.sourceCode;

		return {
			TemplateLiteral(node) {
				if (!isQuerySink(node)) return;

				let open: OpenLiteral = null;

				node.quasis.forEach((quasi, index) => {
					open = scanLiteral(quasi.value.cooked ?? quasi.value.raw, open);

					const expression = node.expressions[index];
					// Only an interpolation inside a quoted literal can close it.
					if (!expression || open === null) return;

					if (isNeutralised(expression, (n) => sourceCode.getScope(n))) return;

					context.report({ node: expression, messageId: 'escapeQueryValue' });
				});
			},
		};
	},
});
