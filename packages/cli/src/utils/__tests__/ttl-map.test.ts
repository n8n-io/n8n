import { TtlMap } from '../ttl-map';

describe('TtlMap', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('touch', () => {
		it('slides the expiry so a touched entry outlives its original deadline', () => {
			const map = new TtlMap<string, string>(30, 0);
			map.set('key', 'value');

			vi.advanceTimersByTime(20);
			expect(map.touch('key')).toBe(true);

			// 40ms after set — past the original 30ms deadline, kept alive by the touch.
			vi.advanceTimersByTime(20);
			expect(map.get('key')).toBe('value');

			// 30ms of no touches — expires.
			vi.advanceTimersByTime(11);
			expect(map.get('key')).toBeUndefined();

			map.dispose();
		});

		it('returns false for missing keys and evicts already-expired entries via onExpire', () => {
			const onExpire = vi.fn();
			const map = new TtlMap<string, string>(30, 0, onExpire);

			expect(map.touch('missing')).toBe(false);

			map.set('key', 'value');
			vi.advanceTimersByTime(31);

			expect(map.touch('key')).toBe(false);
			expect(onExpire).toHaveBeenCalledWith('value');
			expect(map.has('key')).toBe(false);

			map.dispose();
		});
	});
});
