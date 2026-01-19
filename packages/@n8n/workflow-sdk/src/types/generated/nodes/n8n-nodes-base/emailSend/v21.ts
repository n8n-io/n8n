/**
 * Send Email Node - Version 2.1
 * Sends an email using SMTP protocol
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface EmailSendV21Params {
	resource?: unknown;
	operation?: 'send' | 'sendAndWait' | Expression<string>;
/**
 * Email address of the sender. You can also specify a name: Nathan Doe &lt;nate@n8n.io&gt;.
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 */
		fromEmail: string | Expression<string>;
/**
 * Email address of the recipient. You can also specify a name: Nathan Doe &lt;nate@n8n.io&gt;.
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 */
		toEmail: string | Expression<string>;
/**
 * Subject line of the email
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 */
		subject?: string | Expression<string>;
	emailFormat?: 'text' | 'html' | 'both' | Expression<string>;
/**
 * Plain text message of email
 * @displayOptions.show { emailFormat: ["text", "both"], resource: ["email"], operation: ["send"] }
 */
		text?: string | Expression<string>;
/**
 * HTML text message of email
 * @displayOptions.show { emailFormat: ["html", "both"], resource: ["email"], operation: ["send"] }
 */
		html?: string | Expression<string>;
	options?: Record<string, unknown>;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	approvalOptions?: {
		values?: {
			/** Type of Approval
			 * @default single
			 */
			approvalType?: 'single' | 'double' | Expression<string>;
			/** Approve Button Label
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default Approve
			 */
			approveLabel?: string | Expression<string>;
			/** Approve Button Style
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default primary
			 */
			buttonApprovalStyle?: 'primary' | 'secondary' | Expression<string>;
			/** Disapprove Button Label
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default Decline
			 */
			disapproveLabel?: string | Expression<string>;
			/** Disapprove Button Style
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default secondary
			 */
			buttonDisapprovalStyle?: 'primary' | 'secondary' | Expression<string>;
		};
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface EmailSendV21Credentials {
	smtp: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface EmailSendV21NodeBase {
	type: 'n8n-nodes-base.emailSend';
	version: 2.1;
	credentials?: EmailSendV21Credentials;
}

export type EmailSendV21ParamsNode = EmailSendV21NodeBase & {
	config: NodeConfig<EmailSendV21Params>;
};

export type EmailSendV21Node = EmailSendV21ParamsNode;