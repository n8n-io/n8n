/**
 * Mailcheck Node Types
 *
 * Consume Mailcheck API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mailcheck/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MailcheckV1EmailCheckConfig = {
	resource: 'email';
	operation: 'check';
	/**
	 * Email address to check
	 */
	email?: string | Expression<string>;
};

export type MailcheckV1Params = MailcheckV1EmailCheckConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailcheckV1Credentials {
	mailcheckApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MailcheckV1Node = {
	type: 'n8n-nodes-base.mailcheck';
	version: 1;
	config: NodeConfig<MailcheckV1Params>;
	credentials?: MailcheckV1Credentials;
};

export type MailcheckNode = MailcheckV1Node;
