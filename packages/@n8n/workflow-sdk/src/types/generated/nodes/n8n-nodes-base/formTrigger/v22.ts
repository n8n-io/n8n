/**
 * n8n Form Trigger Node - Version 2.2
 * Generate webforms in n8n and pass their responses to the workflow
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormTriggerV22Config {
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
// Node Types
// ===========================================================================

interface FormTriggerV22NodeBase {
	type: 'n8n-nodes-base.formTrigger';
	version: 2.2;
	credentials?: FormTriggerV22Credentials;
	isTrigger: true;
}

export type FormTriggerV22Node = FormTriggerV22NodeBase & {
	config: NodeConfig<FormTriggerV22Config>;
};

export type FormTriggerV22Node = FormTriggerV22Node;