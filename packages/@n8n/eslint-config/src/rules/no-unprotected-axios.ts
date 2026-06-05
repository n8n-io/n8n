import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

/**
 * Axios members that initiate an outbound HTTP request (or build a request
 * instance). Using these on the raw `axios` import bypasses SSRF protection.
 * Non-request members such as `isAxiosError`, `AxiosError`, `AxiosHeaders` and
 * `getUri` are intentionally excluded.
 */
const REQUEST_MEMBERS = new Set([
	'create',
	'request',
	'get',
	'delete',
	'head',
	'options',
	'post',
	'put',
	'patch',
	'postForm',
	'putForm',
	'patchForm',
	'all',
]);

type Options = [{ allow?: string[] }];

export const NoUnprotectedAxiosRule = ESLintUtils.RuleCreator.withoutDocs<Options, 'useFactory'>({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow using the raw `axios` import for HTTP requests. Use `SafeAxiosFactory.create()` so outbound requests are protected against SSRF, or `createUnsafe()` for trusted, hardcoded endpoints.',
		},
		messages: {
			useFactory:
				'Do not call `axios.{{member}}` directly — it bypasses SSRF protection. Inject `SafeAxiosFactory` and use `create()` (or `createUnsafe()` for trusted, hardcoded endpoints). If this call is intentionally unprotected, disable this rule on the line with a justifying comment.',
		},
		schema: [
			{
				type: 'object',
				properties: {
					allow: {
						type: 'array',
						items: { type: 'string' },
						description: 'Filename substrings that are exempt from this rule.',
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ allow: [] }],
	create(context, [options]) {
		const allow = options?.allow ?? [];
		if (allow.some((pattern) => context.filename.includes(pattern))) {
			return {};
		}

		// Local names bound to a *value* import of the axios default/namespace export.
		const axiosNames = new Set<string>();

		return {
			ImportDeclaration(node) {
				if (node.source.value !== 'axios') return;
				// `import type ... from 'axios'` is types-only and safe.
				if (node.importKind === 'type') return;

				for (const specifier of node.specifiers) {
					if (
						specifier.type === 'ImportDefaultSpecifier' ||
						specifier.type === 'ImportNamespaceSpecifier'
					) {
						axiosNames.add(specifier.local.name);
					}
				}
			},

			// `axios.get(...)`, `axios.create(...)`, etc.
			'MemberExpression[object.type="Identifier"]'(node: TSESTree.MemberExpression) {
				const object = node.object as TSESTree.Identifier;
				if (!axiosNames.has(object.name)) return;
				if (node.property.type !== 'Identifier') return;
				if (!REQUEST_MEMBERS.has(node.property.name)) return;

				context.report({
					node,
					messageId: 'useFactory',
					data: { member: node.property.name },
				});
			},

			// `axios(config)` — calling the default export directly.
			'CallExpression[callee.type="Identifier"]'(node: TSESTree.CallExpression) {
				const callee = node.callee as TSESTree.Identifier;
				if (!axiosNames.has(callee.name)) return;

				context.report({
					node,
					messageId: 'useFactory',
					data: { member: callee.name },
				});
			},
		};
	},
});
