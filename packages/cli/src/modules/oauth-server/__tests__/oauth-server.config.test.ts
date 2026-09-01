import { Container } from '@n8n/di';

import { OAuthServerConfig } from '../oauth-server.config';

describe('OAuthServerConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_OAUTH_SERVER_REGISTER_RATE_LIMIT;
		delete process.env.N8N_OAUTH_SERVER_AUTHORIZE_RATE_LIMIT;
		delete process.env.N8N_OAUTH_SERVER_TOKEN_RATE_LIMIT;
		delete process.env.N8N_OAUTH_SERVER_REVOKE_RATE_LIMIT;
		delete process.env.N8N_OAUTH_SERVER_WELL_KNOWN_RATE_LIMIT;
	});

	it('applies the documented default limits', () => {
		const config = Container.get(OAuthServerConfig);

		expect(config.rateLimitRegister).toBe(10);
		expect(config.rateLimitAuthorize).toBe(50);
		expect(config.rateLimitToken).toBe(20);
		expect(config.rateLimitRevoke).toBe(30);
		expect(config.rateLimitWellKnown).toBe(100);
	});

	it('reads each limit from its environment variable', () => {
		process.env.N8N_OAUTH_SERVER_REGISTER_RATE_LIMIT = '100';
		process.env.N8N_OAUTH_SERVER_AUTHORIZE_RATE_LIMIT = '200';
		process.env.N8N_OAUTH_SERVER_TOKEN_RATE_LIMIT = '300';
		process.env.N8N_OAUTH_SERVER_REVOKE_RATE_LIMIT = '400';
		process.env.N8N_OAUTH_SERVER_WELL_KNOWN_RATE_LIMIT = '500';

		const config = Container.get(OAuthServerConfig);

		expect(config.rateLimitRegister).toBe(100);
		expect(config.rateLimitAuthorize).toBe(200);
		expect(config.rateLimitToken).toBe(300);
		expect(config.rateLimitRevoke).toBe(400);
		expect(config.rateLimitWellKnown).toBe(500);
	});

	it('accepts 0 to disable rate limiting for an endpoint', () => {
		process.env.N8N_OAUTH_SERVER_TOKEN_RATE_LIMIT = '0';

		const config = Container.get(OAuthServerConfig);

		expect(config.rateLimitToken).toBe(0);
	});

	it.each(['-5', 'abc', '1.5'])(
		'falls back to the default when given an invalid value (%s)',
		(value) => {
			process.env.N8N_OAUTH_SERVER_TOKEN_RATE_LIMIT = value;

			const config = Container.get(OAuthServerConfig);

			expect(config.rateLimitToken).toBe(20);
		},
	);
});
