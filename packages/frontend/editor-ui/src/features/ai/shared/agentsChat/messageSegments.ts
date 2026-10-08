import type { AgentPersistedMessageContentPart } from '@n8n/api-types';

import type { AgentsChatMessage } from './types';

/**
 * The visible output that one assistant message holds. Each assistant message
 * holds text or tool calls, never both, so the display groups show them in the
 * order that the agent produced them. Live streams and reloaded history use the
 * same rule, so both show the same groups.
 *
 * Reasoning, files and blank text have no kind. They stay in the open segment.
 */
export type MessageSegmentKind = 'text' | 'tools';

/** Blank text does not open a segment: it would split a tool run in two. */
export function getTextSegmentKind(text: string | undefined): MessageSegmentKind | undefined {
	return text?.trim() ? 'text' : undefined;
}

export function getPersistedPartSegmentKind(
	part: AgentPersistedMessageContentPart,
): MessageSegmentKind | undefined {
	if (part.type === 'text') return getTextSegmentKind(part.text);
	if (part.type === 'tool-call' && part.toolName) return 'tools';
	return undefined;
}

export function getMessageSegmentKind(
	message: Pick<AgentsChatMessage, 'content' | 'toolCalls'>,
): MessageSegmentKind | undefined {
	if (message.toolCalls?.length) return 'tools';
	return getTextSegmentKind(message.content);
}

/**
 * True when output of kind `next` must start a new segment after a segment of
 * kind `open`. Output without a kind stays in the open segment, and a segment
 * without a kind takes output of any kind. Live streams and history both use it.
 */
export function startsNewSegment(
	open: MessageSegmentKind | undefined,
	next: MessageSegmentKind | undefined,
): boolean {
	return open !== undefined && next !== undefined && open !== next;
}

/**
 * Split ordered parts into runs of one kind. A part without a kind joins the
 * open run, so each run is a contiguous slice and no part is lost. The result
 * always holds at least one run, so an empty message still maps to a message.
 */
export function splitIntoSegments<T>(
	parts: readonly T[],
	kindOf: (part: T) => MessageSegmentKind | undefined,
): T[][] {
	const segments: T[][] = [[]];
	let openKind: MessageSegmentKind | undefined;
	for (const part of parts) {
		const kind = kindOf(part);
		if (startsNewSegment(openKind, kind)) segments.push([]);
		openKind = kind ?? openKind;
		segments[segments.length - 1].push(part);
	}
	return segments;
}

/** The first segment keeps the persisted id, so existing references still match. */
export function getSegmentMessageId(messageId: string, segmentIndex: number): string {
	return segmentIndex === 0 ? messageId : `${messageId}:segment-${segmentIndex}`;
}

type SegmentedMessage = Pick<AgentsChatMessage, 'id' | 'segmentOf'>;

/** The id that all segments of one agent output share: the id of its first segment. */
export function getSegmentRootId(message: SegmentedMessage): string {
	return message.segmentOf ?? message.id;
}

/**
 * All segments of the last agent output, oldest first. A parked run is always
 * the last output, but its card can sit in an earlier segment than the text
 * that follows it. Checks that read only the last message miss that card.
 */
export function getTailSegments<T extends SegmentedMessage>(messages: readonly T[]): T[] {
	const tail = messages.at(-1);
	if (!tail) return [];
	const rootId = getSegmentRootId(tail);
	let start = messages.length - 1;
	while (start > 0 && getSegmentRootId(messages[start - 1]) === rootId) start--;
	return messages.slice(start);
}
