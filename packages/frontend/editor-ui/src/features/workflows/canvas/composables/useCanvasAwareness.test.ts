import { describe, it, expect } from 'vitest';
import { getUserCursorColor } from './useCanvasAwareness';

describe('getUserCursorColor', () => {
	it('is deterministic for the same user id', () => {
		expect(getUserCursorColor('user-123')).toBe(getUserCursorColor('user-123'));
	});

	it('returns a hex color from the palette', () => {
		expect(getUserCursorColor('user-123')).toMatch(/^#[0-9A-F]{6}$/i);
	});

	it('distributes different ids across colors', () => {
		const colors = new Set(
			Array.from({ length: 20 }, (_, index) => getUserCursorColor(`user-${index}`)),
		);
		expect(colors.size).toBeGreaterThan(1);
	});
});
