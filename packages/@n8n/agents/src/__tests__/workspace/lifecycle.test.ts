import { callLifecycle } from '../../workspace/lifecycle';

describe('callLifecycle', () => {
	it('calls _init when both _init and init exist', async () => {
		const target = {
			_init: jest.fn().mockResolvedValue(undefined),
			init: jest.fn().mockResolvedValue(undefined),
		};

		await callLifecycle(target, 'init');

		expect(target._init).toHaveBeenCalledTimes(1);
		expect(target.init).not.toHaveBeenCalled();
	});

	it('falls back to init when _init is undefined', async () => {
		const target = {
			init: jest.fn().mockResolvedValue(undefined),
		};

		await callLifecycle(target, 'init');

		expect(target.init).toHaveBeenCalledTimes(1);
	});

	it('calls _start when both _start and start exist', async () => {
		const target = {
			_start: jest.fn().mockResolvedValue(undefined),
			start: jest.fn().mockResolvedValue(undefined),
		};

		await callLifecycle(target, 'start');

		expect(target._start).toHaveBeenCalledTimes(1);
		expect(target.start).not.toHaveBeenCalled();
	});

	it('calls _stop over stop', async () => {
		const target = {
			_stop: jest.fn().mockResolvedValue(undefined),
			stop: jest.fn().mockResolvedValue(undefined),
		};

		await callLifecycle(target, 'stop');

		expect(target._stop).toHaveBeenCalledTimes(1);
		expect(target.stop).not.toHaveBeenCalled();
	});

	it('calls _destroy over destroy', async () => {
		const target = {
			_destroy: jest.fn().mockResolvedValue(undefined),
			destroy: jest.fn().mockResolvedValue(undefined),
		};

		await callLifecycle(target, 'destroy');

		expect(target._destroy).toHaveBeenCalledTimes(1);
		expect(target.destroy).not.toHaveBeenCalled();
	});

	it('does nothing if neither underscore nor plain method exists', async () => {
		const target = {};

		await expect(callLifecycle(target, 'init')).resolves.toBeUndefined();
	});

	it('propagates errors from lifecycle methods', async () => {
		const error = new Error('lifecycle failure');
		const target = {
			_start: jest.fn().mockRejectedValue(error),
		};

		await expect(callLifecycle(target, 'start')).rejects.toThrow('lifecycle failure');
	});

	it('binds correctly (calls with proper this)', async () => {
		const target = {
			value: 42,
			// eslint-disable-next-line @typescript-eslint/require-await
			_init: jest.fn(async function (this: { value: number }) {
				expect(this.value).toBe(42);
			}),
		};

		await callLifecycle(target, 'init');

		expect(target._init).toHaveBeenCalled();
	});
});
