const daytonaInstances: Array<{ config: unknown }> = [];

jest.mock('@daytonaio/sdk', () => {
	class Daytona {
		constructor(public config: unknown) {
			daytonaInstances.push({ config });
		}
	}
	return { Daytona };
});

import { DaytonaAuthManager, decodeJwtExp } from '../daytona-auth-manager';

function base64url(input: string): string {
	return Buffer.from(input, 'utf8').toString('base64url');
}

function makeJwt(expMsFromEpoch: number): string {
	const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const payload = base64url(JSON.stringify({ exp: Math.floor(expMsFromEpoch / 1000) }));
	return `${header}.${payload}.signature`;
}

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SKEW_MS = 5 * MINUTE_MS;

describe('decodeJwtExp', () => {
	it('returns ms epoch for a valid JWT', () => {
		const expSeconds = 1_700_000_000;
		expect(decodeJwtExp(makeJwt(expSeconds * 1000))).toBe(expSeconds * 1000);
	});

	it('returns undefined for an opaque (non-JWT) token', () => {
		expect(decodeJwtExp('opaque-token')).toBeUndefined();
	});

	it('returns undefined when exp is missing', () => {
		const header = base64url(JSON.stringify({ alg: 'HS256' }));
		const payload = base64url(JSON.stringify({ sub: 'user' }));
		expect(decodeJwtExp(`${header}.${payload}.sig`)).toBeUndefined();
	});

	it('returns undefined when exp is not a number', () => {
		const header = base64url(JSON.stringify({ alg: 'HS256' }));
		const payload = base64url(JSON.stringify({ exp: 'soon' }));
		expect(decodeJwtExp(`${header}.${payload}.sig`)).toBeUndefined();
	});

	it('returns undefined for malformed base64', () => {
		expect(decodeJwtExp('not.valid-base64!!.sig')).toBeUndefined();
	});
});

describe('DaytonaAuthManager (direct mode)', () => {
	beforeEach(() => {
		daytonaInstances.length = 0;
	});

	it('lazily instantiates a single Daytona client and reuses it', async () => {
		const manager = new DaytonaAuthManager({
			staticApiKey: 'static-key',
			apiUrl: 'https://api.daytona.io',
		});

		const a = await manager.getClient();
		const b = await manager.getClient();

		expect(a).toBe(b);
		expect(daytonaInstances).toHaveLength(1);
		expect(daytonaInstances[0].config).toEqual({
			apiKey: 'static-key',
			apiUrl: 'https://api.daytona.io',
		});
	});

	it('keeps generation stable across calls', async () => {
		const manager = new DaytonaAuthManager({ staticApiKey: 'static-key' });
		await manager.getClient();
		const gen = manager.getGeneration();
		await manager.getClient();
		expect(manager.getGeneration()).toBe(gen);
	});
});

