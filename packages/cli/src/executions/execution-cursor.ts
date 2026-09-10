import type { SerializedCursor } from '@n8n/api-types';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const timestamp = z.string().datetime({ offset: true });

/** An engine 1.0 execution ID: an auto-increment integer. */
const V1_ID = z
	.string()
	.regex(/^[1-9]\d*$/)
	.refine((id) => Number(id) <= 2147483647);

/**
 * A cursor for a list merging engine 1.0 (integer ID) and engine 2.0 (UUID) rows, since
 * the two ID spaces don't sort against each other and must each track their own position.
 */
const Cursor = z
	.object({
		version: z.literal(1),
		v1: z.object({ timestamp, id: V1_ID }).strict().optional(),
		v2: z.object({ timestamp, id: z.string().uuid() }).strict().optional(),
	})
	.strict();

export type ExecutionCursor = z.infer<typeof Cursor>;
export type ExecutionPosition = NonNullable<ExecutionCursor['v1']>;

/** Parse a cursor, or an empty one when the caller asks for the first page. */
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

/** Whether a cursor marks a position, as opposed to asking for the first page. */
export function hasPosition(cursor?: ExecutionCursor): boolean {
	return cursor?.v1 !== undefined || cursor?.v2 !== undefined;
}

export function encodeExecutionCursor(cursor: ExecutionCursor): SerializedCursor {
	return Buffer.from(JSON.stringify(cursor)).toString('base64url') as SerializedCursor;
}
