import { renderOidcTestFailure, renderOidcTestSuccess } from '../views/oidc-test-result';

describe('renderOidcTestSuccess', () => {
	const claims = { sub: 'user-1', acr: 'urn:loa:1' };
	const userInfo = {
		email: 'jane.doe@example.com',
		given_name: 'Jane',
		family_name: 'Doe',
		sub: 'user-1',
		groups: ['admins', 'engineers'],
	};

	it('renders the email, names and subject from userInfo', () => {
		const html = renderOidcTestSuccess({ claims, userInfo }, 'nonce-value');

		expect(html).toContain('jane.doe@example.com');
		expect(html).toContain('Jane');
		expect(html).toContain('Doe');
		expect(html).toContain('user-1');
	});

	it('embeds the full claims and userInfo as JSON for debugging', () => {
		const html = renderOidcTestSuccess({ claims, userInfo }, 'nonce-value');

		// JSON is HTML-escaped, so quotes become &quot; inside <pre>
		expect(html).toContain('&quot;groups&quot;');
		expect(html).toContain('&quot;admins&quot;');
		expect(html).toContain('&quot;acr&quot;');
	});

	it('escapes HTML metacharacters in claim values', () => {
		const html = renderOidcTestSuccess(
			{
				claims: { sub: 'user-1' },
				userInfo: { email: '<script>alert(1)</script>@example.com', sub: 'user-1' },
			},
			'nonce-value',
		);

		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
	});

	it('should close the window from a nonced script rather than an inline handler', () => {
		const html = renderOidcTestSuccess({ claims, userInfo }, 'nonce-value');

		expect(html).toContain('<script nonce="nonce-value">');
		expect(html).toContain("document.getElementById('close-window')");
		expect(html).not.toMatch(/\son[a-z]+=/i);
	});
});

describe('renderOidcTestFailure', () => {
	it('should escape the error message', () => {
		const html = renderOidcTestFailure(new Error('<img src=x onerror=alert(1)>'), 'nonce-value');

		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
		expect(html).not.toContain('<img src=x');
	});

	it('should close the window from a nonced script rather than an inline handler', () => {
		const html = renderOidcTestFailure(new Error('nope'), 'nonce-value');

		expect(html).toContain('<script nonce="nonce-value">');
		expect(html).not.toMatch(/\son[a-z]+=/i);
	});
});
