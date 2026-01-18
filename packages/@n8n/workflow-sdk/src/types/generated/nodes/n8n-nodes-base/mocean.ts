/**
 * Mocean Node Types
 *
 * Send SMS and voice messages via Mocean
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mocean/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send SMS/Voice message */
export type MoceanV1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
	/**
	 * Number to which to send the message
	 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
	 */
	from: string | Expression<string>;
	/**
	 * Number from which to send the message
	 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
	 */
	to: string | Expression<string>;
	/**
	 * Message to send
	 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
	 */
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Send SMS/Voice message */
export type MoceanV1VoiceSendConfig = {
	resource: 'voice';
	operation: 'send';
	/**
	 * Number to which to send the message
	 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
	 */
	from: string | Expression<string>;
	/**
	 * Number from which to send the message
	 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
	 */
	to: string | Expression<string>;
	language?: 'cmn-CN' | 'en-GB' | 'en-US' | 'ja-JP' | 'ko-KR' | Expression<string>;
	/**
	 * Message to send
	 * @displayOptions.show { operation: ["send"], resource: ["sms", "voice"] }
	 */
	message: string | Expression<string>;
};

export type MoceanV1Params = MoceanV1SmsSendConfig | MoceanV1VoiceSendConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MoceanV1Credentials {
	moceanApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MoceanV1Node = {
	type: 'n8n-nodes-base.mocean';
	version: 1;
	config: NodeConfig<MoceanV1Params>;
	credentials?: MoceanV1Credentials;
};

export type MoceanNode = MoceanV1Node;
