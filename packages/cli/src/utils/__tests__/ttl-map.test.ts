import { TtlMap } from '../ttl-map';

describe('TtlMap', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(0);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('notifies once when get lazily expires an entry', () => {
		const onExpire = vi.fn();
		const value = { id: 'value' };
		const map = new TtlMap<string, typeof value>(100, 0, onExpire);
		map.set('key', value);
		vi.setSystemTime(101);

		expect(map.get('key')).toBeUndefined();
		expect(map.get('key')).toBeUndefined();
		expect(onExpire).toHaveBeenCalledOnce();
		expect(onExpire).toHaveBeenCalledWith('key', value);
	});

	it('notifies once when has lazily expires an entry', () => {
		const onExpire = vi.fn();
		const value = { id: 'value' };
		const map = new TtlMap<string, typeof value>(100, 0, onExpire);
		map.set('key', value);
		vi.setSystemTime(101);

		expect(map.has('key')).toBe(false);
		expect(map.has('key')).toBe(false);
		expect(onExpire).toHaveBeenCalledOnce();
		expect(onExpire).toHaveBeenCalledWith('key', value);
	});

	it('notifies once when a sweep expires an entry', () => {
		const onExpire = vi.fn();
		const value = { id: 'value' };
		const map = new TtlMap<string, typeof value>(100, 0, onExpire);
		map.set('key', value);
		vi.setSystemTime(101);

		map.sweep();
		map.sweep();
		expect(onExpire).toHaveBeenCalledOnce();
		expect(onExpire).toHaveBeenCalledWith('key', value);
	});

	it('does not notify for explicit deletion or clearing', () => {
		const onExpire = vi.fn();
		const map = new TtlMap<string, number>(100, 0, onExpire);
		map.set('deleted', 1);
		map.set('cleared', 2);

		map.delete('deleted');
		map.clear();

		expect(onExpire).not.toHaveBeenCalled();
	});
});
