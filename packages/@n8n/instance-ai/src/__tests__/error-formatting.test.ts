import { formatErrorForLog } from '../error-formatting';

describe('formatErrorForLog', () => {
	it('removes query strings from logged URLs', () => {
		const formatted = formatErrorForLog({
			responseBody: 'Request failed for https://api.example.test/import?token=secret&api_key=abc',
			statusCode: 403,
			url: 'https://api.example.test/import?token=secret&api_key=abc',
		});

		expect(formatted).toContain('https://api.example.test/import');
		expect(formatted).toContain('status: 403');
		expect(formatted).not.toContain('token=secret');
		expect(formatted).not.toContain('api_key=abc');
	});

	it('redacts basic-auth credentials from logged URLs', () => {
		const formatted = formatErrorForLog({
			responseBody: 'Request failed for https://user:secret@example.test/import?api_key=abc',
			url: 'https://user:secret@example.test/import?api_key=abc',
		});

		expect(formatted).toContain('https://REDACTED:REDACTED@example.test/import');
		expect(formatted).not.toContain('user:secret');
		expect(formatted).not.toContain('api_key=abc');
	});

	it('redacts common credential fields from logged bodies', () => {
		const formatted = formatErrorForLog({
			body: JSON.stringify({
				error: 'invalid token',
				access_token: 'secret-token',
				client_secret: 'secret-client',
				password: 'secret-password',
			}),
		});

		expect(formatted).toContain('"access_token": "[REDACTED]"');
		expect(formatted).toContain('"client_secret": "[REDACTED]"');
		expect(formatted).toContain('"password": "[REDACTED]"');
		expect(formatted).not.toContain('secret-token');
		expect(formatted).not.toContain('secret-client');
		expect(formatted).not.toContain('secret-password');
	});

	it('redacts bearer authorization values from logged messages', () => {
		const formatted = formatErrorForLog(
			new Error('Authorization: Bearer super-secret failed with token=other-secret'),
		);

		expect(formatted).toContain('Authorization: Bearer [REDACTED]');
		expect(formatted).toContain('token=[REDACTED]');
		expect(formatted).not.toContain('super-secret');
		expect(formatted).not.toContain('other-secret');
	});

	it('redacts credential values before truncating long messages', () => {
		const secret = 's'.repeat(2_000);
		const formatted = formatErrorForLog({
			body: `${'x'.repeat(960)} access_token=${secret}`,
		});

		expect(formatted).toContain('access_token=[REDACTED]');
		expect(formatted).not.toContain(secret.slice(0, 20));
		expect(formatted.length).toBeLessThanOrEqual(1_003);
	});

	it('summarizes HTML errors from a bounded input sample', () => {
		const formatted = formatErrorForLog({
			body: `<!doctype html><html><head><title>Access denied</title></head><body>${'x'.repeat(
				20_000,
			)}secret_token=do-not-log</body></html>`,
		});

		expect(formatted).toContain('Received an HTML error response');
		expect(formatted).toContain('title: Access denied');
		expect(formatted).not.toContain('do-not-log');
	});

	it('truncates long HTML summaries', () => {
		const formatted = formatErrorForLog({
			body: `<!doctype html><html><head><title>${'x'.repeat(
				2_000,
			)}</title></head><body></body></html>`,
		});

		expect(formatted).toContain('Received an HTML error response');
		expect(formatted.length).toBeLessThanOrEqual(1_003);
	});
});
