/**
 * Salesforce Trigger Node Types
 *
 * Fetches data from Salesforce and starts the workflow on specified polling intervals.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/salesforcetrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SalesforceTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	/**
	 * Which Salesforce event should trigger the node
	 */
	triggerOn?:
		| 'accountCreated'
		| 'accountUpdated'
		| 'attachmentCreated'
		| 'attachmentUpdated'
		| 'caseCreated'
		| 'caseUpdated'
		| 'contactCreated'
		| 'contactUpdated'
		| 'customObjectCreated'
		| 'customObjectUpdated'
		| 'leadCreated'
		| 'leadUpdated'
		| 'opportunityCreated'
		| 'opportunityUpdated'
		| 'taskCreated'
		| 'taskUpdated'
		| 'userCreated'
		| 'userUpdated'
		| Expression<string>;
	/**
	 * Name of the custom object. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	customObject: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface SalesforceTriggerV1Credentials {
	salesforceOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SalesforceTriggerNode = {
	type: 'n8n-nodes-base.salesforceTrigger';
	version: 1;
	config: NodeConfig<SalesforceTriggerV1Params>;
	credentials?: SalesforceTriggerV1Credentials;
	isTrigger: true;
};
