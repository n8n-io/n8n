import { Linter } from 'eslint';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const fixtureDir = mkdtempSync(join(tmpdir(), 'n8n-vendored-dependencies-'));
const packageJson = {
	name: 'n8n-nodes-example',
	version: '1.0.0',
	author: { name: 'Jane Doe', email: 'jane@example.com' },
	dependencies: {},
	files: ['dist'],
};
writeFileSync(join(fixtureDir, 'package.json'), JSON.stringify(packageJson));

afterAll(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
});

const ruleId = '@n8n/community-nodes/no-vendored-dependencies';
const librarySource = `/*! js-yaml 4.1.0 | (c) 2011-2015 Kirill Simonov | MIT */
export const version = '4.1.0';`;

describe.each(['recommended', 'recommendedWithoutN8nCloudSupport'] as const)(
	'%s vendored dependency review',
	(config) => {
		const linter = new Linter({ cwd: fixtureDir });

		function lint(code: string, filename: string) {
			const messages = linter.verify(code, [{ ...configs[config], files: ['**/*.{ts,js,json}'] }], {
				filename: join(fixtureDir, filename),
			});
			expect(messages.filter(({ ruleId: reportedRuleId }) => !reportedRuleId)).toEqual([]);
			return messages;
		}

		// CE-3547: Empty dependencies must not hide a copied library's leading licence header.
		it.each(['ts', 'js'])('warns about the js-yaml header in a .%s helper', (extension) => {
			expect(lint(librarySource, `src/vendor/js-yaml.${extension}`)).toEqual([
				expect.objectContaining({
					ruleId,
					severity: 1,
					message: expect.stringContaining('carries a third-party licence header'),
				}),
			]);
		});

		it.each([
			'Copyright (c) Other Author',
			'Copyright (c) 2020-2026 Other Author',
			'@license MIT',
			'Licensed under the MIT license',
			'Licensed under the Apache License, Version 2.0',
			'Licensed under the BSD license',
			'Licensed under the ISC license',
			'This file is part of Example Library',
		])('warns about a leading %s header', (header) => {
			expect(lint(`/* ${header} */\nexport const value = 1;`, 'src/helper.ts')).toEqual([
				expect.objectContaining({ ruleId, severity: 1 }),
			]);
		});

		it('warns once for a comment-only library file', () => {
			expect(
				lint('/* @license MIT */\n/* Licensed under the MIT license */', 'src/helper.js'),
			).toEqual([expect.objectContaining({ ruleId, severity: 1 })]);
		});

		it('warns about non-empty bundledDependencies without runtime dependencies', () => {
			const code = JSON.stringify({ ...packageJson, bundledDependencies: ['js-yaml'] });
			// These rules inspect the package object as a JavaScript expression.
			const messages = lint(`(${code})`, 'package.json');

			expect(messages.filter((message) => message.ruleId === ruleId)).toEqual([
				expect.objectContaining({ ruleId, severity: 1 }),
			]);
		});

		it('accepts empty bundledDependencies', () => {
			const code = JSON.stringify({ ...packageJson, bundledDependencies: [] });
			const messages = lint(`(${code})`, 'package.json');

			expect(messages.filter((message) => message.ruleId === ruleId)).toEqual([]);
		});

		it.each([{ bundleDependencies: ['js-yaml'] }, { bundledDependencies: true }])(
			'warns about the npm bundle setting %j',
			(bundleSetting) => {
				const code = JSON.stringify({ ...packageJson, ...bundleSetting });
				expect(
					lint(`(${code})`, 'package.json').filter((message) => message.ruleId === ruleId),
				).toEqual([expect.objectContaining({ ruleId, severity: 1 })]);
			},
		);

		it('ignores nested bundledDependencies', () => {
			const code = JSON.stringify({ ...packageJson, config: { bundledDependencies: ['js-yaml'] } });
			expect(
				lint(`(${code})`, 'package.json').filter((message) => message.ruleId === ruleId),
			).toEqual([]);
		});

		it('accepts the package author copyright header', () => {
			const code = `/* Copyright (c) Jane Doe */
export const boundary = 'n8n-example-boundary';`;

			expect(lint(code, 'src/boundary.ts')).toEqual([]);
		});

		it('accepts the package author licence header with a year', () => {
			const code = `/* Copyright (c) 2026 Jane Doe. All rights reserved.
 * @license MIT
 */
export const value = 1;`;
			expect(lint(code, 'src/helper.ts')).toEqual([]);
		});

		it('accepts the copyright holder in an npm author string', () => {
			writeFileSync(
				join(fixtureDir, 'package.json'),
				JSON.stringify({
					...packageJson,
					author: 'Jane Doe <jane@example.com> (https://example.com)',
				}),
			);
			try {
				expect(
					lint('/* Copyright (c) Jane Doe */\nexport const value = 1;', 'src/helper.js'),
				).toEqual([]);
			} finally {
				writeFileSync(join(fixtureDir, 'package.json'), JSON.stringify(packageJson));
			}
		});

		it('reports a third-party copyright next to the package author', () => {
			const code = `/* Copyright (c) Jane Doe
 * Copyright (c) Other Author
 */
export const value = 1;`;
			expect(lint(code, 'src/helper.ts')).toEqual([
				expect.objectContaining({ ruleId, severity: 1 }),
			]);
		});

		it('ignores licence text in strings and comments after code', () => {
			const code = `export const text = 'Licensed under the MIT license';
/* @license MIT */`;
			expect(lint(code, 'src/helper.js')).toEqual([]);
		});

		it('accepts an original multipart encoder with an explanatory comment', () => {
			const code = `// Encode only text fields because community nodes cannot use runtime dependencies.
export function encodeMultipart(fields, boundary) {
	return Object.entries(fields).map(([name, value]) =>
		'--' + boundary + '\\r\\nContent-Disposition: form-data; name="' + name +
		'"\\r\\n\\r\\n' + value + '\\r\\n'
	).join('') + '--' + boundary + '--\\r\\n';
}`;

			expect(lint(code, 'src/multipart.ts')).toEqual([]);
		});

		it('accepts build output in dist', () => {
			expect(lint("export const boundary = 'n8n-example-boundary';", 'dist/boundary.js')).toEqual(
				[],
			);
		});

		it('accepts a licence header in build output', () => {
			expect(lint(librarySource, 'dist/helper.js')).toEqual([]);
		});

		it('reports declared runtime dependencies to verify the lint setup', () => {
			const code = JSON.stringify({ ...packageJson, dependencies: { 'js-yaml': '4.1.0' } });
			const messages = lint(`(${code})`, 'package.json');

			expect(messages).toContainEqual(
				expect.objectContaining({
					ruleId: '@n8n/community-nodes/no-runtime-dependencies',
					severity: 2,
				}),
			);
		});
	},
);
