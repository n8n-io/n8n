/**
 * HTTP Request Node Types
 *
 * Makes an HTTP request and returns the response data
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/httprequest/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

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
	queryParameters?: Record<string, unknown>;
	jsonQuery?: IDataObject | string | Expression<string>;
	/**
	 * Whether the request has headers or not
	 * @default false
	 */
	sendHeaders?: boolean | Expression<boolean>;
	specifyHeaders?: 'keypair' | 'json' | Expression<string>;
	headerParameters?: Record<string, unknown>;
	jsonHeaders?: IDataObject | string | Expression<string>;
	/**
	 * Whether the request has a body or not
	 * @default false
	 */
	sendBody?: boolean | Expression<boolean>;
	/**
	 * Content-Type to use to send body parameters
	 * @default json
	 */
	contentType?:
		| 'form-urlencoded'
		| 'multipart-form-data'
		| 'json'
		| 'binaryData'
		| 'raw'
		| Expression<string>;
	/**
	 * The body can be specified using explicit fields (&lt;code&gt;keypair&lt;/code&gt;) or using a JavaScript object (&lt;code&gt;json&lt;/code&gt;)
	 * @default keypair
	 */
	specifyBody?: 'keypair' | 'json' | Expression<string>;
	bodyParameters?: Record<string, unknown>;
	jsonBody?: IDataObject | string | Expression<string>;
	body?: string | Expression<string>;
	/**
	 * The name of the incoming field containing the binary file data to be processed
	 */
	inputDataFieldName?: string | Expression<string>;
	rawContentType?: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * Whether the optimize the tool response to reduce amount of data passed to the LLM that could lead to better result and reduce cost
	 * @default false
	 */
	optimizeResponse?: boolean | Expression<boolean>;
	responseType?: 'json' | 'html' | 'text' | Expression<string>;
	/**
	 * Specify the name of the field in the response containing the data
	 * @hint leave blank to use whole response
	 */
	dataField?: string | Expression<string>;
	/**
	 * What fields response object should include
	 * @default all
	 */
	fieldsToInclude?: 'all' | 'selected' | 'except' | Expression<string>;
	/**
	 * Comma-separated list of the field names. Supports dot notation. You can drag the selected fields from the input panel.
	 */
	fields?: string | Expression<string>;
	/**
	 * Select specific element(e.g. body) or multiple elements(e.g. div) of chosen type in the response HTML.
	 * @default body
	 */
	cssSelector?: string | Expression<string>;
	/**
	 * Whether to return only content of html elements, stripping html tags and attributes
	 * @hint Uses less tokens and may be easier for model to understand
	 * @default false
	 */
	onlyContent?: boolean | Expression<boolean>;
	/**
	 * Comma-separated list of selectors that would be excluded when extracting content
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
	queryParameters?: Record<string, unknown>;
	jsonQuery?: IDataObject | string | Expression<string>;
	/**
	 * Whether the request has headers or not
	 * @default false
	 */
	sendHeaders?: boolean | Expression<boolean>;
	specifyHeaders?: 'keypair' | 'json' | Expression<string>;
	headerParameters?: Record<string, unknown>;
	jsonHeaders?: IDataObject | string | Expression<string>;
	/**
	 * Whether the request has a body or not
	 * @default false
	 */
	sendBody?: boolean | Expression<boolean>;
	/**
	 * Content-Type to use to send body parameters
	 * @default json
	 */
	contentType?:
		| 'form-urlencoded'
		| 'multipart-form-data'
		| 'json'
		| 'binaryData'
		| 'raw'
		| Expression<string>;
	/**
	 * The body can be specified using explicit fields (&lt;code&gt;keypair&lt;/code&gt;) or using a JavaScript object (&lt;code&gt;json&lt;/code&gt;)
	 * @default keypair
	 */
	specifyBody?: 'keypair' | 'json' | Expression<string>;
	bodyParameters?: Record<string, unknown>;
	jsonBody?: IDataObject | string | Expression<string>;
	body?: string | Expression<string>;
	/**
	 * The name of the incoming field containing the binary file data to be processed
	 */
	inputDataFieldName?: string | Expression<string>;
	rawContentType?: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * Whether the optimize the tool response to reduce amount of data passed to the LLM that could lead to better result and reduce cost
	 * @default false
	 */
	optimizeResponse?: boolean | Expression<boolean>;
	responseType?: 'json' | 'html' | 'text' | Expression<string>;
	/**
	 * Specify the name of the field in the response containing the data
	 * @hint leave blank to use whole response
	 */
	dataField?: string | Expression<string>;
	/**
	 * What fields response object should include
	 * @default all
	 */
	fieldsToInclude?: 'all' | 'selected' | 'except' | Expression<string>;
	/**
	 * Comma-separated list of the field names. Supports dot notation. You can drag the selected fields from the input panel.
	 */
	fields?: string | Expression<string>;
	/**
	 * Select specific element(e.g. body) or multiple elements(e.g. div) of chosen type in the response HTML.
	 * @default body
	 */
	cssSelector?: string | Expression<string>;
	/**
	 * Whether to return only content of html elements, stripping html tags and attributes
	 * @hint Uses less tokens and may be easier for model to understand
	 * @default false
	 */
	onlyContent?: boolean | Expression<boolean>;
	/**
	 * Comma-separated list of selectors that would be excluded when extracting content
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
	queryParameters?: Record<string, unknown>;
	jsonQuery?: IDataObject | string | Expression<string>;
	/**
	 * Whether the request has headers or not
	 * @default false
	 */
	sendHeaders?: boolean | Expression<boolean>;
	specifyHeaders?: 'keypair' | 'json' | Expression<string>;
	headerParameters?: Record<string, unknown>;
	jsonHeaders?: IDataObject | string | Expression<string>;
	/**
	 * Whether the request has a body or not
	 * @default false
	 */
	sendBody?: boolean | Expression<boolean>;
	/**
	 * Content-Type to use to send body parameters
	 * @default json
	 */
	contentType?:
		| 'form-urlencoded'
		| 'multipart-form-data'
		| 'json'
		| 'binaryData'
		| 'raw'
		| Expression<string>;
	/**
	 * The body can be specified using explicit fields (&lt;code&gt;keypair&lt;/code&gt;) or using a JavaScript object (&lt;code&gt;json&lt;/code&gt;)
	 * @default keypair
	 */
	specifyBody?: 'keypair' | 'json' | Expression<string>;
	bodyParameters?: Record<string, unknown>;
	jsonBody?: IDataObject | string | Expression<string>;
	body?: string | Expression<string>;
	/**
	 * The name of the incoming field containing the binary file data to be processed
	 */
	inputDataFieldName?: string | Expression<string>;
	rawContentType?: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * Whether the optimize the tool response to reduce amount of data passed to the LLM that could lead to better result and reduce cost
	 * @default false
	 */
	optimizeResponse?: boolean | Expression<boolean>;
	responseType?: 'json' | 'html' | 'text' | Expression<string>;
	/**
	 * Specify the name of the field in the response containing the data
	 * @hint leave blank to use whole response
	 */
	dataField?: string | Expression<string>;
	/**
	 * What fields response object should include
	 * @default all
	 */
	fieldsToInclude?: 'all' | 'selected' | 'except' | Expression<string>;
	/**
	 * Comma-separated list of the field names. Supports dot notation. You can drag the selected fields from the input panel.
	 */
	fields?: string | Expression<string>;
	/**
	 * Select specific element(e.g. body) or multiple elements(e.g. div) of chosen type in the response HTML.
	 * @default body
	 */
	cssSelector?: string | Expression<string>;
	/**
	 * Whether to return only content of html elements, stripping html tags and attributes
	 * @hint Uses less tokens and may be easier for model to understand
	 * @default false
	 */
	onlyContent?: boolean | Expression<boolean>;
	/**
	 * Comma-separated list of selectors that would be excluded when extracting content
	 */
	elementsToOmit?: string | Expression<string>;
	truncateResponse?: boolean | Expression<boolean>;
	maxLength?: number | Expression<number>;
};

