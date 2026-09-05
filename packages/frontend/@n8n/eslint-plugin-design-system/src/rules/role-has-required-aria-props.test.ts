import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { RoleHasRequiredAriaPropsRule } from './role-has-required-aria-props.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string, style = ''): string {
	return `<template>${template}</template>${style ? `<style scoped>${style}</style>` : ''}`;
}

ruleTester.run('role-has-required-aria-props', RoleHasRequiredAriaPropsRule, {
	valid: [
		{ filename: 'Component.vue', code: vue('<div role="checkbox" :aria-checked="checked" />') },
		{
			filename: 'Component.vue',
			code: vue('<div role="combobox" aria-controls="options" :aria-expanded="open" />'),
		},
		{ filename: 'Component.vue', code: vue('<Widget :role="role" />') },
		{ filename: 'Component.vue', code: vue('<div role="spinbutton" aria-valuenow="1" />') },
		{ filename: 'Component.vue', code: vue('<div role="tab" :aria-selected="selected" />') },
		{ filename: 'Component.vue', code: vue('<div role="treeitem">Item</div>') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<div role="checkbox" />'),
			errors: [
				{
					messageId: 'missingProperty',
					data: { role: 'checkbox', property: 'aria-checked' },
				},
			],
		},
		{
			filename: 'Component.vue',
			code: vue('<div role="combobox" />'),
			errors: [{ messageId: 'missingProperty' }, { messageId: 'missingProperty' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<Widget role="slider" />'),
			errors: [{ messageId: 'missingProperty' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<div role="spinbutton" />'),
			errors: [{ messageId: 'missingProperty' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<div role="tab" />'),
			errors: [{ messageId: 'missingProperty' }],
		},
	],
});
