import {
	CrossHostRedirectError,
	createPassthroughSsrfGuard,
	findCrossHostRedirectError,
	isSsrfBlockedError,
} from '../ssrf-guard';

describe('ssrf-guard', () => {
	describe('createPassthroughSsrfGuard', () => {
		it('validateUrl always resolves ok', async () => {
			const guard = createPassthroughSsrfGuard();
			expect((await guard.validateUrl('http://10.0.0.1')).ok).toBe(true);
		});

		it('validateRedirectSync is a no-op (never throws)', () => {
			const guard = createPassthroughSsrfGuard();
			expect(() => guard.validateRedirectSync('http://169.254.169.254')).not.toThrow();
		});

		it('createSecureLookup returns a lookup function', () => {
			const guard = createPassthroughSsrfGuard();
			expect(typeof guard.createSecureLookup()).toBe('function');
		});
	});

	describe('isSsrfBlockedError', () => {
		it('detects an SsrfBlockedIpError at the top level by name', () => {
			const error = new Error('blocked');
			error.name = 'SsrfBlockedIpError';
			expect(isSsrfBlockedError(error)).toBe(true);
		});

		it('detects an SsrfBlockedIpError nested in the cause chain', () => {
			const inner = new Error('blocked');
			inner.name = 'SsrfBlockedIpError';
			const mid = new Error('redirection', { cause: inner });
			const outer = new Error('axios', { cause: mid });
			expect(isSsrfBlockedError(outer)).toBe(true);
		});

		it('returns false for unrelated errors', () => {
			expect(isSsrfBlockedError(new Error('network'))).toBe(false);
		});

		it('does not search beyond the cause-chain depth limit', () => {
			let current: Error = new Error('blocked');
			current.name = 'SsrfBlockedIpError';
			// Wrap deeper than the 4-hop limit so the target is out of reach.
			for (let i = 0; i < 5; i++) current = new Error('wrap', { cause: current });
			expect(isSsrfBlockedError(current)).toBe(false);
		});
	});

	describe('findCrossHostRedirectError', () => {
		it('finds a wrapped CrossHostRedirectError and exposes its target', () => {
			const inner = new CrossHostRedirectError('https://other.example/x');
			const outer = new Error('axios', { cause: inner });
			expect(findCrossHostRedirectError(outer)?.finalUrl).toBe('https://other.example/x');
		});

		it('returns undefined when no CrossHostRedirectError is present', () => {
			expect(findCrossHostRedirectError(new Error('network'))).toBeUndefined();
		});
	});
});
