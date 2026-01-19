/**
 * Mailcheck Node - Version 1
 * Consume Mailcheck API
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
// Output Types
// ===========================================================================

export type MailcheckV1EmailCheckOutput = {
	email?: string;
	githubUsername?: string;
	isNotDisposable?: boolean;
	isNotSmtpCatchAll?: boolean;
	microsoftAccountExists?: boolean;
	mxExists?: boolean;
	smtpExists?: boolean;
	trustRate?: number;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailcheckV1Credentials {
	mailcheckApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MailcheckV1NodeBase {
	type: 'n8n-nodes-base.mailcheck';
	version: 1;
	credentials?: MailcheckV1Credentials;
}

export type MailcheckV1EmailCheckNode = MailcheckV1NodeBase & {
	config: NodeConfig<MailcheckV1EmailCheckConfig>;
	output?: MailcheckV1EmailCheckOutput;
};

export type MailcheckV1Node = MailcheckV1EmailCheckNode;