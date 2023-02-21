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
				description:
					'Calls to `JSON.parse()` must be replaced with `jsonParse()` from `n8n-workflow` or surrounded with a try/catch block.',
				recommended: 'error',
			},
			schema: [],
			messages: {
				noUncaughtJsonParse:
					'Use `jsonParse()` from `n8n-workflow` or surround the `JSON.parse()` call with a try/catch block.',
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

	'no-unneeded-backticks': {
		meta: {
			type: 'problem',
			docs: {
				description:
					'Template literal backticks may only be used for string interpolation or multiline strings.',
				recommended: 'error',
			},
			messages: {
				noUneededBackticks: 'Use single or double quotes, not backticks',
			},
			fixable: 'code',
		},
		create(context) {
			return {
				TemplateLiteral(node) {
					if (node.expressions.length > 0) return;
					if (node.quasis.every((q) => q.loc.start.line !== q.loc.end.line)) return;

					node.quasis.forEach((q) => {
						const escaped = q.value.raw.replace(/(?<!\\)'/g, "\\'");

						context.report({
							messageId: 'noUneededBackticks',
							node,
							fix: (fixer) => fixer.replaceText(q, `'${escaped}'`),
						});
					});
				},
			};
		},
	},

	'no-interpolation-in-regular-string': {
		meta: {
			type: 'problem',
			docs: {
				description:
					'String interpolation `${...}` requires backticks, not single or double quotes.',
				recommended: 'error',
			},
			messages: {
				useBackticks: 'Use backticks to interpolate',
			},
			fixable: 'code',
		},
		create(context) {
			return {
				Literal(node) {
					if (typeof node.value !== 'string') return;

					if (/\$\{/.test(node.value)) {
						context.report({
							messageId: 'useBackticks',
							node,
							fix: (fixer) => fixer.replaceText(node, `\`${node.value}\``),
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
