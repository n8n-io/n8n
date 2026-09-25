import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { oauthClientAuth } from '../oauth-client-auth.middleware';

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;

const invoke = async (
	authorization?: string,
	body: unknown = { grant_type: 'authorization_code' },
) => {
	const req = mock<Request>();
	req.headers = { authorization };
	req.body = body;
	const res = mock<Response>();
	res.status.mockReturnValue(res);
	const next = vi.fn();
	await oauthClientAuth(req, res, next);
	return { req, res, next };
};

describe('OAuth client authentication', () => {
	test.each([
		{ client_id: 'public-client' },
		{ client_id: 'confidential-client', client_secret: 'secret' },
	])('preserves body credentials without a Basic header', async (body) => {
		const { req, res, next } = await invoke(undefined, body);
		expect(req.body).toEqual(body);
		expect(next).toHaveBeenCalledOnce();
		expect(res.status).not.toHaveBeenCalled();
	});

	test('decodes form-encoded credentials and preserves grant parameters', async () => {
		const { req, res, next } = await invoke(basic('client%3Aid+name:secret%2B%25%3A+%C3%A9'));
		expect(req.body).toEqual({
			grant_type: 'authorization_code',
			client_id: 'client:id name',
			client_secret: 'secret+%: é',
		});
		expect(next).toHaveBeenCalledOnce();
		expect(res.status).not.toHaveBeenCalled();
	});

	test('accepts a case-insensitive scheme and an empty secret', async () => {
		const { req, next } = await invoke(basic('client:').replace('Basic', 'bAsIc'));
		expect(req.body.client_secret).toBe('');
		expect(next).toHaveBeenCalledOnce();
	});

	test.each([
		'Basic',
		'Basic invalid!base64',
		'Basic A',
		basic('missing-separator'),
		basic('client:bad%escape'),
	])('rejects malformed credentials: %s', async (authorization) => {
		const { res, next } = await invoke(authorization);
		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			error: 'invalid_request',
			error_description: 'Invalid HTTP Basic credentials',
		});
		expect(next).not.toHaveBeenCalled();
	});

	test.each([{ client_id: 'client' }, { client_secret: 'secret' }])(
		'rejects credentials in both the header and body',
		async (body) => {
			const { req, res, next } = await invoke(basic('client:secret'), body);
			expect(req.body).toEqual(body);
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				error: 'invalid_request',
				error_description: 'Use one client authentication method per request',
			});
			expect(next).not.toHaveBeenCalled();
		},
	);

	test('rejects a non-object request body', async () => {
		const { res, next } = await invoke(basic('client:secret'), 'invalid-body');
		expect(res.status).toHaveBeenCalledWith(400);
		expect(next).not.toHaveBeenCalled();
	});
});
