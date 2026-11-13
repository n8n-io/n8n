import { mock } from 'vitest-mock-extended';
import type { ICredentialsHelper, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { OutboundRedactor, redactMcpUrl, simulatorMcpUrls } from '../outbound-redaction';

const telegramToken = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';

async function redactorWithCredential(credential: Record<string, unknown>) {
	const inner = mock<ICredentialsHelper>();
	inner.getDecrypted.mockResolvedValue(credential as never);
	inner.getParentTypes.mockReturnValue(['base']);
	const redactor = new OutboundRedactor();
	const wrapped = redactor.wrap(inner);
	await wrapped.getDecrypted(
		mock<IWorkflowExecuteAdditionalData>(),
		{ id: '1', name: 'c' },
		't',
		'manual',
	);
	return { redactor, wrapped };
}

describe('OutboundRedactor', () => {
	it('removes a decrypted credential from the URL path, the query and the body', async () => {
		const { redactor } = await redactorWithCredential({ accessToken: telegramToken });

		const request = redactor.redact({
			protocol: 'http',
			method: 'POST',
			url: `https://api.telegram.org/bot${telegramToken}/sendMessage?x=${encodeURIComponent(telegramToken)}`,
			body: { text: 'hi', nested: [`token ${telegramToken}`] },
		});

		expect(JSON.stringify(request)).not.toContain(telegramToken);
		expect(JSON.stringify(request)).not.toContain(encodeURIComponent(telegramToken));
		expect(request.url).toContain('https://api.telegram.org/bot');
		expect(request.url).toContain('/sendMessage');
	});

	it('keeps ids and other non-secret values intact', async () => {
		const { redactor } = await redactorWithCredential({
			accessToken: telegramToken,
			region: 'eu-central-1',
		});

		const request = redactor.redact({
			protocol: 'http',
			method: 'GET',
			url: 'https://api.notion.com/v1/pages/0f1e2d3c4b5a69788796a5b4c3d2e1f0?filter=eu-central-1',
		});

		expect(request.url).toBe(
			'https://api.notion.com/v1/pages/0f1e2d3c4b5a69788796a5b4c3d2e1f0?filter=eu-central-1',
		);
	});

	it('drops auth headers and redacts secret-named query values and body fields', () => {
		const redactor = new OutboundRedactor();

		const request = redactor.redact({
			protocol: 'http',
			method: 'POST',
			url: 'https://user:pass@example.com/hook?api_key=abc123456&page=2',
			headers: {
				Authorization: 'Bearer x',
				'X-Auth-Token': 'y',
				'Content-Type': 'application/json',
			},
			body: { password: 'hunter22222', query: 'open issues' },
		});

		expect(request.headers).toEqual({ 'Content-Type': 'application/json' });
		expect(request.url).not.toContain('user:pass');
		expect(request.url).not.toContain('abc123456');
		expect(request.url).toContain('page=2');
		expect(request.body).toEqual({ password: '[REDACTED]', query: 'open issues' });
	});

	it('passes other credential helper calls through unchanged', async () => {
		const { wrapped } = await redactorWithCredential({});

		expect(wrapped.getParentTypes('x')).toEqual(['base']);
	});

	it('removes a secret with spaces from a form-encoded body and query', async () => {
		const { redactor } = await redactorWithCredential({ password: 'my real password' });

		const request = redactor.redact({
			protocol: 'http',
			method: 'POST',
			url: 'https://example.com/login?note=my+real+password',
			body: new URLSearchParams({ pass: 'my real password' }),
		});

		expect(JSON.stringify(request)).not.toContain('my+real+password');
		expect(JSON.stringify(request)).not.toContain('my real password');
	});

	it('removes a secret that a JSON string body escapes', async () => {
		const secret = 'real"secret\\123';
		const { redactor } = await redactorWithCredential({ password: secret });

		const request = redactor.redact({
			protocol: 'http',
			method: 'POST',
			url: 'https://example.com/login',
			body: JSON.stringify({ login: secret }),
		});

		expect(request.body).not.toContain(JSON.stringify(secret).slice(1, -1));
		expect(request.body).toContain('[REDACTED]');
	});

	it('removes a short password from the URL path and a free-form body', async () => {
		const { redactor } = await redactorWithCredential({ password: 'pw4567' });

		const request = redactor.redact({
			protocol: 'http',
			method: 'POST',
			url: 'https://example.com/login/pw4567/session',
			body: 'user=alice&note=uses pw4567',
		});

		expect(JSON.stringify(request)).not.toContain('pw4567');
	});

	it('replaces binary and stream bodies instead of walking their bytes', async () => {
		const { redactor } = await redactorWithCredential({ accessToken: telegramToken });

		const binary = redactor.redact({
			protocol: 'http',
			method: 'POST',
			url: 'https://upload.example.com/files',
			body: Buffer.from(`file with ${telegramToken}`),
		});
		const form = redactor.redact({
			protocol: 'http',
			method: 'POST',
			url: 'https://api.example.com/token',
			body: new URLSearchParams({ grant: 'x', note: telegramToken }),
		});

		expect(binary.body).toMatch(/^\[binary body, \d+ bytes\]$/);
		expect(form.body).toBe('grant=x&note=[REDACTED]');
	});

	it('removes a header auth value whose header name does not look secret', async () => {
		const secret = 'f3a9c1d27b8e4c60';
		const { redactor } = await redactorWithCredential({
			name: 'Ocp-Apim-Subscription-Key',
			value: secret,
		});

		const request = redactor.redact({
			protocol: 'http',
			method: 'GET',
			url: 'https://api.example.com/v1/items',
			headers: { 'Ocp-Apim-Subscription-Key': secret, Accept: 'application/json' },
		});

		expect(JSON.stringify(request)).not.toContain(secret);
		expect(request.headers).toEqual({
			'Ocp-Apim-Subscription-Key': '[REDACTED]',
			Accept: 'application/json',
		});
	});

	it.each(['abc123', 'my real secret'])(
		'removes a short or spaced generic auth value (%s)',
		async (secret) => {
			const { redactor } = await redactorWithCredential({
				name: 'Ocp-Apim-Subscription-Key',
				value: secret,
			});

			const request = redactor.redact({
				protocol: 'http',
				method: 'GET',
				url: 'https://api.example.com/v1/items',
				headers: { 'Ocp-Apim-Subscription-Key': secret },
			});

			expect(JSON.stringify(request)).not.toContain(secret);
		},
	);

	it('removes a numeric value inside a custom auth JSON credential', async () => {
		const { redactor } = await redactorWithCredential({
			json: JSON.stringify({ headers: { 'X-Pin': 123456 } }),
		});

		const request = redactor.redact({
			protocol: 'http',
			method: 'GET',
			url: 'https://api.example.com/data?pin=123456',
			headers: { 'X-Pin': '123456' },
		});

		expect(JSON.stringify(request)).not.toContain('123456');
	});

	it('removes short values inside a custom auth JSON credential', async () => {
		const { redactor } = await redactorWithCredential({
			json: JSON.stringify({ headers: { 'X-Pin': 'p1n9' } }),
		});

		const request = redactor.redact({
			protocol: 'http',
			method: 'GET',
			url: 'https://api.example.com/data',
			headers: { 'X-Pin': 'p1n9' },
		});

		expect(JSON.stringify(request)).not.toContain('p1n9');
	});

	it('removes a query auth value under a plain parameter name', async () => {
		const secret = 'AIzaSyD-plainQueryKey123';
		const { redactor } = await redactorWithCredential({ name: 'key', value: secret });

		const request = redactor.redact({
			protocol: 'http',
			method: 'GET',
			url: `https://maps.example.com/geocode?address=Berlin&key=${secret}`,
		});

		expect(request.url).not.toContain(secret);
		expect(request.url).toContain('address=Berlin');
	});

	it('removes the values inside a custom auth JSON credential', async () => {
		const secret = 'custom-secret-998877';
		const { redactor } = await redactorWithCredential({
			json: JSON.stringify({
				headers: { 'X-Tenant-Pass': secret },
				qs: { sig: 'qs-signature-123' },
			}),
		});

		const request = redactor.redact({
			protocol: 'http',
			method: 'GET',
			url: 'https://api.example.com/data?sig=qs-signature-123',
			headers: { 'X-Tenant-Pass': secret },
		});

		expect(JSON.stringify(request)).not.toContain(secret);
		expect(JSON.stringify(request)).not.toContain('qs-signature-123');
	});

	it('keeps the service address and settings of a credential', async () => {
		const { redactor } = await redactorWithCredential({
			url: 'https://acme.atlassian.net',
			domain: 'acme.atlassian.net',
			authentication: 'genericCredentialType',
			value: 'a-long-enough-secret',
		});

		const request = redactor.redact({
			protocol: 'http',
			method: 'GET',
			url: 'https://acme.atlassian.net/rest/api/3/issue/ABC-1',
		});

		expect(request.url).toBe('https://acme.atlassian.net/rest/api/3/issue/ABC-1');
	});
});

describe('redactMcpUrl', () => {
	it('removes every query value and the user info, and keeps the path', () => {
		expect(redactMcpUrl('https://user:pw@mcp.example.com/mcp?key=s3cret&team=t1')).toBe(
			'https://mcp.example.com/mcp?key=%5BREDACTED%5D&team=%5BREDACTED%5D',
		);
	});

	it('removes a token in the path and the fragment, and keeps plain segments', () => {
		expect(redactMcpUrl('https://mcp.zapier.com/api/mcp/s/aB3dE9xYz71QwErT/mcp#frag')).toBe(
			'https://mcp.zapier.com/api/mcp/s/[REDACTED]/mcp',
		);
		expect(redactMcpUrl('https://api.example.com/v2/sse')).toBe('https://api.example.com/v2/sse');
	});

	it('leaves a URL without a query as it is', () => {
		expect(redactMcpUrl('https://mcp.linear.app/mcp')).toBe('https://mcp.linear.app/mcp');
	});

	it.each(['user:pw@mcp.example.com/mcp?token=abc', 'mcp.example.com/mcp?token=abc'])(
		'keeps nothing of a URL that is not a parsed HTTP URL: %s',
		(url) => {
			expect(redactMcpUrl(url)).toBe('[REDACTED MCP URL]');
		},
	);

	it('keeps nothing of a URL it cannot parse', () => {
		expect(redactMcpUrl('http://[bad')).toBe('[REDACTED MCP URL]');
	});
});

describe('simulatorMcpUrls', () => {
	it('adds the server name only when two redacted URLs are the same', () => {
		const urls = simulatorMcpUrls([
			{ name: 'acct_a', url: 'https://mcp.example.com/mcp?key=key-a' },
			{ name: 'acct_b', url: 'https://mcp.example.com/mcp?key=key-b' },
			{ name: 'linear', url: 'https://mcp.linear.app/mcp' },
		]);

		expect(urls.get('acct_a')).toBe(
			'https://mcp.example.com/mcp?key=%5BREDACTED%5D&n8n_mcp_server=acct_a',
		);
		expect(urls.get('acct_b')).toBe(
			'https://mcp.example.com/mcp?key=%5BREDACTED%5D&n8n_mcp_server=acct_b',
		);
		expect(urls.get('linear')).toBe('https://mcp.linear.app/mcp');
	});
});
