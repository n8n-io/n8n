import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { NoInvalidAriaRoleRule } from './no-invalid-aria-role.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string, style = ''): string {
	return `<template>${template}</template>${style ? `<style scoped>${style}</style>` : ''}`;
}

ruleTester.run('no-invalid-aria-role', NoInvalidAriaRoleRule, {
	valid: [
		{ filename: 'Component.vue', code: vue('<div role="button" />') },
		{ filename: 'Component.vue', code: vue('<Widget :role="role" />') },
		{ filename: 'Component.vue', code: vue('<div role="switch checkbox" />') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<div role="widget" />'),
			errors: [{ messageId: 'abstractRole' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<div role="datepicker" />'),
			errors: [{ messageId: 'invalidRole' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<div :role="\'invalid\'" />'),
			errors: [{ messageId: 'invalidRole' }],
		},
	],
});
