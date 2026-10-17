import { Container } from '@n8n/di';

import { JwksConfig } from '../jwks.config';

describe('JwksConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_OAUTH_JWE_JWKS_PER_MINUTE;
	});

	it('defaults to 60 requests per minute', () => {
		expect(Container.get(JwksConfig).rateLimitJwksPerMinute).toBe(60);
	});

	it('reads the limit from N8N_OAUTH_JWE_JWKS_PER_MINUTE', () => {
		process.env.N8N_OAUTH_JWE_JWKS_PER_MINUTE = '120';

		expect(Container.get(JwksConfig).rateLimitJwksPerMinute).toBe(120);
	});

	it.each(['0', '-1', '1.5'])('falls back to the default for %s', (value) => {
		process.env.N8N_OAUTH_JWE_JWKS_PER_MINUTE = value;
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect(Container.get(JwksConfig).rateLimitJwksPerMinute).toBe(60);
		expect(warn).toHaveBeenCalled();

		warn.mockRestore();
	});
});
