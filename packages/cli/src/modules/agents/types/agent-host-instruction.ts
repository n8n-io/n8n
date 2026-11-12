import type { AgentDbMessage } from '@n8n/agents';

/**
 * An instruction that the host adds to a running turn when the agent tries to
 * stop. The model sees it as a `<system-reminder>` that is not from the user.
 * Transcripts, the chat history and the observer skip it.
 */
export interface AgentHostInstruction {
	/** Stable key of the host feature that sent it, for example `workflow_setup`. */
	reason: string;
	/** The text the model sees. */
	content: string;
}

/**
 * Gives the instruction to add at the completing input boundary, or
 * `undefined` to let the turn end. The runtime adds at most one instruction
 * for each turn, so the hook cannot keep a turn running.
 */
export type AgentCompletingBoundaryHook = () => Promise<AgentHostInstruction | undefined>;

export function toHostInstructionMessage(
	instruction: AgentHostInstruction,
	lastCreatedAt: number,
): AgentDbMessage {
	return {
		id: crypto.randomUUID(),
		createdAt: new Date(Math.max(Date.now(), lastCreatedAt + 1)),
		type: 'custom',
		data: {
			type: 'n8n:host-instruction',
			reason: instruction.reason,
			content: instruction.content,
		},
	};
}
