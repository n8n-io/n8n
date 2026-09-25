import { partitionByPrebuiltCoverage } from '../harness/prebuilt-workflows';

describe('partitionByPrebuiltCoverage', () => {
	const cases = [{ fileSlug: 'a' }, { fileSlug: 'b' }, { fileSlug: 'c' }];

	it('covers cases with at least one manifest workflow, skips the rest', () => {
		const { covered, skipped } = partitionByPrebuiltCoverage(cases, {
			a: ['wf1'],
			c: ['wf2', 'wf3'],
		});
		expect(covered.map((x) => x.fileSlug)).toEqual(['a', 'c']);
		expect(skipped.map((x) => x.fileSlug)).toEqual(['b']);
	});

	it('treats an empty id list as not covered', () => {
		const { covered, skipped } = partitionByPrebuiltCoverage(cases, { a: [], b: ['wf'] });
		expect(covered.map((x) => x.fileSlug)).toEqual(['b']);
		expect(skipped.map((x) => x.fileSlug)).toEqual(['a', 'c']);
	});

	it('skips everything when the manifest covers no selected case', () => {
		const { covered, skipped } = partitionByPrebuiltCoverage(cases, { other: ['wf'] });
		expect(covered).toEqual([]);
		expect(skipped).toHaveLength(3);
	});
});
