import type {
	AgentThreadMemoryDto,
	AgentTraceFlaggedMemoryDto,
	AgentTraceFlaggedMemoryStatus,
	AgentTraceRecalledMemoryDto,
	AgentTraceRecalledMemoryStatus,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { TimelineItem } from '../session-timeline.types';

// The recall tool adds this prefix to what the model sees.
const RECALL_MODEL_PREFIX = 'Prior/historical entry: ';

export type SessionMemoryOrigin =
	| { kind: 'this-run' }
	| { kind: 'this-session'; createdAt: string }
	| { kind: 'previous-session'; createdAt: string; threadId?: string };

export interface SessionMemoryCard {
	key: string;
	content: string;
	evidence?: string;
	origin?: SessionMemoryOrigin;
	/** Absent for traces recorded before memory ids were traced. */
	status?: AgentTraceRecalledMemoryStatus | AgentTraceFlaggedMemoryStatus;
	/** What a delete removes. Absent when there is nothing left to delete. */
	deleteTarget?: { type: 'entry' | 'capture'; id: string };
}

function stringField(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) return undefined;
	const field = value[key];
	return typeof field === 'string' ? field : undefined;
}

function recallOrigin(
	recalled: AgentTraceRecalledMemoryDto,
	threadId: string,
): SessionMemoryOrigin | undefined {
	const origin = recalled.origin;
	if (!origin) return undefined;
	if (origin.threadId === threadId) return { kind: 'this-session', createdAt: origin.createdAt };
	return {
		kind: 'previous-session',
		createdAt: origin.createdAt,
		...(origin.canOpen && { threadId: origin.threadId }),
	};
}

function recalledCard(recalled: AgentTraceRecalledMemoryDto, threadId: string): SessionMemoryCard {
	return {
		key: recalled.entryId,
		content: recalled.content,
		evidence: recalled.origin?.evidence,
		origin: recallOrigin(recalled, threadId),
		status: recalled.status,
		...(recalled.status === 'active' && {
			deleteTarget: { type: 'entry' as const, id: recalled.entryId },
		}),
	};
}

function flaggedCard(flagged: AgentTraceFlaggedMemoryDto): SessionMemoryCard {
	const deletable = flagged.status === 'pending' || flagged.status === 'stored';
	return {
		key: flagged.captureId,
		content: flagged.content,
		evidence: flagged.evidence,
		origin: { kind: 'this-run' },
		status: flagged.status,
		...(deletable && { deleteTarget: { type: 'capture' as const, id: flagged.captureId } }),
	};
}

/** Traces recorded before memory ids were traced keep only the model-facing text. */
function legacyRecallCards(output: unknown): SessionMemoryCard[] {
	if (!isRecord(output) || !Array.isArray(output.entries)) return [];
	return output.entries.flatMap((entry: unknown, index) => {
		const content = stringField(entry, 'content');
		if (!content) return [];
		return [{ key: `legacy-${index}`, content: content.replace(RECALL_MODEL_PREFIX, '') }];
	});
}

function legacyFlagCards(input: unknown): SessionMemoryCard[] {
	const content = stringField(input, 'content');
	if (!content) return [];
	return [
		{
			key: 'legacy',
			content,
			evidence: stringField(input, 'evidence'),
			origin: { kind: 'this-run' },
		},
	];
}

/** The memory cards of one recall_memory or flag_memory row of a session trace. */
export function sessionMemoryCards(
	item: TimelineItem,
	memory: AgentThreadMemoryDto | undefined,
	threadId: string,
): SessionMemoryCard[] {
	const toolCallId = item.toolCallId ?? '';
	if (item.memoryAction === 'flag') {
		const flagged = memory?.flags[toolCallId];
		return flagged ? [flaggedCard(flagged)] : legacyFlagCards(item.toolInput);
	}
	const recalled = memory?.recalls[toolCallId];
	if (!recalled) return legacyRecallCards(item.toolOutput);
	return recalled.map((entry) => recalledCard(entry, threadId));
}
