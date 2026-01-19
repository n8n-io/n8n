/**
 * Airtop Node - Version 1.1
 * Scrape and control any site with Airtop
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Run an Airtop agent */
export type AirtopV11AgentRunConfig = {
	resource: 'agent';
	operation: 'run';
/**
 * Webhook URL to invoke the Airtop agent. Visit &lt;a href="https://portal.airtop.ai/agents" target="_blank"&gt;Airtop Agents&lt;/a&gt; for more information.
 * @displayOptions.show { resource: ["agent"], operation: ["run"] }
 */
		webhookUrl: string | Expression<string>;
/**
 * Agent's input parameters in JSON format. Visit &lt;a href="https://portal.airtop.ai/agents" target="_blank"&gt;Airtop Agents&lt;/a&gt; for more information.
 * @displayOptions.show { resource: ["agent"], operation: ["run"] }
 * @default {}
 */
		agentParameters: IDataObject | string | Expression<string>;
/**
 * Whether to wait for the agent to complete its execution
 * @displayOptions.show { resource: ["agent"], operation: ["run"] }
 * @default true
 */
		awaitExecution?: boolean | Expression<boolean>;
/**
 * Timeout in seconds to wait for the agent to finish
 * @displayOptions.show { resource: ["agent"], operation: ["run"], awaitExecution: [true] }
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
 * @displayOptions.show { resource: ["extraction"], operation: ["getPaginated", "query", "scrape"] }
 * @default existing
 */
		sessionMode?: 'new' | 'existing' | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["existing"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["existing"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * URL to load in the window
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["new"] }
 */
		url: string | Expression<string>;
/**
 * The name of the Airtop profile to load or create
 * @hint &lt;a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank"&gt;Learn more&lt;/a&gt; about Airtop profiles
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["new"] }
 */
		profileName?: string | Expression<string>;
/**
 * Whether to terminate the session after the operation is complete. When disabled, you must manually terminate the session. By default, idle sessions timeout after 10 minutes
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["new"] }
 * @default true
 */
		autoTerminateSession?: boolean | Expression<boolean>;
/**
 * The prompt to query the page content
 * @displayOptions.show { resource: ["extraction"], operation: ["query"] }
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
 * @displayOptions.show { resource: ["extraction"], operation: ["getPaginated", "query", "scrape"] }
 * @default existing
 */
		sessionMode?: 'new' | 'existing' | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["existing"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["existing"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * URL to load in the window
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["new"] }
 */
		url: string | Expression<string>;
/**
 * The name of the Airtop profile to load or create
 * @hint &lt;a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank"&gt;Learn more&lt;/a&gt; about Airtop profiles
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["new"] }
 */
		profileName?: string | Expression<string>;
/**
 * Whether to terminate the session after the operation is complete. When disabled, you must manually terminate the session. By default, idle sessions timeout after 10 minutes
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["new"] }
 * @default true
 */
		autoTerminateSession?: boolean | Expression<boolean>;
/**
 * The prompt to extract data from the pages
 * @displayOptions.show { resource: ["extraction"], operation: ["getPaginated"] }
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
 * @displayOptions.show { resource: ["extraction"], operation: ["getPaginated", "query", "scrape"] }
 * @default existing
 */
		sessionMode?: 'new' | 'existing' | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["existing"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["existing"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * URL to load in the window
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["new"] }
 */
		url: string | Expression<string>;
/**
 * The name of the Airtop profile to load or create
 * @hint &lt;a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank"&gt;Learn more&lt;/a&gt; about Airtop profiles
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["new"] }
 */
		profileName?: string | Expression<string>;
/**
 * Whether to terminate the session after the operation is complete. When disabled, you must manually terminate the session. By default, idle sessions timeout after 10 minutes
 * @displayOptions.show { resource: ["extraction"], sessionMode: ["new"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["deleteFile"] }
 */
		fileId: string | Expression<string>;
};

/** Get a details of an uploaded file */
export type AirtopV11FileGetConfig = {
	resource: 'file';
	operation: 'get';
/**
 * ID of the file to retrieve
 * @displayOptions.show { resource: ["file"], operation: ["get"] }
 */
		fileId: string | Expression<string>;
/**
 * Whether to output the file in binary format if the file is ready for download
 * @displayOptions.show { resource: ["file"], operation: ["get"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["getMany"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["file"], operation: ["getMany"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
/**
 * Comma-separated list of &lt;a href="https://docs.airtop.ai/api-reference/airtop-api/sessions/create" target="_blank"&gt;Session IDs&lt;/a&gt; to filter files by. When empty, all files from all sessions will be returned.
 * @displayOptions.show { resource: ["file"], operation: ["getMany"] }
 */
		sessionIds?: string | Expression<string>;
/**
 * Whether to output one item containing all files or output each file as a separate item
 * @displayOptions.show { resource: ["file"], operation: ["getMany"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["load"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The window ID to trigger the file input in
 * @displayOptions.show { resource: ["file"], operation: ["load"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * ID of the file to load into the session
 * @displayOptions.show { resource: ["file"], operation: ["load"] }
 */
		fileId: string | Expression<string>;
/**
 * Optional description of the file input to interact with
 * @displayOptions.show { resource: ["file"], operation: ["load"] }
 */
		elementDescription?: string | Expression<string>;
/**
 * Whether to include hidden elements in the interaction
 * @displayOptions.show { resource: ["file"], operation: ["load"] }
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
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The window ID to trigger the file input in
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * Name for the file to upload. For a session, all files loaded should have &lt;b&gt;unique names&lt;/b&gt;.
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 */
		fileName: string | Expression<string>;
/**
 * Choose the type of file to upload. Defaults to 'Customer Upload'.
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 * @default customer_upload
 */
		fileType?: 'browser_download' | 'screenshot' | 'video' | 'customer_upload' | Expression<string>;
/**
 * Source of the file to upload
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 * @default url
 */
		source?: 'url' | 'binary' | Expression<string>;
/**
 * Name of the binary property containing the file data
 * @displayOptions.show { source: ["binary"], resource: ["file"], operation: ["upload"] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * URL from where to fetch the file to upload
 * @displayOptions.show { source: ["url"], resource: ["file"], operation: ["upload"] }
 */
		url: string | Expression<string>;
/**
 * Whether to automatically trigger the file input dialog in the current window. If disabled, the file will only be uploaded to the session without opening the file input dialog.
 * @displayOptions.show { resource: ["file"], operation: ["upload"] }
 * @default true
 */
		triggerFileInputParameter?: boolean | Expression<boolean>;
/**
 * Optional description of the file input to interact with
 * @displayOptions.show { triggerFileInputParameter: [true], resource: ["file"], operation: ["upload"] }
 */
		elementDescription?: string | Expression<string>;
/**
 * Whether to include hidden elements in the interaction
 * @displayOptions.show { triggerFileInputParameter: [true], resource: ["file"], operation: ["upload"] }
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
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * A specific description of the element to execute the interaction on
 * @displayOptions.show { resource: ["interaction"], operation: ["click"] }
 */
		elementDescription: string | Expression<string>;
/**
 * The type of click to perform. Defaults to left click.
 * @displayOptions.show { resource: ["interaction"], operation: ["click"] }
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
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * The information to fill into the form written in natural language
 * @displayOptions.show { resource: ["interaction"], operation: ["fill"] }
 */
		formData: string | Expression<string>;
};

/** Execute a hover action on an element given a description */
export type AirtopV11InteractionHoverConfig = {
	resource: 'interaction';
	operation: 'hover';
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * A specific description of the element to execute the interaction on
 * @displayOptions.show { resource: ["interaction"], operation: ["hover"] }
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
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * Choose the mode of scrolling
 * @displayOptions.show { resource: ["interaction"], operation: ["scroll"] }
 * @default automatic
 */
		scrollingMode: 'automatic' | 'manual' | Expression<string>;
/**
 * A natural language description of the element to scroll to
 * @displayOptions.show { resource: ["interaction"], operation: ["scroll"], scrollingMode: ["automatic"] }
 */
		scrollToElement: string | Expression<string>;
/**
 * The direction to scroll to. When 'Scroll By' is defined, 'Scroll To Edge' action will be executed first, then 'Scroll By' action.
 * @displayOptions.show { resource: ["interaction"], operation: ["scroll"], scrollingMode: ["manual"] }
 * @default {}
 */
		scrollToEdge?: {
		edgeValues?: {
			/** Vertically
			 */
			yAxis?: '' | 'top' | 'bottom' | Expression<string>;
			/** Horizontally
			 */
			xAxis?: '' | 'left' | 'right' | Expression<string>;
		};
	};
/**
 * The amount to scroll by. When 'Scroll To Edge' is defined, 'Scroll By' action will be executed after 'Scroll To Edge'.
 * @displayOptions.show { resource: ["interaction"], operation: ["scroll"], scrollingMode: ["manual"] }
 * @default {}
 */
		scrollBy?: {
		scrollValues?: {
			/** Vertically
			 */
			yAxis?: string | Expression<string>;
			/** Horizontally
			 */
			xAxis?: string | Expression<string>;
		};
	};
/**
 * Scroll within an element on the page
 * @displayOptions.show { resource: ["interaction"], operation: ["scroll"] }
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
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["interaction"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * The text to type into the browser window
 * @displayOptions.show { resource: ["interaction"], operation: ["type"] }
 */
		text: string | Expression<string>;
/**
 * Whether to press the Enter key after typing the text
 * @displayOptions.show { resource: ["interaction"], operation: ["type"] }
 * @default false
 */
		pressEnterKey?: boolean | Expression<boolean>;
/**
 * A specific description of the element to execute the interaction on
 * @displayOptions.show { resource: ["interaction"], operation: ["type"] }
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
 * @hint &lt;a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank"&gt;Learn more&lt;/a&gt; about Airtop profiles
 * @displayOptions.show { resource: ["session"], operation: ["create"] }
 */
		profileName?: string | Expression<string>;
/**
 * Whether to automatically save the &lt;a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank"&gt;Airtop profile&lt;/a&gt; for this session upon termination
 * @displayOptions.show { resource: ["session"], operation: ["create"] }
 * @default false
 */
		saveProfileOnTermination?: boolean | Expression<boolean>;
/**
 * Whether to record the browser session. &lt;a href="https://docs.airtop.ai/guides/how-to/recording-a-session" target="_blank"&gt;More details&lt;/a&gt;.
 * @displayOptions.show { resource: ["session"], operation: ["create"] }
 * @default false
 */
		record?: boolean | Expression<boolean>;
/**
 * Minutes to wait before the session is terminated due to inactivity
 * @displayOptions.show { resource: ["session"], operation: ["create"] }
 * @default 10
 */
		timeoutMinutes?: number | Expression<number>;
/**
 * Choose how to configure the proxy for this session
 * @displayOptions.show { resource: ["session"], operation: ["create"] }
 * @default none
 */
		proxy?: 'none' | 'integrated' | 'proxyUrl' | Expression<string>;
/**
 * The Airtop-provided configuration to use for the proxy
 * @displayOptions.show { resource: ["session"], operation: ["create"], proxy: ["integrated"] }
 * @default {"country":"US","sticky":true}
 */
		proxyConfig?: Record<string, unknown>;
/**
 * The URL of the proxy to use
 * @displayOptions.show { resource: ["session"], operation: ["create"], proxy: ["proxyUrl"] }
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
 * @displayOptions.show { resource: ["session"], operation: ["save"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The name of the &lt;a href="https://docs.airtop.ai/guides/how-to/saving-a-profile" target="_blank"&gt;Profile&lt;/a&gt; to save
 * @hint Name of the profile you want to save. Must consist only of alphanumeric characters and hyphens "-"
 * @displayOptions.show { resource: ["session"], operation: ["save"] }
 */
		profileName: string | Expression<string>;
};

/** Terminate a session */
export type AirtopV11SessionTerminateConfig = {
	resource: 'session';
	operation: 'terminate';
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session" target="_blank"&gt;Session&lt;/a&gt; to use
 * @displayOptions.show { resource: ["session"], operation: ["terminate"] }
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
 * @displayOptions.show { resource: ["session"], operation: ["waitForDownload"] }
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
 * @displayOptions.show { resource: ["window"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["window"], operation: ["close", "takeScreenshot", "load", "getLiveView"] }
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
 * @displayOptions.show { resource: ["window"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * Initial URL to load in the window. Defaults to https://www.google.com.
 * @displayOptions.show { resource: ["window"], operation: ["create"] }
 */
		url?: string | Expression<string>;
/**
 * Whether to get the URL of the window's &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-live-view" target="_blank"&gt;Live View&lt;/a&gt;
 * @displayOptions.show { resource: ["window"], operation: ["create"] }
 * @default false
 */
		getLiveView?: boolean | Expression<boolean>;
/**
 * Whether to include the navigation bar in the Live View. When enabled, the navigation bar will be visible allowing you to navigate between pages.
 * @displayOptions.show { resource: ["window"], operation: ["create"], getLiveView: [true] }
 * @default false
 */
		includeNavigationBar?: boolean | Expression<boolean>;
/**
 * The screen resolution of the Live View. Setting a resolution will force the window to open at that specific size.
 * @displayOptions.show { resource: ["window"], operation: ["create"], getLiveView: [true] }
 */
		screenResolution?: string | Expression<string>;
/**
 * Whether to disable the window from being resized in the Live View
 * @displayOptions.show { resource: ["window"], operation: ["create"], getLiveView: [true] }
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
 * @displayOptions.show { resource: ["window"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["window"], operation: ["close", "takeScreenshot", "load", "getLiveView"] }
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
 * @displayOptions.show { resource: ["window"] }
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
 * @displayOptions.show { resource: ["window"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["window"], operation: ["close", "takeScreenshot", "load", "getLiveView"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * URL to load in the window
 * @displayOptions.show { resource: ["window"], operation: ["load"] }
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
 * @displayOptions.show { resource: ["window"] }
 * @default ={{ $json["sessionId"] }}
 */
		sessionId: string | Expression<string>;
/**
 * The ID of the &lt;a href="https://docs.airtop.ai/guides/how-to/creating-a-session#windows" target="_blank"&gt;Window&lt;/a&gt; to use
 * @displayOptions.show { resource: ["window"], operation: ["close", "takeScreenshot", "load", "getLiveView"] }
 * @default ={{ $json["windowId"] }}
 */
		windowId: string | Expression<string>;
/**
 * Whether to output the image as a binary file instead of a base64 encoded string
 * @displayOptions.show { resource: ["window"], operation: ["takeScreenshot"] }
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
	| AirtopV11WindowTakeScreenshotConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type AirtopV11ExtractionQueryOutput = {
	data?: {
		modelResponse?: string;
	};
	meta?: {
		requestId?: string;
		status?: string;
		usage?: {
			credits?: number;
			id?: string;
		};
	};
	warnings?: Array<{
		message?: string;
	}>;
};

export type AirtopV11ExtractionGetPaginatedOutput = {
	data?: {
		modelResponse?: string;
	};
	meta?: {
		requestId?: string;
		status?: string;
		usage?: {
			credits?: number;
			id?: string;
		};
	};
	sessionId?: string;
	windowId?: string;
};

export type AirtopV11ExtractionScrapeOutput = {
	data?: {
		modelResponse?: {
			scrapedContent?: {
				contentType?: string;
				text?: string;
			};
			title?: string;
		};
	};
	meta?: {
		requestId?: string;
		status?: string;
		usage?: {
			credits?: number;
			id?: string;
		};
	};
	sessionId?: string;
	windowId?: string;
};

export type AirtopV11InteractionClickOutput = {
	data?: {
		modelResponse?: string;
	};
	meta?: {
		actionId?: string;
		requestId?: string;
		status?: string;
		usage?: {
			credits?: number;
			id?: string;
		};
	};
	sessionId?: string;
	warnings?: Array<{
		message?: string;
	}>;
	windowId?: string;
};

export type AirtopV11InteractionTypeOutput = {
	data?: {
		modelResponse?: string;
	};
	meta?: {
		actionId?: string;
		requestId?: string;
		status?: string;
		usage?: {
			credits?: number;
			id?: string;
		};
	};
	sessionId?: string;
	warnings?: Array<{
		message?: string;
	}>;
	windowId?: string;
};

export type AirtopV11SessionCreateOutput = {
	data?: {
		cdpUrl?: string;
		cdpWsUrl?: string;
		chromedriverUrl?: string;
		configuration?: {
			baseProfileId?: string;
			timeoutMinutes?: number;
		};
		dateCreated?: string;
		id?: string;
		lastActivity?: string;
		status?: string;
	};
	errors?: null;
	meta?: {
		requestId?: string;
	};
	sessionId?: string;
	warnings?: Array<{
		code?: string;
		message?: string;
	}>;
};

export type AirtopV11SessionTerminateOutput = {
	success?: boolean;
};

export type AirtopV11WindowCreateOutput = {
	data?: {
		liveViewUrl?: string;
		targetId?: string;
		windowId?: string;
	};
	errors?: null;
	meta?: {
		requestId?: string;
	};
	sessionId?: string;
	warnings?: null;
	windowId?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface AirtopV11Credentials {
	airtopApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AirtopV11NodeBase {
	type: 'n8n-nodes-base.airtop';
	version: 1.1;
	credentials?: AirtopV11Credentials;
}

export type AirtopV11AgentRunNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11AgentRunConfig>;
};

export type AirtopV11ExtractionQueryNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11ExtractionQueryConfig>;
	output?: AirtopV11ExtractionQueryOutput;
};

export type AirtopV11ExtractionGetPaginatedNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11ExtractionGetPaginatedConfig>;
	output?: AirtopV11ExtractionGetPaginatedOutput;
};

export type AirtopV11ExtractionScrapeNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11ExtractionScrapeConfig>;
	output?: AirtopV11ExtractionScrapeOutput;
};

export type AirtopV11FileDeleteFileNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11FileDeleteFileConfig>;
};

export type AirtopV11FileGetNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11FileGetConfig>;
};

export type AirtopV11FileGetManyNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11FileGetManyConfig>;
};

export type AirtopV11FileLoadNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11FileLoadConfig>;
};

export type AirtopV11FileUploadNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11FileUploadConfig>;
};

export type AirtopV11InteractionClickNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11InteractionClickConfig>;
	output?: AirtopV11InteractionClickOutput;
};

export type AirtopV11InteractionFillNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11InteractionFillConfig>;
};

export type AirtopV11InteractionHoverNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11InteractionHoverConfig>;
};

export type AirtopV11InteractionScrollNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11InteractionScrollConfig>;
};

export type AirtopV11InteractionTypeNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11InteractionTypeConfig>;
	output?: AirtopV11InteractionTypeOutput;
};

export type AirtopV11SessionCreateNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11SessionCreateConfig>;
	output?: AirtopV11SessionCreateOutput;
};

export type AirtopV11SessionSaveNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11SessionSaveConfig>;
};

export type AirtopV11SessionTerminateNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11SessionTerminateConfig>;
	output?: AirtopV11SessionTerminateOutput;
};

export type AirtopV11SessionWaitForDownloadNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11SessionWaitForDownloadConfig>;
};

export type AirtopV11WindowCloseNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11WindowCloseConfig>;
};

export type AirtopV11WindowCreateNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11WindowCreateConfig>;
	output?: AirtopV11WindowCreateOutput;
};

export type AirtopV11WindowGetLiveViewNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11WindowGetLiveViewConfig>;
};

export type AirtopV11WindowListNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11WindowListConfig>;
};

export type AirtopV11WindowLoadNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11WindowLoadConfig>;
};

export type AirtopV11WindowTakeScreenshotNode = AirtopV11NodeBase & {
	config: NodeConfig<AirtopV11WindowTakeScreenshotConfig>;
};

export type AirtopV11Node =
	| AirtopV11AgentRunNode
	| AirtopV11ExtractionQueryNode
	| AirtopV11ExtractionGetPaginatedNode
	| AirtopV11ExtractionScrapeNode
	| AirtopV11FileDeleteFileNode
	| AirtopV11FileGetNode
	| AirtopV11FileGetManyNode
	| AirtopV11FileLoadNode
	| AirtopV11FileUploadNode
	| AirtopV11InteractionClickNode
	| AirtopV11InteractionFillNode
	| AirtopV11InteractionHoverNode
	| AirtopV11InteractionScrollNode
	| AirtopV11InteractionTypeNode
	| AirtopV11SessionCreateNode
	| AirtopV11SessionSaveNode
	| AirtopV11SessionTerminateNode
	| AirtopV11SessionWaitForDownloadNode
	| AirtopV11WindowCloseNode
	| AirtopV11WindowCreateNode
	| AirtopV11WindowGetLiveViewNode
	| AirtopV11WindowListNode
	| AirtopV11WindowLoadNode
	| AirtopV11WindowTakeScreenshotNode
	;