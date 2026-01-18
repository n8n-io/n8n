/**
 * n8n Form Trigger Node Types
 *
 * Generate webforms in n8n and pass their responses to the workflow
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/formtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormTriggerV25Params {
	authentication?: 'basicAuth' | 'none' | Expression<string>;
	/**
	 * The final segment of the form's URL, both for test and production
	 */
	path: string | Expression<string>;
	/**
	 * Shown at the top of the form
	 */
	formTitle: string | Expression<string>;
	/**
	 * Shown underneath the Form Title. Can be used to prompt the user on how to complete the form. Accepts HTML.
	 */
	formDescription?: string | Expression<string>;
	formFields?: Record<string, unknown>;
	/**
	 * When to respond to the form submission
	 * @default onReceived
	 */
	responseMode?: 'onReceived' | 'lastNode' | 'responseNode' | Expression<string>;
	options?: Record<string, unknown>;
}

export interface FormTriggerV1Params {
	/**
	 * The final segment of the form's URL, both for test and production
	 */
	path: string | Expression<string>;
	/**
	 * Shown at the top of the form
	 */
	formTitle: string | Expression<string>;
	/**
	 * Shown underneath the Form Title. Can be used to prompt the user on how to complete the form. Accepts HTML.
	 */
	formDescription?: string | Expression<string>;
	formFields?: Record<string, unknown>;
	/**
	 * When to respond to the form submission
	 * @default onReceived
	 */
	responseMode?: 'onReceived' | 'lastNode' | 'responseNode' | Expression<string>;
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

export type FormTriggerV25Node = {
	type: 'n8n-nodes-base.formTrigger';
	version: 2 | 2.1 | 2.2 | 2.3 | 2.4 | 2.5;
	config: NodeConfig<FormTriggerV25Params>;
	credentials?: FormTriggerV25Credentials;
	isTrigger: true;
};

export type FormTriggerV1Node = {
	type: 'n8n-nodes-base.formTrigger';
	version: 1;
	config: NodeConfig<FormTriggerV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type FormTriggerNode = FormTriggerV25Node | FormTriggerV1Node;
