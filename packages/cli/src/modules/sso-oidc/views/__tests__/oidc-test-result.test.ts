import { renderOidcTestSuccess, renderOidcTestFailure } from '../oidc-test-result';

describe('renderOidcTestSuccess', () => {
	it('should escape HTML in user info fields', () => {
		const html = renderOidcTestSuccess({
			claims: {},
			userInfo: {
				email: '<script>alert(1)</script>',
				given_name: 'Test',
				family_name: 'User',
				sub: '123',
			},
		});

		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(html).not.toContain('<script>alert(1)</script>');
	});

	it('should show (n/a) for missing fields', () => {
		const html = renderOidcTestSuccess({
			claims: {},
			userInfo: {},
		});

		expect(html).toContain('(n/a)');
	});
});

describe('renderOidcTestFailure', () => {
	it('should escape HTML in error message', () => {
		const html = renderOidcTestFailure(new Error('<img src=x onerror=alert(1)>'));

		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
		expect(html).not.toContain('<img src=x');
	});

	it('should handle non-Error values', () => {
		const html = renderOidcTestFailure('plain string error');

		expect(html).toContain('plain string error');
	});
});
