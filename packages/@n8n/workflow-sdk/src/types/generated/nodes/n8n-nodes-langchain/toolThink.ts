/**
 * Think Tool Node Types
 *
 * Invite the AI agent to do some thinking
 * @subnodeType ai_tool
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/toolthink/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolThinkV11Params {
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

export type LcToolThinkV11Node = {
	type: '@n8n/n8n-nodes-langchain.toolThink';
	version: 1 | 1.1;
	config: NodeConfig<LcToolThinkV11Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type LcToolThinkNode = LcToolThinkV11Node;
