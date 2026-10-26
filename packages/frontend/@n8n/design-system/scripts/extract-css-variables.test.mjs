import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractCssVariables } from './extract-css-variables.mjs';

describe('CSS variable extraction', () => {
	it('keeps public names, nested fallbacks, selectors, and conditions', () => {
		const root = mkdtempSync(join(tmpdir(), 'manifest-css-'));
		try {
			const file = join(root, 'fixture.scss');
			writeFileSync(file, '@media (min-width: 1px) { .root { --n8n-button--height: 20px; color: var(--n8n-button--color, var(--n8n-button--fallback, rgb(1, 2, 3))); width: var(--n8n--private); height: var(--other); } }');
			const entries = extractCssVariables(file, root);
			expect(entries.map((entry) => entry.name)).toEqual(['--n8n-button--color', '--n8n-button--fallback', '--n8n-button--height']);
			expect(entries[0].default).toBe('var(--n8n-button--fallback, rgb(1, 2, 3))');
			expect(entries[1].default).toBe('rgb(1, 2, 3)');
			expect(entries[2].occurrences[0]).toMatchObject({ selector: '.root', conditions: ['@media (min-width: 1px)'], kind: 'declaration', source: { file: 'fixture.scss', line: 1 } });
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('follows cyclic local imports once and retains conflicting defaults', () => {
		const root = mkdtempSync(join(tmpdir(), 'manifest-css-'));
		try {
			writeFileSync(join(root, 'fixture.scss'), '@use "./shared"; .root { color: var(--n8n-color, red); }');
			writeFileSync(join(root, '_shared.scss'), '@use "./fixture"; .inner { color: var(--n8n-color, blue); width: var(--n8n-width); }');
			const entries = extractCssVariables(join(root, 'fixture.scss'), root);
			expect(entries[0].default).toBeNull();
			expect(entries[0].occurrences.map((item) => item.default)).toEqual(['blue', 'red']);
			expect(entries[1].default).toBeNull();
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
