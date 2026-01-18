/**
 * SeaTable Trigger Node Types
 *
 * Starts the workflow when SeaTable events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/seatabletrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SeaTableTriggerV2Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	event?: 'newRow' | 'updatedRow' | 'newAsset' | Expression<string>;
	/**
	 * The name of SeaTable table to access. Choose from the list, or specify the name using an &lt;a href="https://docs.n8n.io/code-examples/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tableName: string | Expression<string>;
	/**
	 * The name of SeaTable view to access. Choose from the list, or specify the name using an &lt;a href="https://docs.n8n.io/code-examples/expressions/"&gt;expression&lt;/a&gt;.
	 */
	viewName?: string | Expression<string>;
	/**
	 * Select the digital-signature column that should be tracked. Choose from the list, or specify the name using an &lt;a href="https://docs.n8n.io/code-examples/expressions/"&gt;expression&lt;/a&gt;.
	 */
	assetColumn: string | Expression<string>;
	options?: Record<string, unknown>;
}

export interface SeaTableTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	/**
	 * The name of SeaTable table to access. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	tableName: string | Expression<string>;
	event?: 'rowCreated' | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface SeaTableTriggerV2Credentials {
	seaTableApi: CredentialReference;
}

export interface SeaTableTriggerV1Credentials {
	seaTableApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SeaTableTriggerV2Node = {
	type: 'n8n-nodes-base.seaTableTrigger';
	version: 2;
	config: NodeConfig<SeaTableTriggerV2Params>;
	credentials?: SeaTableTriggerV2Credentials;
	isTrigger: true;
};

export type SeaTableTriggerV1Node = {
	type: 'n8n-nodes-base.seaTableTrigger';
	version: 1;
	config: NodeConfig<SeaTableTriggerV1Params>;
	credentials?: SeaTableTriggerV1Credentials;
	isTrigger: true;
};

export type SeaTableTriggerNode = SeaTableTriggerV2Node | SeaTableTriggerV1Node;
