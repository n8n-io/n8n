/**
 * Google Cloud Realtime Database Node Types
 *
 * Interact with Google Firebase - Realtime Database API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlefirebaserealtimedatabase/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GoogleFirebaseRealtimeDatabaseV1Params {
	/**
	 * As displayed in firebase console URL. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	projectId: string | Expression<string>;
	operation: 'create' | 'delete' | 'get' | 'push' | 'update' | Expression<string>;
	/**
	 * Object path on database. Do not append .json.
	 */
	path: string | Expression<string>;
	/**
	 * Attributes to save
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

export type GoogleFirebaseRealtimeDatabaseV1Node = {
	type: 'n8n-nodes-base.googleFirebaseRealtimeDatabase';
	version: 1;
	config: NodeConfig<GoogleFirebaseRealtimeDatabaseV1Params>;
	credentials?: GoogleFirebaseRealtimeDatabaseV1Credentials;
};

export type GoogleFirebaseRealtimeDatabaseNode = GoogleFirebaseRealtimeDatabaseV1Node;
