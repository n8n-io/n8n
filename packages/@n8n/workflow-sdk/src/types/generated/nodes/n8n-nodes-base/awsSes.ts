/**
 * AWS SES Node Types
 *
 * Sends data to AWS SES
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/awsses/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new custom verification email template */
export type AwsSesV1CustomVerificationEmailCreateConfig = {
	resource: 'customVerificationEmail';
	operation: 'create';
	/**
	 * The email address that the custom verification email is sent from
	 */
	fromEmailAddress: string | Expression<string>;
	/**
	 * The name of the custom verification email template
	 */
	templateName?: string | Expression<string>;
	/**
	 * The content of the custom verification email. The total size of the email must be less than 10 MB. The message body may contain HTML
	 */
	templateContent?: string | Expression<string>;
	/**
	 * The subject line of the custom verification email
	 */
	templateSubject: string | Expression<string>;
	/**
	 * The URL that the recipient of the verification email is sent to if his or her address is successfully verified
	 */
	successRedirectionURL: string | Expression<string>;
	/**
	 * The URL that the recipient of the verification email is sent to if his or her address is not successfully verified
	 */
	failureRedirectionURL: string | Expression<string>;
};

/** Delete an existing custom verification email template */
export type AwsSesV1CustomVerificationEmailDeleteConfig = {
	resource: 'customVerificationEmail';
	operation: 'delete';
	/**
	 * The name of the custom verification email template
	 */
	templateName?: string | Expression<string>;
};

/** Get the custom email verification template */
export type AwsSesV1CustomVerificationEmailGetConfig = {
	resource: 'customVerificationEmail';
	operation: 'get';
	/**
	 * The name of the custom verification email template
	 */
	templateName?: string | Expression<string>;
};

/** Get many of the existing custom verification email templates for your account */
export type AwsSesV1CustomVerificationEmailGetAllConfig = {
	resource: 'customVerificationEmail';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
};

/** Add an email address to the list of identities */
export type AwsSesV1CustomVerificationEmailSendConfig = {
	resource: 'customVerificationEmail';
	operation: 'send';
	/**
	 * The email address to verify
	 */
	email: string | Expression<string>;
	/**
	 * The name of the custom verification email template to use when sending the verification email
	 */
	templateName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Update an existing custom verification email template */
export type AwsSesV1CustomVerificationEmailUpdateConfig = {
	resource: 'customVerificationEmail';
	operation: 'update';
	/**
	 * The name of the custom verification email template
	 */
	templateName?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add an email address to the list of identities */
export type AwsSesV1EmailSendConfig = {
	resource: 'email';
	operation: 'send';
	/**
	 * Whether body is HTML or simple text
	 * @default false
	 */
	isBodyHtml?: boolean | Expression<boolean>;
	subject: string | Expression<string>;
	/**
	 * The message to be sent
	 */
	body: string | Expression<string>;
	/**
	 * Email address of the sender
	 */
	fromEmail: string | Expression<string>;
	/**
	 * Email addresses of the recipients
	 * @default []
	 */
	toAddresses?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type AwsSesV1EmailSendTemplateConfig = {
	resource: 'email';
	operation: 'sendTemplate';
	/**
	 * The ARN of the template to use when sending this email. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	templateName?: string | Expression<string>;
	/**
	 * Email address of the sender
	 */
	fromEmail: string | Expression<string>;
	/**
	 * Email addresses of the recipients
	 * @default []
	 */
	toAddresses?: string | Expression<string>;
	templateDataUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new custom verification email template */
export type AwsSesV1TemplateCreateConfig = {
	resource: 'template';
	operation: 'create';
	/**
	 * The name of the template
	 */
	templateName: string | Expression<string>;
	/**
	 * The subject line of the email
	 */
	subjectPart?: string | Expression<string>;
	/**
	 * The HTML body of the email
	 */
	htmlPart?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an existing custom verification email template */
export type AwsSesV1TemplateDeleteConfig = {
	resource: 'template';
	operation: 'delete';
	/**
	 * The name of the template
	 */
	templateName: string | Expression<string>;
};

/** Get the custom email verification template */
export type AwsSesV1TemplateGetConfig = {
	resource: 'template';
	operation: 'get';
	/**
	 * The name of the template
	 */
	templateName: string | Expression<string>;
};

/** Get many of the existing custom verification email templates for your account */
export type AwsSesV1TemplateGetAllConfig = {
	resource: 'template';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
};

/** Update an existing custom verification email template */
export type AwsSesV1TemplateUpdateConfig = {
	resource: 'template';
	operation: 'update';
	/**
	 * The name of the template
	 */
	templateName: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type AwsSesV1Params =
	| AwsSesV1CustomVerificationEmailCreateConfig
	| AwsSesV1CustomVerificationEmailDeleteConfig
	| AwsSesV1CustomVerificationEmailGetConfig
	| AwsSesV1CustomVerificationEmailGetAllConfig
	| AwsSesV1CustomVerificationEmailSendConfig
	| AwsSesV1CustomVerificationEmailUpdateConfig
	| AwsSesV1EmailSendConfig
	| AwsSesV1EmailSendTemplateConfig
	| AwsSesV1TemplateCreateConfig
	| AwsSesV1TemplateDeleteConfig
	| AwsSesV1TemplateGetConfig
	| AwsSesV1TemplateGetAllConfig
	| AwsSesV1TemplateUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsSesV1Credentials {
	aws: CredentialReference;
	awsAssumeRole: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AwsSesV1Node = {
	type: 'n8n-nodes-base.awsSes';
	version: 1;
	config: NodeConfig<AwsSesV1Params>;
	credentials?: AwsSesV1Credentials;
};

export type AwsSesNode = AwsSesV1Node;
