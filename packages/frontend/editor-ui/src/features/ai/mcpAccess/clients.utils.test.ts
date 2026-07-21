import { describe, it, expect } from 'vitest';

import { getClientBrand } from './clients.utils';

describe('getClientBrand', () => {
	it.each([
		['Claude Code', 'cli'],
		['Claude', 'assistant'],
		['Cursor', 'ide'],
		['Visual Studio Code', 'editor'],
		['Codex CLI', 'cli'],
		['ChatGPT', 'assistant'],
		['Some Unknown Client', null],
	])('derives the type of %s as %s', (name, type) => {
		expect(getClientBrand(name).type).toBe(type);
	});

	it('resolves a logo for recognized brands and none for unknown clients', () => {
		expect(getClientBrand('Claude Code').icon).not.toBeNull();
		expect(getClientBrand('Cursor').icon).not.toBeNull();
		expect(getClientBrand('Some Unknown Client').icon).toBeNull();
	});
});
