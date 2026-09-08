import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { isExecutionIdV2 } from './execution-id';

const timestamp = z.string().datetime({ offset: true });
const Cursor = z
	.object({
		version: z.literal(1),
		// TODO: add a `v2` position for engine 2.0 (UUID) execution ids, as a followup.
		v1: z
			.object({
				timestamp,
				id: z
					.string()
					.regex(/^[1-9]\d*$/)
					.refine((id) => Number(id) <= 2147483647),
			})
			.strict()
			.optional(),
	})
	.strict();

export type ExecutionCursor = z.infer<typeof Cursor>;
export type ExecutionPosition = NonNullable<ExecutionCursor['v1']>;

export function parseExecutionCursor(value?: string): ExecutionCursor {
	if (value === undefined) return { version: 1 };
	try {
		if (!value.length || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) {
			throw new BadRequestError('Invalid execution cursor');
		}
		return Cursor.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
	} catch {
		throw new BadRequestError('Invalid execution cursor');
	}
}

export function encodeExecutionCursor(cursor: ExecutionCursor): string {
	return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

/** The row position to keep paging from. */
export function positionOf(cursor: ExecutionCursor): ExecutionPosition | undefined {
	return cursor.v1;
}

/**
 * Encode the cursor that continues a list from just after `row`, or `null` if `row` is an
 * engine 2.0 execution — those aren't supported as a cursor position yet.
 */
export function encodeCursorForRow(row: {
	id: string;
	startedAt: Date | string | null;
	createdAt: Date | string;
}): string | null {
	if (isExecutionIdV2(row.id)) return null;

	const position: ExecutionPosition = {
		timestamp: new Date(row.startedAt ?? row.createdAt).toISOString(),
		id: row.id,
	};
	return encodeExecutionCursor({ version: 1, v1: position });
}
