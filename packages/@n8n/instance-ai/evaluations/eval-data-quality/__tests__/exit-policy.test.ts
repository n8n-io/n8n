import { shouldFailProcessForCompletedRun } from '../exit-policy';

describe('shouldFailProcessForCompletedRun', () => {
	it('does not fail the process when the run completed', () => {
		expect(shouldFailProcessForCompletedRun({ passed: false, results: [] })).toBe(false);
	});
});
