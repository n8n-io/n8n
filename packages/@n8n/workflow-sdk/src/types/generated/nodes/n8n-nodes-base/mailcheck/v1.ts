/**
 * Mailcheck Node - Version 1
 * Consume Mailcheck API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MailcheckV1EmailCheckConfig = {
	resource: 'email';
	operation: 'check';
/**
 * Email address to check
 * @displayOptions.show { resource: ["email"], operation: ["check"] }
 */
		email?: string | Expression<string>;
};

export type MailcheckV1Params =
	| MailcheckV1EmailCheckConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailcheckV1Credentials {
	mailcheckApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MailcheckV1Node = {
	type: 'n8n-nodes-base.mailcheck';
	version: 1;
	config: NodeConfig<MailcheckV1Params>;
	credentials?: MailcheckV1Credentials;
};