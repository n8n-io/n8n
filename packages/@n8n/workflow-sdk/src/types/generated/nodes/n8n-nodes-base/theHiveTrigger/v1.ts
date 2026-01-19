/**
 * TheHive Trigger Node - Version 1
 * Starts the workflow when TheHive events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TheHiveTriggerV1Config {
/**
 * Events types
 * @default []
 */
		events: Array<'*' | 'alert_create' | 'alert_delete' | 'alert_update' | 'case_create' | 'case_delete' | 'case_update' | 'case_task_log_create' | 'case_task_log_delete' | 'case_task_log_update' | 'case_artifact_create' | 'case_artifact_delete' | 'case_artifact_update' | 'case_task_create' | 'case_task_delete' | 'case_task_update'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface TheHiveTriggerV1NodeBase {
	type: 'n8n-nodes-base.theHiveTrigger';
	version: 1;
	isTrigger: true;
}

export type TheHiveTriggerV1Node = TheHiveTriggerV1NodeBase & {
	config: NodeConfig<TheHiveTriggerV1Config>;
};

export type TheHiveTriggerV1Node = TheHiveTriggerV1Node;