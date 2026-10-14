import {
	findIntroducedNameClashes,
	findNameClashGroups,
	renameIntroducesClash,
	skillNameKey,
} from '../skills/skill-names';

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

describe('findIntroducedNameClashes', () => {
	it('returns an added name that clashes with an existing name', () => {
		expect(findIntroducedNameClashes(['Brand voice'], ['brand-voice', 'Pricing'])).toEqual([
			'brand-voice',
		]);
	});

	it('returns an added name that clashes with another added name', () => {
		expect(findIntroducedNameClashes([], ['Pricing', 'pricing'])).toEqual(['pricing']);
	});

	it('ignores clashes among the existing names', () => {
		expect(findIntroducedNameClashes(['Pricing', 'pricing'], ['Brand voice'])).toEqual([]);
	});
});

describe('renameIntroducesClash', () => {
	it('is true when the new name clashes with another skill of the agent', () => {
		expect(renameIntroducesClash(['Pricing'], 'Prices', 'pricing')).toBe(true);
	});

	it('is false when the new name differs from the old one only in case or separators', () => {
		expect(renameIntroducesClash(['brand-voice'], 'Brand voice', 'brand_voice')).toBe(false);
	});

	it('is false when no other skill has a similar name', () => {
		expect(renameIntroducesClash(['Pricing'], 'Brand voice', 'Tone')).toBe(false);
	});
});

describe('findNameClashGroups', () => {
	it('groups the names that clash, as written', () => {
		expect(
			findNameClashGroups(['Brand voice', 'Pricing', 'brand-voice', 'pricing', 'Tone']),
		).toEqual([
			['Brand voice', 'brand-voice'],
			['Pricing', 'pricing'],
		]);
	});

	it('returns no group when all names differ', () => {
		expect(findNameClashGroups(['Brand voice', 'Pricing'])).toEqual([]);
	});
});
