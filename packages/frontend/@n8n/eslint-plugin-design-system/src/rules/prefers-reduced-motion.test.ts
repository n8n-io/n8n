import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { PrefersReducedMotionRule } from './prefers-reduced-motion.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
});

function vue(style: string): string {
	return `<template><div /></template><style scoped>${style}</style>`;
}

ruleTester.run('prefers-reduced-motion', PrefersReducedMotionRule, {
	valid: [
		{ filename: 'Component.vue', code: vue('.card { animation: none; transition: none; }') },
		{
			filename: 'Component.vue',
			code: vue(`
				.card { animation: enter 200ms ease-out; }
				@media (prefers-reduced-motion: reduce) {
					.card { animation: none; }
				}
			`),
		},
		{
			filename: 'Component.vue',
			code: vue(`
				.card { transition: transform 200ms ease-out; scroll-behavior: smooth; }
				@media (prefers-reduced-motion: reduce) {
					.card { transition: none; scroll-behavior: auto; }
				}
			`),
		},
		{
			filename: 'Component.vue',
			code: vue(`
				.card { animation-name: enter; transition-property: opacity; }
				@media (prefers-reduced-motion: reduce) {
					* { animation: none; transition: none; }
				}
			`),
		},
		{
			filename: 'Component.vue',
			code: vue(`
				.card {
					&:hover { transition: opacity 100ms ease; }
				}
				@media (prefers-reduced-motion: reduce) {
					.card:hover { transition: none; }
				}
			`),
		},
		{
			filename: 'Component.vue',
			code: vue(`
				@media (prefers-reduced-motion: reduce) {
					.card { animation: fade 1s; }
				}
			`),
		},
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('.card { animation: enter 200ms ease-out; }'),
			errors: [
				{ messageId: 'missingReducedMotion', data: { property: 'animation', selector: '.card' } },
			],
		},
		{
			filename: 'Component.vue',
			code: vue(`
				.card { transition: opacity 200ms ease; scroll-behavior: smooth; }
				@media (prefers-reduced-motion: reduce) {
					.card { transition: none; }
				}
			`),
			errors: [
				{
					messageId: 'missingReducedMotion',
					data: { property: 'scroll-behavior', selector: '.card' },
				},
			],
		},
		{
			filename: 'Component.vue',
			code: vue(`
				.card, .panel { animation-name: enter; }
				@media (prefers-reduced-motion: reduce) {
					.card { animation: none; }
				}
			`),
			errors: [
				{
					messageId: 'missingReducedMotion',
					data: { property: 'animation-name', selector: '.panel' },
				},
			],
		},
	],
});
