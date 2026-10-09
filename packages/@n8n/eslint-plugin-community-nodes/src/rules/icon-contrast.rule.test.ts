import { RuleTester } from '@typescript-eslint/rule-tester';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

import { IconContrastRule } from './icon-contrast.js';

const dir = mkdtempSync(join(tmpdir(), 'icon-contrast-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const icon = (name: string, svg: string) => {
	writeFileSync(join(dir, `${name}.svg`), svg);
	return `file:${name}.svg`;
};

const black = icon('black', '<svg><path fill="currentColor" /></svg>');
const white = icon('white', '<svg><path fill="white" /></svg>');
const grey = icon('grey', '<svg><path style="fill: #777" /></svg>');
const gradient = icon(
	'gradient',
	'<svg><defs><linearGradient id="g"><stop stop-color="white" /></linearGradient></defs><path fill="url(#g)" /></svg>',
);
const image = icon('image', '<svg><image href="data:image/png;base64,a" /></svg>');
const missingStops = icon('missing-stops', '<svg><path fill="url(#g)" /></svg>');
const png = 'file:picture.png';

const node = (value: string) =>
	`export class TestNode extends Node { description = { icon: ${value} }; }`;
const credential = (value: string) =>
	`export class TestCredential implements ICredentialType { icon = ${value}; }`;
const themed = (light: string, dark: string) => `{ light: '${light}', dark: '${dark}' }`;
const warning = (theme: string, ratio: string, minimum = '1.5') => ({
	messageId: 'lowContrast' as const,
	data: { theme, ratio, minimum },
});

new RuleTester().run('icon-contrast', IconContrastRule, {
	valid: [
		{
			name: 'themed icons match their backgrounds',
			filename: join(dir, 'Test.node.ts'),
			code: node(themed(black, white)),
		},
		{
			name: 'one SVG works on both themes',
			filename: join(dir, 'Test.node.ts'),
			code: node(`'${grey}'`),
		},
		{
			name: 'gradient uses its stop color',
			filename: join(dir, 'Test.node.ts'),
			code: node(themed(black, gradient)),
		},
		{ name: 'skips embedded image', filename: join(dir, 'Test.node.ts'), code: node(`'${image}'`) },
		{
			name: 'skips unresolved paint',
			filename: join(dir, 'Test.node.ts'),
			code: node(`'${missingStops}'`),
		},
		{ name: 'skips PNG', filename: join(dir, 'Test.node.ts'), code: node(`'${png}'`) },
		{
			name: 'skips missing files',
			filename: join(dir, 'Test.node.ts'),
			code: node("'file:missing.svg'"),
		},
		{
			name: 'skips unrelated classes',
			filename: join(dir, 'Test.node.ts'),
			code: `class Other { icon = '${black}'; }`,
		},
		{ name: 'skips other files', filename: join(dir, 'Test.ts'), code: node(`'${black}'`) },
	],
	invalid: [
		{
			name: 'single icon checks the dark theme',
			filename: join(dir, 'Test.node.ts'),
			code: node(`'${black}'`),
			errors: [warning('dark', '1.48')],
		},
		{
			name: 'single icon checks the light theme',
			filename: join(dir, 'Test.node.ts'),
			code: node(`'${white}'`),
			errors: [warning('light', '1.00')],
		},
		{
			name: 'themed icon checks each slot',
			filename: join(dir, 'Test.node.ts'),
			code: node(themed(white, black)),
			errors: [warning('light', '1.00'), warning('dark', '1.48')],
		},
		{
			name: 'credential icon checks both themes',
			filename: join(dir, 'Test.credentials.ts'),
			code: credential(`'${black}'`),
			errors: [warning('dark', '1.48')],
		},
		{
			name: 'credential dark slot is checked',
			filename: join(dir, 'Test.credentials.ts'),
			code: credential(themed(black, black)),
			errors: [warning('dark', '1.48')],
		},
		{
			name: 'custom minimum catches weaker graphics',
			filename: join(dir, 'Test.node.ts'),
			code: node(themed(grey, white)),
			options: [{ minimum: 5 }],
			errors: [warning('light', '4.48', '5')],
		},
	],
});
