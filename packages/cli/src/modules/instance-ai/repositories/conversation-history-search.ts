import { escapeLike, LIKE_ESCAPE_CLAUSE } from '@n8n/db';

import {
	ASK_USER_TOOL_NAME,
	INVALID_TOOL_CALL_PART_TYPE,
	LEGACY_ASK_USER_TOOL_NAMES,
	TOOL_CALL_PART_TYPE,
} from '../conversation-history-content';

const toAskUserMarker = (toolName: string) => `%"toolName":"${toolName}"%`;

/** Query parameters that match ask-user rows under the current and the former tool name. */
export const ASK_USER_CONTENT_MARKERS = {
	askUserMarker: toAskUserMarker(ASK_USER_TOOL_NAME),
	legacyAskUserMarker: toAskUserMarker(LEGACY_ASK_USER_TOOL_NAMES[0] ?? ASK_USER_TOOL_NAME),
};

const askUserCondition = (alias: string) =>
	`(${alias}.content LIKE :askUserMarker OR ${alias}.content LIKE :legacyAskUserMarker)`;

export function buildSearchLikePattern(query: string): string {
	return `%${escapeLike(query.toLowerCase())}%`;
}

export function buildVisibleRowCondition(alias: string): string {
	return (
		`(${alias}.role = 'user'` +
		` OR (${alias}.content NOT LIKE :toolCallMarker AND ${alias}.content NOT LIKE :invalidToolCallMarker)` +
		` OR ${askUserCondition(alias)})`
	);
}

export const VISIBLE_ROW_MARKERS = {
	...ASK_USER_CONTENT_MARKERS,
	toolCallMarker: `%"type":"${TOOL_CALL_PART_TYPE}"%`,
	invalidToolCallMarker: `%"type":"${INVALID_TOOL_CALL_PART_TYPE}"%`,
};

export function buildMessageMatchCondition(alias: string): string {
	return (
		`((${alias}.role = 'user' AND LOWER(${alias}.content) LIKE :pattern ${LIKE_ESCAPE_CLAUSE})` +
		` OR (${alias}.role = 'assistant' AND ${askUserCondition(alias)}` +
		` AND LOWER(${alias}.content) LIKE :pattern ${LIKE_ESCAPE_CLAUSE}))`
	);
}
