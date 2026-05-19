import { patchNoProxyForLoopback } from '../proxy-loopback';

describe('patchNoProxyForLoopback', () => {
	const originalNoProxy = process.env.NO_PROXY;

	afterEach(() => {
		if (originalNoProxy === undefined) {
			delete process.env.NO_PROXY;
		} else {
			process.env.NO_PROXY = originalNoProxy;
		}
	});

	it('sets NO_PROXY to the loopback entries when previously undefined', () => {
		delete process.env.NO_PROXY;

		const restore = patchNoProxyForLoopback();

		expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost');

		restore();
		expect(process.env.NO_PROXY).toBeUndefined();
	});

	it('sets NO_PROXY to the loopback entries when previously empty', () => {
		process.env.NO_PROXY = '';

		const restore = patchNoProxyForLoopback();

		expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost');

		restore();
		expect(process.env.NO_PROXY).toBe('');
	});

	it('prepends loopback entries while preserving existing entries', () => {
		process.env.NO_PROXY = 'example.com,internal.net';

		const restore = patchNoProxyForLoopback();

		expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com,internal.net');

		restore();
		expect(process.env.NO_PROXY).toBe('example.com,internal.net');
	});

	it('leaves NO_PROXY unchanged when both loopback entries are already present', () => {
		process.env.NO_PROXY = '127.0.0.1, localhost, example.com';

		const restore = patchNoProxyForLoopback();

		expect(process.env.NO_PROXY).toBe('127.0.0.1, localhost, example.com');

		restore();
		expect(process.env.NO_PROXY).toBe('127.0.0.1, localhost, example.com');
	});

	it('prepends if only one of the loopback entries is present', () => {
		process.env.NO_PROXY = '127.0.0.1';

		const restore = patchNoProxyForLoopback();

		expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,127.0.0.1');

		restore();
		expect(process.env.NO_PROXY).toBe('127.0.0.1');
	});

	it('restore closure resets to undefined when env var was unset', () => {
		delete process.env.NO_PROXY;

		const restore = patchNoProxyForLoopback();
		restore();

		expect(Object.prototype.hasOwnProperty.call(process.env, 'NO_PROXY')).toBe(false);
	});
});
