import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { RequireTeleportedTooltipInDropdownRule } from './require-teleported-tooltip-in-dropdown.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
	},
});

const vue = (template: string) => `<template>${template}</template>`;

ruleTester.run('require-teleported-tooltip-in-dropdown', RequireTeleportedTooltipInDropdownRule, {
	valid: [
		{
			filename: 'Component.vue',
			code: vue('<N8nDropdownMenu><N8nTooltip /></N8nDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<N8nDropdownMenu><N8nTooltip teleported /></N8nDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<N8nDropdownMenu><N8nTooltip teleported="" /></N8nDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<N8nDropdownMenu><N8nTooltip teleported="true" /></N8nDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<N8nDropdownMenu><N8nTooltip :teleported="true" /></N8nDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<N8nTooltip :teleported="false" />'),
		},
		{
			filename: 'Component.vue',
			code: vue(
				'<n8n-dropdown-menu><template #item-label><n8n-tooltip /></template></n8n-dropdown-menu>',
			),
		},
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<N8nDropdownMenu><N8nTooltip :teleported="false" /></N8nDropdownMenu>'),
			errors: [{ messageId: 'requireTeleported' }],
		},
		{
			filename: 'Component.vue',
			code: vue(
				'<N8nDropdownMenu><template #item-label><N8nTooltip :teleported="shouldTeleport" /></template></N8nDropdownMenu>',
			),
			errors: [{ messageId: 'requireTeleported' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<n8n-dropdown-menu><n8n-tooltip :teleported="false" /></n8n-dropdown-menu>'),
			errors: [{ messageId: 'requireTeleported' }],
		},
	],
});
