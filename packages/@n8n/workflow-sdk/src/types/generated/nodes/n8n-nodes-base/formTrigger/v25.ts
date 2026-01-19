/**
 * n8n Form Trigger Node - Version 2.5
 * Generate webforms in n8n and pass their responses to the workflow
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormTriggerV25Config {
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

export interface FormTriggerV25Credentials {
	httpBasicAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface FormTriggerV25NodeBase {
	type: 'n8n-nodes-base.formTrigger';
	version: 2.5;
	credentials?: FormTriggerV25Credentials;
	isTrigger: true;
}

export type FormTriggerV25Node = FormTriggerV25NodeBase & {
	config: NodeConfig<FormTriggerV25Config>;
};

export type FormTriggerV25Node = FormTriggerV25Node;