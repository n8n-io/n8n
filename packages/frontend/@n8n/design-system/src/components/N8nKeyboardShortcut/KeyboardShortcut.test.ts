import { describe, expect, it } from 'vitest';
import source from './N8nKeyboardShortcut.vue?raw';

describe('N8nKeyboardShortcut styles', () => {
	it('accepts a border color override such as the tooltip transparent value', () => {
		/** DOM tests do not resolve CSS custom properties. Check the declaration directly. */
		expect(source).toContain(
			'border: 0.5px solid var(--n8n--kbd-border, var(--border-color--subtle));',
		);
	});

	it('keeps the existing key design', () => {
		for (const declaration of [
			'border-radius: var(--radius--2xs);',
			'background-clip: padding-box;',
			'box-shadow: var(--shadow--xs);',
			'font-weight: var(--font-weight--bold);',
			'font-family: var(--font-family--monospace);',
			'font-variant-numeric: tabular-nums;',
		])
			expect(source).toContain(declaration);
	});
});
