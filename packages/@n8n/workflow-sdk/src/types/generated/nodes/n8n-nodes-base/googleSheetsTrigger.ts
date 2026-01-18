/**
 * Google Sheets Trigger Node Types
 *
 * Starts the workflow when Google Sheets events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlesheetstrigger/
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

export interface GoogleSheetsTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	authentication?: unknown;
	documentId: ResourceLocatorValue;
	sheetName: string | Expression<string>;
	/**
	 * It will be triggered also by newly created columns (if the 'Columns to Watch' option is not set)
	 * @default anyUpdate
	 */
	event: 'rowAdded' | 'rowUpdate' | 'anyUpdate' | Expression<string>;
	/**
	 * This option will be effective only when automatically executing the workflow
	 * @default new
	 */
	includeInOutput?: 'new' | 'old' | 'both' | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleSheetsTriggerV1Credentials {
	googleSheetsTriggerOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GoogleSheetsTriggerV1Node = {
	type: 'n8n-nodes-base.googleSheetsTrigger';
	version: 1;
	config: NodeConfig<GoogleSheetsTriggerV1Params>;
	credentials?: GoogleSheetsTriggerV1Credentials;
	isTrigger: true;
};

export type GoogleSheetsTriggerNode = GoogleSheetsTriggerV1Node;
