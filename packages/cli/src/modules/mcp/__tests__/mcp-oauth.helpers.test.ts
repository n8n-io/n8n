import { McpOAuthHelpers } from '../mcp-oauth.helpers';

describe('McpOAuthHelpers', () => {
	describe('buildSuccessRedirectUrl', () => {
		it('should build redirect URL with authorization code', () => {
			const redirectUri = 'https://example.com/callback';
			const code = 'auth-code-123';
			const state = null;

			const result = McpOAuthHelpers.buildSuccessRedirectUrl(redirectUri, code, state);

			expect(result).toBe('https://example.com/callback?code=auth-code-123');
		});

		it('should include state parameter when provided', () => {
			const redirectUri = 'https://example.com/callback';
			const code = 'auth-code-123';
			const state = 'state-xyz';

			const result = McpOAuthHelpers.buildSuccessRedirectUrl(redirectUri, code, state);

			expect(result).toBe('https://example.com/callback?code=auth-code-123&state=state-xyz');
		});

		it('should preserve existing query parameters', () => {
			const redirectUri = 'https://example.com/callback?foo=bar';
			const code = 'auth-code-123';
			const state = 'state-xyz';

			const result = McpOAuthHelpers.buildSuccessRedirectUrl(redirectUri, code, state);

			expect(result).toContain('foo=bar');
			expect(result).toContain('code=auth-code-123');
			expect(result).toContain('state=state-xyz');
		});

		it('should handle redirect URI with port', () => {
			const redirectUri = 'http://localhost:3000/callback';
			const code = 'auth-code-123';
			const state = null;

			const result = McpOAuthHelpers.buildSuccessRedirectUrl(redirectUri, code, state);

			expect(result).toBe('http://localhost:3000/callback?code=auth-code-123');
		});

		it('should URL-encode special characters in code', () => {
			const redirectUri = 'https://example.com/callback';
			const code = 'code+with/special=chars';
			const state = null;

			const result = McpOAuthHelpers.buildSuccessRedirectUrl(redirectUri, code, state);

			expect(result).toContain('code=code%2Bwith%2Fspecial%3Dchars');
		});
	});

	describe('buildErrorRedirectUrl', () => {
		it('should build redirect URL with error parameters', () => {
			const redirectUri = 'https://example.com/callback';
			const error = 'access_denied';
			const errorDescription = 'User denied the authorization request';
			const state = null;

			const result = McpOAuthHelpers.buildErrorRedirectUrl(
				redirectUri,
				error,
				errorDescription,
				state,
			);

			expect(result).toContain('error=access_denied');
			expect(result).toContain('error_description=User+denied+the+authorization+request');
		});

		it('should include state parameter when provided', () => {
			const redirectUri = 'https://example.com/callback';
			const error = 'invalid_request';
			const errorDescription = 'Missing required parameter';
			const state = 'state-xyz';

			const result = McpOAuthHelpers.buildErrorRedirectUrl(
				redirectUri,
				error,
				errorDescription,
				state,
			);

			expect(result).toContain('error=invalid_request');
			expect(result).toContain('state=state-xyz');
		});

		it('should preserve existing query parameters', () => {
			const redirectUri = 'https://example.com/callback?foo=bar';
			const error = 'server_error';
			const errorDescription = 'Internal server error';
			const state = 'state-xyz';

			const result = McpOAuthHelpers.buildErrorRedirectUrl(
				redirectUri,
				error,
				errorDescription,
				state,
			);

			expect(result).toContain('foo=bar');
			expect(result).toContain('error=server_error');
			expect(result).toContain('state=state-xyz');
		});

		it('should handle common OAuth error codes', () => {
			const testCases = [
				{ error: 'access_denied', description: 'User denied' },
				{ error: 'invalid_request', description: 'Bad request' },
				{ error: 'unauthorized_client', description: 'Client not authorized' },
				{ error: 'invalid_scope', description: 'Invalid scope' },
				{ error: 'server_error', description: 'Server error' },
				{ error: 'temporarily_unavailable', description: 'Service unavailable' },
			];

			testCases.forEach(({ error, description }) => {
				const result = McpOAuthHelpers.buildErrorRedirectUrl(
					'https://example.com/callback',
					error,
					description,
					null,
				);

				expect(result).toContain(`error=${error}`);
				expect(result).toContain('error_description=');
			});
		});

		it('should URL-encode special characters in error description', () => {
			const redirectUri = 'https://example.com/callback';
			const error = 'access_denied';
			const errorDescription = 'User said "no thanks!"';
			const state = null;

			const result = McpOAuthHelpers.buildErrorRedirectUrl(
				redirectUri,
				error,
				errorDescription,
				state,
			);

			expect(result).toContain('error_description=');
			expect(result).not.toContain('"'); // Should be encoded
		});
	});
});
