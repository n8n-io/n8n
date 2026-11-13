import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll } from 'vitest';
import * as vueParser from 'vue-eslint-parser';

import {
	findUnteleportedTooltipsInSource,
	RequireTeleportedTooltipInDropdownRule,
} from './require-teleported-tooltip-in-dropdown.js';

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
		...['(true)', '((true))', 'true /* note */', ' true '].map((binding) => ({
			name: `the binding ${binding}`,
			filename: 'Component.vue',
			code: vue(`<N8nDropdownMenu><N8nTooltip :teleported="${binding}" /></N8nDropdownMenu>`),
		})),
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
			errors: [{ messageId: 'requireTeleported', line: 1, column: 40, endColumn: 59 }],
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
		...['(false)', '!false', 'true || shouldTeleport', '"true"'].map((binding) => ({
			name: `the binding ${binding}`,
			filename: 'Component.vue',
			code: vue(`<N8nDropdownMenu><N8nTooltip :teleported='${binding}' /></N8nDropdownMenu>`),
			errors: [{ messageId: 'requireTeleported' as const }],
		})),
	],
});

// Oxlint gives the rule the text of one script block, and the rule reads the
// SFC from disk. The default parser stands in for Oxlint's script parser.
const oxlintTester = new RuleTester();
const dir = mkdtempSync(join(tmpdir(), 'require-teleported-tooltip-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let count = 0;
const sfcFile = (sfc: string) => {
	const filename = join(dir, `Component${count++}.vue`);
	writeFileSync(filename, sfc);
	return filename;
};

const badTemplate =
	'<template>\n\t<N8nDropdownMenu><N8nTooltip :teleported="false" /></N8nDropdownMenu>\n</template>\n';
const twoScripts = `<script lang="ts">\nexport default {};\n</script>\n<script setup lang="ts">\nconst b = 2;\n</script>\n${badTemplate}`;

oxlintTester.run(
	'require-teleported-tooltip-in-dropdown, as Oxlint runs it',
	RequireTeleportedTooltipInDropdownRule,
	{
		valid: [
			{
				name: 'a teleported tooltip',
				code: 'const a = 1;',
				filename: sfcFile(
					'<script setup lang="ts">\nconst a = 1;\n</script>\n<template><N8nDropdownMenu><N8nTooltip /></N8nDropdownMenu></template>\n',
				),
			},
			{
				name: 'an SFC with no dropdown menu',
				code: 'const a = 1;',
				filename: sfcFile(
					'<script setup lang="ts">\nconst a = 1;\n</script>\n<template><N8nTooltip :teleported="false" /></template>\n',
				),
			},
			{
				name: 'the second script block, so that the problem is reported once',
				code: 'const b = 2;',
				filename: sfcFile(twoScripts),
			},
		],
		invalid: [
			{
				code: 'const a = 1;',
				filename: sfcFile(`<script setup lang="ts">\nconst a = 1;\n</script>\n${badTemplate}`),
				errors: [{ messageId: 'requireTeleportedAt', data: { line: 5, column: 31 } }],
			},
			{
				name: 'the first of two script blocks',
				code: 'export default {};',
				filename: sfcFile(twoScripts),
				errors: [{ messageId: 'requireTeleportedAt', data: { line: 8, column: 31 } }],
			},
		],
	},
);

describe('findUnteleportedTooltipsInSource', () => {
	it('reports the position of the attribute in the SFC', () => {
		const [found] = findUnteleportedTooltipsInSource(
			'<script setup lang="ts">\n</script>\n\n<template>\n\t<N8nDropdownMenu>\n\t\t<N8nTooltip :teleported="false" />\n\t</N8nDropdownMenu>\n</template>\n',
		);
		expect([found?.start.line, found?.start.column]).toEqual([6, 15]);
	});

	it('does not throw on a template that does not parse', () => {
		expect(() =>
			findUnteleportedTooltipsInSource(
				'<template><N8nDropdownMenu><N8nTooltip :teleported="false"></N8nDropdownMenu></template>',
			),
		).not.toThrow();
	});
});
