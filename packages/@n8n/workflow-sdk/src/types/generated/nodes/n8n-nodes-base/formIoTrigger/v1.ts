/**
 * Form.io Trigger Node - Version 1
 * Handle form.io events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormIoTriggerV1Params {
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 */
		projectId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 */
		formId: string | Expression<string>;
	events: Array<'create' | 'update'>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @default true
 */
		simple?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FormIoTriggerV1Credentials {
	formIoApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type FormIoTriggerV1Node = {
	type: 'n8n-nodes-base.formIoTrigger';
	version: 1;
	config: NodeConfig<FormIoTriggerV1Params>;
	credentials?: FormIoTriggerV1Credentials;
	isTrigger: true;
};