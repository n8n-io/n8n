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

export const databricksUserAgentRestriction = [
	{
		files: ['./nodes/Databricks/**/*.ts'],
		// helpers.ts is the one file allowed to call the raw helper; tests need to
		// stub it, and forcing an inline disable there would erode the guard.
		ignores: ['./nodes/Databricks/actions/helpers.ts', './nodes/Databricks/test/**'],
		rules: {
			'no-restricted-syntax': [
				'error',
				NO_RAW_ENUM_SYNTAX_RULE,
				{
					// Siblings of httpRequestWithAuthentication are restricted too: an
					// operation written with helpers.httpRequest would otherwise skip
					// the User-Agent silently.
					selector:
						'MemberExpression[property.name=/^(httpRequest|httpRequestWithAuthentication|request|requestWithAuthentication)$/]',
					message:
						'Use databricksApiRequest() from actions/helpers.ts so the partner User-Agent is sent.',
				},
			],
		},
	},
];
