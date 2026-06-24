import { HostnameMatcher } from '../hostname-matcher';

describe('HostnameMatcher', () => {
	describe('wildcard patterns', () => {
		it('should match subdomain against *.example.com', () => {
			const matcher = new HostnameMatcher(['*.example.com']);
			expect(matcher.matches('api.example.com')).toBe(true);
		});

		it('should match deep subdomain', () => {
			const matcher = new HostnameMatcher(['*.example.com']);
			expect(matcher.matches('deep.sub.example.com')).toBe(true);
		});

		it('should not match the bare domain', () => {
			const matcher = new HostnameMatcher(['*.example.com']);
			expect(matcher.matches('example.com')).toBe(false);
		});

		it('should not match unrelated domains', () => {
			const matcher = new HostnameMatcher(['*.example.com']);
			expect(matcher.matches('evil-example.com')).toBe(false);
			expect(matcher.matches('myexample.com')).toBe(false);
			expect(matcher.matches('example.org')).toBe(false);
		});
	});

	describe('exact matches', () => {
		it('should match exact hostname', () => {
			const matcher = new HostnameMatcher(['internal.n8n.io']);
			expect(matcher.matches('internal.n8n.io')).toBe(true);
		});

		it('should not match subdomain of exact hostname', () => {
			const matcher = new HostnameMatcher(['internal.n8n.io']);
			expect(matcher.matches('sub.internal.n8n.io')).toBe(false);
		});
	});

	describe('case insensitivity', () => {
		it('should match regardless of case', () => {
			const matcher = new HostnameMatcher(['*.Example.COM']);
			expect(matcher.matches('API.EXAMPLE.COM')).toBe(true);
			expect(matcher.matches('api.example.com')).toBe(true);
		});
	});

	it('should trim configured patterns', () => {
		const matcher = new HostnameMatcher([' *.example.com ', ' exact.example.com ']);
		expect(matcher.matches('api.example.com')).toBe(true);
		expect(matcher.matches('exact.example.com')).toBe(true);
	});

	it('should return false when no patterns are configured', () => {
		const matcher = new HostnameMatcher([]);
		expect(matcher.matches('anything.com')).toBe(false);
	});
});
