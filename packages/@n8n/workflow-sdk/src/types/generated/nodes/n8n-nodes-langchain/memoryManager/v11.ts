/**
 * Chat Memory Manager Node - Version 1.1
 * Manage chat messages memory and use it in the workflow
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

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


// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcMemoryManagerV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.memoryManager';
	version: 1.1;
}

export type LcMemoryManagerV11LoadNode = LcMemoryManagerV11NodeBase & {
	config: NodeConfig<LcMemoryManagerV11LoadConfig>;
};

export type LcMemoryManagerV11InsertNode = LcMemoryManagerV11NodeBase & {
	config: NodeConfig<LcMemoryManagerV11InsertConfig>;
};

export type LcMemoryManagerV11DeleteNode = LcMemoryManagerV11NodeBase & {
	config: NodeConfig<LcMemoryManagerV11DeleteConfig>;
};

export type LcMemoryManagerV11Node =
	| LcMemoryManagerV11LoadNode
	| LcMemoryManagerV11InsertNode
	| LcMemoryManagerV11DeleteNode
	;