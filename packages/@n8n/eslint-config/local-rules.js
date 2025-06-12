'use strict';

const path = require('path');

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

	'no-unused-param-in-catch-clause': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Unused param in catch clause must be omitted.',
				recommended: 'error',
			},
			messages: {
				removeUnusedParam: 'Remove unused param in catch clause',
			},
			fixable: 'code',
		},
		create(context) {
			return {
				CatchClause(node) {
					if (node.param?.name?.startsWith('_')) {
						const start = node.range[0] + 'catch '.length;
						const end = node.param.range[1] + '()'.length;

						context.report({
							messageId: 'removeUnusedParam',
							node,
							fix: (fixer) => fixer.removeRange([start, end]),
						});
					}
				},
			};
		},
	},

	'no-useless-catch-throw': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Disallow `try-catch` blocks where the `catch` only contains a `throw error`.',
				recommended: 'error',
			},
			messages: {
				noUselessCatchThrow: 'Remove useless `catch` block.',
			},
			fixable: 'code',
		},
		create(context) {
			return {
				CatchClause(node) {
					if (
						node.body.body.length === 1 &&
						node.body.body[0].type === 'ThrowStatement' &&
						node.body.body[0].argument.type === 'Identifier' &&
						node.body.body[0].argument.name === node.param.name
					) {
						context.report({
							node,
							messageId: 'noUselessCatchThrow',
							fix(fixer) {
								const tryStatement = node.parent;
								const tryBlock = tryStatement.block;
								const sourceCode = context.getSourceCode();
								const tryBlockText = sourceCode.getText(tryBlock);
								const tryBlockTextWithoutBraces = tryBlockText.slice(1, -1).trim();
								const indentedTryBlockText = tryBlockTextWithoutBraces
									.split('\n')
									.map((line) => line.replace(/\t/, ''))
									.join('\n');
								return fixer.replaceText(tryStatement, indentedTryBlockText);
							},
						});
					}
				},
			};
		},
	},

	'no-skipped-tests': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Tests must not be skipped.',
				recommended: 'error',
			},
			messages: {
				removeSkip: 'Remove `.skip()` call',
				removeOnly: 'Remove `.only()` call',
				removeXPrefix: 'Remove `x` prefix',
			},
			fixable: 'code',
		},
		create(context) {
			const TESTING_FUNCTIONS = new Set(['test', 'it', 'describe']);
			const SKIPPING_METHODS = new Set(['skip', 'only']);
			const PREFIXED_TESTING_FUNCTIONS = new Set(['xtest', 'xit', 'xdescribe']);
			const toMessageId = (s) => 'remove' + s.charAt(0).toUpperCase() + s.slice(1);

			return {
				MemberExpression(node) {
					if (
						node.object.type === 'Identifier' &&
						TESTING_FUNCTIONS.has(node.object.name) &&
						node.property.type === 'Identifier' &&
						SKIPPING_METHODS.has(node.property.name)
					) {
						context.report({
							messageId: toMessageId(node.property.name),
							node,
							fix: (fixer) => {
								const [start, end] = node.property.range;
								return fixer.removeRange([start - '.'.length, end]);
							},
						});
					}
				},
				CallExpression(node) {
					if (
						node.callee.type === 'Identifier' &&
						PREFIXED_TESTING_FUNCTIONS.has(node.callee.name)
					) {
						context.report({
							messageId: 'removeXPrefix',
							node,
							fix: (fixer) => fixer.replaceText(node.callee, 'test'),
						});
					}
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

	'no-plain-errors': {
		meta: {
			type: 'problem',
			docs: {
				description:
					'Only `ApplicationError` (from the `workflow` package) or its child classes must be thrown. This ensures the error will be normalized when reported to Sentry, if applicable.',
				recommended: 'error',
			},
			messages: {
				useApplicationError:
					'Throw an `ApplicationError` (from the `workflow` package) or its child classes.',
			},
			fixable: 'code',
		},
		create(context) {
			return {
				ThrowStatement(node) {
					if (!node.argument) return;

					const isNewError =
						node.argument.type === 'NewExpression' && node.argument.callee.name === 'Error';

					const isNewlessError =
						node.argument.type === 'CallExpression' && node.argument.callee.name === 'Error';

					if (isNewError || isNewlessError) {
						return context.report({
							messageId: 'useApplicationError',
							node,
							fix: (fixer) =>
								fixer.replaceText(
									node,
									`throw new ApplicationError(${node.argument.arguments
										.map((arg) => arg.raw)
										.join(', ')})`,
								),
						});
					}
				},
			};
		},
	},

	'no-dynamic-import-template': {
		meta: {
			type: 'error',
			docs: {
				description:
					'Disallow non-relative imports in template string argument to `await import()`, because `tsc-alias` as of 1.8.7 is unable to resolve aliased paths in this scenario.',
				recommended: true,
			},
		},
		create: function (context) {
			return {
				'AwaitExpression > ImportExpression TemplateLiteral'(node) {
					const templateValue = node.quasis[0].value.cooked;

					if (!templateValue?.startsWith('@/')) return;

					context.report({
						node,
						message:
							'Use relative imports in template string argument to `await import()`, because `tsc-alias` as of 1.8.7 is unable to resolve aliased paths in this scenario.',
					});
				},
			};
		},
	},

	'misplaced-n8n-typeorm-import': {
		meta: {
			type: 'error',
			docs: {
				description: 'Ensure `@n8n/typeorm` is imported only from within the `@n8n/db` package.',
				recommended: 'error',
			},
			messages: {
				moveImport: 'Please move this import to `@n8n/db`.',
			},
		},
		create(context) {
			return {
				ImportDeclaration(node) {
					if (node.source.value === '@n8n/typeorm' && !context.getFilename().includes('@n8n/db')) {
						context.report({ node, messageId: 'moveImport' });
					}
				},
			};
		},
	},

	'no-type-unsafe-event-emitter': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Disallow extending from `EventEmitter`, which is not type-safe.',
				recommended: 'error',
			},
			messages: {
				noExtendsEventEmitter: 'Extend from the type-safe `TypedEmitter` class instead.',
			},
		},
		create(context) {
			return {
				ClassDeclaration(node) {
					if (
						node.superClass &&
						node.superClass.type === 'Identifier' &&
						node.superClass.name === 'EventEmitter' &&
						node.id.name !== 'TypedEmitter'
					) {
						context.report({
							node: node.superClass,
							messageId: 'noExtendsEventEmitter',
						});
					}
				},
			};
		},
	},

	'no-untyped-config-class-field': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Enforce explicit typing of config class fields',
				recommended: 'error',
			},
			messages: {
				noUntypedConfigClassField:
					'Class field must have an explicit type annotation, e.g. `field: type = value`. See: https://github.com/n8n-io/n8n/pull/10433',
			},
		},
		create(context) {
			return {
				PropertyDefinition(node) {
					if (!node.typeAnnotation) {
						context.report({ node: node.key, messageId: 'noUntypedConfigClassField' });
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
