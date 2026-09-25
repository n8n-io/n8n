import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { RuleContext } from '@typescript-eslint/utils/ts-eslint';

type Options = [{ allow?: string[] }];
type MessageIds = 'useBackendNetwork' | 'addReviewedException';

const DOCS_URL =
	'https://github.com/n8n-io/n8n/blob/master/packages/@n8n/backend-network/README.md';

const RESTRICTED_MODULES = new Set([
	'axios',
	'undici',
	'http-proxy-agent',
	'https-proxy-agent',
	'proxy-from-env',
]);

const NODE_HTTP_MODULES = new Set(['http', 'https', 'node:http', 'node:https']);

/**
 * axios symbols that perform no request
 */
const ALLOWED_AXIOS_VALUE_IMPORTS = new Set([
	'AxiosError',
	'AxiosHeaders',
	'CanceledError',
	'isAxiosError',
	'isCancel',
]);

const NON_RUNTIME_FILE = /(\.test\.ts|\.spec\.ts|\/__tests__\/|\/test\/|\/integration-tests\/)/;

export const NoUncentralizedHttpRule = ESLintUtils.RuleCreator.withoutDocs<Options, MessageIds>({
	meta: {
		type: 'problem',
		hasSuggestions: true,
		docs: {
			description:
				'Disallow direct backend imports of HTTP client/proxy libraries; outbound HTTP must go through the @n8n/backend-network factory.',
			url: DOCS_URL,
		},
		messages: {
			useBackendNetwork:
				"Importing '{{ module }}' opens an outbound connection that bypasses n8n's SSRF/DNS guarding and proxy handling. Route it through @n8n/backend-network instead: inject the `OutboundHttp` service, then `.requests()` to send a request or `.transport()` to hand a guarded fetch/dispatcher to an SDK (DI-less code: import from '@n8n/backend-network/transport'). Sanctioned exceptions and the full factory API are in the rule docs.",
			addReviewedException:
				'Mark this line as a reviewed exception (inserts an eslint-disable with a TODO reason to complete)',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					allow: {
						type: 'array',
						items: { type: 'string' },
						description: 'File path substrings exempt from this rule (reviewed exceptions).',
					},
				},
			},
		],
	},
	defaultOptions: [{ allow: [] }],
	create(context, [options]) {
		const filename = context.filename.replace(/\\/g, '/');

		if (NON_RUNTIME_FILE.test(filename)) {
			return {};
		}

		const allow = options?.allow ?? [];
		if (allow.some((entry) => filename.includes(entry))) {
			return {};
		}

		return {
			ImportDeclaration(node) {
				const module = node.source.value;
				if (!RESTRICTED_MODULES.has(module) && !NODE_HTTP_MODULES.has(module)) {
					return;
				}

				if (node.importKind === 'type') {
					return;
				}

				// `import 'undici'`: bare side-effect import still loads the library.
				if (RESTRICTED_MODULES.has(module) && node.specifiers.length === 0) {
					report(node, module, context);
					return;
				}

				node.specifiers
					.filter(
						(specifier) => specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type',
					)
					.forEach((specifier) => {
						const importedName =
							specifier.type === 'ImportSpecifier' && specifier.imported.type === 'Identifier'
								? specifier.imported.name
								: undefined;

						reportNamedValue(specifier, module, importedName, context);
					});
			},

			// `export { request } from 'axios'`: re-exporting a value pulls the library into consumers exactly like a direct import.
			ExportNamedDeclaration(node) {
				if (!node.source) {
					// local re-export (`export { x }`), no module.
					return;
				}

				const module = node.source.value;
				if (!RESTRICTED_MODULES.has(module) && !NODE_HTTP_MODULES.has(module)) {
					return;
				}

				if (node.exportKind === 'type') {
					return;
				}

				node.specifiers
					.filter((specifier) => specifier.exportKind !== 'type')
					.forEach((specifier) => {
						const importedName =
							specifier.local.type === 'Identifier' ? specifier.local.name : undefined;
						reportNamedValue(specifier, module, importedName, context);
					});
			},

			// `export * from 'undici'` re-exports the whole client
			ExportAllDeclaration(node) {
				const module = node.source.value;
				if (!RESTRICTED_MODULES.has(module)) {
					return;
				}
				if (node.exportKind === 'type') {
					return;
				}
				report(node, module, context);
			},

			// Dynamic/runtime module loads (`import()`, `require`, `import =`) only restrict
			// RESTRICTED_MODULES, not node:http/https: a runtime load returns the whole module,
			// so blocking `Agent` would also block `createServer`, the same accepted gap as the
			// namespace/default static import above.
			//
			// Dynamic `import('axios')` loads the whole client at runtime.
			ImportExpression(node) {
				if (node.source.type !== 'Literal' || typeof node.source.value !== 'string') {
					return;
				}
				if (!RESTRICTED_MODULES.has(node.source.value)) {
					return;
				}
				report(node, node.source.value, context);
			},

			// `require('axios')`: same as a dynamic import for our purposes.
			CallExpression(node) {
				if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') {
					return;
				}
				const [arg] = node.arguments;
				if (!arg || arg.type !== 'Literal' || typeof arg.value !== 'string') {
					return;
				}
				if (!RESTRICTED_MODULES.has(arg.value)) {
					return;
				}
				report(node, arg.value, context);
			},

			// `import axios = require('axios')`: the TS import-equals form.
			TSImportEqualsDeclaration(node) {
				if (node.moduleReference.type !== 'TSExternalModuleReference') {
					return;
				}
				const { expression } = node.moduleReference;
				if (expression.type !== 'Literal' || typeof expression.value !== 'string') {
					return;
				}
				if (!RESTRICTED_MODULES.has(expression.value)) {
					return;
				}
				report(node, expression.value, context);
			},
		};
	},
});

const REVIEWED_EXCEPTION_COMMENT =
	'// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- TODO: explain why @n8n/backend-network cannot be used here';
function report(
	node: TSESTree.Node,
	module: string,
	context: Readonly<RuleContext<MessageIds, Options>>,
): void {
	context.report({
		node,
		messageId: 'useBackendNetwork',
		data: { module },
		suggest: [
			{
				messageId: 'addReviewedException',
				fix: (fixer) => {
					const { line } = node.loc.start;
					const indent = /^\s*/.exec(context.sourceCode.lines[line - 1])?.[0] ?? '';
					const lineStart = context.sourceCode.getIndexFromLoc({ line, column: 0 });
					return fixer.insertTextBeforeRange(
						[lineStart, lineStart],
						`${indent}${REVIEWED_EXCEPTION_COMMENT}\n`,
					);
				},
			},
		],
	});
}

function reportNamedValue(
	node: TSESTree.Node,
	module: string,
	importedName: string | undefined,
	context: Readonly<RuleContext<MessageIds, Options>>,
) {
	if (NODE_HTTP_MODULES.has(module)) {
		// Only the raw `Agent` class is restricted from node http/https.
		// A namespace/default binding (`import http from 'node:http'`) can still reach `http.Agent`,
		// but banning it would also forbid `createServer`; that gap is accepted.
		if (importedName === 'Agent') {
			report(node, module, context);
		}
		return;
	}

	if (module === 'axios' && importedName && ALLOWED_AXIOS_VALUE_IMPORTS.has(importedName)) {
		return;
	}

	report(node, module, context);
}
