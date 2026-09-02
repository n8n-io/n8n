import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { NoPointerOnlyEventsRule } from './no-pointer-only-events.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(template: string): string {
	return `<template>${template}</template>`;
}

ruleTester.run('no-pointer-only-events', NoPointerOnlyEventsRule, {
	valid: [
		{ filename: 'Component.vue', code: vue('<button @pointerdown="start" />') },
		{ filename: 'Component.vue', code: vue('<a href="/next" @mousedown="open" />') },
		{
			filename: 'Component.vue',
			code: vue('<div @pointerdown="start" @keydown="startFromKeyboard" />'),
		},
		{ filename: 'Component.vue', code: vue('<div role="button" @mouseup="activate" />') },
		{ filename: 'Component.vue', code: vue('<div :role="role" @pointerup="activate" />') },
		{ filename: 'Component.vue', code: vue('<Widget @mousedown="activate" />') },
		{ filename: 'Component.vue', code: vue('<component :is="tag" @mousedown="activate" />') },
		{ filename: 'Component.vue', code: vue('<div @[event]="activate" />') },
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<div @mousedown="activate" />'),
			errors: [{ messageId: 'pointerOnly' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<span v-on:pointerdown="start" />'),
			errors: [{ messageId: 'pointerOnly' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<section role="note" @pointerup.stop="finish" />'),
			errors: [{ messageId: 'pointerOnly' }],
		},
	],
});
