import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { CssModuleClassUsageRule } from './css-module-class-usage.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
	},
});

const component = (template: string, style: string, script = '') =>
	`${script}<template>${template}</template><style module>${style}</style>`;

ruleTester.run('css-module-class-usage', CssModuleClassUsageRule, {
	valid: [
		{
			filename: 'Component.vue',
			code: component('<div :class="$style.box" />', '.box { color: red; }'),
		},
		{
			filename: 'Component.vue',
			code: component('<div :class="[open && $style.box]" />', '.box { color: red; }'),
		},
		{
			filename: 'Component.vue',
			code: component('<div :class="$style[\'box\']" />', '.box { color: red; }'),
		},
		{
			filename: 'Component.vue',
			code: component(
				'<div :class="$style.box" />',
				'.box {}\n:global(.outside) { display: none; }',
			),
		},
		{
			filename: 'Component.vue',
			code: component(
				'<div :class="$style.modal"><div :class="$style.list" /></div>',
				'.modal { .list { gap: 0; } }',
			),
		},
		{
			filename: 'Component.vue',
			code: `<template><div :class="classes.box" /></template><style module="classes">.box {}</style>`,
		},
		{
			filename: 'Component.vue',
			code: component(
				'<div :class="classes.box" />',
				'.box {}',
				'<script setup lang="ts">const classes = useCssModule();</script>',
			),
		},
		{
			filename: 'Component.vue',
			code: component(
				'<div />',
				'.box {}',
				'<script setup lang="ts">const { box } = useCssModule();</script>',
			),
		},
		{
			// A computed key can read any class, so an unused warning is not sound.
			filename: 'Component.vue',
			code: component('<div :class="$style[name]" />', '.box {}'),
		},
		{
			filename: 'Component.vue',
			code: '<template><div class="box" /></template><style>.box {}</style>',
		},
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: component('<div />', '.box { color: red; }'),
			errors: [{ messageId: 'unusedClass', data: { name: 'box' } }],
		},
		{
			filename: 'Component.vue',
			code: component('<div :class="$style.box" />', '.other {}'),
			errors: [
				{ messageId: 'missingClass', data: { name: 'box' } },
				{ messageId: 'unusedClass', data: { name: 'other' } },
			],
		},
		{
			filename: 'Component.vue',
			code: component('<div :class="$style.searchInput" />', '.icon { flex: none; }'),
			errors: [
				{ messageId: 'missingClass', data: { name: 'searchInput' } },
				{ messageId: 'unusedClass', data: { name: 'icon' } },
			],
		},
		{
			filename: 'Component.vue',
			code: component('<div :class="[$style.missing, $style[name]]" />', '.box {}'),
			errors: [{ messageId: 'missingClass', data: { name: 'missing' } }],
		},
	],
});
