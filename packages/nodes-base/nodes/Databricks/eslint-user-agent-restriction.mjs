// Every Databricks API call must go through databricksApiRequest() in actions/helpers.ts.
// Spread into packages/nodes-base/eslint.config.mjs; the globs below resolve from there.

// Flat-config `rules` blocks replace, not merge, for any file matched by more
// than one block, so the scoped `no-restricted-syntax` below must repeat the
// base config's raw-enum rule, or it silently stops applying there.
const NO_RAW_ENUM_SYNTAX_RULE = {
	selector: 'TSEnumDeclaration:not([const=true])',
	message:
		'Do not declare raw enums as it leads to runtime overhead. Use const enum instead. See https://www.typescriptlang.org/docs/handbook/enums.html#const-enums',
};

// `request` also names unrelated members (error.request), so it stays anchored to `helpers`.
const RESTRICTED_HELPER_METHODS =
	'/^(httpRequest|httpRequestWithAuthentication|request|requestWithAuthentication|requestWithAuthenticationPaginated|requestOAuth1|requestOAuth2)$/';
const DISTINCTIVE_HELPER_METHODS =
	'/^(httpRequest|httpRequestWithAuthentication|requestWithAuthentication|requestWithAuthenticationPaginated|requestOAuth1|requestOAuth2)$/';
const USE_DATABRICKS_API_REQUEST =
	'Use databricksApiRequest() from actions/helpers.ts so the partner User-Agent is sent.';

export const databricksUserAgentRestriction = [
	{
		files: ['./nodes/Databricks/**/*.ts'],
		// helpers.ts is the one file allowed to call the raw helpers; tests stub them directly.
		ignores: ['./nodes/Databricks/actions/helpers.ts', './nodes/Databricks/test/**'],
		rules: {
			'no-restricted-syntax': [
				'error',
				NO_RAW_ENUM_SYNTAX_RULE,
				{
					selector: `MemberExpression[computed=false][property.name=${DISTINCTIVE_HELPER_METHODS}]`,
					message: USE_DATABRICKS_API_REQUEST,
				},
				{
					selector: `MemberExpression[computed=true] > Literal.property[value=${RESTRICTED_HELPER_METHODS}]`,
					message: USE_DATABRICKS_API_REQUEST,
				},
				{
					selector: `MemberExpression:matches([object.property.name="helpers"], [object.name="helpers"])[property.name="request"]`,
					message: USE_DATABRICKS_API_REQUEST,
				},
				{
					selector: `ObjectPattern > Property[key.name=${DISTINCTIVE_HELPER_METHODS}]`,
					message: USE_DATABRICKS_API_REQUEST,
				},
				{
					selector: `VariableDeclarator:matches([init.name="helpers"], [init.property.name="helpers"]) > ObjectPattern > Property[key.name="request"]`,
					message: USE_DATABRICKS_API_REQUEST,
				},
			],
		},
	},
];
