/**
 * Airtable Trigger Node Types
 *
 * Starts the workflow when Airtable events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/airtabletrigger/
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

export interface AirtableTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	authentication?: 'airtableApi' | 'airtableTokenApi' | 'airtableOAuth2Api' | Expression<string>;
	/**
	 * The Airtable Base in which to operate on
	 * @default {"mode":"url","value":""}
	 */
	baseId: ResourceLocatorValue;
	tableId: ResourceLocatorValue;
	/**
	 * A Created Time or Last Modified Time field that will be used to sort records. If you do not have a Created Time or Last Modified Time field in your schema, please create one, because without this field trigger will not work correctly.
	 */
	triggerField: string | Expression<string>;
	/**
	 * Whether the attachment fields define in 'Download Fields' will be downloaded
	 * @default false
	 */
	downloadAttachments?: boolean | Expression<boolean>;
	/**
	 * Name of the fields of type 'attachment' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive.
	 */
	downloadFieldNames: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AirtableTriggerV1Credentials {
	airtableApi: CredentialReference;
	airtableTokenApi: CredentialReference;
	airtableOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AirtableTriggerV1Node = {
	type: 'n8n-nodes-base.airtableTrigger';
	version: 1;
	config: NodeConfig<AirtableTriggerV1Params>;
	credentials?: AirtableTriggerV1Credentials;
	isTrigger: true;
};

export type AirtableTriggerNode = AirtableTriggerV1Node;
