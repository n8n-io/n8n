import { z } from 'zod';

import { Z } from '../zod-class';

export const AGENT_ATTENTION_FLAG_TYPES = ['session-error'] as const;
export type AgentAttentionFlagType = (typeof AGENT_ATTENTION_FLAG_TYPES)[number];

export interface AgentAttentionFlag {
	id: string;
	type: AgentAttentionFlagType;
	sessionId: string;
	createdAt: string;
}

export class ListAgentAttentionFlagsQueryDto extends Z.class({
	type: z.enum(AGENT_ATTENTION_FLAG_TYPES).optional(),
}) {}

export class DismissAgentAttentionFlagsDto extends Z.class({
	type: z.enum(AGENT_ATTENTION_FLAG_TYPES),
	/** IDs returned by retrieval. Later flags must remain visible. */
	flagIds: z.array(z.string().uuid()).min(1).max(500),
}) {}
