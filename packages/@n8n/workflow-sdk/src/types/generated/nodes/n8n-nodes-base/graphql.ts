/**
 * GraphQL Node Types
 *
 * Makes a GraphQL request and returns the received data
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/graphql/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GraphqlV11Params {
	/**
	 * The way to authenticate
	 * @default none
	 */
	authentication?:
		| 'basicAuth'
		| 'customAuth'
		| 'digestAuth'
		| 'headerAuth'
		| 'none'
		| 'oAuth1'
		| 'oAuth2'
		| 'queryAuth'
		| Expression<string>;
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
	 * The format for the query payload
	 * @displayOptions.show { requestMethod: ["POST"], @version: [1] }
	 * @default graphql
	 */
	requestFormat: 'graphql' | 'json' | Expression<string>;
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

export type GraphqlV11Node = {
	type: 'n8n-nodes-base.graphql';
	version: 1 | 1.1;
	config: NodeConfig<GraphqlV11Params>;
	credentials?: GraphqlV11Credentials;
};

export type GraphqlNode = GraphqlV11Node;
