/**
 * AWS SES Node - Version 1
 * Sends data to AWS SES
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new custom verification email template */
export type AwsSesV1CustomVerificationEmailCreateConfig = {
	resource: 'customVerificationEmail';
	operation: 'create';
/**
 * The email address that the custom verification email is sent from
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["create"] }
 */
		fromEmailAddress: string | Expression<string>;
/**
 * The name of the custom verification email template
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["create"] }
 */
		templateName?: string | Expression<string>;
/**
 * The content of the custom verification email. The total size of the email must be less than 10 MB. The message body may contain HTML
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["create"] }
 */
		templateContent?: string | Expression<string>;
/**
 * The subject line of the custom verification email
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["create"] }
 */
		templateSubject: string | Expression<string>;
/**
 * The URL that the recipient of the verification email is sent to if his or her address is successfully verified
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["create"] }
 */
		successRedirectionURL: string | Expression<string>;
/**
 * The URL that the recipient of the verification email is sent to if his or her address is not successfully verified
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["create"] }
 */
		failureRedirectionURL: string | Expression<string>;
};

/** Delete an existing custom verification email template */
export type AwsSesV1CustomVerificationEmailDeleteConfig = {
	resource: 'customVerificationEmail';
	operation: 'delete';
/**
 * The name of the custom verification email template
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["update", "delete", "get"] }
 */
		templateName?: string | Expression<string>;
};

/** Get the custom email verification template */
export type AwsSesV1CustomVerificationEmailGetConfig = {
	resource: 'customVerificationEmail';
	operation: 'get';
/**
 * The name of the custom verification email template
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["update", "delete", "get"] }
 */
		templateName?: string | Expression<string>;
};

/** Get many of the existing custom verification email templates for your account */
export type AwsSesV1CustomVerificationEmailGetAllConfig = {
	resource: 'customVerificationEmail';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["send"] }
 */
		email: string | Expression<string>;
/**
 * The name of the custom verification email template to use when sending the verification email
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["send"] }
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
 * @displayOptions.show { resource: ["customVerificationEmail"], operation: ["update", "delete", "get"] }
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
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 * @default false
 */
		isBodyHtml?: boolean | Expression<boolean>;
	subject: string | Expression<string>;
/**
 * The message to be sent
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 */
		body: string | Expression<string>;
/**
 * Email address of the sender
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 */
		fromEmail: string | Expression<string>;
/**
 * Email addresses of the recipients
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
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
 * @displayOptions.show { resource: ["email"], operation: ["sendTemplate"] }
 */
		templateName?: string | Expression<string>;
/**
 * Email address of the sender
 * @displayOptions.show { resource: ["email"], operation: ["sendTemplate"] }
 */
		fromEmail: string | Expression<string>;
/**
 * Email addresses of the recipients
 * @displayOptions.show { resource: ["email"], operation: ["sendTemplate"] }
 * @default []
 */
		toAddresses?: string | Expression<string>;
	templateDataUi?: {
		templateDataValues?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

/** Create a new custom verification email template */
export type AwsSesV1TemplateCreateConfig = {
	resource: 'template';
	operation: 'create';
/**
 * The name of the template
 * @displayOptions.show { resource: ["template"], operation: ["update", "create", "get", "delete"] }
 */
		templateName: string | Expression<string>;
/**
 * The subject line of the email
 * @displayOptions.show { resource: ["template"], operation: ["create"] }
 */
		subjectPart?: string | Expression<string>;
/**
 * The HTML body of the email
 * @displayOptions.show { resource: ["template"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["template"], operation: ["update", "create", "get", "delete"] }
 */
		templateName: string | Expression<string>;
};

/** Get the custom email verification template */
export type AwsSesV1TemplateGetConfig = {
	resource: 'template';
	operation: 'get';
/**
 * The name of the template
 * @displayOptions.show { resource: ["template"], operation: ["update", "create", "get", "delete"] }
 */
		templateName: string | Expression<string>;
};

/** Get many of the existing custom verification email templates for your account */
export type AwsSesV1TemplateGetAllConfig = {
	resource: 'template';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["template"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["template"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["template"], operation: ["update", "create", "get", "delete"] }
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
	| AwsSesV1TemplateUpdateConfig
	;

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

interface AwsSesV1NodeBase {
	type: 'n8n-nodes-base.awsSes';
	version: 1;
	credentials?: AwsSesV1Credentials;
}

export type AwsSesV1CustomVerificationEmailCreateNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1CustomVerificationEmailCreateConfig>;
};

export type AwsSesV1CustomVerificationEmailDeleteNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1CustomVerificationEmailDeleteConfig>;
};

export type AwsSesV1CustomVerificationEmailGetNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1CustomVerificationEmailGetConfig>;
};

export type AwsSesV1CustomVerificationEmailGetAllNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1CustomVerificationEmailGetAllConfig>;
};

export type AwsSesV1CustomVerificationEmailSendNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1CustomVerificationEmailSendConfig>;
};

export type AwsSesV1CustomVerificationEmailUpdateNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1CustomVerificationEmailUpdateConfig>;
};

export type AwsSesV1EmailSendNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1EmailSendConfig>;
};

export type AwsSesV1EmailSendTemplateNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1EmailSendTemplateConfig>;
};

export type AwsSesV1TemplateCreateNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1TemplateCreateConfig>;
};

export type AwsSesV1TemplateDeleteNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1TemplateDeleteConfig>;
};

export type AwsSesV1TemplateGetNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1TemplateGetConfig>;
};

export type AwsSesV1TemplateGetAllNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1TemplateGetAllConfig>;
};

export type AwsSesV1TemplateUpdateNode = AwsSesV1NodeBase & {
	config: NodeConfig<AwsSesV1TemplateUpdateConfig>;
};

export type AwsSesV1Node =
	| AwsSesV1CustomVerificationEmailCreateNode
	| AwsSesV1CustomVerificationEmailDeleteNode
	| AwsSesV1CustomVerificationEmailGetNode
	| AwsSesV1CustomVerificationEmailGetAllNode
	| AwsSesV1CustomVerificationEmailSendNode
	| AwsSesV1CustomVerificationEmailUpdateNode
	| AwsSesV1EmailSendNode
	| AwsSesV1EmailSendTemplateNode
	| AwsSesV1TemplateCreateNode
	| AwsSesV1TemplateDeleteNode
	| AwsSesV1TemplateGetNode
	| AwsSesV1TemplateGetAllNode
	| AwsSesV1TemplateUpdateNode
	;