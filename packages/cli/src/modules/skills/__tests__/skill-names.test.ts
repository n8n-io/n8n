import {
	findIntroducedNameClashes,
	findNameClashGroups,
	renameIntroducesClash,
} from '../utils/skill-names';

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
