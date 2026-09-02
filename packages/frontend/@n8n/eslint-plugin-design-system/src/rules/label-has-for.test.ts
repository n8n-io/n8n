import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { LabelHasForRule } from './label-has-for.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string, style = ''): string {
	return `<template>${template}</template>${style ? `<style scoped>${style}</style>` : ''}`;
}

ruleTester.run('label-has-for', LabelHasForRule, {
	valid: [
		{ filename: 'Component.vue', code: vue('<label>Name<input /></label>') },
		{ filename: 'Component.vue', code: vue('<label for="name">Name</label><input id="name" />') },
		{
			filename: 'Component.vue',
			code: vue('<input id="name" /><label :for="controlId">Name</label>'),
		},
		{ filename: 'Component.vue', code: vue('<FormLabel>Label</FormLabel>') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<label>Name</label>'),
			errors: [{ messageId: 'labelHasFor' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<label for="name">Name</label><input id="email" />'),
			errors: [{ messageId: 'labelHasFor' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<label><span>Name</span></label>'),
			errors: [{ messageId: 'labelHasFor' }],
		},
	],
});
