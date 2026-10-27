import { collectExpectations } from '../build-expectations/collect';

describe('collectExpectations', () => {
	it('returns an empty array when neither field is set', () => {
		expect(collectExpectations({})).toEqual([]);
	});

	it('returns only process expectations when outcome is absent', () => {
		expect(collectExpectations({ processExpectations: ['p1', 'p2'] })).toEqual(['p1', 'p2']);
	});

	it('returns only outcome expectations when process is absent', () => {
		expect(collectExpectations({ outcomeExpectations: ['o1'] })).toEqual(['o1']);
	});

	it('concatenates process expectations before outcome expectations', () => {
		expect(
			collectExpectations({
				processExpectations: ['p1', 'p2'],
				outcomeExpectations: ['o1', 'o2'],
			}),
		).toEqual(['p1', 'p2', 'o1', 'o2']);
	});

	it('treats empty arrays as empty', () => {
		expect(collectExpectations({ processExpectations: [], outcomeExpectations: [] })).toEqual([]);
	});
});
