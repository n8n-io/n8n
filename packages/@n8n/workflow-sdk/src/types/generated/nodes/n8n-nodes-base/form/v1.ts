/**
 * n8n Form Node - Version 1
 * Generate webforms in n8n and pass their responses to the workflow
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FormV1Params {
	operation?: 'page' | 'completion' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
/**
 * Whether to limit the time this node should wait for a user response before execution resumes
 * @displayOptions.show { operation: ["page"] }
 * @default false
 */
		limitWaitTime?: boolean | Expression<boolean>;
/**
 * Sets the condition for the execution to resume. Can be a specified date or after some time.
 * @displayOptions.show { limitWaitTime: [true], operation: ["page"] }
 * @default afterTimeInterval
 */
		limitType?: 'afterTimeInterval' | 'atSpecifiedTime' | Expression<string>;
/**
 * The time to wait
 * @displayOptions.show { limitType: ["afterTimeInterval"], limitWaitTime: [true], operation: ["page"] }
 * @default 1
 */
		resumeAmount?: number | Expression<number>;
/**
 * Unit of the interval value
 * @displayOptions.show { limitType: ["afterTimeInterval"], limitWaitTime: [true], operation: ["page"] }
 * @default hours
 */
		resumeUnit?: 'minutes' | 'hours' | 'days' | Expression<string>;
/**
 * Continue execution after the specified date and time
 * @displayOptions.show { limitType: ["atSpecifiedTime"], limitWaitTime: [true], operation: ["page"] }
 */
		maxDateAndTime?: string | Expression<string>;
	options?: Record<string, unknown>;
	respondWith?: 'text' | 'redirect' | 'showText' | 'returnBinary' | Expression<string>;
	redirectUrl: string | Expression<string>;
	completionTitle: string | Expression<string>;
	completionMessage?: string | Expression<string>;
/**
 * The text to display on the page. Use HTML to show a customized web page.
 * @displayOptions.show { respondWith: ["showText"], operation: ["completion"] }
 */
		responseText?: string | Expression<string>;
/**
 * Find the name of input field containing the binary data to return in the Input panel on the left, in the Binary tab
 * @hint The name of the input field containing the binary file data to be returned
 * @displayOptions.show { respondWith: ["returnBinary"], operation: ["completion"] }
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

interface FormV1NodeBase {
	type: 'n8n-nodes-base.form';
	version: 1;
}

export type FormV1ParamsNode = FormV1NodeBase & {
	config: NodeConfig<FormV1Params>;
};

export type FormV1Node = FormV1ParamsNode;