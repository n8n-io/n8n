import { ProxyTokenManager } from '../proxy-token-manager';

/** Build a minimal JWT with the given `exp` (seconds since epoch). */
function makeJwt(exp: number): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
	const payload = Buffer.from(JSON.stringify({ sub: 'test', exp })).toString('base64url');
	return `${header}.${payload}.fake-sig`;
}

/** Build a token response whose JWT expires at `expMs` (absolute ms). */
function tokenExpiringAt(expMs: number) {
	return { accessToken: makeJwt(expMs / 1000), tokenType: 'Bearer' };
}

describe('ProxyTokenManager', () => {
	const THRESHOLD = 0.8;

	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should return auth headers on first call', async () => {
		const now = Date.now();
		const fetchToken = jest.fn().mockResolvedValue(tokenExpiringAt(now + 600_000));
		const mgr = new ProxyTokenManager(fetchToken, THRESHOLD);

		const headers = await mgr.getAuthHeaders();

		expect(headers.Authorization).toMatch(/^Bearer /);
		expect(fetchToken).toHaveBeenCalledTimes(1);
	});

	it('should cache the token within the TTL threshold', async () => {
		const now = Date.now();
		const ttlMs = 600_000; // 10 min
		const fetchToken = jest.fn().mockResolvedValue(tokenExpiringAt(now + ttlMs));
		const mgr = new ProxyTokenManager(fetchToken, THRESHOLD);

		await mgr.getAuthHeaders();
		// Advance to 50% of TTL — well within the 80% threshold
		jest.advanceTimersByTime(ttlMs * 0.5);
		await mgr.getAuthHeaders();

		expect(fetchToken).toHaveBeenCalledTimes(1);
	});

	it('should refresh the token when past the TTL threshold', async () => {
		const now = Date.now();
		const ttlMs = 600_000;
		const fetchToken = jest
			.fn()
			.mockResolvedValueOnce(tokenExpiringAt(now + ttlMs))
			.mockResolvedValueOnce(tokenExpiringAt(now + ttlMs * 2));
		const mgr = new ProxyTokenManager(fetchToken, THRESHOLD);

		await mgr.getAuthHeaders();

		// Advance past the 80% threshold
		jest.advanceTimersByTime(ttlMs * 0.85);
		await mgr.getAuthHeaders();

		expect(fetchToken).toHaveBeenCalledTimes(2);
	});

	it('should derive TTL from the JWT exp claim', async () => {
		const now = Date.now();
		const shortTtlMs = 60_000; // 1 min token
		const fetchToken = jest.fn().mockResolvedValue(tokenExpiringAt(now + shortTtlMs));
		const mgr = new ProxyTokenManager(fetchToken, THRESHOLD);

		await mgr.getAuthHeaders();
		// At 70% of 1 min — still within threshold
		jest.advanceTimersByTime(shortTtlMs * 0.7);
		await mgr.getAuthHeaders();
		expect(fetchToken).toHaveBeenCalledTimes(1);

		// At 85% of 1 min — past the 80% threshold → refresh
		jest.advanceTimersByTime(shortTtlMs * 0.15);
		await mgr.getAuthHeaders();
		expect(fetchToken).toHaveBeenCalledTimes(2);
	});

	it('should throw when JWT has no exp claim', async () => {
		const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
		const payload = Buffer.from(JSON.stringify({ sub: 'no-exp' })).toString('base64url');
		const noExpJwt = `${header}.${payload}.fake-sig`;

		const fetchToken = jest.fn().mockResolvedValue({ accessToken: noExpJwt, tokenType: 'Bearer' });
		const mgr = new ProxyTokenManager(fetchToken, THRESHOLD);

		await expect(mgr.getAuthHeaders()).rejects.toThrow('Proxy token JWT is missing the exp claim');
	});

	it('should deduplicate concurrent refresh calls (single-flight)', async () => {
		const now = Date.now();
		const fetchToken = jest.fn().mockImplementation(
			async () =>
				await new Promise((resolve) => {
					setTimeout(() => resolve(tokenExpiringAt(now + 600_000)), 100);
				}),
		);
		const mgr = new ProxyTokenManager(fetchToken, THRESHOLD);

		const p1 = mgr.getAuthHeaders();
		const p2 = mgr.getAuthHeaders();
		const p3 = mgr.getAuthHeaders();

		jest.advanceTimersByTime(100);

		const [h1, h2, h3] = await Promise.all([p1, p2, p3]);

		expect(h1).toEqual(h2);
		expect(h2).toEqual(h3);
		expect(fetchToken).toHaveBeenCalledTimes(1);
	});

	it('should allow a new refresh after a previous one completes', async () => {
		const now = Date.now();
		const ttlMs = 1000;
		const fetchToken = jest
			.fn()
			.mockResolvedValueOnce(tokenExpiringAt(now + ttlMs))
			.mockResolvedValueOnce(tokenExpiringAt(now + ttlMs * 2));
		const mgr = new ProxyTokenManager(fetchToken, THRESHOLD);

		await mgr.getAuthHeaders();
		jest.advanceTimersByTime(ttlMs);
		await mgr.getAuthHeaders();

		expect(fetchToken).toHaveBeenCalledTimes(2);
	});

	it('should propagate fetch errors', async () => {
		const fetchToken = jest.fn().mockRejectedValue(new Error('network error'));
		const mgr = new ProxyTokenManager(fetchToken, THRESHOLD);

		await expect(mgr.getAuthHeaders()).rejects.toThrow('network error');
	});

	it('should retry after a failed refresh', async () => {
		const now = Date.now();
		const fetchToken = jest
			.fn()
			.mockRejectedValueOnce(new Error('transient'))
			.mockResolvedValueOnce(tokenExpiringAt(now + 600_000));
		const mgr = new ProxyTokenManager(fetchToken, THRESHOLD);

		await expect(mgr.getAuthHeaders()).rejects.toThrow('transient');
		const headers = await mgr.getAuthHeaders();
		expect(headers.Authorization).toMatch(/^Bearer /);
		expect(fetchToken).toHaveBeenCalledTimes(2);
	});
});
