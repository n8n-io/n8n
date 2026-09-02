import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { NoStaticElementInteractionsRule } from './no-static-element-interactions.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string, style = ''): string {
	return `<template>${template}</template>${style ? `<style scoped>${style}</style>` : ''}`;
}

ruleTester.run('no-static-element-interactions', NoStaticElementInteractionsRule, {
	valid: [
		{ filename: 'Component.vue', code: vue('<button @click="save">Save</button>') },
		{ filename: 'Component.vue', code: vue('<div role="button" @click="save">Save</div>') },
		{ filename: 'Component.vue', code: vue('<div :role="role" @keydown="handle" />') },
		{ filename: 'Component.vue', code: vue('<Widget @click="save" />') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<div @click="save">Save</div>'),
			errors: [{ messageId: 'staticInteraction' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<span role="note" @keydown="handle" />'),
			errors: [{ messageId: 'staticInteraction' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<section><p @pointerdown="start">Drag</p></section>'),
			errors: [{ messageId: 'staticInteraction' }],
		},
	],
});
