import { isEnvFeatureEnabled } from '@n8n/backend-common';

/**
 * More granular credential sharing (personal-space credentials usable in any
 * project their owner works in, the can-see/can-use split, and related
 * behavior) is opt-in while it lands on master in incremental pieces.
 */
export function isCredSharingEnabled(): boolean {
	return isEnvFeatureEnabled('N8N_ENV_FEAT_CRED_SHARING');
}
