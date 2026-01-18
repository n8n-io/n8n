/**
 * AMQP Sender Node Types
 *
 * Sends a raw-message via AMQP 1.0, executed once per item
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/amqp/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AmqpV1Params {
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

export type AmqpV1Node = {
	type: 'n8n-nodes-base.amqp';
	version: 1;
	config: NodeConfig<AmqpV1Params>;
	credentials?: AmqpV1Credentials;
};

export type AmqpNode = AmqpV1Node;
