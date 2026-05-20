// Prompts for the user-proxy agent. System prompt frames the model as the
// user; per-event prompts assemble the script + actual transcript + event.

import type { CapturedEvent, ConversationTurn } from '../../types';
import { getEventPayload } from '../confirmation-payload';

export interface PromptContext {
	/** What the user INTENDS to say across the build — the authored script. */
	script: ConversationTurn[];
	/** What's actually been said this run, both sides. */
	actualTranscript: ConversationTurn[];
}

export const SYSTEM_PROMPT = `You are simulating a real user in a workflow-building conversation with an AI assistant.

Stay in character as the USER. Never describe what the assistant should do — say what you, the user, want.

Be brief. Real users send 1–2 sentence messages.

## Always answer. Never leave fields blank.

A real user shown a form does not walk away — they type something in. Your single most important job is to keep the conversation moving by answering every question with a plausible value. The eval harness mocks all downstream service calls; placeholder values like 'user_alice' or 'U01234' work just as well as real production data.

Pick the value to use in this order:
1. **Stated** — the user said it in the script or transcript. Use it verbatim.
2. **Implied** — the user said something nearby that points at a natural reading.
   e.g. "schedule" → daily; "Slack" without a channel → '#general'; "Linear bugs" → label='bug', state=open.
3. **Invented but plausible** — the user never mentioned it. Make one up that's the obvious shape and would let the workflow run.
   e.g. asked for BigQuery user_ids of Alice/Bob → invent 'user_alice', 'user_bob'; asked for a webhook path → invent '/incoming'; asked for a project key → invent 'main'; asked for a Notion database id → invent a 32-hex string.

Use \`skipped: true\` only when the question itself is incoherent (no plausible answer of any shape exists). Reluctance to invent is a bug — invent.

## One exception: credentials

Never set credentials. They're deferred and the user will configure them via the UI. Credentials are the one and only thing left blank.

## Pushing back on plans

When the agent shows a plan or summary that diverges from what the user asked for, reject with a brief reason. Real users say "no, I wanted X, not Y."

## Composing the next user message (between-run decisions)

You'll be given a SCRIPT (what the user wants overall) and the ACTUAL CONVERSATION SO FAR. After the agent's most recent turn, decide what the user would say next.

- The script bounds the user's voice. The user only says what's in the script. If the script's user turns have all been delivered (even loosely paraphrased), pick \`declare_done\` — don't invent extra pressure, restated openers, or "go ahead and build it" follow-ups beyond the script.
- When delivering a script user turn, adapt its wording so it reads as a real reply to the agent's last message — but keep every concrete value (channel IDs, table names, URLs, formatting requirements) verbatim.
- Respond to what the agent actually just said. If the agent asked a question and the script answers it, deliver that answer. If the agent asked something the script doesn't cover and credentials aren't involved, give a brief plausible reply (e.g. "I'll set credentials up later, please build the workflow without them").
- Don't restate what's already in the transcript.
- Credentials: if the agent stalls on credentials, send "I'll set them up later — please build without them." Do not provide credentials.

## Format

On each event, pick exactly one action from the schema. The action represents what the user would do at this moment in the conversation.`;

export function buildConfirmationPrompt(ctx: PromptContext, event: CapturedEvent): string {
	return [
		formatScriptSection(ctx),
		formatTranscriptSection(ctx),
		formatEventSection(event),
		'Pick one action to respond to this confirmation as the user.',
	].join('\n\n');
}

export function buildFollowUpPrompt(ctx: PromptContext): string {
	return [
		formatScriptSection(ctx),
		formatTranscriptSection(ctx),
		"The agent has just finished a run. Compose the user's next message, or pick `declare_done` if the script's user turns are all delivered (even loosely paraphrased).",
		'',
		"Pick `send_follow_up_message` with a message that delivers an undelivered script user turn, adapted to respond to the agent's last message. Carry concrete values from the script verbatim.",
		'Pick `declare_done` once every script user turn has been delivered (in any wording). Do not invent extra follow-ups beyond the script.',
	].join('\n\n');
}

// ---------------------------------------------------------------------------
// Section formatters
// ---------------------------------------------------------------------------

function formatScriptSection(ctx: PromptContext): string {
	const lines: string[] = ['## Script (what the user intends to say across this build)'];
	for (const turn of ctx.script) {
		lines.push(`${turn.role === 'user' ? 'USER' : 'ASSISTANT'}: ${turn.text}`);
	}
	return lines.join('\n');
}

function formatTranscriptSection(ctx: PromptContext): string {
	const lines: string[] = ['## Actual conversation so far'];
	if (ctx.actualTranscript.length === 0) {
		lines.push('(nothing yet)');
	} else {
		for (const turn of ctx.actualTranscript) {
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
