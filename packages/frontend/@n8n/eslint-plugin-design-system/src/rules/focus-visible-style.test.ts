import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { FocusVisibleStyleRule } from './focus-visible-style.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string, style = ''): string {
	return `<template>${template}</template>${style ? `<style scoped>${style}</style>` : ''}`;
}

ruleTester.run('focus-visible-style', FocusVisibleStyleRule, {
	valid: [
		{
			filename: 'Component.vue',
			code: vue('<button>Save</button>', 'button:focus-visible { outline: solid; }'),
		},
		{
			filename: 'Component.vue',
			code: vue('<a class="link" href="/">Home</a>', '.link:focus { outline: solid; }'),
		},
		{
			filename: 'Component.vue',
			code: vue('<Widget tabindex="0" />'),
		},
		{
			filename: 'Component.vue',
			code: vue('<button>Save</button>', ':focus-visible { outline: solid; }'),
		},
		{
			filename: 'Component.vue',
			code: vue(
				'<button class="save">Save</button>',
				'.save { &:focus-visible { outline: solid; } }',
			),
		},
		{
			filename: 'Component.vue',
			code: vue(
				'<button :class="$style.save">Save</button>',
				'.save { &:focus { outline: solid; } }',
			),
		},
		{
			filename: 'Component.vue',
			code: vue(
				'<button :class="$style[\'save-button\']">Save</button>',
				'.save-button:focus-visible { outline: solid; }',
			),
		},
		{ filename: 'Component.vue', code: vue('<button tabindex="-1">Toggle</button>') },
		{ filename: 'Component.vue', code: vue('<div>Static</div>') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<button>Save</button>'),
			errors: [{ messageId: 'missingFocusStyle' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<button class="save">Save</button>', '.other:focus { outline: solid; }'),
			errors: [{ messageId: 'missingFocusStyle' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<button>Save</button>', 'button:focus-within { outline: solid; }'),
			errors: [{ messageId: 'missingFocusStyle' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<button>Save</button>', 'button.save:focus { outline: solid; }'),
			errors: [{ messageId: 'missingFocusStyle' }],
		},
	],
});
