/**
 * HTTP Request Node - Version 4.3
 * Makes an HTTP request and returns the response data
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type HttpRequestV43NoneConfig = {
	authentication: 'none';
/**
 * The request method to use
 * @default GET
 */
		method?: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | Expression<string>;
/**
 * The URL to make the request to
 */
		url: string | Expression<string>;
	provideSslCertificates?: boolean | Expression<boolean>;
/**
 * Whether the request has query params or not
 * @default false
 */
		sendQuery?: boolean | Expression<boolean>;
	specifyQuery?: 'keypair' | 'json' | Expression<string>;
	queryParameters?: {
		parameters?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	jsonQuery?: IDataObject | string | Expression<string>;
/**
 * Whether the request has headers or not
 * @default false
 */
		sendHeaders?: boolean | Expression<boolean>;
	specifyHeaders?: 'keypair' | 'json' | Expression<string>;
	headerParameters?: {
		parameters?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	jsonHeaders?: IDataObject | string | Expression<string>;
/**
 * Whether the request has a body or not
 * @default false
 */
		sendBody?: boolean | Expression<boolean>;
/**
 * Content-Type to use to send body parameters
 * @displayOptions.show { sendBody: [true] }
 * @default json
 */
		contentType?: 'form-urlencoded' | 'multipart-form-data' | 'json' | 'binaryData' | 'raw' | Expression<string>;
/**
 * The body can be specified using explicit fields (&lt;code&gt;keypair&lt;/code&gt;) or using a JavaScript object (&lt;code&gt;json&lt;/code&gt;)
 * @displayOptions.show { sendBody: [true], contentType: ["json"] }
 * @default keypair
 */
		specifyBody?: 'keypair' | 'json' | Expression<string>;
	bodyParameters?: {
		parameters?: Array<{
			/** ID of the field to set. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			name?: string | Expression<string>;
			/** Value of the field to set
			 */
			value?: string | Expression<string>;
		}>;
	};
	jsonBody?: IDataObject | string | Expression<string>;
	body?: string | Expression<string>;
/**
 * The name of the incoming field containing the binary file data to be processed
 * @displayOptions.show { sendBody: [true], contentType: ["binaryData"] }
 */
		inputDataFieldName?: string | Expression<string>;
	rawContentType?: string | Expression<string>;
	options?: Record<string, unknown>;
/**
 * Whether the optimize the tool response to reduce amount of data passed to the LLM that could lead to better result and reduce cost
 * @displayOptions.show { @tool: [true] }
 * @default false
 */
		optimizeResponse?: boolean | Expression<boolean>;
	responseType?: 'json' | 'html' | 'text' | Expression<string>;
/**
 * Specify the name of the field in the response containing the data
 * @hint leave blank to use whole response
 * @displayOptions.show { optimizeResponse: [true], responseType: ["json"], @tool: [true] }
 */
		dataField?: string | Expression<string>;
/**
 * What fields response object should include
 * @displayOptions.show { optimizeResponse: [true], responseType: ["json"], @tool: [true] }
 * @default all
 */
		fieldsToInclude?: 'all' | 'selected' | 'except' | Expression<string>;
/**
 * Comma-separated list of the field names. Supports dot notation. You can drag the selected fields from the input panel.
 * @displayOptions.show { optimizeResponse: [true], responseType: ["json"], @tool: [true] }
 * @displayOptions.hide { fieldsToInclude: ["all"] }
 */
		fields?: string | Expression<string>;
/**
 * Select specific element(e.g. body) or multiple elements(e.g. div) of chosen type in the response HTML.
 * @displayOptions.show { optimizeResponse: [true], responseType: ["html"], @tool: [true] }
 * @default body
 */
		cssSelector?: string | Expression<string>;
/**
 * Whether to return only content of html elements, stripping html tags and attributes
 * @hint Uses less tokens and may be easier for model to understand
 * @displayOptions.show { optimizeResponse: [true], responseType: ["html"], @tool: [true] }
 * @default false
 */
		onlyContent?: boolean | Expression<boolean>;
/**
 * Comma-separated list of selectors that would be excluded when extracting content
 * @displayOptions.show { optimizeResponse: [true], responseType: ["html"], onlyContent: [true], @tool: [true] }
 */
		elementsToOmit?: string | Expression<string>;
	truncateResponse?: boolean | Expression<boolean>;
	maxLength?: number | Expression<number>;
};

/** We've already implemented auth for many services so that you don't have to set it up manually */
export type HttpRequestV43PredefinedCredentialTypeConfig = {
	authentication: 'predefinedCredentialType';
/**
 * The request method to use
 * @default GET
 */
		method?: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | Expression<string>;
/**
 * The URL to make the request to
 */
		url: string | Expression<string>;
	provideSslCertificates?: boolean | Expression<boolean>;
/**
 * Whether the request has query params or not
 * @default false
 */
		sendQuery?: boolean | Expression<boolean>;
	specifyQuery?: 'keypair' | 'json' | Expression<string>;
	queryParameters?: {
		parameters?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	jsonQuery?: IDataObject | string | Expression<string>;
/**
 * Whether the request has headers or not
 * @default false
 */
		sendHeaders?: boolean | Expression<boolean>;
	specifyHeaders?: 'keypair' | 'json' | Expression<string>;
	headerParameters?: {
		parameters?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	jsonHeaders?: IDataObject | string | Expression<string>;
/**
 * Whether the request has a body or not
 * @default false
 */
		sendBody?: boolean | Expression<boolean>;
/**
 * Content-Type to use to send body parameters
 * @displayOptions.show { sendBody: [true] }
 * @default json
 */
		contentType?: 'form-urlencoded' | 'multipart-form-data' | 'json' | 'binaryData' | 'raw' | Expression<string>;
/**
 * The body can be specified using explicit fields (&lt;code&gt;keypair&lt;/code&gt;) or using a JavaScript object (&lt;code&gt;json&lt;/code&gt;)
 * @displayOptions.show { sendBody: [true], contentType: ["json"] }
 * @default keypair
 */
		specifyBody?: 'keypair' | 'json' | Expression<string>;
	bodyParameters?: {
		parameters?: Array<{
			/** ID of the field to set. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			name?: string | Expression<string>;
			/** Value of the field to set
			 */
			value?: string | Expression<string>;
		}>;
	};
	jsonBody?: IDataObject | string | Expression<string>;
	body?: string | Expression<string>;
/**
 * The name of the incoming field containing the binary file data to be processed
 * @displayOptions.show { sendBody: [true], contentType: ["binaryData"] }
 */
		inputDataFieldName?: string | Expression<string>;
	rawContentType?: string | Expression<string>;
	options?: Record<string, unknown>;
/**
 * Whether the optimize the tool response to reduce amount of data passed to the LLM that could lead to better result and reduce cost
 * @displayOptions.show { @tool: [true] }
 * @default false
 */
		optimizeResponse?: boolean | Expression<boolean>;
	responseType?: 'json' | 'html' | 'text' | Expression<string>;
/**
 * Specify the name of the field in the response containing the data
 * @hint leave blank to use whole response
 * @displayOptions.show { optimizeResponse: [true], responseType: ["json"], @tool: [true] }
 */
		dataField?: string | Expression<string>;
/**
 * What fields response object should include
 * @displayOptions.show { optimizeResponse: [true], responseType: ["json"], @tool: [true] }
 * @default all
 */
		fieldsToInclude?: 'all' | 'selected' | 'except' | Expression<string>;
/**
 * Comma-separated list of the field names. Supports dot notation. You can drag the selected fields from the input panel.
 * @displayOptions.show { optimizeResponse: [true], responseType: ["json"], @tool: [true] }
 * @displayOptions.hide { fieldsToInclude: ["all"] }
 */
		fields?: string | Expression<string>;
/**
 * Select specific element(e.g. body) or multiple elements(e.g. div) of chosen type in the response HTML.
 * @displayOptions.show { optimizeResponse: [true], responseType: ["html"], @tool: [true] }
 * @default body
 */
		cssSelector?: string | Expression<string>;
/**
 * Whether to return only content of html elements, stripping html tags and attributes
 * @hint Uses less tokens and may be easier for model to understand
 * @displayOptions.show { optimizeResponse: [true], responseType: ["html"], @tool: [true] }
 * @default false
 */
		onlyContent?: boolean | Expression<boolean>;
/**
 * Comma-separated list of selectors that would be excluded when extracting content
 * @displayOptions.show { optimizeResponse: [true], responseType: ["html"], onlyContent: [true], @tool: [true] }
 */
		elementsToOmit?: string | Expression<string>;
	truncateResponse?: boolean | Expression<boolean>;
	maxLength?: number | Expression<number>;
};

/** Fully customizable. Choose between basic, header, OAuth2, etc. */
export type HttpRequestV43GenericCredentialTypeConfig = {
	authentication: 'genericCredentialType';
/**
 * The request method to use
 * @default GET
 */
		method?: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | Expression<string>;
/**
 * The URL to make the request to
 */
		url: string | Expression<string>;
	provideSslCertificates?: boolean | Expression<boolean>;
/**
 * Whether the request has query params or not
 * @default false
 */
		sendQuery?: boolean | Expression<boolean>;
	specifyQuery?: 'keypair' | 'json' | Expression<string>;
	queryParameters?: {
		parameters?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	jsonQuery?: IDataObject | string | Expression<string>;
/**
 * Whether the request has headers or not
 * @default false
 */
		sendHeaders?: boolean | Expression<boolean>;
	specifyHeaders?: 'keypair' | 'json' | Expression<string>;
	headerParameters?: {
		parameters?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	jsonHeaders?: IDataObject | string | Expression<string>;
/**
 * Whether the request has a body or not
 * @default false
 */
		sendBody?: boolean | Expression<boolean>;
/**
 * Content-Type to use to send body parameters
 * @displayOptions.show { sendBody: [true] }
 * @default json
 */
		contentType?: 'form-urlencoded' | 'multipart-form-data' | 'json' | 'binaryData' | 'raw' | Expression<string>;
/**
 * The body can be specified using explicit fields (&lt;code&gt;keypair&lt;/code&gt;) or using a JavaScript object (&lt;code&gt;json&lt;/code&gt;)
 * @displayOptions.show { sendBody: [true], contentType: ["json"] }
 * @default keypair
 */
		specifyBody?: 'keypair' | 'json' | Expression<string>;
	bodyParameters?: {
		parameters?: Array<{
			/** ID of the field to set. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			name?: string | Expression<string>;
			/** Value of the field to set
			 */
			value?: string | Expression<string>;
		}>;
	};
	jsonBody?: IDataObject | string | Expression<string>;
	body?: string | Expression<string>;
/**
 * The name of the incoming field containing the binary file data to be processed
 * @displayOptions.show { sendBody: [true], contentType: ["binaryData"] }
 */
		inputDataFieldName?: string | Expression<string>;
	rawContentType?: string | Expression<string>;
	options?: Record<string, unknown>;
/**
 * Whether the optimize the tool response to reduce amount of data passed to the LLM that could lead to better result and reduce cost
 * @displayOptions.show { @tool: [true] }
 * @default false
 */
		optimizeResponse?: boolean | Expression<boolean>;
	responseType?: 'json' | 'html' | 'text' | Expression<string>;
/**
 * Specify the name of the field in the response containing the data
 * @hint leave blank to use whole response
 * @displayOptions.show { optimizeResponse: [true], responseType: ["json"], @tool: [true] }
 */
		dataField?: string | Expression<string>;
/**
 * What fields response object should include
 * @displayOptions.show { optimizeResponse: [true], responseType: ["json"], @tool: [true] }
 * @default all
 */
		fieldsToInclude?: 'all' | 'selected' | 'except' | Expression<string>;
/**
 * Comma-separated list of the field names. Supports dot notation. You can drag the selected fields from the input panel.
 * @displayOptions.show { optimizeResponse: [true], responseType: ["json"], @tool: [true] }
 * @displayOptions.hide { fieldsToInclude: ["all"] }
 */
		fields?: string | Expression<string>;
/**
 * Select specific element(e.g. body) or multiple elements(e.g. div) of chosen type in the response HTML.
 * @displayOptions.show { optimizeResponse: [true], responseType: ["html"], @tool: [true] }
 * @default body
 */
		cssSelector?: string | Expression<string>;
/**
 * Whether to return only content of html elements, stripping html tags and attributes
 * @hint Uses less tokens and may be easier for model to understand
 * @displayOptions.show { optimizeResponse: [true], responseType: ["html"], @tool: [true] }
 * @default false
 */
		onlyContent?: boolean | Expression<boolean>;
/**
 * Comma-separated list of selectors that would be excluded when extracting content
 * @displayOptions.show { optimizeResponse: [true], responseType: ["html"], onlyContent: [true], @tool: [true] }
 */
		elementsToOmit?: string | Expression<string>;
	truncateResponse?: boolean | Expression<boolean>;
	maxLength?: number | Expression<number>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface HttpRequestV43Credentials {
	httpSslAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HttpRequestV43NodeBase {
	type: 'n8n-nodes-base.httpRequest';
	version: 4.3;
	credentials?: HttpRequestV43Credentials;
}

export type HttpRequestV43NoneNode = HttpRequestV43NodeBase & {
	config: NodeConfig<HttpRequestV43NoneConfig>;
};

export type HttpRequestV43PredefinedCredentialTypeNode = HttpRequestV43NodeBase & {
	config: NodeConfig<HttpRequestV43PredefinedCredentialTypeConfig>;
};

export type HttpRequestV43GenericCredentialTypeNode = HttpRequestV43NodeBase & {
	config: NodeConfig<HttpRequestV43GenericCredentialTypeConfig>;
};

export type HttpRequestV43Node =
	| HttpRequestV43NoneNode
	| HttpRequestV43PredefinedCredentialTypeNode
	| HttpRequestV43GenericCredentialTypeNode
	;