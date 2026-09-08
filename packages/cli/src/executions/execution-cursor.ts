import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { isExecutionIdV2 } from './execution-id';

const timestamp = z.string().datetime({ offset: true });
const Cursor = z
	.object({
		version: z.literal(1),
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
		v2: z.object({ timestamp, id: z.string().uuid() }).strict().optional(),
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

/** The row position to keep paging from, regardless of which execution version it names. */
export function positionOf(cursor: ExecutionCursor): ExecutionPosition | undefined {
	return cursor.v1 ?? cursor.v2;
}

/** Encode the cursor that continues a list from just after `row`. */
export function encodeCursorForRow(row: {
	id: string;
	startedAt: Date | string | null;
	createdAt: Date | string;
}): string {
	const position: ExecutionPosition = {
		timestamp: new Date(row.startedAt ?? row.createdAt).toISOString(),
		id: row.id,
	};
	return encodeExecutionCursor(
		isExecutionIdV2(row.id) ? { version: 1, v2: position } : { version: 1, v1: position },
	);
}
