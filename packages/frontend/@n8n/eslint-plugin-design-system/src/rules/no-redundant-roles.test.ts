import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { NoRedundantRolesRule } from './no-redundant-roles.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string, style = ''): string {
	return `<template>${template}</template>${style ? `<style scoped>${style}</style>` : ''}`;
}

ruleTester.run('no-redundant-roles', NoRedundantRolesRule, {
	valid: [
		{ filename: 'Component.vue', code: vue('<button role="switch" aria-checked="false" />') },
		{ filename: 'Component.vue', code: vue('<a role="button">Action</a>') },
		{ filename: 'Component.vue', code: vue('<Widget role="button" />') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<button role="button" />'),
			errors: [{ messageId: 'redundantRole' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<a href="/" role="link">Home</a>'),
			errors: [{ messageId: 'redundantRole' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<input type="checkbox" :role="\'checkbox\'" />'),
			errors: [{ messageId: 'redundantRole' }],
		},
	],
});
