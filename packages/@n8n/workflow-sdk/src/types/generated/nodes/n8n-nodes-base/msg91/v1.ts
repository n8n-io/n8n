/**
 * MSG91 Node - Version 1
 * Sends transactional SMS via MSG91
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send SMS */
export type Msg91V1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
/**
 * The number from which to send the message
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		from: string | Expression<string>;
/**
 * The number, with coutry code, to which to send the message
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		to: string | Expression<string>;
/**
 * The message to send
 * @displayOptions.show { operation: ["send"], resource: ["sms"] }
 */
		message: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface Msg91V1Credentials {
	msg91Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface Msg91V1NodeBase {
	type: 'n8n-nodes-base.msg91';
	version: 1;
	credentials?: Msg91V1Credentials;
}

export type Msg91V1SmsSendNode = Msg91V1NodeBase & {
	config: NodeConfig<Msg91V1SmsSendConfig>;
};

export type Msg91V1Node = Msg91V1SmsSendNode;