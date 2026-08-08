import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { GraphMailer } from '@/user-management/email/graph-mailer';

const graphConfig = {
	clientId: 'client-id',
	clientSecret: 'client-secret',
	tenantId: 'tenant-id',
	sender: 'noreply@test.com',
};

function makeMailer(fetchMock: ReturnType<typeof vi.fn>) {
	const transport = mock<HttpTransport>({
		asCustomFetch: () => fetchMock as unknown as CustomFetch,
	});
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);
	return new GraphMailer(
		mockInstance(GlobalConfig, {
			userManagement: { emails: { microsoftGraph: graphConfig } },
		}),
		mock(),
		mock(),
		outboundHttp,
	);
}

function okJson(body: unknown) {
	return { ok: true, status: 200, json: async () => body, text: async () => '' } as Response;
}

describe('GraphMailer', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockReset();
		// 1st call: token, 2nd call: sendMail
		fetchMock
			.mockResolvedValueOnce(okJson({ access_token: 'tok', expires_in: 3600 }))
			.mockResolvedValue(okJson({}));
	});

	it('requests a token then posts sendMail with a bearer token', async () => {
		const result = await makeMailer(fetchMock).sendMail({
			emailRecipients: 'user@test.com',
			subject: 'Hi',
			body: '<p>hello</p>',
		});

		expect(result).toEqual({ emailSent: true });

		const [tokenUrl] = fetchMock.mock.calls[0];
		expect(tokenUrl).toBe('https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token');

		const [sendUrl, sendOpts] = fetchMock.mock.calls[1];
		expect(sendUrl).toBe('https://graph.microsoft.com/v1.0/users/noreply%40test.com/sendMail');
		expect(sendOpts.headers.Authorization).toBe('Bearer tok');
		const payload = JSON.parse(sendOpts.body);
		expect(payload.message.subject).toBe('Hi');
		expect(payload.message.body).toEqual({ contentType: 'HTML', content: '<p>hello</p>' });
		expect(payload.message.toRecipients).toEqual([{ emailAddress: { address: 'user@test.com' } }]);
	});

	it('maps multiple recipients', async () => {
		await makeMailer(fetchMock).sendMail({
			emailRecipients: ['a@test.com', 'b@test.com'],
			subject: 'Hi',
			body: 'x',
		});
		const payload = JSON.parse(fetchMock.mock.calls[1][1].body);
		expect(payload.message.toRecipients).toEqual([
			{ emailAddress: { address: 'a@test.com' } },
			{ emailAddress: { address: 'b@test.com' } },
		]);
	});

	it('reuses the cached token across sends', async () => {
		const mailer = makeMailer(fetchMock);
		await mailer.sendMail({ emailRecipients: 'a@test.com', subject: 's', body: 'x' });
		await mailer.sendMail({ emailRecipients: 'b@test.com', subject: 's', body: 'x' });
		// 1 token request + 2 sends, not 2 token requests
		const tokenCalls = fetchMock.mock.calls.filter(([url]) => (url as string).includes('/token'));
		expect(tokenCalls).toHaveLength(1);
	});

	it('throws when sendMail responds non-ok', async () => {
		fetchMock.mockReset();
		fetchMock
			.mockResolvedValueOnce(okJson({ access_token: 'tok', expires_in: 3600 }))
			.mockResolvedValue({ ok: false, status: 403, text: async () => 'forbidden' } as Response);

		await expect(
			makeMailer(fetchMock).sendMail({ emailRecipients: 'a@test.com', subject: 's', body: 'x' }),
		).rejects.toThrow(/403/);
	});
});