export type HttpRequestV43Params =
	| HttpRequestV43NoneConfig
	| HttpRequestV43PredefinedCredentialTypeConfig
	| HttpRequestV43GenericCredentialTypeConfig;

export type HttpRequestV2NoneConfig = {
	authentication: 'none';
	/**
	 * The request method to use
	 * @default GET
	 */
	requestMethod?:
		| 'DELETE'
		| 'GET'
		| 'HEAD'
		| 'OPTIONS'
		| 'PATCH'
		| 'POST'
		| 'PUT'
		| Expression<string>;
	/**
	 * The URL to make the request to
	 */
	url: string | Expression<string>;
	/**
	 * Whether to download the response even if SSL certificate validation is not possible
	 * @default false
	 */
	allowUnauthorizedCerts?: boolean | Expression<boolean>;
	/**
	 * The format in which the data gets returned from the URL
	 * @default json
	 */
	responseFormat?: 'file' | 'json' | 'string' | Expression<string>;
	/**
	 * Name of the property to which to write the response data
	 * @default data
	 */
	dataPropertyName: string | Expression<string>;
	/**
	 * Whether the query and/or body parameter should be set via the value-key pair UI or JSON/RAW
	 * @default false
	 */
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	/**
	 * Whether binary data should be send as body
	 * @default false
	 */
	sendBinaryData?: boolean | Expression<boolean>;
	/**
	 * For Form-Data Multipart, they can be provided in the format: &lt;code&gt;"sendKey1:binaryProperty1,sendKey2:binaryProperty2&lt;/code&gt;
	 * @hint The name of the input binary field containing the file to be uploaded
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Body parameters as JSON or RAW
	 */
	bodyParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The body parameter to send
	 * @default {}
	 */
	bodyParametersUi?: Record<string, unknown>;
	/**
	 * Header parameters as JSON or RAW
	 */
	headerParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The headers to send
	 * @default {}
	 */
	headerParametersUi?: Record<string, unknown>;
	/**
	 * Query parameters as JSON (flat object)
	 */
	queryParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The query parameter to send
	 * @default {}
	 */
	queryParametersUi?: Record<string, unknown>;
};

