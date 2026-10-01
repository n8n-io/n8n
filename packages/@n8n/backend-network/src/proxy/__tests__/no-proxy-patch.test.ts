import { ensureHostsBypassProxy } from '../no-proxy-patch';

const LOOPBACK = ['127.0.0.1', 'localhost'];

describe('ensureHostsBypassProxy', () => {
	const originalNoProxy = process.env.NO_PROXY;
	const originalNoProxyLower = process.env.no_proxy;

	const restoreEnv = (name: 'NO_PROXY' | 'no_proxy', value: string | undefined) => {
		if (value === undefined) {
			delete process.env[name];
		} else {
			process.env[name] = value;
		}
	};

	beforeEach(() => {
		// Tests drive the lowercase form explicitly; start from a known-clear state
		// so an ambient `no_proxy` in the runner's env can't make assertions flaky.
		delete process.env.no_proxy;
	});

	afterEach(() => {
		// Reset the shared global ref-count state so tests don't leak into each other.
		delete (globalThis as unknown as Record<symbol, unknown>)[
			Symbol.for('n8n.backend-network.no-proxy-patch')
		];
		restoreEnv('NO_PROXY', originalNoProxy);
		restoreEnv('no_proxy', originalNoProxyLower);
	});

	it('sets NO_PROXY to the given hosts when previously undefined', () => {
		delete process.env.NO_PROXY;

		const restore = ensureHostsBypassProxy(LOOPBACK);

		expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost');

		restore();
		expect(process.env.NO_PROXY).toBeUndefined();
	});

	it('sets NO_PROXY to the given hosts when previously empty', () => {
		process.env.NO_PROXY = '';

		const restore = ensureHostsBypassProxy(LOOPBACK);

		expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost');

		restore();
		expect(process.env.NO_PROXY).toBe('');
	});

	it('prepends the given hosts while preserving existing entries', () => {
		process.env.NO_PROXY = 'example.com,internal.net';

		const restore = ensureHostsBypassProxy(LOOPBACK);

		expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com,internal.net');

		restore();
		expect(process.env.NO_PROXY).toBe('example.com,internal.net');
	});

	it('leaves NO_PROXY unchanged when all given hosts are already present', () => {
		process.env.NO_PROXY = '127.0.0.1, localhost, example.com';

		const restore = ensureHostsBypassProxy(LOOPBACK);

		expect(process.env.NO_PROXY).toBe('127.0.0.1, localhost, example.com');

		restore();
		expect(process.env.NO_PROXY).toBe('127.0.0.1, localhost, example.com');
	});

	it('prepends only the missing hosts, without duplicating an existing entry', () => {
		process.env.NO_PROXY = '127.0.0.1';

		const restore = ensureHostsBypassProxy(LOOPBACK);

		expect(process.env.NO_PROXY).toBe('localhost,127.0.0.1');

		restore();
		expect(process.env.NO_PROXY).toBe('127.0.0.1');
	});

	it('writes both casings so an uppercase-only patch is also visible as lowercase', () => {
		delete process.env.NO_PROXY;

		const restore = ensureHostsBypassProxy(LOOPBACK);

		// `proxy-from-env` reads `no_proxy || NO_PROXY`, so the lowercase form must carry the hosts too.
		expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost');
		expect(process.env.no_proxy).toBe('127.0.0.1,localhost');

		restore();
		expect(process.env.NO_PROXY).toBeUndefined();
		expect(process.env.no_proxy).toBeUndefined();
	});

	it('honors an operator-set lowercase no_proxy, which the resolver gives precedence', () => {
		delete process.env.NO_PROXY;
		process.env.no_proxy = 'internal.lan';

		const restore = ensureHostsBypassProxy(LOOPBACK);

		// Merged into the value the resolver actually consults (lowercase), preserving the operator entry.
		expect(process.env.no_proxy).toBe('127.0.0.1,localhost,internal.lan');
		expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,internal.lan');

		restore();
		expect(process.env.no_proxy).toBe('internal.lan');
		expect(process.env.NO_PROXY).toBeUndefined();
	});

	it('restore closure resets to undefined when env var was unset', () => {
		delete process.env.NO_PROXY;

		const restore = ensureHostsBypassProxy(LOOPBACK);
		restore();

		expect(Object.prototype.hasOwnProperty.call(process.env, 'NO_PROXY')).toBe(false);
	});

	describe('overlapping (reference-counted) patches', () => {
		it('keeps the exemption in place until every overlapping caller restores', () => {
			process.env.NO_PROXY = 'example.com';

			const restoreA = ensureHostsBypassProxy(LOOPBACK);
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com');

			const restoreB = ensureHostsBypassProxy(LOOPBACK);
			// Second call must not snapshot the *already patched* value, otherwise
			// restoring would leave the hosts permanently.
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com');

			restoreA();
			// A is done, but B is still running — env must stay patched.
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com');

			restoreB();
			// All overlapping callers done — env reverts to the operator's value.
			expect(process.env.NO_PROXY).toBe('example.com');
		});

		it('each restore closure is idempotent', () => {
			process.env.NO_PROXY = 'example.com';

			const restoreA = ensureHostsBypassProxy(LOOPBACK);
			const restoreB = ensureHostsBypassProxy(LOOPBACK);

			restoreA();
			restoreA(); // duplicate call must not double-decrement
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,example.com');

			restoreB();
			expect(process.env.NO_PROXY).toBe('example.com');
		});

		it('adds the hosts of an overlapping caller that passes a different set', () => {
			delete process.env.NO_PROXY;

			const restoreA = ensureHostsBypassProxy(['127.0.0.1']);
			expect(process.env.NO_PROXY).toBe('127.0.0.1');

			const restoreB = ensureHostsBypassProxy(['example.internal']);
			expect(process.env.NO_PROXY).toBe('example.internal,127.0.0.1');

			restoreA();
			// B still running — its host must remain exempt.
			expect(process.env.NO_PROXY).toBe('example.internal,127.0.0.1');

			restoreB();
			expect(Object.prototype.hasOwnProperty.call(process.env, 'NO_PROXY')).toBe(false);
		});

		it('handles undefined original across overlapping patches', () => {
			delete process.env.NO_PROXY;

			const restoreA = ensureHostsBypassProxy(LOOPBACK);
			const restoreB = ensureHostsBypassProxy(LOOPBACK);
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost');

			restoreB();
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost');

			restoreA();
			expect(Object.prototype.hasOwnProperty.call(process.env, 'NO_PROXY')).toBe(false);
		});

		it('after every closure fires, a fresh patch starts a new snapshot', () => {
			process.env.NO_PROXY = 'first.example.com';
			const restore1 = ensureHostsBypassProxy(LOOPBACK);
			restore1();
			expect(process.env.NO_PROXY).toBe('first.example.com');

			// Operator changes NO_PROXY between cycles — the next patch should
			// snapshot the new value, not the original from the previous cycle.
			process.env.NO_PROXY = 'second.example.com';
			const restore2 = ensureHostsBypassProxy(LOOPBACK);
			expect(process.env.NO_PROXY).toBe('127.0.0.1,localhost,second.example.com');

			restore2();
			expect(process.env.NO_PROXY).toBe('second.example.com');
		});
	});
});
