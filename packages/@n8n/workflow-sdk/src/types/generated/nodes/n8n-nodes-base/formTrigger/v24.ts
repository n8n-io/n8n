/**
 * n8n Form Trigger Node - Version 2.4
 * Generate webforms in n8n and pass their responses to the workflow
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormTriggerV24Params {
	authentication?: 'basicAuth' | 'none' | Expression<string>;
/**
 * Shown at the top of the form
 */
		formTitle: string | Expression<string>;
/**
 * Shown underneath the Form Title. Can be used to prompt the user on how to complete the form. Accepts HTML.
 */
		formDescription?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FormTriggerV24Credentials {
	httpBasicAuth: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type FormTriggerV24Node = {
	type: 'n8n-nodes-base.formTrigger';
	version: 2.4;
	config: NodeConfig<FormTriggerV24Params>;
	credentials?: FormTriggerV24Credentials;
	isTrigger: true;
};