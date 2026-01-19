/**
 * SurveyMonkey Trigger Node - Version 1
 * Starts the workflow when Survey Monkey events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SurveyMonkeyTriggerV1Config {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
	objectType: 'collector' | 'survey' | Expression<string>;
	event: 'collector_created' | 'collector_deleted' | 'collector_updated' | 'response_completed' | 'response_created' | 'response_deleted' | 'response_disqualified' | 'response_overquota' | 'response_updated' | 'survey_created' | 'survey_deleted' | 'survey_updated' | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { objectType: ["survey"] }
 * @displayOptions.hide { event: ["survey_created"] }
 * @default []
 */
		surveyIds: string[];
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { objectType: ["collector"] }
 * @default []
 */
		surveyId: string | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { objectType: ["collector"] }
 * @default []
 */
		collectorIds: string[];
/**
 * By default the webhook-data only contain the IDs. If this option gets activated, it will resolve the data automatically.
 * @displayOptions.show { event: ["response_completed"] }
 * @default true
 */
		resolveData?: boolean | Expression<boolean>;
/**
 * Whether to return only the answers of the form and not any of the other data
 * @displayOptions.show { resolveData: [true], event: ["response_completed"] }
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

interface SurveyMonkeyTriggerV1NodeBase {
	type: 'n8n-nodes-base.surveyMonkeyTrigger';
	version: 1;
	credentials?: SurveyMonkeyTriggerV1Credentials;
	isTrigger: true;
}

export type SurveyMonkeyTriggerV1Node = SurveyMonkeyTriggerV1NodeBase & {
	config: NodeConfig<SurveyMonkeyTriggerV1Config>;
};

export type SurveyMonkeyTriggerV1Node = SurveyMonkeyTriggerV1Node;