/**
 * Zendesk Trigger Node Types
 *
 * Handle Zendesk events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/zendesktrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ZendeskTriggerV1Params {
	authentication?: 'apiToken' | 'oAuth2' | Expression<string>;
	service: 'support' | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The condition to set
	 * @default {}
	 */
	conditions?: {
		all?: Array<{
			resource?: 'ticket' | Expression<string>;
			field?: 'assignee' | 'group' | 'priority' | 'status' | 'type' | Expression<string>;
			operation?:
				| 'changed'
				| 'value_previous'
				| 'value'
				| 'greater_than'
				| 'is'
				| 'is_not'
				| 'less_than'
				| 'not_changed'
				| 'not_value_previous'
				| 'not_value'
				| Expression<string>;
			operation?:
				| 'changed'
				| 'value_previous'
				| 'value'
				| 'is'
				| 'is_not'
				| 'not_changed'
				| 'not_value_previous'
				| 'not_value'
				| Expression<string>;
			value?: 'closed' | 'new' | 'open' | 'pending' | 'solved' | Expression<string>;
			value?: 'question' | 'incident' | 'problem' | 'task' | Expression<string>;
			value?: 'low' | 'normal' | 'high' | 'urgent' | Expression<string>;
			value?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
		any?: Array<{
			resource?: 'ticket' | Expression<string>;
			field?: 'assignee' | 'group' | 'priority' | 'status' | 'type' | Expression<string>;
			operation?:
				| 'changed'
				| 'value_previous'
				| 'value'
				| 'greater_than'
				| 'is'
				| 'is_not'
				| 'less_than'
				| 'not_changed'
				| 'not_value_previous'
				| 'not_value'
				| Expression<string>;
			operation?:
				| 'changed'
				| 'value_previous'
				| 'value'
				| 'is'
				| 'is_not'
				| 'not_changed'
				| 'not_value_previous'
				| 'not_value'
				| Expression<string>;
			value?: 'closed' | 'new' | 'open' | 'pending' | 'solved' | Expression<string>;
			value?: 'question' | 'incident' | 'problem' | 'task' | Expression<string>;
			value?: 'low' | 'normal' | 'high' | 'urgent' | Expression<string>;
			value?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZendeskTriggerV1Credentials {
	zendeskApi: CredentialReference;
	zendeskOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ZendeskTriggerV1Node = {
	type: 'n8n-nodes-base.zendeskTrigger';
	version: 1;
	config: NodeConfig<ZendeskTriggerV1Params>;
	credentials?: ZendeskTriggerV1Credentials;
	isTrigger: true;
};

export type ZendeskTriggerNode = ZendeskTriggerV1Node;
