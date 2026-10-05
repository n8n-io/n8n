import { escapeLike, LIKE_ESCAPE_CLAUSE } from '@n8n/db';

import {
	ASK_USER_TOOL_NAME,
	INVALID_TOOL_CALL_PART_TYPE,
	TOOL_CALL_PART_TYPE,
} from '../conversation-history-content';

export const ASK_USER_CONTENT_MARKER = `%"toolName":"${ASK_USER_TOOL_NAME}"%`;

export function buildSearchLikePattern(query: string): string {
	return `%${escapeLike(query.toLowerCase())}%`;
}

/**
 * Message content is a JSON column (`json` on Postgres), so LIKE matches run
 * over the content cast to text.
 */
function contentText(alias: string): string {
	return `CAST(${alias}.content AS TEXT)`;
}

export function buildVisibleRowCondition(alias: string): string {
	const content = contentText(alias);
	return (
		`(${alias}.role = 'user'` +
		` OR (${content} NOT LIKE :toolCallMarker AND ${content} NOT LIKE :invalidToolCallMarker)` +
		` OR ${content} LIKE :askUserMarker)`
	);
}

export const VISIBLE_ROW_MARKERS = {
	askUserMarker: ASK_USER_CONTENT_MARKER,
	toolCallMarker: `%"type":"${TOOL_CALL_PART_TYPE}"%`,
	invalidToolCallMarker: `%"type":"${INVALID_TOOL_CALL_PART_TYPE}"%`,
};

export function buildMessageMatchCondition(alias: string): string {
	const content = contentText(alias);
	return (
		`((${alias}.role = 'user' AND LOWER(${content}) LIKE :pattern ${LIKE_ESCAPE_CLAUSE})` +
		` OR (${alias}.role = 'assistant' AND ${content} LIKE :askUserMarker` +
		` AND LOWER(${content}) LIKE :pattern ${LIKE_ESCAPE_CLAUSE}))`
	);
}
