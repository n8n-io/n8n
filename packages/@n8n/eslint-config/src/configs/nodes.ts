import tseslint from 'typescript-eslint';
import nodesBasePlugin from 'eslint-plugin-n8n-nodes-base';

import { backendConfig } from './backend.js';

/**
 * The two packages that ship nodes: `n8n-nodes-base` and
 * `@n8n/nodes-langchain`.
 *
 * They had kept the same ~100 `n8n-nodes-base/*` rules in their own configs,
 * which had already drifted (a duplicated key in each). The rules describe the
 * node and credential file formats, so they belong to the node format, not to
 * one package.
 *
 * The globs stay relative: ESLint resolves `files` against the config that
 * consumes this one, so `credentials/*.ts` means each package's own tree.
 *
 * The `@n8n/community-nodes` rules stay in the two packages. That plugin peer-
 * depends on `n8n-workflow`, which reaches this package again through
 * `@n8n/utils`, and turbo's build graph rejects the cycle. Only the two rules
 * both packages agree on are duplicated, against 97 lifted here.
 */
export const nodesConfig = tseslint.config(
	backendConfig,
	{
		plugins: {
			'n8n-nodes-base': nodesBasePlugin,
		},

		rules: {
			// A node file is `Slack.node.ts` and a credential is
			// `SlackApi.credentials.ts`, so the kebab-case default cannot apply.
			'unicorn/filename-case': 'off',

			'n8n-local-rules/no-dynamic-regexp': 'error',
			'@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],

			/**
			 * Retired for both nodes packages, which had each downgraded all of
			 * these. Node source is largely generated or transcribed from a
			 * vendor API, so it does not read like the rest of the repo.
			 */
			'@typescript-eslint/no-base-to-string': 'off',
			'@typescript-eslint/no-duplicate-type-constituents': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
			'@typescript-eslint/prefer-optional-chain': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			eqeqeq: 'off',
			'id-denylist': 'off',
			'import-x/extensions': 'off',
			'n8n-local-rules/no-argument-spread': 'off',
			'no-async-promise-executor': 'off',
			'no-case-declarations': 'off',
			'no-extra-boolean-cast': 'off',
			'no-prototype-builtins': 'off',
			'no-useless-escape': 'off',
		},
	},
	{
		files: ['credentials/*.ts'],
		rules: {
			'n8n-nodes-base/cred-class-field-authenticate-type-assertion': 'error',
			'n8n-nodes-base/cred-class-field-display-name-missing-oauth2': 'error',
			'n8n-nodes-base/cred-class-field-display-name-miscased': 'error',
			'n8n-nodes-base/cred-class-field-documentation-url-missing': 'error',
			'n8n-nodes-base/cred-class-field-name-missing-oauth2': 'error',
			'n8n-nodes-base/cred-class-field-name-unsuffixed': 'error',
			'n8n-nodes-base/cred-class-field-name-uppercase-first-char': 'error',
			'n8n-nodes-base/cred-class-field-properties-assertion': 'error',
			'n8n-nodes-base/cred-class-field-type-options-password-missing': 'error',
			'n8n-nodes-base/cred-class-name-missing-oauth2-suffix': 'error',
			'n8n-nodes-base/cred-class-name-unsuffixed': 'error',
			'n8n-nodes-base/cred-filename-against-convention': 'error',
		},
	},
	{
		files: ['nodes/**/*.ts'],
		rules: {
			'n8n-nodes-base/node-class-description-credentials-name-unsuffixed': 'error',
			'n8n-nodes-base/node-class-description-display-name-unsuffixed-trigger-node': 'error',
			'n8n-nodes-base/node-class-description-empty-string': 'error',
			'n8n-nodes-base/node-class-description-icon-not-svg': 'off',
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
			'n8n-nodes-base/node-class-description-inputs-wrong-trigger-node': 'error',
			'n8n-nodes-base/node-class-description-missing-subtitle': 'error',
			'n8n-nodes-base/node-class-description-non-core-color-present': 'error',
			'n8n-nodes-base/node-class-description-name-miscased': 'error',
			'n8n-nodes-base/node-class-description-name-unsuffixed-trigger-node': 'error',
			'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
			'n8n-nodes-base/node-dirname-against-convention': 'error',
			'n8n-nodes-base/node-execute-block-double-assertion-for-items': 'error',
			'n8n-nodes-base/node-execute-block-wrong-error-thrown': 'error',
			'n8n-nodes-base/node-filename-against-convention': 'error',
			'n8n-nodes-base/node-param-array-type-assertion': 'error',
			'n8n-nodes-base/node-param-color-type-unused': 'error',
			'n8n-nodes-base/node-param-default-missing': 'error',
			'n8n-nodes-base/node-param-default-wrong-for-boolean': 'error',
			'n8n-nodes-base/node-param-default-wrong-for-collection': 'error',
			'n8n-nodes-base/node-param-default-wrong-for-fixed-collection': 'error',
			'n8n-nodes-base/node-param-default-wrong-for-multi-options': 'error',
			'n8n-nodes-base/node-param-default-wrong-for-number': 'error',
			'n8n-nodes-base/node-param-default-wrong-for-simplify': 'error',
			'n8n-nodes-base/node-param-default-wrong-for-string': 'error',
			'n8n-nodes-base/node-param-description-boolean-without-whether': 'error',
			'n8n-nodes-base/node-param-description-comma-separated-hyphen': 'error',
			'n8n-nodes-base/node-param-description-empty-string': 'error',
			'n8n-nodes-base/node-param-description-excess-final-period': 'error',
			'n8n-nodes-base/node-param-description-excess-inner-whitespace': 'error',
			'n8n-nodes-base/node-param-description-identical-to-display-name': 'error',
			'n8n-nodes-base/node-param-description-line-break-html-tag': 'error',
			'n8n-nodes-base/node-param-description-lowercase-first-char': 'error',
			'n8n-nodes-base/node-param-description-miscased-id': 'error',
			'n8n-nodes-base/node-param-description-miscased-json': 'error',
			'n8n-nodes-base/node-param-description-miscased-url': 'error',
			'n8n-nodes-base/node-param-description-missing-final-period': 'error',
			'n8n-nodes-base/node-param-description-missing-for-ignore-ssl-issues': 'error',
			'n8n-nodes-base/node-param-description-missing-for-return-all': 'error',
			'n8n-nodes-base/node-param-description-missing-for-simplify': 'error',
			'n8n-nodes-base/node-param-description-missing-from-dynamic-multi-options': 'error',
			'n8n-nodes-base/node-param-description-missing-from-dynamic-options': 'error',
			'n8n-nodes-base/node-param-description-missing-from-limit': 'error',
			'n8n-nodes-base/node-param-description-unencoded-angle-brackets': 'error',
			'n8n-nodes-base/node-param-description-unneeded-backticks': 'error',
			'n8n-nodes-base/node-param-description-untrimmed': 'error',
			'n8n-nodes-base/node-param-description-url-missing-protocol': 'error',
			'n8n-nodes-base/node-param-description-weak': 'error',
			'n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options': 'error',
			'n8n-nodes-base/node-param-description-wrong-for-dynamic-options': 'error',
			'n8n-nodes-base/node-param-description-wrong-for-ignore-ssl-issues': 'error',
			'n8n-nodes-base/node-param-description-wrong-for-limit': 'error',
			'n8n-nodes-base/node-param-description-wrong-for-return-all': 'error',
			'n8n-nodes-base/node-param-description-wrong-for-simplify': 'error',
			'n8n-nodes-base/node-param-description-wrong-for-upsert': 'error',
			'n8n-nodes-base/node-param-display-name-excess-inner-whitespace': 'error',
			'n8n-nodes-base/node-param-display-name-miscased-id': 'error',
			'n8n-nodes-base/node-param-display-name-miscased': 'error',
			'n8n-nodes-base/node-param-display-name-not-first-position': 'error',
			'n8n-nodes-base/node-param-display-name-untrimmed': 'error',
			'n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options': 'error',
			'n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options': 'error',
			'n8n-nodes-base/node-param-display-name-wrong-for-simplify': 'error',
			'n8n-nodes-base/node-param-display-name-wrong-for-update-fields': 'error',
			'n8n-nodes-base/node-param-min-value-wrong-for-limit': 'error',
			'n8n-nodes-base/node-param-multi-options-type-unsorted-items': 'error',
			'n8n-nodes-base/node-param-name-untrimmed': 'error',
			'n8n-nodes-base/node-param-operation-option-action-wrong-for-get-many': 'error',
			'n8n-nodes-base/node-param-operation-option-description-wrong-for-get-many': 'error',
			'n8n-nodes-base/node-param-operation-option-without-action': 'error',
			'n8n-nodes-base/node-param-operation-without-no-data-expression': 'error',
			'n8n-nodes-base/node-param-option-description-identical-to-name': 'error',
			'n8n-nodes-base/node-param-option-name-containing-star': 'error',
			'n8n-nodes-base/node-param-option-name-duplicate': 'error',
			'n8n-nodes-base/node-param-option-name-wrong-for-get-many': 'error',
			'n8n-nodes-base/node-param-option-name-wrong-for-upsert': 'error',
			'n8n-nodes-base/node-param-option-value-duplicate': 'error',
			'n8n-nodes-base/node-param-options-type-unsorted-items': 'error',
			'n8n-nodes-base/node-param-placeholder-miscased-id': 'error',
			'n8n-nodes-base/node-param-placeholder-missing-email': 'error',
			'n8n-nodes-base/node-param-required-false': 'error',
			'n8n-nodes-base/node-param-resource-with-plural-option': 'error',
			'n8n-nodes-base/node-param-resource-without-no-data-expression': 'error',
			'n8n-nodes-base/node-param-type-options-missing-from-limit': 'error',
			'n8n-nodes-base/node-param-type-options-password-missing': 'error',
		},
	},
	{
		files: ['**/*.test.ts', '**/test/**/*.ts', '**/__test__/**/*.ts', '**/__tests__/**/*.ts'],
		rules: {
			'import-x/no-extraneous-dependencies': 'off',
			'n8n-nodes-base/node-filename-against-convention': 'off',
			'n8n-local-rules/no-dynamic-regexp': 'off',
		},
	},
);
