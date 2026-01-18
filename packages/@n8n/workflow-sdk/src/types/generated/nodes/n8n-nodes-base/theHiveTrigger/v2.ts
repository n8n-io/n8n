/**
 * TheHive Trigger Node - Version 2
 * Starts the workflow when TheHive events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TheHiveTriggerV2Params {
/**
 * Events types
 * @default []
 */
		events: Array<'*' | 'alert_create' | 'alert_delete' | 'alert_update' | 'case_create' | 'case_delete' | 'case_update' | 'case_task_log_create' | 'case_task_log_delete' | 'case_task_log_update' | 'case_artifact_create' | 'case_artifact_delete' | 'case_artifact_update' | 'case_task_create' | 'case_task_update'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type TheHiveTriggerV2Node = {
	type: 'n8n-nodes-base.theHiveTrigger';
	version: 2;
	config: NodeConfig<TheHiveTriggerV2Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};