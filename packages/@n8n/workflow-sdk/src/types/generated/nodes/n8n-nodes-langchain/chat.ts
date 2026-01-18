/**
 * Chat Node Types
 *
 * Send a message into the chat
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/chat/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcChatV11Params {
	operation?: 'send' | 'sendAndWait' | Expression<string>;
	message: string | Expression<string>;
	waitUserReply?: boolean | Expression<boolean>;
	responseType?: 'approval' | 'freeTextChat' | Expression<string>;
	/**
	 * Whether to block input from the user while waiting for approval
	 * @default false
	 */
	blockUserInput?: boolean | Expression<boolean>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	formFields?: Record<string, unknown>;
	approvalOptions?: Record<string, unknown>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcChatNode = {
	type: '@n8n/n8n-nodes-langchain.chat';
	version: 1 | 1.1;
	config: NodeConfig<LcChatV11Params>;
	credentials?: Record<string, never>;
};
