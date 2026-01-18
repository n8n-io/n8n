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
	pollTimes?: {
		item?: Array<{
			mode?:
				| 'everyMinute'
				| 'everyHour'
				| 'everyDay'
				| 'everyWeek'
				| 'everyMonth'
				| 'everyX'
				| 'custom'
				| Expression<string>;
			hour?: number | Expression<number>;
			minute?: number | Expression<number>;
			dayOfMonth?: number | Expression<number>;
			weekday?: '1' | '2' | '3' | '4' | '5' | '6' | '0' | Expression<string>;
			cronExpression?: string | Expression<string>;
			value?: number | Expression<number>;
			unit?: 'minutes' | 'hours' | Expression<string>;
		}>;
	};
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
// Node Types
// ===========================================================================

export type SalesforceTriggerV1Node = {
	type: 'n8n-nodes-base.salesforceTrigger';
	version: 1;
	config: NodeConfig<SalesforceTriggerV1Params>;
	credentials?: SalesforceTriggerV1Credentials;
	isTrigger: true;
};

export type SalesforceTriggerNode = SalesforceTriggerV1Node;
