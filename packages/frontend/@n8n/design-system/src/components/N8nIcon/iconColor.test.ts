import { resolveIconColor } from './iconColor';

describe('resolveIconColor', () => {
	it('maps named IconColor tokens to their design-system CSS variable', () => {
		expect(resolveIconColor('primary')).toBe('var(--color--primary)');
		expect(resolveIconColor('text-light')).toBe('var(--color--text--tint-1)');
	});

	it('uses raw CSS custom properties directly', () => {
		expect(resolveIconColor('--node--icon--color--blue')).toBe('var(--node--icon--color--blue)');
	});

	it('returns undefined for no color or unknown non-variable values', () => {
		expect(resolveIconColor(undefined)).toBeUndefined();
		expect(resolveIconColor('')).toBeUndefined();
		expect(resolveIconColor('not-a-token')).toBeUndefined();
	});
});
