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

	describe('overlapping (reference-counted) patches', () => {
		it('keeps the loopback exemption in place until every overlapping caller restores', () => {
			process.env.NO_PROXY = 'example.com';

			const restoreA = patchNoProxyForLoopback();
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com');

			const restoreB = patchNoProxyForLoopback();
			// Second call must not snapshot the *already patched* value, otherwise
			// restoring would leave the loopback entries permanently.
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com');

			restoreA();
			// A is done, but B is still running — env must stay patched.
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com');

			restoreB();
			// All overlapping evals done — env reverts to the operator's value.
			expect(process.env.NO_PROXY).toBe('example.com');
		});

		it('each restore closure is idempotent', () => {
			process.env.NO_PROXY = 'example.com';

			const restoreA = patchNoProxyForLoopback();
			const restoreB = patchNoProxyForLoopback();

			restoreA();
			restoreA(); // duplicate call must not double-decrement
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com');

			restoreB();
			expect(process.env.NO_PROXY).toBe('example.com');
		});

		it('handles undefined original across overlapping patches', () => {
			delete process.env.NO_PROXY;

			const restoreA = patchNoProxyForLoopback();
			const restoreB = patchNoProxyForLoopback();
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost');

			restoreB();
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost');

			restoreA();
			expect(Object.prototype.hasOwnProperty.call(process.env, 'NO_PROXY')).toBe(false);
		});

		it('after every closure fires, a fresh patch starts a new snapshot', () => {
			process.env.NO_PROXY = 'first.example.com';
			const restore1 = patchNoProxyForLoopback();
			restore1();
			expect(process.env.NO_PROXY).toBe('first.example.com');

			// Operator changes NO_PROXY between eval runs — the next patch should
			// snapshot the new value, not the original from the previous cycle.
			process.env.NO_PROXY = 'second.example.com';
			const restore2 = patchNoProxyForLoopback();
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,second.example.com');

			restore2();
			expect(process.env.NO_PROXY).toBe('second.example.com');
		});
	});
});