/** We've already implemented auth for many services so that you don't have to set it up manually */
export type HttpRequestV2PredefinedCredentialTypeConfig = {
	authentication: 'predefinedCredentialType';
	/**
	 * The request method to use
	 * @default GET
	 */
	requestMethod?:
		| 'DELETE'
		| 'GET'
		| 'HEAD'
		| 'OPTIONS'
		| 'PATCH'
		| 'POST'
		| 'PUT'
		| Expression<string>;
	/**
	 * The URL to make the request to
	 */
	url: string | Expression<string>;
	/**
	 * Whether to download the response even if SSL certificate validation is not possible
	 * @default false
	 */
	allowUnauthorizedCerts?: boolean | Expression<boolean>;
	/**
	 * The format in which the data gets returned from the URL
	 * @default json
	 */
	responseFormat?: 'file' | 'json' | 'string' | Expression<string>;
	/**
	 * Name of the property to which to write the response data
	 * @default data
	 */
	dataPropertyName: string | Expression<string>;
	/**
	 * Whether the query and/or body parameter should be set via the value-key pair UI or JSON/RAW
	 * @default false
	 */
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	/**
	 * Whether binary data should be send as body
	 * @default false
	 */
	sendBinaryData?: boolean | Expression<boolean>;
	/**
	 * For Form-Data Multipart, they can be provided in the format: &lt;code&gt;"sendKey1:binaryProperty1,sendKey2:binaryProperty2&lt;/code&gt;
	 * @hint The name of the input binary field containing the file to be uploaded
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Body parameters as JSON or RAW
	 */
	bodyParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The body parameter to send
	 * @default {}
	 */
	bodyParametersUi?: Record<string, unknown>;
	/**
	 * Header parameters as JSON or RAW
	 */
	headerParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The headers to send
	 * @default {}
	 */
	headerParametersUi?: Record<string, unknown>;
	/**
	 * Query parameters as JSON (flat object)
	 */
	queryParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The query parameter to send
	 * @default {}
	 */
	queryParametersUi?: Record<string, unknown>;
};

/** Fully customizable. Choose between basic, header, OAuth2, etc. */
export type HttpRequestV2GenericCredentialTypeConfig = {
	authentication: 'genericCredentialType';
	/**
	 * The request method to use
	 * @default GET
	 */
	requestMethod?:
		| 'DELETE'
		| 'GET'
		| 'HEAD'
		| 'OPTIONS'
		| 'PATCH'
		| 'POST'
		| 'PUT'
		| Expression<string>;
	/**
	 * The URL to make the request to
	 */
	url: string | Expression<string>;
	/**
	 * Whether to download the response even if SSL certificate validation is not possible
	 * @default false
	 */
	allowUnauthorizedCerts?: boolean | Expression<boolean>;
	/**
	 * The format in which the data gets returned from the URL
	 * @default json
	 */
	responseFormat?: 'file' | 'json' | 'string' | Expression<string>;
	/**
	 * Name of the property to which to write the response data
	 * @default data
	 */
	dataPropertyName: string | Expression<string>;
	/**
	 * Whether the query and/or body parameter should be set via the value-key pair UI or JSON/RAW
	 * @default false
	 */
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	/**
	 * Whether binary data should be send as body
	 * @default false
	 */
	sendBinaryData?: boolean | Expression<boolean>;
	/**
	 * For Form-Data Multipart, they can be provided in the format: &lt;code&gt;"sendKey1:binaryProperty1,sendKey2:binaryProperty2&lt;/code&gt;
	 * @hint The name of the input binary field containing the file to be uploaded
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Body parameters as JSON or RAW
	 */
	bodyParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The body parameter to send
	 * @default {}
	 */
	bodyParametersUi?: Record<string, unknown>;
	/**
	 * Header parameters as JSON or RAW
	 */
	headerParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The headers to send
	 * @default {}
	 */
	headerParametersUi?: Record<string, unknown>;
	/**
	 * Query parameters as JSON (flat object)
	 */
	queryParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The query parameter to send
	 * @default {}
	 */
	queryParametersUi?: Record<string, unknown>;
};

