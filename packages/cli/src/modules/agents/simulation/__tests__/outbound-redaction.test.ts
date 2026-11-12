import { mock } from 'vitest-mock-extended';
import type { ICredentialsHelper, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { OutboundRedactor } from '../outbound-redaction';

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
});
