/**
 * Send Email Node Types
 *
 * Sends an email using SMTP protocol
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/emailsend/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

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
	formFields?: {
		values?: Array<{
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [2.4] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"lt":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { fieldType: ["hiddenField"], @version: [{"_cnd":{"lt":2.4}}] }
			 */
			fieldName?: string | Expression<string>;
			/** The type of field to add to the form
			 * @default text
			 */
			fieldType?:
				| 'checkbox'
				| 'html'
				| 'date'
				| 'dropdown'
				| 'email'
				| 'file'
				| 'hiddenField'
				| 'number'
				| 'password'
				| 'radio'
				| 'text'
				| 'textarea'
				| Expression<string>;
			/** Optional field. It can be used to include the html in the output.
			 * @displayOptions.show { fieldType: ["html"] }
			 */
			elementName?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.5}}] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Sample text to display inside the field
			 * @displayOptions.hide { fieldType: ["dropdown", "date", "file", "html", "hiddenField", "radio", "checkbox"] }
			 */
			placeholder?: string | Expression<string>;
			/** Default value that will be pre-filled in the form field
			 * @displayOptions.show { fieldType: ["text", "number", "email", "textarea"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default date value that will be pre-filled in the form field (format: YYYY-MM-DD)
			 * @displayOptions.show { fieldType: ["date"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value that will be pre-selected. Must match one of the option labels.
			 * @displayOptions.show { fieldType: ["dropdown", "radio"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value(s) that will be pre-selected. Must match one or multiple of the option labels. Separate multiple pre-selected options with a comma.
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Input value can be set here or will be passed as a query parameter via Field Name if no value is set
			 * @displayOptions.show { fieldType: ["hiddenField"] }
			 */
			fieldValue?: string | Expression<string>;
			/** List of options that can be selected from the dropdown
			 * @displayOptions.show { fieldType: ["dropdown"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Option
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Checkboxes
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Checkbox Label
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Radio Buttons
			 * @displayOptions.show { fieldType: ["radio"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Radio Button Label
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Whether to allow the user to select multiple options from the dropdown list
			 * @displayOptions.show { fieldType: ["dropdown"], @version: [{"_cnd":{"lt":2.3}}] }
			 * @default false
			 */
			multiselect?: boolean | Expression<boolean>;
			/** Limit Selection
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default unlimited
			 */
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			/** Number of Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["exact"] }
			 * @default 1
			 */
			numberOfSelections?: number | Expression<number>;
			/** Minimum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 0
			 */
			minSelections?: number | Expression<number>;
			/** Maximum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 1
			 */
			maxSelections?: number | Expression<number>;
			/** HTML elements to display on the form page
			 * @hint Does not accept &lt;code&gt;&lt;script&gt;&lt;/code&gt;, &lt;code&gt;&lt;style&gt;&lt;/code&gt; or &lt;code&gt;&lt;input&gt;&lt;/code&gt; tags
			 * @displayOptions.show { fieldType: ["html"] }
			 * @default <!-- Your custom HTML here --->



			 */
			html?: string | Expression<string>;
			/** Whether to allow the user to select multiple files from the file input or just one
			 * @displayOptions.show { fieldType: ["file"] }
			 * @default true
			 */
			multipleFiles?: boolean | Expression<boolean>;
			/** Comma-separated list of allowed file extensions
			 * @hint Leave empty to allow all file types
			 * @displayOptions.show { fieldType: ["file"] }
			 */
			acceptFileTypes?: string | Expression<string>;
			/** Whether to require the user to enter a value for this field before submitting the form
			 * @displayOptions.hide { fieldType: ["html", "hiddenField"] }
			 * @default false
			 */
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
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

export interface EmailSendV1Params {
	/**
	 * Email address of the sender optional with name
	 */
	fromEmail: string | Expression<string>;
	/**
	 * Email address of the recipient
	 */
	toEmail: string | Expression<string>;
	/**
	 * Email address of CC recipient
	 */
	ccEmail?: string | Expression<string>;
	/**
	 * Email address of BCC recipient
	 */
	bccEmail?: string | Expression<string>;
	/**
	 * Subject line of the email
	 */
	subject?: string | Expression<string>;
	/**
	 * Plain text message of email
	 */
	text?: string | Expression<string>;
	/**
	 * HTML text message of email
	 */
	html?: string | Expression<string>;
	/**
	 * Name of the binary properties that contain data to add to email as attachment. Multiple ones can be comma-separated.
	 */
	attachments?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface EmailSendV21Credentials {
	smtp: CredentialReference;
}

export interface EmailSendV1Credentials {
	smtp: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type EmailSendV21Node = {
	type: 'n8n-nodes-base.emailSend';
	version: 2 | 2.1;
	config: NodeConfig<EmailSendV21Params>;
	credentials?: EmailSendV21Credentials;
};

export type EmailSendV1Node = {
	type: 'n8n-nodes-base.emailSend';
	version: 1;
	config: NodeConfig<EmailSendV1Params>;
	credentials?: EmailSendV1Credentials;
};

export type EmailSendNode = EmailSendV21Node | EmailSendV1Node;
