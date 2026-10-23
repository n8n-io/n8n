import { OperationalError, UserError } from 'n8n-workflow';
import { z } from 'zod';

export const SLACK_SEARCH_PAGE_SIZE = 200;
const CURSOR_PREFIX = 'n8n-slack:';
const cursorSchema = z.object({
	kind: z.enum(['users', 'channels']),
	searchKey: z.string(),
	cursor: z.string().optional(),
	offset: z.number().int().min(0).max(SLACK_SEARCH_PAGE_SIZE),
});

type SearchKind = z.infer<typeof cursorSchema>['kind'];
export type SlackSearchPosition = Pick<z.infer<typeof cursorSchema>, 'cursor' | 'offset'>;

export function readSlackSearchCursor(
	kind: SearchKind,
	searchKey: string,
	cursor?: string,
): SlackSearchPosition {
	if (!cursor?.startsWith(CURSOR_PREFIX)) return { cursor, offset: 0 };
	try {
		const value: unknown = JSON.parse(
			Buffer.from(cursor.slice(CURSOR_PREFIX.length), 'base64url').toString('utf8'),
		);
		const position = cursorSchema.parse(value);
		if (position.kind !== kind) throw new Error('The search type changed.');
		if (position.searchKey !== searchKey) throw new Error('The search criteria changed.');
		return position;
	} catch {
		throw new UserError('The Slack search cursor is invalid. Start the search again.');
	}
}

/** Keep unused matches from a large API page available to the next tool call. */
export function selectSlackSearchPage<T>(params: {
	kind: SearchKind;
	searchKey: string;
	matches: T[];
	limit: number;
	position: SlackSearchPosition;
	nextCursor?: string;
}): { results: T[]; nextCursor?: string } {
	const { kind, searchKey, matches, limit, position, nextCursor } = params;
	if (nextCursor && nextCursor === position.cursor) {
		throw new OperationalError('Slack returned the same search cursor. Start the search again.');
	}
	const end = position.offset + limit;
	const results = matches.slice(position.offset, end);
	const nextPosition =
		end < matches.length
			? { cursor: position.cursor, offset: end }
			: nextCursor
				? { cursor: nextCursor, offset: 0 }
				: undefined;
	return {
		results,
		...(nextPosition
			? {
					nextCursor: `${CURSOR_PREFIX}${Buffer.from(
						JSON.stringify({ kind, searchKey, ...nextPosition }),
					).toString('base64url')}`,
				}
			: {}),
	};
}
