import { useLatestFetch } from './useLatestFetch';

describe('useLatestFetch', () => {
	it('should return isCurrent as true for a single call', () => {
		const { next } = useLatestFetch();
		const isCurrent = next();
		expect(isCurrent()).toBe(true);
	});

	it('should invalidate first call when a second call is made', () => {
		const { next } = useLatestFetch();
		const isCurrentFirst = next();
		const isCurrentSecond = next();
		expect(isCurrentFirst()).toBe(false);
		expect(isCurrentSecond()).toBe(true);
	});

	it('should allow sequential calls to both be current at their check time', () => {
		const { next } = useLatestFetch();
		const isCurrentFirst = next();
		expect(isCurrentFirst()).toBe(true);

		const isCurrentSecond = next();
		expect(isCurrentSecond()).toBe(true);
		// First is no longer current after second call
		expect(isCurrentFirst()).toBe(false);
	});

	it('should only keep the last checker current when calling next() multiple times', () => {
		const { next } = useLatestFetch();
		const checkers = [next(), next(), next(), next()];
		expect(checkers[0]()).toBe(false);
		expect(checkers[1]()).toBe(false);
		expect(checkers[2]()).toBe(false);
		expect(checkers[3]()).toBe(true);
	});
});
