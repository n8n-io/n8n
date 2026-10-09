import { Linter } from 'eslint';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const contrastRuleId = '@n8n/community-nodes/icon-contrast';
const themedVariantsRuleId = '@n8n/community-nodes/icon-prefer-themed-variants';

let fixtureDir: string;
let nodeFilePath: string;

beforeAll(() => {
	fixtureDir = mkdtempSync(join(process.cwd(), 'icon-contrast-test-'));
	mkdirSync(join(fixtureDir, 'icons'));
	nodeFilePath = join(fixtureDir, 'Test.node.ts');
	writeFileSync(
		join(fixtureDir, 'icons', 'black.svg'),
		'<svg xmlns="http://www.w3.org/2000/svg"><path fill="#000" d="M0 0h10v10H0z"/></svg>',
	);
});

afterAll(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
});

const nodeCode = `
export class TestNode extends Node {
	description = {
		icon: { light: 'file:icons/black.svg', dark: 'file:icons/black.svg' },
	};
}`;

it('recognizes the node icon in the test source', () => {
	const messages = new Linter().verify(
		"export class TestNode extends Node { description = { icon: 'file:icons/black.svg' }; }",
		{
			files: ['**/*.ts'],
			plugins: configs.recommended.plugins,
			rules: { [themedVariantsRuleId]: 'warn' },
		},
		{ filename: nodeFilePath },
	);

	expect(messages).toEqual([
		expect.objectContaining({ ruleId: themedVariantsRuleId, severity: 1 }),
	]);
});

it.each([
	['recommended', configs.recommended],
	['recommendedWithoutN8nCloudSupport', configs.recommendedWithoutN8nCloudSupport],
] as const)('%s warns when both theme slots use a black SVG', (_name, config) => {
	const contrastOnly = Object.fromEntries(
		Object.entries(config.rules).filter(([ruleId]) => ruleId === contrastRuleId),
	);
	const messages = new Linter().verify(
		nodeCode,
		{ files: ['**/*.ts'], plugins: config.plugins, rules: contrastOnly },
		{ filename: nodeFilePath },
	);

	// CE-3261: black on the dark node background has only 1.48:1 contrast.
	expect(messages).toEqual([
		expect.objectContaining({
			ruleId: contrastRuleId,
			severity: 1,
			message: expect.stringMatching(/1\.48/),
		}),
	]);
});
