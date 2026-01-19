/**
 * GraphQL Node - Version 1.1
 * Makes a GraphQL request and returns the received data
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GraphqlV11Params {
/**
 * The way to authenticate
 * @default none
 */
		authentication?: 'basicAuth' | 'customAuth' | 'digestAuth' | 'headerAuth' | 'none' | 'oAuth1' | 'oAuth2' | 'queryAuth' | Expression<string>;
/**
 * The underlying HTTP request method to use
 * @default POST
 */
		requestMethod?: 'GET' | 'POST' | Expression<string>;
/**
 * The GraphQL endpoint
 */
		endpoint: string | Expression<string>;
/**
 * Whether to download the response even if SSL certificate validation is not possible
 * @default false
 */
		allowUnauthorizedCerts?: boolean | Expression<boolean>;
/**
 * GraphQL query
 */
		query: string | Expression<string>;
/**
 * Query variables as JSON object
 * @displayOptions.show { requestFormat: ["json"], requestMethod: ["POST"] }
 */
		variables?: IDataObject | string | Expression<string>;
/**
 * Name of operation to execute
 * @displayOptions.show { requestFormat: ["json"], requestMethod: ["POST"] }
 */
		operationName?: string | Expression<string>;
/**
 * The format in which the data gets returned from the URL
 * @default json
 */
		responseFormat?: 'json' | 'string' | Expression<string>;
/**
 * Name of the property to which to write the response data
 * @displayOptions.show { responseFormat: ["string"] }
 * @default data
 */
		dataPropertyName: string | Expression<string>;
/**
 * The headers to send
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
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GraphqlV11Credentials {
	httpBasicAuth: CredentialReference;
	httpCustomAuth: CredentialReference;
	httpDigestAuth: CredentialReference;
	httpHeaderAuth: CredentialReference;
	httpQueryAuth: CredentialReference;
	oAuth1Api: CredentialReference;
	oAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GraphqlV11NodeBase {
	type: 'n8n-nodes-base.graphql';
	version: 1.1;
	credentials?: GraphqlV11Credentials;
}

export type GraphqlV11ParamsNode = GraphqlV11NodeBase & {
	config: NodeConfig<GraphqlV11Params>;
};

export type GraphqlV11Node = GraphqlV11ParamsNode;