/**
 * AMQP Sender Node - Version 1
 * Sends a raw-message via AMQP 1.0, executed once per item
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AmqpV1Config {
/**
 * Name of the queue of topic to publish to
 */
		sink?: string | Expression<string>;
/**
 * Header parameters as JSON (flat object). Sent as application_properties in amqp-message meta info.
 */
		headerParametersJson?: IDataObject | string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AmqpV1Credentials {
	amqp: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AmqpV1NodeBase {
	type: 'n8n-nodes-base.amqp';
	version: 1;
	credentials?: AmqpV1Credentials;
}

export type AmqpV1Node = AmqpV1NodeBase & {
	config: NodeConfig<AmqpV1Config>;
};

export type AmqpV1Node = AmqpV1Node;