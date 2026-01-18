/**
 * n8n Form Trigger Node - Version 2.2
 * Generate webforms in n8n and pass their responses to the workflow
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormTriggerV22Params {
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

export interface FormTriggerV22Credentials {
	httpBasicAuth: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type FormTriggerV22Node = {
	type: 'n8n-nodes-base.formTrigger';
	version: 2.2;
	config: NodeConfig<FormTriggerV22Params>;
	credentials?: FormTriggerV22Credentials;
	isTrigger: true;
};