/**
 * n8n Form Trigger Node - Version 2.1
 * Generate webforms in n8n and pass their responses to the workflow
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormTriggerV21Config {
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

export interface FormTriggerV21Credentials {
	httpBasicAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface FormTriggerV21NodeBase {
	type: 'n8n-nodes-base.formTrigger';
	version: 2.1;
	credentials?: FormTriggerV21Credentials;
	isTrigger: true;
}

export type FormTriggerV21Node = FormTriggerV21NodeBase & {
	config: NodeConfig<FormTriggerV21Config>;
};

export type FormTriggerV21Node = FormTriggerV21Node;