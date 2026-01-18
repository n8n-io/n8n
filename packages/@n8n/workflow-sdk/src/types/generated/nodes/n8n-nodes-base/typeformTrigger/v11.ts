/**
 * Typeform Trigger Node - Version 1.1
 * Starts the workflow on a Typeform form submission
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TypeformTriggerV11Params {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
/**
 * Form which should trigger workflow on submission. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		formId: string | Expression<string>;
/**
 * Whether to convert the answers to a key:value pair ("FIELD_TITLE":"USER_ANSER") to be easily processable
 * @default true
 */
		simplifyAnswers?: boolean | Expression<boolean>;
/**
 * Whether to return only the answers of the form and not any of the other data
 * @default true
 */
		onlyAnswers?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TypeformTriggerV11Credentials {
	typeformApi: CredentialReference;
	typeformOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TypeformTriggerV11Node = {
	type: 'n8n-nodes-base.typeformTrigger';
	version: 1 | 1.1;
	config: NodeConfig<TypeformTriggerV11Params>;
	credentials?: TypeformTriggerV11Credentials;
	isTrigger: true;
};