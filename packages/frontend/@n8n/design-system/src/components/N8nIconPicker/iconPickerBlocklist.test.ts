import { ICON_PICKER_BLOCKLIST } from './iconPickerBlocklist';

describe('ICON_PICKER_BLOCKLIST', () => {
	it('is a non-empty Set', () => {
		expect(ICON_PICKER_BLOCKLIST).toBeInstanceOf(Set);
		expect(ICON_PICKER_BLOCKLIST.size).toBeGreaterThan(0);
	});

	it('contains only strings', () => {
		for (const entry of ICON_PICKER_BLOCKLIST) {
			expect(typeof entry).toBe('string');
			expect(entry.length).toBeGreaterThan(0);
		}
	});

	it('contains expected navigation icons', () => {
		// Spot-check a few critical icons that must always be blocked
		expect(ICON_PICKER_BLOCKLIST.has('house')).toBe(true);
		expect(ICON_PICKER_BLOCKLIST.has('settings')).toBe(true);
		expect(ICON_PICKER_BLOCKLIST.has('search')).toBe(true);
		expect(ICON_PICKER_BLOCKLIST.has('git-branch')).toBe(true);
	});

	it('uses kebab-case icon names (Lucide convention)', () => {
		for (const entry of ICON_PICKER_BLOCKLIST) {
			// No uppercase letters, no spaces — kebab-case only
			expect(entry).toMatch(/^[a-z0-9-]+$/);
		}
	});
});
