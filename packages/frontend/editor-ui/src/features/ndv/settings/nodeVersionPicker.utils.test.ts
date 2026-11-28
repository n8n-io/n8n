import { getNodeVersionChoices } from './nodeVersionPicker.utils';

const hides =
	(...hidden: number[]) =>
	(version: number) =>
		hidden.includes(version);

describe('getNodeVersionChoices', () => {
	it('sorts the versions numerically, highest first', () => {
		expect(getNodeVersionChoices([1, 4.5, 3, 4.1, 2], hides(), 3, 4.5).listed).toEqual([
			4.5, 4.1, 3, 2, 1,
		]);
	});

	it('drops a hidden version', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(2), 1, 3).listed).toEqual([3, 1]);
	});

	it('keeps a hidden version when it is the current version', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(2), 2, 3).listed).toEqual([3, 2, 1]);
	});

	it('drops a version above the latest version', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(), 1, 2).listed).toEqual([2, 1]);
	});

	it('keeps a version above the latest version when it is the current version', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(), 3, 2).listed).toEqual([3, 2, 1]);
	});

	it('uses the default version as latest', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(), 1, 2).latest).toBe(2);
	});

	it('falls back to the highest listed version when the default version is hidden', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(3), 1, 3).latest).toBe(2);
	});

	it('falls back to the highest listed version when there is no default version', () => {
		expect(getNodeVersionChoices([1, 3, 2], hides(), 1, undefined).latest).toBe(3);
	});

	it('does not use a hidden current version as latest', () => {
		expect(getNodeVersionChoices([1, 2, 3], hides(3), 3, undefined)).toEqual({
			latest: 2,
			listed: [3, 2, 1],
		});
	});

	it('returns no choices for no versions', () => {
		expect(getNodeVersionChoices([], hides(), 1, 1)).toEqual({ latest: undefined, listed: [] });
	});
});