export type HttpRequestV2Params =
	| HttpRequestV2NoneConfig
	| HttpRequestV2PredefinedCredentialTypeConfig
	| HttpRequestV2GenericCredentialTypeConfig;

export interface HttpRequestV1Params {
	/**
	 * The way to authenticate
	 * @default none
	 */
	authentication?:
		| 'basicAuth'
		| 'digestAuth'
		| 'headerAuth'
		| 'none'
		| 'oAuth1'
		| 'oAuth2'
		| 'queryAuth'
		| Expression<string>;
	/**
	 * The request method to use
	 * @default GET
	 */
	requestMethod?:
		| 'DELETE'
		| 'GET'
		| 'HEAD'
		| 'OPTIONS'
		| 'PATCH'
		| 'POST'
		| 'PUT'
		| Expression<string>;
	/**
	 * The URL to make the request to
	 */
	url: string | Expression<string>;
	/**
	 * Whether to download the response even if SSL certificate validation is not possible
	 * @default false
	 */
	allowUnauthorizedCerts?: boolean | Expression<boolean>;
	/**
	 * The format in which the data gets returned from the URL
	 * @default json
	 */
	responseFormat?: 'file' | 'json' | 'string' | Expression<string>;
	/**
	 * Name of the property to which to write the response data
	 * @default data
	 */
	dataPropertyName: string | Expression<string>;
	/**
	 * Whether the query and/or body parameter should be set via the value-key pair UI or JSON/RAW
	 * @default false
	 */
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	/**
	 * Whether binary data should be send as body
	 * @default false
	 */
	sendBinaryData?: boolean | Expression<boolean>;
	/**
	 * For Form-Data Multipart, they can be provided in the format: &lt;code&gt;"sendKey1:binaryProperty1,sendKey2:binaryProperty2&lt;/code&gt;
	 * @hint The name of the input binary field containing the file to be uploaded
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Body parameters as JSON or RAW
	 */
	bodyParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The body parameter to send
	 * @default {}
	 */
	bodyParametersUi?: Record<string, unknown>;
	/**
	 * Header parameters as JSON or RAW
	 */
	headerParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The headers to send
	 * @default {}
	 */
	headerParametersUi?: Record<string, unknown>;
	/**
	 * Query parameters as JSON (flat object)
	 */
	queryParametersJson?: IDataObject | string | Expression<string>;
	/**
	 * The query parameter to send
	 * @default {}
	 */
	queryParametersUi?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface HttpRequestV43Credentials {
	httpSslAuth: CredentialReference;
}

export interface HttpRequestV2Credentials {
	httpBasicAuth: CredentialReference;
	httpDigestAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	httpQueryAuth: CredentialReference;
	oAuth1Api: CredentialReference;
	oAuth2Api: CredentialReference;
}

export interface HttpRequestV1Credentials {
	httpBasicAuth: CredentialReference;
	httpDigestAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	httpQueryAuth: CredentialReference;
	oAuth1Api: CredentialReference;
	oAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type HttpRequestV43Node = {
	type: 'n8n-nodes-base.httpRequest';
	version: 3 | 4 | 4.1 | 4.2 | 4.3;
	config: NodeConfig<HttpRequestV43Params>;
	credentials?: HttpRequestV43Credentials;
};

export type HttpRequestV2Node = {
	type: 'n8n-nodes-base.httpRequest';
	version: 2;
	config: NodeConfig<HttpRequestV2Params>;
	credentials?: HttpRequestV2Credentials;
};

export type HttpRequestV1Node = {
	type: 'n8n-nodes-base.httpRequest';
	version: 1;
	config: NodeConfig<HttpRequestV1Params>;
	credentials?: HttpRequestV1Credentials;
};

export type HttpRequestNode = HttpRequestV43Node | HttpRequestV2Node | HttpRequestV1Node;
