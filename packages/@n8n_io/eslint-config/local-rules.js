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

					if (isJsonStringifyCall(node)) {
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

	'no-json-parse-json-stringify': {
		meta: {
			type: 'problem',
			docs: {
				description:
					'Calls to `JSON.parse(JSON.stringify(arg))` must be replaced with `deepCopy(arg)` from `n8n-workflow`.',
				recommended: 'error',
			},
			messages: {
				noJsonParseJsonStringify: 'Replace with `deepCopy({{ argText }})`',
			},
			fixable: 'code',
		},
		create(context) {
			return {
				CallExpression(node) {
					if (isJsonParseCall(node) && isJsonStringifyCall(node)) {
						const [callExpression] = node.arguments;

						const { arguments: args } = callExpression;

						if (!Array.isArray(args) || args.length !== 1) return;

						const [arg] = args;

						if (!arg) return;

						const argText = context.getSourceCode().getText(arg);

						context.report({
							messageId: 'noJsonParseJsonStringify',
							node,
							data: { argText },
							fix: (fixer) => fixer.replaceText(node, `deepCopy(${argText})`),
						});
					}
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

const isJsonStringifyCall = (node) => {
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
