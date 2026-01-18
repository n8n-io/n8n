/**
 * RocketChat Node - Version 1
 * Consume RocketChat API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Post a message to a channel or a direct message */
export type RocketchatV1ChatPostMessageConfig = {
	resource: 'chat';
	operation: 'postMessage';
/**
 * The channel name with the prefix in front of it
 * @displayOptions.show { resource: ["chat"], operation: ["postMessage"] }
 */
		channel: string | Expression<string>;
/**
 * The text of the message to send, is optional because of attachments
 * @displayOptions.show { resource: ["chat"], operation: ["postMessage"] }
 */
		text?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
	attachments?: Record<string, unknown>;
	attachmentsJson?: IDataObject | string | Expression<string>;
};

export type RocketchatV1Params =
	| RocketchatV1ChatPostMessageConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface RocketchatV1Credentials {
	rocketchatApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type RocketchatV1Node = {
	type: 'n8n-nodes-base.rocketchat';
	version: 1;
	config: NodeConfig<RocketchatV1Params>;
	credentials?: RocketchatV1Credentials;
};