import { Container } from '@n8n/di';

import { IdentitySubstrateConfig } from '../identity-substrate.config';

/**
 * IAM-1181: these nine fields moved from `TokenExchangeConfig` to
 * `IdentitySubstrateConfig` when the module split. The env var names they
 * bind to must NOT change - only which `@Config` class declares them. A
 * silently-broken env binding here makes inbound verification fail closed
 * everywhere, with poor test visibility (config falls back to a plausible
 * default rather than throwing) - this is the plan's highest-blast-radius
 * risk, so each field gets an explicit round-trip assertion against its
 * documented env var name.
 */
describe('IdentitySubstrateConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env.N8N_TOKEN_EXCHANGE_EXCLUDE_OWNER;
		delete process.env.N8N_TOKEN_EXCHANGE_TRUSTED_KEYS;
		delete process.env.N8N_TOKEN_EXCHANGE_KEY_REFRESH_INTERVAL_SECONDS;
		delete process.env.N8N_TOKEN_EXCHANGE_JTI_CLEANUP_INTERVAL_SECONDS;
		delete process.env.N8N_TOKEN_EXCHANGE_JTI_CLEANUP_BATCH_SIZE;
		delete process.env.N8N_TOKEN_EXCHANGE_INBOUND_AUDIENCE;
		delete process.env.N8N_TOKEN_EXCHANGE_INBOUND_SUBJECT_CLAIM;
		delete process.env.N8N_TOKEN_EXCHANGE_SSO_INBOUND_AUDIENCES;
		delete process.env.N8N_TOKEN_EXCHANGE_INBOUND_REQUIRE_VERIFIED_EMAIL;
	});

	it('applies the documented defaults when no env vars are set', () => {
		const config = Container.get(IdentitySubstrateConfig);

		expect(config.excludeOwner).toBe(true);
		expect(config.trustedKeys).toBe('');
		expect(config.keyRefreshIntervalSeconds).toBe(300);
		expect(config.jtiCleanupIntervalSeconds).toBe(60);
		expect(config.jtiCleanupBatchSize).toBe(1000);
		expect(config.inboundAudience).toBe('');
		expect(config.inboundSubjectClaim).toBe('');
		expect(config.ssoInboundAudiences).toBe('');
		expect(config.inboundRequireVerifiedEmail).toBe(true);
	});

	it.each([
		['N8N_TOKEN_EXCHANGE_EXCLUDE_OWNER', 'false', 'excludeOwner', false],
		[
			'N8N_TOKEN_EXCHANGE_TRUSTED_KEYS',
			'[{"type":"static"}]',
			'trustedKeys',
			'[{"type":"static"}]',
		],
		['N8N_TOKEN_EXCHANGE_KEY_REFRESH_INTERVAL_SECONDS', '600', 'keyRefreshIntervalSeconds', 600],
		['N8N_TOKEN_EXCHANGE_JTI_CLEANUP_INTERVAL_SECONDS', '120', 'jtiCleanupIntervalSeconds', 120],
		['N8N_TOKEN_EXCHANGE_JTI_CLEANUP_BATCH_SIZE', '2000', 'jtiCleanupBatchSize', 2000],
		[
			'N8N_TOKEN_EXCHANGE_INBOUND_AUDIENCE',
			'https://n8n.example.com',
			'inboundAudience',
			'https://n8n.example.com',
		],
		['N8N_TOKEN_EXCHANGE_INBOUND_SUBJECT_CLAIM', 'uid', 'inboundSubjectClaim', 'uid'],
		[
			'N8N_TOKEN_EXCHANGE_SSO_INBOUND_AUDIENCES',
			'https://n8n.example.com',
			'ssoInboundAudiences',
			'https://n8n.example.com',
		],
		[
			'N8N_TOKEN_EXCHANGE_INBOUND_REQUIRE_VERIFIED_EMAIL',
			'false',
			'inboundRequireVerifiedEmail',
			false,
		],
	] as const)('binds %s to IdentitySubstrateConfig.%s', (envName, envValue, field, expected) => {
		process.env[envName] = envValue;

		const config = Container.get(IdentitySubstrateConfig);

		expect(config[field]).toBe(expected);
	});
});
