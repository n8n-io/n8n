import type { AgentToolGuardrailKind } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import { TOOL_CALL_STATE } from '../constants';
import { TOOL_GUARDRAIL_KINDS, guardrailKindLabelKey } from './guardrails';

export interface GuardrailStop {
	/** The guardrail kind that stopped the call, from the stop code. */
	kind: AgentToolGuardrailKind;
	/** Which side of the tool call the guardrail stopped. */
	stage: 'before' | 'after';
}

/**
 * A tool call the runtime refused through a tool guardrail reaches the chat
 * as its serialized `GuardrailStopError`: `GuardrailStopError: Tool call
 * stopped by guardrail: guardrail.<kind>.<id>` (or "Tool result blocked by
 * guardrail" after the call). The prefix varies with the serializer — the
 * cancel path and older payloads use `Error: ` — so only the runtime-authored
 * sentence is matched. Cancellation stops reuse the sentence with a
 * non-`guardrail` code, so the anchored `guardrail.` segment keeps them apart.
 */
const GUARDRAIL_STOP_PATTERN =
	/Tool (call stopped|result blocked) by guardrail: guardrail\.([a-zA-Z]+)\.[A-Za-z0-9_-]+/;

/** Parses a tool guardrail stop from a failed call's error output. */
export function parseGuardrailStop(toolCall: ToolCall): GuardrailStop | undefined {
	if (toolCall.state !== TOOL_CALL_STATE.ERROR) return undefined;
	const match = GUARDRAIL_STOP_PATTERN.exec(String(toolCall.output ?? '').trim());
	if (!match) return undefined;
	const kind = match[2] as AgentToolGuardrailKind;
	if (!(TOOL_GUARDRAIL_KINDS as readonly string[]).includes(kind)) return undefined;
	return { kind, stage: match[1] === 'call stopped' ? 'before' : 'after' };
}

/** The callout label for a guardrail stop: names the kind that stopped the call. */
export function guardrailStopLabelKey(stop: GuardrailStop): BaseTextKey {
	return stop.stage === 'before'
		? ('agents.chat.toolGuardrailStop.call.label' as BaseTextKey)
		: ('agents.chat.toolGuardrailStop.result.label' as BaseTextKey);
}

/** The guardrail kind's display name, the label's `{type}` value. */
export function guardrailStopType(stop: GuardrailStop): BaseTextKey {
	return guardrailKindLabelKey(stop.kind);
}
