export const SERVICE_ACCOUNTS_ENV_FEATURE_FLAG = 'N8N_ENV_FEAT_SERVICE_ACCOUNTS';

/**
 * RFC 2606 reserved TLD — unresolvable, so a synthesized service-account address
 * can never receive mail or collide with a real one.
 */
export const SERVICE_ACCOUNT_EMAIL_DOMAIN = 'n8n.local';

export function isServiceAccountsEnvFeatureFlagEnabled(): boolean {
	return process.env[SERVICE_ACCOUNTS_ENV_FEATURE_FLAG] === 'true';
}
