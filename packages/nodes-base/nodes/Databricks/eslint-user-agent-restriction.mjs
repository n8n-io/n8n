// Forces every Databricks API call through databricksApiRequest() in
// actions/helpers.ts, which is what attaches the partner User-Agent. Spread into
// packages/nodes-base's eslint.config.mjs, which is where the `files`/`ignores`
// globs below are resolved from (this file's own location doesn't affect path
// resolution).

// Flat-config `rules` blocks replace, not merge, for any file matched by more
// than one block — so the scoped `no-restricted-syntax` below must repeat the
// base config's raw-enum rule, or it silently stops applying there.
const NO_RAW_ENUM_SYNTAX_RULE = {
	selector: 'TSEnumDeclaration:not([const=true])',
	message:
		'Do not declare raw enums as it leads to runtime overhead. Use const enum instead. See https://www.typescriptlang.org/docs/handbook/enums.html#const-enums',
};

// Raw request helpers that would skip the partner User-Agent, shared by both
// selectors below so the list can't drift between them.
const RESTRICTED_HELPER_METHODS =
	'/^(httpRequest|httpRequestWithAuthentication|request|requestWithAuthentication|requestWithAuthenticationPaginated)$/';

export const databricksUserAgentRestriction = [
	{
		files: ['./nodes/Databricks/**/*.ts'],
		// helpers.ts is the one file allowed to call the raw helper; tests stub it directly.
		ignores: ['./nodes/Databricks/actions/helpers.ts', './nodes/Databricks/test/**'],
		rules: {
			'no-restricted-syntax': [
				'error',
				NO_RAW_ENUM_SYNTAX_RULE,
				{
					// Siblings of httpRequestWithAuthentication are restricted too: an
					// operation written with helpers.httpRequest would otherwise skip
					// the User-Agent silently. Anchored to `helpers` (as a member or a bare
					// binding from `const { helpers } = this`) so unrelated members like
					// `error.request` don't trip the guard.
					selector: `MemberExpression:matches([object.property.name="helpers"], [object.name="helpers"])[property.name=${RESTRICTED_HELPER_METHODS}]`,
					message:
						'Use databricksApiRequest() from actions/helpers.ts so the partner User-Agent is sent.',
				},
				{
					// The same helpers reached by destructuring rather than member access.
					// Anchored to a `*.helpers` or bare `helpers` initialiser so an unrelated
					// `const { request } = response` doesn't trip the guard with a confusing
					// message.
					selector: `VariableDeclarator:matches([init.name="helpers"], [init.property.name="helpers"]) > ObjectPattern > Property[key.name=${RESTRICTED_HELPER_METHODS}]`,
					message:
						'Use databricksApiRequest() from actions/helpers.ts so the partner User-Agent is sent.',
				},
			],
		},
	},
];
