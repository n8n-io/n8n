import { serialiseForBrowserLane } from '../cli/index';

// The n8n relay is instance-wide: two concurrent browser builds displace each
// other's session. The condition is "can more than one browser BUILD exist",
// which is not the same as "is a browser case selected" — that over-serialised
// every unrelated row in a full run — nor "are two browser cases selected",
// which missed one case expanded by --iterations.
describe('serialiseForBrowserLane', () => {
	it('does not serialise a run with no browser case, however many iterations', () => {
		expect(serialiseForBrowserLane(0, 1)).toBe(false);
		expect(serialiseForBrowserLane(0, 8)).toBe(false);
	});

	it('leaves one browser case at one iteration parallel — it cannot collide with itself', () => {
		// The regression this guards: the credential-setup case ships
		// datasets: ["full"], so serialising here drops an entire nightly to
		// concurrency 1 for the sake of a single row.
		expect(serialiseForBrowserLane(1, 1)).toBe(false);
	});

	it('serialises one browser case across iterations — they expand into concurrent rows', () => {
		expect(serialiseForBrowserLane(1, 2)).toBe(true);
		expect(serialiseForBrowserLane(1, 3)).toBe(true);
	});

	it('serialises two or more browser cases', () => {
		expect(serialiseForBrowserLane(2, 1)).toBe(true);
		expect(serialiseForBrowserLane(5, 1)).toBe(true);
	});
});
