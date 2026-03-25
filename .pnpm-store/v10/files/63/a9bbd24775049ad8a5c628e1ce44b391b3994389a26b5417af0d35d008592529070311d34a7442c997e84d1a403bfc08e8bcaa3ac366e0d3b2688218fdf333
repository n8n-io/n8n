'use strict';

module.exports = {
	extends: ['stylelint-config-standard', 'stylelint-config-recommended-scss'],
	rules: {
		'at-rule-empty-line-before': [
			'always',
			{
				except: ['blockless-after-blockless', 'first-nested'],
				ignore: ['after-comment'],
				ignoreAtRules: ['else'],
			},
		],
		'import-notation': 'string',
		'length-zero-no-unit': [
			true,
			{
				ignore: ['custom-properties'],
				ignorePreludeOfAtRules: ['function', 'mixin'],
			},
		],
		'scss/at-else-closing-brace-newline-after': 'always-last-in-chain',
		'scss/at-else-closing-brace-space-after': 'always-intermediate',
		'scss/at-else-empty-line-before': 'never',
		'scss/at-else-if-parentheses-space-before': 'always',
		'scss/at-function-parentheses-space-before': 'never',
		'scss/at-function-pattern': [
			'^(-?[a-z][a-z0-9]*)(-[a-z0-9]+)*$',
			{
				message: 'Expected function name to be kebab-case',
			},
		],
		'scss/at-if-closing-brace-newline-after': 'always-last-in-chain',
		'scss/at-if-closing-brace-space-after': 'always-intermediate',
		'scss/at-mixin-argumentless-call-parentheses': 'never',
		'scss/at-mixin-parentheses-space-before': 'never',
		'scss/at-mixin-pattern': [
			'^(-?[a-z][a-z0-9]*)(-[a-z0-9]+)*$',
			{
				message: 'Expected mixin name to be kebab-case',
			},
		],
		'scss/at-rule-conditional-no-parentheses': true,
		'scss/dollar-variable-colon-space-after': 'always-single-line',
		'scss/dollar-variable-colon-space-before': 'never',
		'scss/dollar-variable-empty-line-before': [
			'always',
			{
				except: ['after-dollar-variable', 'first-nested'],
				ignore: ['after-comment', 'inside-single-line-block'],
			},
		],
		'scss/dollar-variable-pattern': [
			'^(-?[a-z][a-z0-9]*)(-[a-z0-9]+)*$',
			{
				message: 'Expected variable to be kebab-case',
			},
		],
		'scss/double-slash-comment-empty-line-before': [
			'always',
			{
				except: ['first-nested'],
				ignore: ['between-comments', 'stylelint-commands'],
			},
		],
		'scss/double-slash-comment-whitespace-inside': 'always',
		'scss/percent-placeholder-pattern': [
			'^(-?[a-z][a-z0-9]*)(-[a-z0-9]+)*$',
			{
				message: 'Expected placeholder to be kebab-case',
			},
		],
	},
};
