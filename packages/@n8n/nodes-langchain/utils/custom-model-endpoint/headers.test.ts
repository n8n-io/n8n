import { UserError } from 'n8n-workflow';

import { buildRequestHeaders, toHeaderRecord } from './headers';
import type { EndpointCredential, LoginMethod } from './types';

const endpoint = (
	login: LoginMethod,
	gatewayHeaders: Record<string, string> = {},
): Pick<EndpointCredential, 'login' | 'gatewayHeaders'> => ({ login, gatewayHeaders });

describe('buildRequestHeaders', () => {
	describe('login methods', () => {
		it('sends a Bearer token in the Authorization header', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint({ type: 'bearer', token: 'sk-test' }),
			});

			expect(headers).toEqual({ authorization: 'Bearer sk-test' });
		});

		it('sends the key in the named header with a prefix and one space', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint({ type: 'header', name: 'X-Api-Key', prefix: 'Token', key: 'abc' }),
			});

			expect(headers).toEqual({ 'x-api-key': 'Token abc' });
		});

		it('sends the key alone when the prefix is empty', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint({
					type: 'header',
					name: 'Ocp-Apim-Subscription-Key',
					prefix: '',
					key: 'sub-key-123',
				}),
			});

			expect(headers).toEqual({ 'ocp-apim-subscription-key': 'sub-key-123' });
		});

		it('does not send an Authorization header for "API key in header"', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint({ type: 'header', name: 'X-Api-Key', prefix: '', key: 'abc' }),
			});

			expect(headers).not.toHaveProperty('authorization');
		});

		it('sends Basic auth as the base64 of user name and password', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint({ type: 'basic', username: 'demo-user', password: 'demo-pass' }),
			});

			expect(headers).toEqual({ authorization: 'Basic ZGVtby11c2VyOmRlbW8tcGFzcw==' });
		});

		it('keeps a password with a colon, a space and non-ASCII characters', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint({ type: 'basic', username: 'user', password: ' p:ss wörd ' }),
			});

			const encoded = headers.authorization.replace('Basic ', '');
			expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe('user: p:ss wörd ');
		});

		it('sends no login header for "None"', () => {
			const headers = buildRequestHeaders({ endpoint: endpoint({ type: 'none' }) });

			expect(headers).toEqual({});
		});
	});

	describe('order of precedence', () => {
		const login: LoginMethod = { type: 'bearer', token: 'sk-test' };

		it('sends the gateway headers', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint(login, { 'x-gateway-team': 'platform', 'x-cost-center': 'cc-1' }),
			});

			expect(headers).toEqual({
				authorization: 'Bearer sk-test',
				'x-gateway-team': 'platform',
				'x-cost-center': 'cc-1',
			});
		});

		it('lets a per-request header override a gateway header, whatever the case of the name', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint(login, { 'X-Gateway-Team': 'platform' }),
				requestHeaders: { 'x-gateway-team': 'per-request' },
			});

			expect(headers['x-gateway-team']).toBe('per-request');
		});

		it('never lets a gateway or per-request header override the login header', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint(login, { Authorization: 'Bearer from-gateway' }),
				requestHeaders: { AUTHORIZATION: 'Bearer from-request' },
			});

			expect(headers.authorization).toBe('Bearer sk-test');
		});

		it('never lets another header override the key of "API key in header"', () => {
			const headers = buildRequestHeaders({
				endpoint: endpoint(
					{ type: 'header', name: 'X-Api-Key', prefix: '', key: 'real' },
					{ 'x-api-key': 'from-gateway' },
				),
				requestHeaders: { 'X-API-KEY': 'from-request' },
			});

			expect(headers['x-api-key']).toBe('real');
		});
	});

	describe('invalid headers', () => {
		it('names the header and not the value', () => {
			const act = () =>
				buildRequestHeaders({
					endpoint: endpoint({ type: 'none' }, { 'x-gateway': 'top-secret\nvalue' }),
				});

			expect(act).toThrow(UserError);
			expect(act).toThrow(/^The header "x-gateway" is not valid$/);
		});

		it('rejects a header name with a space', () => {
			const act = () =>
				buildRequestHeaders({ endpoint: endpoint({ type: 'none' }, { 'bad name': 'x' }) });

			expect(act).toThrow(UserError);
		});
	});
});

describe('toHeaderRecord', () => {
	it('returns an empty record when there are no headers', () => {
		expect(toHeaderRecord(undefined)).toEqual({});
	});

	it('keeps strings, numbers and booleans as strings and drops other values', () => {
		const headers = toHeaderRecord({
			'x-text': 'a',
			'x-number': 5,
			'x-flag': true,
			'x-object': { nested: 1 },
			'x-null': null,
		});

		expect(headers).toEqual({ 'x-text': 'a', 'x-number': '5', 'x-flag': 'true' });
	});
});
