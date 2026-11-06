import { escapeLike, LIKE_ESCAPE_CLAUSE } from '@n8n/db';

import {
	ASK_USER_TOOL_NAMES,
	INVALID_TOOL_CALL_PART_TYPE,
	TOOL_CALL_PART_TYPE,
} from '../conversation-history-content';

const toAskUserMarker = (toolName: string) => `%"toolName":"${toolName}"%`;

/** Query parameters that match ask-user rows under the current and every former tool name. */
export const ASK_USER_CONTENT_MARKERS: Record<string, string> = Object.fromEntries(
	ASK_USER_TOOL_NAMES.map((toolName, index) => [
		`askUserMarker${index}`,
		toAskUserMarker(toolName),
	]),
);

const askUserCondition = (alias: string) =>
	`(${Object.keys(ASK_USER_CONTENT_MARKERS)
		.map((key) => `${alias}.content LIKE :${key}`)
		.join(' OR ')})`;

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
