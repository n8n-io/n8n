import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { NoAccessKeyRule } from './no-access-key.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string, style = ''): string {
	return `<template>${template}</template>${style ? `<style scoped>${style}</style>` : ''}`;
}

ruleTester.run('no-access-key', NoAccessKeyRule, {
	valid: [
		{ filename: 'Component.vue', code: vue('<button aria-keyshortcuts="Alt+S" />') },
		{ filename: 'Component.vue', code: vue('<Widget :shortcut="shortcut" />') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<button accesskey="s" />'),
			errors: [{ messageId: 'noAccessKey' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<Widget :accesskey="shortcut" />'),
			errors: [{ messageId: 'noAccessKey' }],
		},
	],
});
