import { Container } from '@n8n/di';

import { TokenExchangeConfig } from '../token-exchange.config';

/**
 * IAM-1181: these five fields are consumer-only and stayed on
 * `TokenExchangeConfig` when the module split (everything else moved to
 * `IdentitySubstrateConfig` - see the sibling `identity-substrate.config.test.ts`).
 * Locking in their env var names here the same way guards against the split
 * accidentally renaming or misrouting a field during a future refactor.
 */
describe('TokenExchangeConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_TOKEN_EXCHANGE_ENABLED;
		delete process.env.N8N_EMBED_LOGIN_ENABLED;
		delete process.env.N8N_TOKEN_EXCHANGE_MAX_TOKEN_TTL;
		delete process.env.N8N_TOKEN_EXCHANGE_EMBED_LOGIN_PER_MINUTE;
		delete process.env.N8N_TOKEN_EXCHANGE_TOKEN_EXCHANGE_PER_MINUTE;
	});

	it('applies the documented defaults when no env vars are set', () => {
		const config = Container.get(TokenExchangeConfig);

		expect(config.enabled).toBe(false);
		expect(config.embedEnabled).toBe(false);
		expect(config.maxTokenTtl).toBe(900);
		expect(config.rateLimitEmbedLogin).toBe(20);
		expect(config.rateLimitTokenExchange).toBe(20);
	});

	it.each([
		['N8N_TOKEN_EXCHANGE_ENABLED', 'true', 'enabled', true],
		['N8N_EMBED_LOGIN_ENABLED', 'true', 'embedEnabled', true],
		['N8N_TOKEN_EXCHANGE_MAX_TOKEN_TTL', '1800', 'maxTokenTtl', 1800],
		['N8N_TOKEN_EXCHANGE_EMBED_LOGIN_PER_MINUTE', '5', 'rateLimitEmbedLogin', 5],
		['N8N_TOKEN_EXCHANGE_TOKEN_EXCHANGE_PER_MINUTE', '5', 'rateLimitTokenExchange', 5],
	] as const)('binds %s to TokenExchangeConfig.%s', (envName, envValue, field, expected) => {
		process.env[envName] = envValue;

		const config = Container.get(TokenExchangeConfig);

		expect(config[field]).toBe(expected);
	});
});
