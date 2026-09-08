import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { NoPositiveTabindexRule } from './no-positive-tabindex.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string, style = ''): string {
	return `<template>${template}</template>${style ? `<style scoped>${style}</style>` : ''}`;
}

ruleTester.run('no-positive-tabindex', NoPositiveTabindexRule, {
	valid: [
		{ filename: 'Component.vue', code: vue('<button tabindex="0" />') },
		{ filename: 'Component.vue', code: vue('<div :tabindex="tabIndex" />') },
		{ filename: 'Component.vue', code: vue('<Widget :tabindex="-1" />') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<button tabindex="1" />'),
			errors: [{ messageId: 'positiveTabindex' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<div :tabindex="2" />'),
			errors: [{ messageId: 'positiveTabindex' }],
		},
	],
});
