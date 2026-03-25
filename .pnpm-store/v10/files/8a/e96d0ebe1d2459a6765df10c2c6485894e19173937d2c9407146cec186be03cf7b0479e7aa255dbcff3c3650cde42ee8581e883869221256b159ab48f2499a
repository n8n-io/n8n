'use strict';

const postcssScss = require('postcss-scss');

module.exports = {
	extends: ['stylelint-config-recommended'],
	customSyntax: postcssScss,
	plugins: ['stylelint-scss'],
	rules: {
		'annotation-no-unknown': null,
		'at-rule-descriptor-no-unknown': null,
		'at-rule-descriptor-value-no-unknown': null,
		'at-rule-no-unknown': null,
		'at-rule-prelude-no-invalid': null,
		'color-no-invalid-hex': true,
		'comment-no-empty': null,
		'declaration-property-value-no-unknown': null,
		'function-linear-gradient-no-nonstandard-direction': true,
		'function-no-unknown': null,
		'media-feature-name-value-no-unknown': null,
		'media-query-no-invalid': null,
		'no-invalid-position-at-import-rule': [
			true,
			{
				ignoreAtRules: ['use', 'forward'],
			},
		],
		'string-no-newline': true,
		'unit-no-unknown': true,
		'scss/at-extend-no-missing-placeholder': true,
		'scss/at-if-no-null': true,
		'scss/at-rule-no-unknown': true,
		'scss/comment-no-empty': true,
		'scss/declaration-nested-properties-no-divided-groups': true,
		'scss/dollar-variable-no-missing-interpolation': true,
		'scss/function-quote-no-quoted-strings-inside': true,
		'scss/function-unquote-no-unquoted-strings-inside': true,
		'scss/load-no-partial-leading-underscore': true,
		'scss/load-partial-extension': 'never',
		'scss/no-duplicate-mixins': true,
		'scss/no-global-function-names': true,
		'scss/operator-no-newline-after': true,
		'scss/operator-no-newline-before': true,
		'scss/operator-no-unspaced': true,
	},
};
