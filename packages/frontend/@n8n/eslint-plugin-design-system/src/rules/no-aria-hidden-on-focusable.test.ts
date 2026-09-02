import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { NoAriaHiddenOnFocusableRule } from './no-aria-hidden-on-focusable.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string, style = ''): string {
	return `<template>${template}</template>${style ? `<style scoped>${style}</style>` : ''}`;
}

ruleTester.run('no-aria-hidden-on-focusable', NoAriaHiddenOnFocusableRule, {
	valid: [
		{
			filename: 'Component.vue',
			code: vue('<div aria-hidden="true"><span>Decoration</span></div>'),
		},
		{ filename: 'Component.vue', code: vue('<button :aria-hidden="hidden" />') },
		{ filename: 'Component.vue', code: vue('<input type="hidden" aria-hidden="true" />') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<button aria-hidden="true" />'),
			errors: [{ messageId: 'hiddenFocusable' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<div aria-hidden="true"><span><a href="/help">Help</a></span></div>'),
			errors: [{ messageId: 'hiddenFocusable' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<Widget tabindex="0" aria-hidden="true" />'),
			errors: [{ messageId: 'hiddenFocusable' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<button :aria-hidden="true" />'),
			errors: [{ messageId: 'hiddenFocusable' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<div aria-hidden="true"><span tabindex="-1" /></div>'),
			errors: [{ messageId: 'hiddenFocusable' }],
		},
	],
});
