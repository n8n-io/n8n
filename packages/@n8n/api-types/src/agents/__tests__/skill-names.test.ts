import { skillNameKey } from '../skill-names';

describe('skillNameKey', () => {
	it.each([
		['Brand voice', 'brand-voice'],
		['Brand voice', 'brand_voice'],
		['Brand voice', '  BRAND   voice '],
		['Brand voice', 'brand -_ voice'],
	])('treats "%s" and "%s" as the same name', (left, right) => {
		expect(skillNameKey(left)).toBe(skillNameKey(right));
	});

	it('keeps other characters apart', () => {
		expect(skillNameKey('Brand voice')).not.toBe(skillNameKey('Brand voices'));
		expect(skillNameKey('brand.voice')).not.toBe(skillNameKey('brand voice'));
	});
});
