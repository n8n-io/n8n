/**
 * Wait Node Types
 *
 * Wait before continue with execution
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/wait/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WaitV11Params {
	/**
	 * Determines the waiting mode to use before the workflow continues
	 * @default timeInterval
	 */
	resume?: 'timeInterval' | 'specificTime' | 'webhook' | 'form' | Expression<string>;
	/**
	 * If and how incoming resume-webhook-requests to $execution.resumeFormUrl should be authenticated for additional security
	 * @default none
	 */
	incomingAuthentication?: 'basicAuth' | 'none' | Expression<string>;
	/**
	 * The date and time to wait for before continuing
	 */
	dateTime: string | Expression<string>;
	/**
	 * The time to wait
	 * @default 1
	 */
	amount?: number | Expression<number>;
	/**
	 * The time unit of the Wait Amount value
	 * @default hours
	 */
	unit?: 'seconds' | 'minutes' | 'hours' | 'days' | Expression<string>;
	/**
	 * Shown at the top of the form
	 */
	formTitle: string | Expression<string>;
	/**
	 * Shown underneath the Form Title. Can be used to prompt the user on how to complete the form. Accepts HTML.
	 */
	formDescription?: string | Expression<string>;
	formFields?: Record<string, unknown>;
	/**
	 * When to respond to the form submission
	 * @default onReceived
	 */
	responseMode?: 'onReceived' | 'lastNode' | 'responseNode' | Expression<string>;
	/**
	 * The HTTP method of the Webhook call
	 * @default GET
	 */
	httpMethod?: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | Expression<string>;
	/**
	 * The HTTP Response code to return
	 * @default 200
	 */
	responseCode?: number | Expression<number>;
	/**
	 * What data should be returned. If it should return all items as an array or only the first item as object.
	 * @default firstEntryJson
	 */
	responseData?:
		| 'allEntries'
		| 'firstEntryJson'
		| 'firstEntryBinary'
		| 'noData'
		| Expression<string>;
	/**
	 * Name of the binary property to return
	 * @default data
	 */
	responseBinaryPropertyName: string | Expression<string>;
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
	resumeUnit?: 'seconds' | 'minutes' | 'hours' | 'days' | Expression<string>;
	/**
	 * Continue execution after the specified date and time
	 */
	maxDateAndTime?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WaitV11Credentials {
	httpBasicAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	jwtAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type WaitV11Node = {
	type: 'n8n-nodes-base.wait';
	version: 1 | 1.1;
	config: NodeConfig<WaitV11Params>;
	credentials?: WaitV11Credentials;
};

export type WaitNode = WaitV11Node;