describe('DaytonaAuthManager (proxy mode)', () => {
	let now: number;
	const nowFn = () => now;

	beforeEach(() => {
		daytonaInstances.length = 0;
		now = 1_700_000_000_000;
	});

	it('fetches a token on first call and decodes its exp', async () => {
		const token = makeJwt(now + HOUR_MS);
		const getAuthToken = jest.fn().mockResolvedValue(token);
		const manager = new DaytonaAuthManager({ getAuthToken, now: nowFn });

		await manager.getClient();

		expect(getAuthToken).toHaveBeenCalledTimes(1);
		expect(daytonaInstances).toHaveLength(1);
		expect(daytonaInstances[0].config).toEqual({ apiKey: token });
		expect(manager.getGeneration()).toBe(1);
	});

	it('reuses the cached client when well outside the skew window', async () => {
		const getAuthToken = jest.fn().mockResolvedValue(makeJwt(now + HOUR_MS));
		const manager = new DaytonaAuthManager({ getAuthToken, now: nowFn });

		await manager.getClient();
		now += 30 * MINUTE_MS;
		await manager.getClient();

		expect(getAuthToken).toHaveBeenCalledTimes(1);
		expect(daytonaInstances).toHaveLength(1);
		expect(manager.getGeneration()).toBe(1);
	});

	it('refreshes when the next call is inside the skew window', async () => {
		const getAuthToken = jest.fn<Promise<string>, []>().mockImplementation(async () => {
			await Promise.resolve();
			return makeJwt(nowFn() + HOUR_MS);
		});
		const manager = new DaytonaAuthManager({ getAuthToken, now: nowFn });

		await manager.getClient();
		// Advance to within the skew window.
		now += HOUR_MS - SKEW_MS + 1;
		await manager.getClient();

		expect(getAuthToken).toHaveBeenCalledTimes(2);
		expect(daytonaInstances).toHaveLength(2);
		expect(manager.getGeneration()).toBe(2);
	});

	it('serializes concurrent refreshes (single-flight)', async () => {
		let resolveToken: (token: string) => void = () => {};
		const getAuthToken = jest.fn(
			async () =>
				await new Promise<string>((resolve) => {
					resolveToken = resolve;
				}),
		);
		const manager = new DaytonaAuthManager({ getAuthToken, now: nowFn });

		const pending = Promise.all(Array.from({ length: 10 }, async () => await manager.getClient()));
		// Settle microtasks so all 10 callers enter refresh().
		await Promise.resolve();
		resolveToken(makeJwt(now + HOUR_MS));
		const clients = await pending;

		expect(getAuthToken).toHaveBeenCalledTimes(1);
		expect(new Set(clients).size).toBe(1);
		expect(manager.getGeneration()).toBe(1);
	});

	it('falls back to 30-minute TTL when the token is opaque', async () => {
		const getAuthToken = jest.fn().mockResolvedValue('opaque-token');
		const manager = new DaytonaAuthManager({ getAuthToken, now: nowFn });

		await manager.getClient();
		// Just inside the 30-min fallback window, no refresh yet.
		now += 30 * MINUTE_MS - SKEW_MS - 1;
		await manager.getClient();
		expect(getAuthToken).toHaveBeenCalledTimes(1);

		// Cross the skew boundary, refresh fires.
		now += 2;
		await manager.getClient();
		expect(getAuthToken).toHaveBeenCalledTimes(2);
	});

	it('uses a configurable refresh skew', async () => {
		const customSkewMs = 15 * MINUTE_MS;
		const getAuthToken = jest.fn<Promise<string>, []>().mockImplementation(async () => {
			await Promise.resolve();
			return makeJwt(nowFn() + HOUR_MS);
		});
		const manager = new DaytonaAuthManager({
			getAuthToken,
			refreshSkewMs: customSkewMs,
			now: nowFn,
		});

		await manager.getClient();

		// Outside the 15-min skew window — should still reuse.
		now += HOUR_MS - customSkewMs - MINUTE_MS;
		await manager.getClient();
		expect(getAuthToken).toHaveBeenCalledTimes(1);

		// Cross into the 15-min skew window — should refresh.
		now += 2 * MINUTE_MS;
		await manager.getClient();
		expect(getAuthToken).toHaveBeenCalledTimes(2);
	});

	it('ignores non-positive refreshSkewMs and falls back to the default', async () => {
		const getAuthToken = jest.fn().mockResolvedValue(makeJwt(now + HOUR_MS));
		const manager = new DaytonaAuthManager({
			getAuthToken,
			refreshSkewMs: 0,
			now: nowFn,
		});

		await manager.getClient();
		// Just before default 5-min skew window — no refresh.
		now += HOUR_MS - SKEW_MS - 1;
		await manager.getClient();
		expect(getAuthToken).toHaveBeenCalledTimes(1);
	});

	it('passes apiUrl and target through to the Daytona client', async () => {
		const getAuthToken = jest.fn().mockResolvedValue(makeJwt(Date.now() + HOUR_MS));
		const manager = new DaytonaAuthManager({
			getAuthToken,
			apiUrl: 'https://proxy.example.com',
			target: 'us',
		});

		await manager.getClient();

		expect(daytonaInstances[0].config).toMatchObject({
			apiUrl: 'https://proxy.example.com',
			target: 'us',
		});
	});
});

describe('DaytonaAuthManager (invariants)', () => {
	it('rejects construction without either auth option', () => {
		expect(() => new DaytonaAuthManager({})).toThrow(/exactly one of staticApiKey or getAuthToken/);
	});

	it('rejects construction with both auth options', () => {
		const getAuthToken = jest.fn().mockResolvedValue('jwt');
		expect(
			() =>
				new DaytonaAuthManager({
					staticApiKey: 'k',
					getAuthToken,
				}),
		).toThrow(/exactly one of staticApiKey or getAuthToken/);
	});
});
