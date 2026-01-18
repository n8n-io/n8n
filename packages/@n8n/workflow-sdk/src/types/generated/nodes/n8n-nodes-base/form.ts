/**
 * n8n Form Node Types
 *
 * Generate webforms in n8n and pass their responses to the workflow
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/form/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormV25Params {
	operation?: 'page' | 'completion' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	formFields?: {
		values?: Array<{
			fieldName?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldName?: string | Expression<string>;
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
			elementName?: string | Expression<string>;
			fieldName?: string | Expression<string>;
			placeholder?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			multiselect?: boolean | Expression<boolean>;
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			numberOfSelections?: number | Expression<number>;
			minSelections?: number | Expression<number>;
			maxSelections?: number | Expression<number>;
			html?: string | Expression<string>;
			multipleFiles?: boolean | Expression<boolean>;
			acceptFileTypes?: string | Expression<string>;
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
	/**
	 * Whether to limit the time this node should wait for a user response before execution resumes
	 * @default false
	 */
	limitWaitTime?: boolean | Expression<boolean>;
	/**
	 * Sets the condition for the execution to resume. Can be a specified date or after some time.
	 * @default afterTimeInterval
	 */
	limitType?: 'afterTimeInterval' | 'atSpecifiedTime' | Expression<string>;
	/**
	 * The time to wait
	 * @default 1
	 */
	resumeAmount?: number | Expression<number>;
	/**
	 * Unit of the interval value
	 * @default hours
	 */
	resumeUnit?: 'minutes' | 'hours' | 'days' | Expression<string>;
	/**
	 * Continue execution after the specified date and time
	 */
	maxDateAndTime?: string | Expression<string>;
	options?: Record<string, unknown>;
	respondWith?: 'text' | 'redirect' | 'showText' | 'returnBinary' | Expression<string>;
	redirectUrl: string | Expression<string>;
	completionTitle: string | Expression<string>;
	completionMessage?: string | Expression<string>;
	/**
	 * The text to display on the page. Use HTML to show a customized web page.
	 */
	responseText?: string | Expression<string>;
	/**
	 * Find the name of input field containing the binary data to return in the Input panel on the left, in the Binary tab
	 * @hint The name of the input field containing the binary file data to be returned
	 * @default data
	 */
	inputDataFieldName?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type FormV25Node = {
	type: 'n8n-nodes-base.form';
	version: 1 | 2.3 | 2.4 | 2.5;
	config: NodeConfig<FormV25Params>;
	credentials?: Record<string, never>;
};

export type FormNode = FormV25Node;
