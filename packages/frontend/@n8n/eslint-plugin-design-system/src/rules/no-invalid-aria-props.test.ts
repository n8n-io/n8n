import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { NoInvalidAriaPropsRule } from './no-invalid-aria-props.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
	},
});

function vue(template: string) {
	return `<template>${template}</template>`;
}

ruleTester.run('no-invalid-aria-props', NoInvalidAriaPropsRule, {
	valid: [
		{
			filename: 'Component.vue',
			code: vue('<button aria-label="Close" />'),
		},
		{
			filename: 'Component.vue',
			code: vue('<button :aria-label="label" />'),
		},
		{
			filename: 'Component.vue',
			code: vue('<div aria-description="More information" aria-braillelabel="Info" />'),
		},
		{
			filename: 'Component.vue',
			code: vue('<div :aria-expanded="isExpanded" :aria-controls="targetId" />'),
		},
		{
			filename: 'Component.vue',
			code: vue('<div :[attributeName]="value" />'),
		},
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<button aria-lable="Close" />'),
			errors: [{ messageId: 'invalidAriaProp', data: { name: 'aria-lable' } }],
		},
		{
			filename: 'Component.vue',
			code: vue('<button :aria-lable="label" />'),
			errors: [{ messageId: 'invalidAriaProp', data: { name: 'aria-lable' } }],
		},
		{
			filename: 'Component.vue',
			code: vue('<div aria-example="one" :aria-other="two" />'),
			errors: [
				{ messageId: 'invalidAriaProp', data: { name: 'aria-example' } },
				{ messageId: 'invalidAriaProp', data: { name: 'aria-other' } },
			],
		},
	],
});
