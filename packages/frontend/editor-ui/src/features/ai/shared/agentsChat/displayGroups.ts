import { summariseToolCall } from './interactiveSummary';
import { getMessageInteractives } from './messageMappers';
import type { AgentsChatMessage, InteractivePayload, ToolCall } from './types';

/**
 * Presentation group for the message list. The builder persists one assistant
 * message per tool-use turn, so a single conversation fragments into many robot
 * avatars on reload. We fold consecutive tool-only assistant messages into a
 * single `toolRun` block to match the live-stream look.
 *
 * Interactive messages are still grouped: their tool calls join the rest of
 * the run (so the suspended/done icon shows in the step list), and any
 * interactive payloads — both still-open and already-resolved cards — are
 * collected into `interactives` so the group can render the corresponding
 * cards beside the step list.
 */
export type DisplayGroup =
	| { kind: 'message'; id: string; message: AgentsChatMessage }
	| {
			kind: 'toolRun';
			id: string;
			thinking: string;
			toolCalls: ToolCall[];
			/** Interactive cards belonging to messages folded into this group. */
			interactives: InteractivePayload[];
			/**
			 * Trailing assistant message in the turn that carries text content.
			 * Folding it into the same group keeps a single bubble per turn
			 * (thinking → tools → interactives → final text).
			 */
			finalMessage?: AgentsChatMessage;
	  };

export function isGroupable(message: AgentsChatMessage): boolean {
	return message.role === 'assistant' && !!message.toolCalls?.length && !message.content.trim();
}

/**
 * Merge two records of the same tool call: messages are now stored both when a
 * stream suspends and again on completion, so history can carry the same
 * toolCallId twice (open, then resolved). Ported from master's undrained-stream
 * fix (#32119).
 */
function mergeToolCall(previous: ToolCall, next: ToolCall): ToolCall {
	const merged: ToolCall = {
		...previous,
		...next,
		input: next.input ?? previous.input,
		startTime: previous.startTime ?? next.startTime,
		endTime: next.endTime ?? previous.endTime,
		canceled: next.canceled ?? previous.canceled,
	};
	return {
		...merged,
		displaySummary: summariseToolCall(merged.tool, merged.output, merged.input),
	};
}

function appendToolCalls(existing: ToolCall[], next: ToolCall[]): ToolCall[] {
	const merged = [...existing];
	const indexByToolCallId = new Map<string, number>();
	for (const [index, toolCall] of merged.entries()) {
		if (toolCall.toolCallId) indexByToolCallId.set(toolCall.toolCallId, index);
	}

	for (const toolCall of next) {
		if (!toolCall.toolCallId) {
			merged.push(toolCall);
			continue;
		}
		const index = indexByToolCallId.get(toolCall.toolCallId);
		if (index === undefined) {
			indexByToolCallId.set(toolCall.toolCallId, merged.length);
			merged.push(toolCall);
			continue;
		}
		merged[index] = mergeToolCall(merged[index], toolCall);
	}
	return merged;
}

function appendInteractivePayloads(
	existing: InteractivePayload[],
	next: InteractivePayload[],
): InteractivePayload[] {
	let merged = existing;
	for (const payload of next) {
		const index = merged.findIndex(
			(existingPayload) => existingPayload.toolCallId === payload.toolCallId,
		);
		if (index === -1) {
			merged = [...merged, payload];
		} else {
			merged = merged.map((existingPayload, i) => (i === index ? payload : existingPayload));
		}
	}
	return merged;
}

export function buildDisplayGroups(messages: AgentsChatMessage[]): DisplayGroup[] {
	const groups: DisplayGroup[] = [];
	for (const message of messages) {
		if (isGroupable(message)) {
			const last = groups[groups.length - 1];
			if (last && last.kind === 'toolRun' && !last.finalMessage) {
				last.toolCalls = appendToolCalls(last.toolCalls, message.toolCalls ?? []);
				if (message.thinking) {
					last.thinking = last.thinking
						? `${last.thinking}\n\n${message.thinking}`
						: message.thinking;
				}
				last.interactives = appendInteractivePayloads(
					last.interactives,
					getMessageInteractives(message),
				);
				continue;
			}
			groups.push({
				kind: 'toolRun',
				id: message.id,
				thinking: message.thinking ?? '',
				toolCalls: [...(message.toolCalls ?? [])],
				interactives: getMessageInteractives(message),
			});
			continue;
		}

		if (message.role === 'assistant') {
			const last = groups[groups.length - 1];
			if (last && last.kind === 'toolRun' && !last.finalMessage) {
				last.finalMessage = message;
				if (message.thinking) {
					last.thinking = last.thinking
						? `${last.thinking}\n\n${message.thinking}`
						: message.thinking;
				}
				if (message.toolCalls?.length) {
					last.toolCalls = appendToolCalls(last.toolCalls, message.toolCalls);
				}
				last.interactives = appendInteractivePayloads(
					last.interactives,
					getMessageInteractives(message),
				);
				continue;
			}
		}

		groups.push({ kind: 'message', id: message.id, message });
	}
	return groups;
}
