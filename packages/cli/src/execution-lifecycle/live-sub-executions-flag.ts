import { isEnvFeatureEnabled } from '@n8n/backend-common';

/**
 * Whether a run the editor is watching streams its sub-executions to the same
 * push session, so the canvas and log tree can follow them live. When off, a
 * sub-execution installs no push hooks and reports no parent, which is what
 * every production run does anyway.
 */
export function isLiveSubExecutionsEnabled(): boolean {
	return isEnvFeatureEnabled('N8N_ENV_FEAT_LIVE_SUB_EXECUTIONS');
}
