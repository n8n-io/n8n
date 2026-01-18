/**
 * Think Tool Node - Version 1
 * Invite the AI agent to do some thinking
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolThinkV1Params {
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
// Node Type
// ===========================================================================

export type LcToolThinkV1Node = {
	type: '@n8n/n8n-nodes-langchain.toolThink';
	version: 1;
	config: NodeConfig<LcToolThinkV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};