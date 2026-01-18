/**
 * Zendesk Trigger Node - Version 1
 * Handle Zendesk events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ZendeskTriggerV1Params {
	authentication?: 'apiToken' | 'oAuth2' | Expression<string>;
	service: 'support' | Expression<string>;
	options?: Record<string, unknown>;
/**
 * The condition to set
 * @displayOptions.show { service: ["support"] }
 * @default {}
 */
		conditions?: {
		all?: Array<{
			/** Resource
			 * @default ticket
			 */
			resource?: 'ticket' | Expression<string>;
			/** Field
			 * @displayOptions.show { resource: ["ticket"] }
			 * @default status
			 */
			field?: 'assignee' | 'group' | 'priority' | 'status' | 'type' | Expression<string>;
			/** Operation
			 * @displayOptions.hide { field: ["assignee"] }
			 * @default is
			 */
			operation?: 'changed' | 'value_previous' | 'value' | 'greater_than' | 'is' | 'is_not' | 'less_than' | 'not_changed' | 'not_value_previous' | 'not_value' | Expression<string>;
			/** Operation
			 * @displayOptions.show { field: ["assignee"] }
			 * @default is
			 */
			operation?: 'changed' | 'value_previous' | 'value' | 'is' | 'is_not' | 'not_changed' | 'not_value_previous' | 'not_value' | Expression<string>;
			/** Value
			 * @displayOptions.show { field: ["status"] }
			 * @displayOptions.hide { operation: ["changed", "not_changed"], field: ["assignee", "group", "priority", "type"] }
			 * @default open
			 */
			value?: 'closed' | 'new' | 'open' | 'pending' | 'solved' | Expression<string>;
			/** Value
			 * @displayOptions.show { field: ["type"] }
			 * @displayOptions.hide { operation: ["changed", "not_changed"], field: ["assignee", "group", "priority", "status"] }
			 * @default question
			 */
			value?: 'question' | 'incident' | 'problem' | 'task' | Expression<string>;
			/** Value
			 * @displayOptions.show { field: ["priority"] }
			 * @displayOptions.hide { operation: ["changed", "not_changed"], field: ["assignee", "group", "type", "status"] }
			 * @default low
			 */
			value?: 'low' | 'normal' | 'high' | 'urgent' | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { field: ["group"] }
			 * @displayOptions.hide { field: ["assignee", "priority", "type", "status"] }
			 */
			value?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { field: ["assignee"] }
			 * @displayOptions.hide { field: ["group", "priority", "type", "status"] }
			 */
			value?: string | Expression<string>;
		}>;
		any?: Array<{
			/** Resource
			 * @default ticket
			 */
			resource?: 'ticket' | Expression<string>;
			/** Field
			 * @displayOptions.show { resource: ["ticket"] }
			 * @default status
			 */
			field?: 'assignee' | 'group' | 'priority' | 'status' | 'type' | Expression<string>;
			/** Operation
			 * @displayOptions.hide { field: ["assignee"] }
			 * @default is
			 */
			operation?: 'changed' | 'value_previous' | 'value' | 'greater_than' | 'is' | 'is_not' | 'less_than' | 'not_changed' | 'not_value_previous' | 'not_value' | Expression<string>;
			/** Operation
			 * @displayOptions.show { field: ["assignee"] }
			 * @default is
			 */
			operation?: 'changed' | 'value_previous' | 'value' | 'is' | 'is_not' | 'not_changed' | 'not_value_previous' | 'not_value' | Expression<string>;
			/** Value
			 * @displayOptions.show { field: ["status"] }
			 * @displayOptions.hide { operation: ["changed", "not_changed"], field: ["assignee", "group", "priority", "type"] }
			 * @default open
			 */
			value?: 'closed' | 'new' | 'open' | 'pending' | 'solved' | Expression<string>;
			/** Value
			 * @displayOptions.show { field: ["type"] }
			 * @displayOptions.hide { operation: ["changed", "not_changed"], field: ["assignee", "group", "priority", "status"] }
			 * @default question
			 */
			value?: 'question' | 'incident' | 'problem' | 'task' | Expression<string>;
			/** Value
			 * @displayOptions.show { field: ["priority"] }
			 * @displayOptions.hide { operation: ["changed", "not_changed"], field: ["assignee", "group", "type", "status"] }
			 * @default low
			 */
			value?: 'low' | 'normal' | 'high' | 'urgent' | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { field: ["group"] }
			 * @displayOptions.hide { field: ["assignee", "priority", "type", "status"] }
			 */
			value?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { field: ["assignee"] }
			 * @displayOptions.hide { field: ["group", "priority", "type", "status"] }
			 */
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
// Node Type
// ===========================================================================

export type ZendeskTriggerV1Node = {
	type: 'n8n-nodes-base.zendeskTrigger';
	version: 1;
	config: NodeConfig<ZendeskTriggerV1Params>;
	credentials?: ZendeskTriggerV1Credentials;
	isTrigger: true;
};