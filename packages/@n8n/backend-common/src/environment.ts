const { NODE_ENV } = process.env;

export const inTest = NODE_ENV === 'test';
export const inProduction = NODE_ENV === 'production';
export const inDevelopment = !NODE_ENV || NODE_ENV === 'development';

/**
 * Whether the `N8N_ENV_FEAT_<FLAG>` env var is set to `'true'`. Stays a
 * function because tests and the e2e controller mutate these vars at runtime.
 */
export function isEnvFeatureEnabled(flag: Uppercase<string>): boolean {
	return process.env[`N8N_ENV_FEAT_${flag}`] === 'true';
}
