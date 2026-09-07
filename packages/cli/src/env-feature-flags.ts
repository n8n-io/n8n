import type { N8nEnvFeatFlags } from '@n8n/api-types';

/** Takes the full `N8N_ENV_FEAT_*` key, so the flag stays greppable from the call site. */
export function isEnvFeatureEnabled(flag: keyof N8nEnvFeatFlags): boolean {
	return process.env[flag] === 'true';
}
