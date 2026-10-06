import { once } from './once';

describe('once', () => {
	it('runs the function at the first call only, also for an undefined value', () => {
		const read = vi.fn(() => undefined);
		const cached = once(read);

		expect([cached(), cached()]).toEqual([undefined, undefined]);
		expect(read).toHaveBeenCalledTimes(1);
	});

	it('runs the function again after it throws', () => {
		const read = vi
			.fn<() => number>()
			.mockImplementationOnce(() => {
				throw new Error('not ready');
			})
			.mockReturnValue(1);
		const cached = once(read);

		expect(cached).toThrow('not ready');
		expect([cached(), cached()]).toEqual([1, 1]);
		expect(read).toHaveBeenCalledTimes(2);
	});
});
