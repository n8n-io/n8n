/**
 * Notion Trigger Node Types
 *
 * Starts the workflow when Notion events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/notiontrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface NotionTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	event: 'pageAddedToDatabase' | 'pagedUpdatedInDatabase' | Expression<string>;
	/**
	 * The Notion Database to operate on
	 * @default {"mode":"list","value":""}
	 */
	databaseId: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface NotionTriggerV1Credentials {
	notionApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type NotionTriggerNode = {
	type: 'n8n-nodes-base.notionTrigger';
	version: 1;
	config: NodeConfig<NotionTriggerV1Params>;
	credentials?: NotionTriggerV1Credentials;
	isTrigger: true;
};
