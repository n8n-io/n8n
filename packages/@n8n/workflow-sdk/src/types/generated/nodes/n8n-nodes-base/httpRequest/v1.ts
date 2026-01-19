/**
 * HTTP Request Node - Version 1
 * Makes an HTTP request and returns the response data
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface HttpRequestV1Params {
/**
 * The way to authenticate
 * @default none
 */
		authentication?: 'basicAuth' | 'digestAuth' | 'headerAuth' | 'none' | 'oAuth1' | 'oAuth2' | 'queryAuth' | Expression<string>;
/**
 * The request method to use
 * @default GET
 */
		requestMethod?: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | Expression<string>;
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
 * @displayOptions.show { responseFormat: ["string"] }
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
 * @displayOptions.show { jsonParameters: [true], requestMethod: ["PATCH", "POST", "PUT"] }
 * @default false
 */
		sendBinaryData?: boolean | Expression<boolean>;
/**
 * For Form-Data Multipart, they can be provided in the format: &lt;code&gt;"sendKey1:binaryProperty1,sendKey2:binaryProperty2&lt;/code&gt;
 * @hint The name of the input binary field containing the file to be uploaded
 * @displayOptions.show { jsonParameters: [true], requestMethod: ["PATCH", "POST", "PUT"] }
 * @displayOptions.hide { sendBinaryData: [false] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Body parameters as JSON or RAW
 * @displayOptions.show { jsonParameters: [true], requestMethod: ["PATCH", "POST", "PUT", "DELETE"] }
 * @displayOptions.hide { sendBinaryData: [true] }
 */
		bodyParametersJson?: IDataObject | string | Expression<string>;
/**
 * The body parameter to send
 * @displayOptions.show { jsonParameters: [false], requestMethod: ["PATCH", "POST", "PUT", "DELETE"] }
 * @default {}
 */
		bodyParametersUi?: {
		parameter?: Array<{
			/** Name of the parameter
			 */
			name?: string | Expression<string>;
			/** Value of the parameter
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Header parameters as JSON or RAW
 * @displayOptions.show { jsonParameters: [true] }
 */
		headerParametersJson?: IDataObject | string | Expression<string>;
/**
 * The headers to send
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		headerParametersUi?: {
		parameter?: Array<{
			/** Name of the header
			 */
			name?: string | Expression<string>;
			/** Value to set for the header
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Query parameters as JSON (flat object)
 * @displayOptions.show { jsonParameters: [true] }
 */
		queryParametersJson?: IDataObject | string | Expression<string>;
/**
 * The query parameter to send
 * @displayOptions.show { jsonParameters: [false] }
 * @default {}
 */
		queryParametersUi?: {
		parameter?: Array<{
			/** Name of the parameter
			 */
			name?: string | Expression<string>;
			/** Value of the parameter
			 */
			value?: string | Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

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

interface HttpRequestV1NodeBase {
	type: 'n8n-nodes-base.httpRequest';
	version: 1;
	credentials?: HttpRequestV1Credentials;
}

export type HttpRequestV1ParamsNode = HttpRequestV1NodeBase & {
	config: NodeConfig<HttpRequestV1Params>;
};

export type HttpRequestV1Node = HttpRequestV1ParamsNode;