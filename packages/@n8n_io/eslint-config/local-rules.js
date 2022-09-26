'use strict';

/**
 * This file contains any locally defined ESLint rules. They are picked up by
 * eslint-plugin-n8n-local-rules and exposed as 'n8n-local-rules/<rule-name>'.
 */
module.exports = {
	/**
	 * A rule to detect calls to JSON.parse() that are not wrapped inside try/catch blocks.
	 *
	 * Valid:
	 * ```js
	 * try { JSON.parse(foo) } catch(err) { baz() }
	 * ```
	 *
	 * Invalid:
	 * ```js
	 * JSON.parse(foo)
	 * ```
	 *
	 * The pattern where an object is cloned with JSON.parse(JSON.stringify()) is allowed
	 * (abundant in the n8n codebase):
	 *
	 * Valid:
	 * ```js
	 * JSON.parse(JSON.stringify(foo))
	 * ```
	 */
	'no-uncaught-json-parse': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Calls to JSON.parse() must be surrounded with a try/catch block.',
				recommended: 'error',
			},
			schema: [],
			messages: {
				noUncaughtJsonParse: 'Surround the JSON.parse() call with a try/catch block.',
			},
		},
		defaultOptions: [],
		create(context) {
			return {
				CallExpression(node) {
					if (!isJsonParseCall(node)) {
						return;
					}

					if (isDeepCloneOperation(node)) {
						return;
					}

					if (context.getAncestors().find((node) => node.type === 'TryStatement') !== undefined) {
						return;
					}

					// Found a JSON.parse() call not wrapped into a try/catch, so report it
					context.report({
						messageId: 'noUncaughtJsonParse',
						node,
					});
				},
			};
		},
	},
};

const isJsonParseCall = (node) =>
	node.callee.type === 'MemberExpression' &&
	node.callee.object.type === 'Identifier' &&
	node.callee.object.name === 'JSON' &&
	node.callee.property.type === 'Identifier' &&
	node.callee.property.name === 'parse';

const isDeepCloneOperation = (node) => {
	const parseArg = node.arguments?.[0];
	return (
		parseArg !== undefined &&
		parseArg.type === 'CallExpression' &&
		parseArg.callee.type === 'MemberExpression' &&
		parseArg.callee.object.type === 'Identifier' &&
		parseArg.callee.object.name === 'JSON' &&
		parseArg.callee.property.type === 'Identifier' &&
		parseArg.callee.property.name === 'stringify'
	);
};
