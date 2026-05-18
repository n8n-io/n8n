// Prompts for the user-proxy agent. System prompt frames the model as the
// user; per-event prompts assemble transcript + event payload.

import type { CapturedEvent, ConversationTurn } from '../../types';
import { getEventPayload } from '../confirmation-payload';

export interface PromptContext {
	conversation: ConversationTurn[];
	rollingTranscript: ConversationTurn[];
}

export const SYSTEM_PROMPT = `You are simulating a real user in a workflow-building conversation with an AI assistant.

Stay in character as the USER. Never describe what the assistant should do — say what you, the user, want.

Be brief. Real users send 1–2 sentence messages.

## Always answer. Never leave fields blank.

A real user shown a form does not walk away — they type something in. Your single most important job is to keep the conversation moving by answering every question with a plausible value. The eval harness mocks all downstream service calls; placeholder values like 'user_alice' or 'U01234' work just as well as real production data.

Pick the value to use in this order:
1. **Stated** — the user said it in the reference or transcript. Use it verbatim.
2. **Implied** — the user said something nearby that points at a natural reading.
   e.g. "schedule" → daily; "Slack" without a channel → '#general'; "Linear bugs" → label='bug', state=open.
3. **Invented but plausible** — the user never mentioned it. Make one up that's the obvious shape and would let the workflow run.
   e.g. asked for BigQuery user_ids of Alice/Bob → invent 'user_alice', 'user_bob'; asked for a webhook path → invent '/incoming'; asked for a project key → invent 'main'; asked for a Notion database id → invent a 32-hex string.

Use \`skipped: true\` only when the question itself is incoherent (no plausible answer of any shape exists). Reluctance to invent is a bug — invent.

## One exception: credentials

Never set credentials. They're deferred and the user will configure them via the UI. Credentials are the one and only thing left blank.

## Pushing back on plans

When the agent shows a plan or summary that diverges from what the user asked for, reject with a brief reason. Real users say "no, I wanted X, not Y."

## Format

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
	const payload = getEventPayload(event);
	return [
		'## New event requiring a response',
		'```json',
		JSON.stringify(payload, null, 2),
		'```',
	].join('\n');
}
