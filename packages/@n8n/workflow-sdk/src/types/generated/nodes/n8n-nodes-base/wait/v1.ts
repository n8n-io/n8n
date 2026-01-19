/**
 * Wait Node - Version 1
 * Wait before continue with execution
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WaitV1Config {
/**
 * Determines the waiting mode to use before the workflow continues
 * @default timeInterval
 */
		resume?: 'timeInterval' | 'specificTime' | 'webhook' | 'form' | Expression<string>;
/**
 * If and how incoming resume-webhook-requests to $execution.resumeFormUrl should be authenticated for additional security
 * @displayOptions.show { resume: ["form"] }
 * @default none
 */
		incomingAuthentication?: 'basicAuth' | 'none' | Expression<string>;
/**
 * The date and time to wait for before continuing
 * @displayOptions.show { resume: ["specificTime"] }
 */
		dateTime: string | Expression<string>;
/**
 * The time to wait
 * @displayOptions.show { resume: ["timeInterval"] }
 * @default 1
 */
		amount?: number | Expression<number>;
/**
 * The time unit of the Wait Amount value
 * @displayOptions.show { resume: ["timeInterval"] }
 * @default hours
 */
		unit?: 'seconds' | 'minutes' | 'hours' | 'days' | Expression<string>;
/**
 * Shown at the top of the form
 * @displayOptions.show { resume: ["form"] }
 */
		formTitle: string | Expression<string>;
/**
 * Shown underneath the Form Title. Can be used to prompt the user on how to complete the form. Accepts HTML.
 * @displayOptions.show { resume: ["form"] }
 */
		formDescription?: string | Expression<string>;
	formFields?: {
		values?: Array<{
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { fieldType: ["hiddenField"] }
			 */
			fieldName?: string | Expression<string>;
			/** The type of field to add to the form
			 * @default text
			 */
			fieldType?: 'checkbox' | 'html' | 'date' | 'dropdown' | 'email' | 'file' | 'hiddenField' | 'number' | 'password' | 'radio' | 'text' | 'textarea' | Expression<string>;
			/** Optional field. It can be used to include the html in the output.
			 * @displayOptions.show { fieldType: ["html"] }
			 */
			elementName?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
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
			 * @displayOptions.show { fieldType: ["dropdown"] }
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
/**
 * When to respond to the form submission
 * @displayOptions.show { resume: ["form"] }
 * @default onReceived
 */
		responseMode?: 'onReceived' | 'lastNode' | 'responseNode' | Expression<string>;
/**
 * The HTTP method of the Webhook call
 * @displayOptions.show { resume: ["webhook"] }
 * @default GET
 */
		httpMethod?: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | Expression<string>;
/**
 * The HTTP Response code to return
 * @displayOptions.show { resume: ["webhook"] }
 * @displayOptions.hide { responseMode: ["responseNode"] }
 * @default 200
 */
		responseCode?: number | Expression<number>;
/**
 * What data should be returned. If it should return all items as an array or only the first item as object.
 * @displayOptions.show { responseMode: ["lastNode"], resume: ["webhook"] }
 * @default firstEntryJson
 */
		responseData?: 'allEntries' | 'firstEntryJson' | 'firstEntryBinary' | 'noData' | Expression<string>;
/**
 * Name of the binary property to return
 * @displayOptions.show { responseData: ["firstEntryBinary"], resume: ["webhook"] }
 * @default data
 */
		responseBinaryPropertyName: string | Expression<string>;
/**
 * Whether to limit the time this node should wait for a user response before execution resumes
 * @displayOptions.show { resume: ["webhook", "form"] }
 * @default false
 */
		limitWaitTime?: boolean | Expression<boolean>;
/**
 * Sets the condition for the execution to resume. Can be a specified date or after some time.
 * @displayOptions.show { limitWaitTime: [true], resume: ["webhook", "form"] }
 * @default afterTimeInterval
 */
		limitType?: 'afterTimeInterval' | 'atSpecifiedTime' | Expression<string>;
/**
 * The time to wait
 * @displayOptions.show { limitType: ["afterTimeInterval"], limitWaitTime: [true], resume: ["webhook", "form"] }
 * @default 1
 */
		resumeAmount?: number | Expression<number>;
/**
 * Unit of the interval value
 * @displayOptions.show { limitType: ["afterTimeInterval"], limitWaitTime: [true], resume: ["webhook", "form"] }
 * @default hours
 */
		resumeUnit?: 'seconds' | 'minutes' | 'hours' | 'days' | Expression<string>;
/**
 * Continue execution after the specified date and time
 * @displayOptions.show { limitType: ["atSpecifiedTime"], limitWaitTime: [true], resume: ["webhook", "form"] }
 */
		maxDateAndTime?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WaitV1Credentials {
	httpBasicAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	jwtAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WaitV1NodeBase {
	type: 'n8n-nodes-base.wait';
	version: 1;
	credentials?: WaitV1Credentials;
}

export type WaitV1Node = WaitV1NodeBase & {
	config: NodeConfig<WaitV1Config>;
};

export type WaitV1Node = WaitV1Node;