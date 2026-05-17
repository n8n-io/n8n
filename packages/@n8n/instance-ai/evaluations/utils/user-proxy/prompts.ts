// Prompts for the user-proxy agent. System prompt frames the model as the
// user; per-event prompts assemble transcript + event payload.

import type { CapturedEvent, ConversationTurn } from '../../types';

export interface PromptContext {
	conversation: ConversationTurn[];
	rollingTranscript: ConversationTurn[];
}

export const SYSTEM_PROMPT = `You are simulating a real user in a workflow-building conversation with an AI assistant.

Stay in character as the USER. Never describe what the assistant should do — say what you, the user, want.

Hard rules:
- Be brief. Real users send 1–2 sentence messages.
- Provide concrete plausible values when asked for specifics (channel names, IDs, etc.), drawing from the reference conversation and the conversation so far.
- Do not invent values the user has not stated. If a setup-wizard asks for a value the user hasn't mentioned, leave that placeholder unset.
- Push back when the agent's plan diverges from what you asked for. Real users say "no, I wanted X, not Y."
- For setup wizards, fill node parameters from values the user has stated in the conversation. Never set credentials — they are deferred and the user will configure them later.

On each event, pick exactly one action from the schema. The action represents what the user would do at this moment in the conversation.`;

export function buildConfirmationPrompt(ctx: PromptContext, event: CapturedEvent): string {
	return [
		formatReferenceSection(ctx),
		formatTranscriptSection(ctx),
		formatEventSection(event),
		'Pick one action to respond to this confirmation as the user.',
	].join('\n\n');
}

export function buildFollowUpPrompt(ctx: PromptContext): string {
	return [
		formatReferenceSection(ctx),
		formatTranscriptSection(ctx),
		'The agent has just finished a run. Decide whether the user would send another message or be done.',
		'',
		'Pick send_follow_up_message if the user has more to say (the agent asked something not yet answered, or the user has a follow-up request).',
		'Pick declare_done if the user got what they asked for and would end the conversation.',
	].join('\n\n');
}

// ---------------------------------------------------------------------------
// Section formatters
// ---------------------------------------------------------------------------

function formatReferenceSection(ctx: PromptContext): string {
	const lines: string[] = ['## Reference conversation (the script for what the user wants)'];
	for (const turn of ctx.conversation) {
		lines.push(`${turn.role === 'user' ? 'USER' : 'ASSISTANT'}: ${turn.text}`);
	}
	return lines.join('\n');
}

function formatTranscriptSection(ctx: PromptContext): string {
	const actualOnly = ctx.rollingTranscript.slice(ctx.conversation.length);
	const lines: string[] = [
		'## Actual conversation so far (what the assistant has said in this run)',
	];
	if (actualOnly.length === 0) {
		lines.push('(none yet)');
	} else {
		for (const turn of actualOnly) {
			lines.push(`${turn.role === 'user' ? 'USER' : 'ASSISTANT'}: ${turn.text}`);
		}
	}
	return lines.join('\n');
}

function formatEventSection(event: CapturedEvent): string {
	const payload =
		typeof event.data.payload === 'object' && event.data.payload !== null
			? (event.data.payload as Record<string, unknown>)
			: event.data;
	return [
		'## New event requiring a response',
		'```json',
		JSON.stringify(payload, null, 2),
		'```',
	].join('\n');
}
