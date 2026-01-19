/**
 * Facebook Graph API Node - Version 1
 * Interacts with Facebook using the Graph API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FacebookGraphApiV1Config {
/**
 * The Host URL of the request. Almost all requests are passed to the graph.facebook.com host URL. The single exception is video uploads, which use graph-video.facebook.com.
 * @default graph.facebook.com
 */
		hostUrl: 'graph.facebook.com' | 'graph-video.facebook.com' | Expression<string>;
/**
 * The HTTP Method to be used for the request
 * @default GET
 */
		httpRequestMethod: 'GET' | 'POST' | 'DELETE' | Expression<string>;
/**
 * The version of the Graph API to be used in the request
 */
		graphApiVersion: '' | 'v23.0' | 'v22.0' | 'v21.0' | 'v20.0' | 'v19.0' | 'v18.0' | 'v17.0' | 'v16.0' | 'v15.0' | 'v14.0' | 'v13.0' | 'v12.0' | 'v11.0' | 'v10.0' | 'v9.0' | 'v8.0' | 'v7.0' | 'v6.0' | 'v5.0' | 'v4.0' | 'v3.3' | 'v3.2' | 'v3.1' | 'v3.0' | Expression<string>;
/**
 * The node on which to operate. A node is an individual object with a unique ID. For example, there are many User node objects, each with a unique ID representing a person on Facebook.
 */
		node: string | Expression<string>;
/**
 * Edge of the node on which to operate. Edges represent collections of objects which are attached to the node.
 */
		edge?: string | Expression<string>;
/**
 * Whether to connect even if SSL certificate validation is not possible
 * @default false
 */
		allowUnauthorizedCerts?: boolean | Expression<boolean>;
/**
 * Whether binary data should be sent as body
 * @displayOptions.show { httpRequestMethod: ["POST", "PUT"] }
 * @default false
 */
		sendBinaryData: boolean | Expression<boolean>;
/**
 * For Form-Data Multipart, they can be provided in the format: &lt;code&gt;"sendKey1:binaryProperty1,sendKey2:binaryProperty2&lt;/code&gt;
 * @hint The name of the input binary field containing the file to be uploaded
 * @displayOptions.show { httpRequestMethod: ["POST", "PUT"] }
 * @displayOptions.hide { sendBinaryData: [false] }
 */
		binaryPropertyName?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FacebookGraphApiV1Credentials {
	facebookGraphApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface FacebookGraphApiV1NodeBase {
	type: 'n8n-nodes-base.facebookGraphApi';
	version: 1;
	credentials?: FacebookGraphApiV1Credentials;
}

export type FacebookGraphApiV1Node = FacebookGraphApiV1NodeBase & {
	config: NodeConfig<FacebookGraphApiV1Config>;
};

export type FacebookGraphApiV1Node = FacebookGraphApiV1Node;