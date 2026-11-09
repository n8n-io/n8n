import { instanceAiHandoffContextSchema, type InstanceAiHandoffContext } from '@n8n/api-types';

import type { AgentChatComposerAttachment } from '@/features/agents/utils/composer-attachments';

type AgentPreviewContext = Extract<InstanceAiHandoffContext, { source: 'agent-preview' }>;

const AGENT_PREVIEW_CHIP_ID = 'agent-preview-session';

interface StagedChip {
	readonly chip: { readonly id: string };
	readonly clientContextPatch?: Readonly<Record<string, unknown>>;
}

/**
 * The composer chip of an agent test chat that the user hands off to the
 * Assistant. The hand-off context goes with the next message, like the
 * context of a hand-off to a new thread.
 */
export function toAgentPreviewComposerAttachment(
	context: AgentPreviewContext,
	label: string,
): AgentChatComposerAttachment {
	return {
		chip: { id: AGENT_PREVIEW_CHIP_ID, label, icon: 'bot' },
		clientContextPatch: { context },
	};
}

/** The test chat session of the staged hand-off chip. */
export function stagedAgentPreviewSession(
	staged: readonly StagedChip[],
): { agentId: string; threadId: string } | undefined {
	const chip = staged.find(({ chip }) => chip.id === AGENT_PREVIEW_CHIP_ID);
	const parsed = instanceAiHandoffContextSchema.safeParse(chip?.clientContextPatch?.context);
	if (!parsed.success || parsed.data.source !== 'agent-preview') return undefined;
	return { agentId: parsed.data.agentId, threadId: parsed.data.threadId };
}
