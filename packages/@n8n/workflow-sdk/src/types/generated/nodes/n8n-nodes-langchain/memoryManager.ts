/**
 * Chat Memory Manager Node Types
 *
 * Manage chat messages memory and use it in the workflow
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/memorymanager/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Retrieve chat messages from connected memory */
export type LcMemoryManagerV11LoadConfig = {
	mode: 'load';
	/**
	 * Whether to simplify the output to only include the sender and the text
	 * @displayOptions.show { mode: ["load"] }
	 * @default true
	 */
	simplifyOutput?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Insert chat messages into connected memory */
export type LcMemoryManagerV11InsertConfig = {
	mode: 'insert';
	/**
	 * Choose how new messages are inserted into the memory
	 * @displayOptions.show { mode: ["insert"] }
	 * @default insert
	 */
	insertMode?: 'insert' | 'override' | Expression<string>;
	/**
	 * Chat messages to insert into memory
	 * @displayOptions.show { mode: ["insert"] }
	 * @default {}
	 */
	messages?: {
		messageValues?: Array<{
			/** Type Name or ID
			 * @default system
			 */
			type?: 'ai' | 'system' | 'user' | Expression<string>;
			/** Message
			 */
			message?: string | Expression<string>;
			/** Whether to hide the message from the chat UI
			 * @default false
			 */
			hideFromUI?: boolean | Expression<boolean>;
		}>;
	};
};

/** Delete chat messages from connected memory */
export type LcMemoryManagerV11DeleteConfig = {
	mode: 'delete';
	/**
	 * How messages are deleted from memory
	 * @displayOptions.show { mode: ["delete"] }
	 * @default lastN
	 */
	deleteMode?: 'lastN' | 'all' | Expression<string>;
	/**
	 * The amount of last messages to delete
	 * @displayOptions.show { mode: ["delete"], deleteMode: ["lastN"] }
	 * @default 2
	 */
	lastMessagesCount?: number | Expression<number>;
};

export type LcMemoryManagerV11Params =
	| LcMemoryManagerV11LoadConfig
	| LcMemoryManagerV11InsertConfig
	| LcMemoryManagerV11DeleteConfig;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type LcMemoryManagerV11Node = {
	type: '@n8n/n8n-nodes-langchain.memoryManager';
	version: 1 | 1.1;
	config: NodeConfig<LcMemoryManagerV11Params>;
	credentials?: Record<string, never>;
};

export type LcMemoryManagerNode = LcMemoryManagerV11Node;
