/**
 * RocketChat Node - Version 1
 * Consume RocketChat API
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


// ===========================================================================
// Output Types
// ===========================================================================

export type RocketchatV1ChatPostMessageOutput = {
	channel?: string;
	message?: {
		_id?: string;
		_updatedAt?: string;
		alias?: string;
		attachments?: Array<{
			fields?: Array<{
				short?: boolean;
				title?: string;
				value?: string;
			}>;
			text?: string;
			title?: string;
			ts?: string;
		}>;
		groupable?: boolean;
		md?: Array<{
			type?: string;
			value?: Array<{
				type?: string;
			}>;
		}>;
		mentions?: Array<{
			_id?: string;
			name?: string;
			type?: string;
			username?: string;
		}>;
		msg?: string;
		parseUrls?: boolean;
		rid?: string;
		ts?: string;
		u?: {
			_id?: string;
			name?: string;
			username?: string;
		};
		unread?: boolean;
		urls?: Array<{
			url?: string;
		}>;
	};
	success?: boolean;
	ts?: number;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface RocketchatV1Credentials {
	rocketchatApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface RocketchatV1NodeBase {
	type: 'n8n-nodes-base.rocketchat';
	version: 1;
	credentials?: RocketchatV1Credentials;
}

export type RocketchatV1ChatPostMessageNode = RocketchatV1NodeBase & {
	config: NodeConfig<RocketchatV1ChatPostMessageConfig>;
	output?: RocketchatV1ChatPostMessageOutput;
};

export type RocketchatV1Node = RocketchatV1ChatPostMessageNode;