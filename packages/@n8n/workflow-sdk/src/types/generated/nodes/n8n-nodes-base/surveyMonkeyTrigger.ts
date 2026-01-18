/**
 * SurveyMonkey Trigger Node Types
 *
 * Starts the workflow when Survey Monkey events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/surveymonkeytrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SurveyMonkeyTriggerV1Params {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
	objectType: 'collector' | 'survey' | Expression<string>;
	event:
		| 'collector_created'
		| 'collector_deleted'
		| 'collector_updated'
		| 'response_completed'
		| 'response_created'
		| 'response_deleted'
		| 'response_disqualified'
		| 'response_overquota'
		| 'response_updated'
		| 'survey_created'
		| 'survey_deleted'
		| 'survey_updated'
		| Expression<string>;
	/**
	 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default []
	 */
	surveyIds: string[];
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default []
	 */
	surveyId: string | Expression<string>;
	/**
	 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default []
	 */
	collectorIds: string[];
	/**
	 * By default the webhook-data only contain the IDs. If this option gets activated, it will resolve the data automatically.
	 * @default true
	 */
	resolveData?: boolean | Expression<boolean>;
	/**
	 * Whether to return only the answers of the form and not any of the other data
	 * @default true
	 */
	onlyAnswers?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface SurveyMonkeyTriggerV1Credentials {
	surveyMonkeyApi: CredentialReference;
	surveyMonkeyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SurveyMonkeyTriggerV1Node = {
	type: 'n8n-nodes-base.surveyMonkeyTrigger';
	version: 1;
	config: NodeConfig<SurveyMonkeyTriggerV1Params>;
	credentials?: SurveyMonkeyTriggerV1Credentials;
	isTrigger: true;
};

export type SurveyMonkeyTriggerNode = SurveyMonkeyTriggerV1Node;
