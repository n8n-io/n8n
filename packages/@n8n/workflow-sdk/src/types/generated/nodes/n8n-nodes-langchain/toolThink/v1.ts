/**
 * Think Tool Node - Version 1
 * Invite the AI agent to do some thinking
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolThinkV1Config {
/**
 * The thinking tool's description
 * @default Use the tool to think about something. It will not obtain new information or change the database, but just append the thought to the log. Use it when complex reasoning or some cache memory is needed.
 */
		description: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcToolThinkV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolThink';
	version: 1;
	isTrigger: true;
}

export type LcToolThinkV1Node = LcToolThinkV1NodeBase & {
	config: NodeConfig<LcToolThinkV1Config>;
};

export type LcToolThinkV1Node = LcToolThinkV1Node;