import type { InstanceAiHandoffContext } from '@n8n/api-types';

import type { AgentChatComposerAttachment } from '@/features/agents/utils/composer-attachments';

type AgentPreviewContext = Extract<InstanceAiHandoffContext, { source: 'agent-preview' }>;

const AGENT_PREVIEW_CHIP_ID = 'agent-preview-session';

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
