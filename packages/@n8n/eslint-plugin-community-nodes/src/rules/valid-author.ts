import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty, getTopLevelObjectInJson } from '../utils/index.js';

/**
 * Parses an npm "person" shorthand string of the form
 * `Name <email> (url)` into its name and email parts. Any part may be absent.
 */
function parsePersonString(value: string): { name: string; email: string } {
	const emailMatch = /<([^>]*)>/.exec(value);
	const email = (emailMatch?.[1] ?? '').trim();

	const ltIndex = value.indexOf('<');
	const parenIndex = value.indexOf('(');
	let nameEnd = value.length;
	if (ltIndex !== -1) nameEnd = Math.min(nameEnd, ltIndex);
	if (parenIndex !== -1) nameEnd = Math.min(nameEnd, parenIndex);
	const name = value.slice(0, nameEnd).trim();

	return { name, email };
}

function isNonEmptyStringLiteral(node: TSESTree.Property | null): boolean {
	if (!node || node.value.type !== AST_NODE_TYPES.Literal) {
		return false;
	}
	const { value } = node.value;
	return typeof value === 'string' && value.trim().length > 0;
}

export const ValidAuthorRule = createRule({
	name: 'valid-author',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require a non-empty author name and email in package.json',
		},
		messages: {
			authorMissing: 'package.json must have an "author" field with a non-empty name and email.',
			authorNameMissing: 'The "author" field must include a non-empty name.',
			authorEmailMissing: 'The "author" field must include a non-empty email.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				const root = getTopLevelObjectInJson(node);
				if (!root) {
					return;
				}

				const authorProp = findJsonProperty(root, 'author');
				if (!authorProp) {
					context.report({ node: root, messageId: 'authorMissing' });
					return;
				}

				const authorValue = authorProp.value;

				// Shorthand string form: "Name <email> (url)"
				if (authorValue.type === AST_NODE_TYPES.Literal) {
					if (typeof authorValue.value !== 'string') {
						context.report({ node: authorProp, messageId: 'authorMissing' });
						return;
					}

					const { name, email } = parsePersonString(authorValue.value);
					if (name.length === 0) {
						context.report({ node: authorProp, messageId: 'authorNameMissing' });
					}
					if (email.length === 0) {
						context.report({ node: authorProp, messageId: 'authorEmailMissing' });
					}
					return;
				}

				// Object form: { "name": "...", "email": "..." }
				if (authorValue.type === AST_NODE_TYPES.ObjectExpression) {
					if (!isNonEmptyStringLiteral(findJsonProperty(authorValue, 'name'))) {
						context.report({ node: authorProp, messageId: 'authorNameMissing' });
					}
					if (!isNonEmptyStringLiteral(findJsonProperty(authorValue, 'email'))) {
						context.report({ node: authorProp, messageId: 'authorEmailMissing' });
					}
					return;
				}

				// Any other shape (e.g. array, null) cannot carry a name and email.
				context.report({ node: authorProp, messageId: 'authorMissing' });
			},
		};
	},
});
