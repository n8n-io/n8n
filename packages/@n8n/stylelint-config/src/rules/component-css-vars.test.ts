import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import stylelint from 'stylelint';
import plugin from './component-css-vars';

const directory = mkdtempSync(join(tmpdir(), 'n8n-component-css-vars-'));
const themeFile = join(directory, 'theme.scss');
writeFileSync(
	themeFile,
	`// --comment-only: red;
	@mixin theme {
		--background--surface: white;
		--text-color: black;
	}
	[data-theme='dark'] { --background--surface: black; }`,
);

afterAll(() => rmSync(directory, { recursive: true, force: true }));

async function lint(code: string, ignoreVariables: string[] = [], vue = false) {
	const result = await stylelint.lint({
		code,
		...(vue ? { customSyntax: 'postcss-html' } : { customSyntax: 'postcss-scss' }),
		config: {
			plugins: [plugin],
			rules: {
				'@n8n/component-css-vars': [true, { themeFiles: [themeFile], ignoreVariables }],
			},
		},
	});
	return result.results[0].warnings;
}

describe('component-css-vars', () => {
	it('accepts theme declarations and component overrides', async () => {
		expect(
			await lint(`.input {
				--background--surface: black;
				--n8n-input--background-color: var(--background--surface);
				background: var(--n8n-input--background-color, var(--background--surface));
				color: var(--text-color);
				border-color: var(--n8n-input--border-color--hover);
			}`),
		).toEqual([]);
	});

	it.each([
		'--input-bg',
		'--input--background-color',
		'--n8n--input--background-color',
		'--n8n-input-background-color',
		'--n8n-input--',
		'--n8n-Input--color',
		'--n8n-input--background_color',
		'--background--unknown',
		'--comment-only',
	])('rejects the declaration and reference for %s', async (variable) => {
		const warnings = await lint(`.input { ${variable}: red; color: var(${variable}); }`);
		expect(warnings).toHaveLength(2);
		expect(warnings.every((warning) => warning.text.includes(`"${variable}"`))).toBe(true);
	});

	it('checks nested fallbacks and whitespace before variable names', async () => {
		const warnings = await lint(`.input {
			color: var( --n8n-input--color, var(\n --missing-theme-color, var(--text-color)));
		}`);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].text).toContain('"--missing-theme-color"');
	});

	it('allows only the configured runtime variables', async () => {
		const warnings = await lint('.spinner { opacity: var(--step); height: var(--step-height); }', [
			'--step',
		]);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].text).toContain('"--step-height"');
	});

	it('ignores strings, comments and Sass variables', async () => {
		expect(
			await lint(`$--local: red;
			.input { color: $--local; content: "var(--example)";
				font-family: 'var(--example)'; background: red /* var(--example) */; }
		`),
		).toEqual([]);
	});

	it('checks every Vue style block without checking the script or template', async () => {
		const warnings = await lint(
			`<script setup>const example = 'var(--script-variable)';</script>
			<template><div style="color: var(--inline-variable)" /></template>
			<style scoped lang="scss">.input { color: var(--first); }</style>
			<style module>.input { color: var(--second); }</style>`,
			[],
			true,
		);
		expect(warnings).toHaveLength(2);
		expect(warnings.map((warning) => warning.text)).toEqual([
			expect.stringContaining('"--first"'),
			expect.stringContaining('"--second"'),
		]);
	});
});
