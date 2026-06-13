import { describe, expect, it } from 'vitest';

import { shouldStopRenamePromptSpacePropagation } from './NodeView.utils';

describe('shouldStopRenamePromptSpacePropagation', () => {
	it.each([
		[{ key: ' ', code: 'Space' }],
		[{ key: ' ', code: '' }],
		[{ key: 'Spacebar', code: '' }],
		[{ key: '', code: 'Space' }],
	])('returns true for space key variants: %o', (event) => {
		expect(shouldStopRenamePromptSpacePropagation(event)).toBe(true);
	});

	it.each([
		[{ key: 'Enter', code: 'Enter' }],
		[{ key: 'Tab', code: 'Tab' }],
		[{ key: ':', code: 'Semicolon' }],
	])('returns false for non-space keys: %o', (event) => {
		expect(shouldStopRenamePromptSpacePropagation(event)).toBe(false);
	});
});
