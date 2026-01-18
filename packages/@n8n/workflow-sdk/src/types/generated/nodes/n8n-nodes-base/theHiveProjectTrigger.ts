/**
 * TheHive 5 Trigger Node Types
 *
 * Starts the workflow when TheHive events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/thehiveprojecttrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TheHiveProjectTriggerV1Params {
	/**
	 * Events types
	 * @default []
	 */
	events: Array<
		| '*'
		| 'alert_create'
		| 'alert_delete'
		| 'alert_update'
		| 'case_create'
		| 'case_delete'
		| 'case_update'
		| 'comment_create'
		| 'comment_delete'
		| 'comment_update'
		| 'observable_create'
		| 'observable_delete'
		| 'observable_update'
		| 'page_create'
		| 'page_delete'
		| 'page_update'
		| 'task_create'
		| 'task_update'
		| 'log_create'
		| 'log_delete'
		| 'log_update'
	>;
	/**
	 * Filter any incoming events based on their fields
	 * @default {}
	 */
	filters?: {
		values?: Array<{
			/** Field
			 * @hint The field to filter on, supports dot notation
			 */
			field?: string | Expression<string>;
			/** Operator
			 * @default equal
			 */
			operator?: 'equal' | 'notEqual' | 'includes' | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type TheHiveProjectTriggerV1Node = {
	type: 'n8n-nodes-base.theHiveProjectTrigger';
	version: 1;
	config: NodeConfig<TheHiveProjectTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type TheHiveProjectTriggerNode = TheHiveProjectTriggerV1Node;
