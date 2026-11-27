import { TtlMap } from '../ttl-map';

describe('TtlMap', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('keepAlive', () => {
		it('keeps an entry past its TTL while the predicate is true, then expires it', () => {
			const onExpire = vi.fn();
			const kept = new Set(['value']);
			const map = new TtlMap<string, string>(30, 0, onExpire, (value) => kept.has(value));
			map.set('key', 'value');

			vi.advanceTimersByTime(31);
			map.sweep();
			expect(map.get('key')).toBe('value');
			expect([...map]).toEqual([['key', 'value']]);
			expect(onExpire).not.toHaveBeenCalled();

			kept.clear();
			map.sweep();
			expect(map.get('key')).toBeUndefined();
			expect(onExpire).toHaveBeenCalledWith('value');

			map.dispose();
		});
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
