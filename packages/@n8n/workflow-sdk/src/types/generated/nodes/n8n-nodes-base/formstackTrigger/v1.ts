/**
 * Formstack Trigger Node - Version 1
 * Starts the workflow on a Formstack form submission.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormstackTriggerV1Params {
	authentication?: 'accessToken' | 'oAuth2' | Expression<string>;
/**
 * The Formstack form to monitor for new submissions. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		formId: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @default true
 */
		simple?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FormstackTriggerV1Credentials {
	formstackApi: CredentialReference;
	formstackOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type FormstackTriggerV1Node = {
	type: 'n8n-nodes-base.formstackTrigger';
	version: 1;
	config: NodeConfig<FormstackTriggerV1Params>;
	credentials?: FormstackTriggerV1Credentials;
	isTrigger: true;
};