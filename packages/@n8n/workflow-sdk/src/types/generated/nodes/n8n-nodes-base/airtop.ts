/**
 * Airtop Node Types
 *
 * Scrape and control any site with Airtop
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/airtop/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Run an Airtop agent */
export type AirtopV11AgentRunConfig = {
	resource: 'agent';
	operation: 'run';
	/**
	 * Webhook URL to invoke the Airtop agent. Visit &lt;a href="https://portal.airtop.ai/agents" target="_blank"&gt;Airtop Agents&lt;/a&gt; for more information.
	 */
	webhookUrl: string | Expression<string>;
	/**
	 * Agent's input parameters in JSON format. Visit &lt;a href="https://portal.airtop.ai/agents" target="_blank"&gt;Airtop Agents&lt;/a&gt; for more information.
	 * @default {}
	 */
	agentParameters: IDataObject | string | Expression<string>;
	/**
	 * Whether to wait for the agent to complete its execution
	 * @default true
	 */
	awaitExecution?: boolean | Expression<boolean>;
	/**
	 * Timeout in seconds to wait for the agent to finish
	 * @default 600
	 */
	timeout?: number | Expression<number>;
};

/** Query a page to extract data or ask a question given the data on the page */
export type AirtopV11ExtractionQueryConfig = {
	resource: 'extraction';
	operation: 'query';
	/**
	 * Choose between creating a new session or using an existing one
	 * @default existing
	 */
	sessionMode?: 'new' | 'existing' | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * URL to load in the window
	 */
	url: string | Expression<string>;
	/**
	 * The name of the Airtop profile to load or create
	 */
	profileName?: string | Expression<string>;
	/**
	 * Whether to terminate the session after the operation is complete. When disabled, you must manually terminate the session. By default, idle sessions timeout after 10 minutes
	 * @default true
	 */
	autoTerminateSession?: boolean | Expression<boolean>;
	/**
	 * The prompt to query the page content
	 */
	prompt: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Extract content from paginated or dynamically loaded pages */
export type AirtopV11ExtractionGetPaginatedConfig = {
	resource: 'extraction';
	operation: 'getPaginated';
	/**
	 * Choose between creating a new session or using an existing one
	 * @default existing
	 */
	sessionMode?: 'new' | 'existing' | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * URL to load in the window
	 */
	url: string | Expression<string>;
	/**
	 * The name of the Airtop profile to load or create
	 */
	profileName?: string | Expression<string>;
	/**
	 * Whether to terminate the session after the operation is complete. When disabled, you must manually terminate the session. By default, idle sessions timeout after 10 minutes
	 * @default true
	 */
	autoTerminateSession?: boolean | Expression<boolean>;
	/**
	 * The prompt to extract data from the pages
	 */
	prompt: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Scrape a page and return the data as markdown */
export type AirtopV11ExtractionScrapeConfig = {
	resource: 'extraction';
	operation: 'scrape';
	/**
	 * Choose between creating a new session or using an existing one
	 * @default existing
	 */
	sessionMode?: 'new' | 'existing' | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * URL to load in the window
	 */
	url: string | Expression<string>;
	/**
	 * The name of the Airtop profile to load or create
	 */
	profileName?: string | Expression<string>;
	/**
	 * Whether to terminate the session after the operation is complete. When disabled, you must manually terminate the session. By default, idle sessions timeout after 10 minutes
	 * @default true
	 */
	autoTerminateSession?: boolean | Expression<boolean>;
};

/** Delete an uploaded file */
export type AirtopV11FileDeleteFileConfig = {
	resource: 'file';
	operation: 'deleteFile';
	/**
	 * ID of the file to delete
	 */
	fileId: string | Expression<string>;
};

/** Get a details of an uploaded file */
export type AirtopV11FileGetConfig = {
	resource: 'file';
	operation: 'get';
	/**
	 * ID of the file to retrieve
	 */
	fileId: string | Expression<string>;
	/**
	 * Whether to output the file in binary format if the file is ready for download
	 * @default false
	 */
	outputBinaryFile?: boolean | Expression<boolean>;
};

/** Get details of multiple uploaded files */
export type AirtopV11FileGetManyConfig = {
	resource: 'file';
	operation: 'getMany';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 10
	 */
	limit?: number | Expression<number>;
	/**
	 * Comma-separated list of &lt;a href="https://docs.airtop.ai/api-reference/airtop-api/sessions/create" target="_blank"&gt;Session IDs&lt;/a&gt; to filter files by. When empty, all files from all sessions will be returned.
	 */
	sessionIds?: string | Expression<string>;
	/**
	 * Whether to output one item containing all files or output each file as a separate item
	 * @default true
	 */
	outputSingleItem?: boolean | Expression<boolean>;
};

/** Load a URL in an existing window */
export type AirtopV11FileLoadConfig = {
	resource: 'file';
	operation: 'load';
	/**
	 * The session ID to load the file into
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The window ID to trigger the file input in
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * ID of the file to load into the session
	 */
	fileId: string | Expression<string>;
	/**
	 * Optional description of the file input to interact with
	 */
	elementDescription?: string | Expression<string>;
	/**
	 * Whether to include hidden elements in the interaction
	 * @default true
	 */
	includeHiddenElements?: boolean | Expression<boolean>;
};

/** Upload a file into a session */
export type AirtopV11FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	/**
	 * The session ID to load the file into
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The window ID to trigger the file input in
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * Name for the file to upload. For a session, all files loaded should have &lt;b&gt;unique names&lt;/b&gt;.
	 */
	fileName: string | Expression<string>;
	/**
	 * Choose the type of file to upload. Defaults to 'Customer Upload'.
	 * @default customer_upload
	 */
	fileType?: 'browser_download' | 'screenshot' | 'video' | 'customer_upload' | Expression<string>;
	/**
	 * Source of the file to upload
	 * @default url
	 */
	source?: 'url' | 'binary' | Expression<string>;
	/**
	 * Name of the binary property containing the file data
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * URL from where to fetch the file to upload
	 */
	url: string | Expression<string>;
	/**
	 * Whether to automatically trigger the file input dialog in the current window. If disabled, the file will only be uploaded to the session without opening the file input dialog.
	 * @default true
	 */
	triggerFileInputParameter?: boolean | Expression<boolean>;
	/**
	 * Optional description of the file input to interact with
	 */
	elementDescription?: string | Expression<string>;
	/**
	 * Whether to include hidden elements in the interaction
	 * @default true
	 */
	includeHiddenElements?: boolean | Expression<boolean>;
};

/** Execute a click on an element given a description */
export type AirtopV11InteractionClickConfig = {
	resource: 'interaction';
	operation: 'click';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * A specific description of the element to execute the interaction on
	 */
	elementDescription: string | Expression<string>;
	/**
	 * The type of click to perform. Defaults to left click.
	 * @default click
	 */
	clickType?: 'click' | 'doubleClick' | 'rightClick' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Fill a form with the provided information */
export type AirtopV11InteractionFillConfig = {
	resource: 'interaction';
	operation: 'fill';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * The information to fill into the form written in natural language
	 */
	formData: string | Expression<string>;
};

/** Execute a hover action on an element given a description */
export type AirtopV11InteractionHoverConfig = {
	resource: 'interaction';
	operation: 'hover';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * A specific description of the element to execute the interaction on
	 */
	elementDescription: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Execute a scroll action on the page */
export type AirtopV11InteractionScrollConfig = {
	resource: 'interaction';
	operation: 'scroll';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * Choose the mode of scrolling
	 * @default automatic
	 */
	scrollingMode: 'automatic' | 'manual' | Expression<string>;
	/**
	 * A natural language description of the element to scroll to
	 */
	scrollToElement: string | Expression<string>;
	/**
	 * The direction to scroll to. When 'Scroll By' is defined, 'Scroll To Edge' action will be executed first, then 'Scroll By' action.
	 * @default {}
	 */
	scrollToEdge?: Record<string, unknown>;
	/**
	 * The amount to scroll by. When 'Scroll To Edge' is defined, 'Scroll By' action will be executed after 'Scroll To Edge'.
	 * @default {}
	 */
	scrollBy?: Record<string, unknown>;
	/**
	 * Scroll within an element on the page
	 */
	scrollWithin?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Execute a Type action on an element given a description */
export type AirtopV11InteractionTypeConfig = {
	resource: 'interaction';
	operation: 'type';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * The text to type into the browser window
	 */
	text: string | Expression<string>;
	/**
	 * Whether to press the Enter key after typing the text
	 * @default false
	 */
	pressEnterKey?: boolean | Expression<boolean>;
	/**
	 * A specific description of the element to execute the interaction on
	 */
	elementDescription?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create an Airtop browser session */
export type AirtopV11SessionCreateConfig = {
	resource: 'session';
	operation: 'create';
	/**
	 * The name of the Airtop profile to load or create
	 */
	profileName?: string | Expression<string>;
	/**
	 * Whether to automatically save the &lt;a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank"&gt;Airtop profile&lt;/a&gt; for this session upon termination
	 * @default false
	 */
	saveProfileOnTermination?: boolean | Expression<boolean>;
	/**
	 * Whether to record the browser session. &lt;a href="https://docs.airtop.ai/guides/how-to/recording-a-session" target="_blank"&gt;More details&lt;/a&gt;.
	 * @default false
	 */
	record?: boolean | Expression<boolean>;
	/**
	 * Minutes to wait before the session is terminated due to inactivity
	 * @default 10
	 */
	timeoutMinutes?: number | Expression<number>;
	/**
	 * Choose how to configure the proxy for this session
	 * @default none
	 */
	proxy?: 'none' | 'integrated' | 'proxyUrl' | Expression<string>;
	/**
	 * The Airtop-provided configuration to use for the proxy
	 * @default {"country":"US","sticky":true}
	 */
	proxyConfig?: Record<string, unknown>;
	/**
	 * The URL of the proxy to use
	 */
	proxyUrl?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Save in a profile changes made in your browsing session such as cookies and local storage */
export type AirtopV11SessionSaveConfig = {
	resource: 'session';
	operation: 'save';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The name of the &lt;a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank"&gt;Profile&lt;/a&gt; to save
	 */
	profileName: string | Expression<string>;
};

/** Terminate a session */
export type AirtopV11SessionTerminateConfig = {
	resource: 'session';
	operation: 'terminate';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
};

/** Wait for a file download to become available */
export type AirtopV11SessionWaitForDownloadConfig = {
	resource: 'session';
	operation: 'waitForDownload';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Close a window inside a session */
export type AirtopV11WindowCloseConfig = {
	resource: 'window';
	operation: 'close';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
};

/** Create an Airtop browser session */
export type AirtopV11WindowCreateConfig = {
	resource: 'window';
	operation: 'create';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * Initial URL to load in the window. Defaults to https://www.google.com.
	 */
	url?: string | Expression<string>;
	/**
	 * Whether to get the URL of the window's &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-live-view" target="_blank"&gt;Live View&lt;/a&gt;
	 * @default false
	 */
	getLiveView?: boolean | Expression<boolean>;
	/**
	 * Whether to include the navigation bar in the Live View. When enabled, the navigation bar will be visible allowing you to navigate between pages.
	 * @default false
	 */
	includeNavigationBar?: boolean | Expression<boolean>;
	/**
	 * The screen resolution of the Live View. Setting a resolution will force the window to open at that specific size.
	 */
	screenResolution?: string | Expression<string>;
	/**
	 * Whether to disable the window from being resized in the Live View
	 * @default false
	 */
	disableResize?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Get information about a browser window, including the live view URL */
export type AirtopV11WindowGetLiveViewConfig = {
	resource: 'window';
	operation: 'getLiveView';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** List all browser windows in a session */
export type AirtopV11WindowListConfig = {
	resource: 'window';
	operation: 'list';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
};

/** Load a URL in an existing window */
export type AirtopV11WindowLoadConfig = {
	resource: 'window';
	operation: 'load';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * URL to load in the window
	 */
	url: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Take a screenshot of the current window */
export type AirtopV11WindowTakeScreenshotConfig = {
	resource: 'window';
	operation: 'takeScreenshot';
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
	 * @default ={{ $json["sessionId"] }}
	 */
	sessionId: string | Expression<string>;
	/**
	 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
	 * @default ={{ $json["windowId"] }}
	 */
	windowId: string | Expression<string>;
	/**
	 * Whether to output the image as a binary file instead of a base64 encoded string
	 * @default false
	 */
	outputImageAsBinary?: boolean | Expression<boolean>;
};

export type AirtopV11Params =
	| AirtopV11AgentRunConfig
	| AirtopV11ExtractionQueryConfig
	| AirtopV11ExtractionGetPaginatedConfig
	| AirtopV11ExtractionScrapeConfig
	| AirtopV11FileDeleteFileConfig
	| AirtopV11FileGetConfig
	| AirtopV11FileGetManyConfig
	| AirtopV11FileLoadConfig
	| AirtopV11FileUploadConfig
	| AirtopV11InteractionClickConfig
	| AirtopV11InteractionFillConfig
	| AirtopV11InteractionHoverConfig
	| AirtopV11InteractionScrollConfig
	| AirtopV11InteractionTypeConfig
	| AirtopV11SessionCreateConfig
	| AirtopV11SessionSaveConfig
	| AirtopV11SessionTerminateConfig
	| AirtopV11SessionWaitForDownloadConfig
	| AirtopV11WindowCloseConfig
	| AirtopV11WindowCreateConfig
	| AirtopV11WindowGetLiveViewConfig
	| AirtopV11WindowListConfig
	| AirtopV11WindowLoadConfig
	| AirtopV11WindowTakeScreenshotConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AirtopV11Credentials {
	airtopApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AirtopNode = {
	type: 'n8n-nodes-base.airtop';
	version: 1 | 1.1;
	config: NodeConfig<AirtopV11Params>;
	credentials?: AirtopV11Credentials;
};
