/**
 * Google Cloud Realtime Database Node - Version 1
 * Interact with Google Firebase - Realtime Database API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GoogleFirebaseRealtimeDatabaseV1Config {
/**
 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		projectId: string | Expression<string>;
	operation: 'create' | 'delete' | 'get' | 'push' | 'update' | Expression<string>;
/**
 * Object path on database. Do not append .json.
 * @displayOptions.hide { operation: ["get"] }
 */
		path: string | Expression<string>;
/**
 * Attributes to save
 * @displayOptions.show { operation: ["create", "push", "update"] }
 */
		attributes: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleFirebaseRealtimeDatabaseV1Credentials {
	googleFirebaseRealtimeDatabaseOAuth2Api?: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleFirebaseRealtimeDatabaseV1NodeBase {
	type: 'n8n-nodes-base.googleFirebaseRealtimeDatabase';
	version: 1;
	credentials?: GoogleFirebaseRealtimeDatabaseV1Credentials;
}

export type GoogleFirebaseRealtimeDatabaseV1Node = GoogleFirebaseRealtimeDatabaseV1NodeBase & {
	config: NodeConfig<GoogleFirebaseRealtimeDatabaseV1Config>;
};

export type GoogleFirebaseRealtimeDatabaseV1Node = GoogleFirebaseRealtimeDatabaseV1Node;