import type { AgentChatMessagesQueryDto } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';

const MAX_TURNS_PER_PAGE = 100;

/** The position of an execution in its thread, in the order of `createdAt` and `id`. */
export interface ExecutionPosition {
	createdAt: Date;
	id: string;
}

/** One page of turns: the newest `limit` turns before `before`. */
export interface ChatHistoryPageRequest {
	limit: number;
	before?: ExecutionPosition;
}

export function encodeChatHistoryCursor({ createdAt, id }: ExecutionPosition): string {
	return `${createdAt.toISOString()}|${id}`;
}

function decodeChatHistoryCursor(cursor: string): ExecutionPosition {
	const separator = cursor.indexOf('|');
	const date = new Date(cursor.slice(0, separator));
	const id = cursor.slice(separator + 1);
	if (separator < 1 || !id || Number.isNaN(date.getTime())) {
		throw new BadRequestError('Invalid cursor');
	}
	return { createdAt: date, id };
}

/**
 * The page that the query asks for. Without `limit`, the query asks for the
 * whole thread, so the result is `undefined`.
 */
export function parseChatHistoryPage(
	query: AgentChatMessagesQueryDto | undefined,
): ChatHistoryPageRequest | undefined {
	if (query?.limit === undefined) {
		if (query?.cursor !== undefined) throw new BadRequestError('A cursor requires a limit');
		return undefined;
	}
	const limit = Math.trunc(Number(query.limit));
	if (!Number.isFinite(limit) || limit < 1) throw new BadRequestError('Invalid limit');
	return {
		limit: Math.min(limit, MAX_TURNS_PER_PAGE),
		...(query.cursor !== undefined ? { before: decodeChatHistoryCursor(query.cursor) } : {}),
	};
}
