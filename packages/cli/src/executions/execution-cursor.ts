import type { SerializedCursor } from '@n8n/api-types';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { isExecutionIdV2 } from './execution-id';

/** An engine 1.0 execution ID: an auto-increment integer. */
const V1_ID = z
	.string()
	.regex(/^[1-9]\d*$/)
	.refine((id) => Number(id) <= 2147483647);

/** An engine 2.0 execution ID: a UUID. */
const V2_ID = z.string().refine(isExecutionIdV2);

/** A position holds one ID space, because the two spaces do not sort against each other. */
const Cursor = z.union([
	z.object({ version: z.literal(1), v1: V1_ID }).strict(),
	z.object({ version: z.literal(1), v2: V2_ID }).strict(),
]);

/** Parse a cursor into the execution ID to page from, or `undefined` for the first page. */
export function parseExecutionCursor(value?: string): string | undefined {
	if (value === undefined) return undefined;

	let cursor: z.infer<typeof Cursor>;
	try {
		if (!value.length || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) {
			throw new BadRequestError('Invalid execution cursor');
		}
		cursor = Cursor.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
	} catch {
		throw new BadRequestError('Invalid execution cursor');
	}

	// The executions table pages by its integer `id`, so a v2 position has nothing
	// to page against yet. Nothing encodes one either - see `encodeCursorForId`.
	if ('v2' in cursor) throw new BadRequestError('Unsupported execution cursor');

	return cursor.v1;
}

/** Encode a cursor position. The ID shape picks the ID space it belongs to. */
export function encodeExecutionCursor(id: string): SerializedCursor {
	const position = isExecutionIdV2(id) ? { v2: id } : { v1: id };

	return Buffer.from(JSON.stringify({ version: 1, ...position })).toString(
		'base64url',
	) as SerializedCursor;
}

/**
 * Encode the cursor that continues a list from just after execution `id`, or `null` if `id`
 * is an engine 2.0 execution ID — those aren't supported as a cursor position yet.
 */
export function encodeCursorForId(id: string): SerializedCursor | null {
	if (isExecutionIdV2(id)) return null;

	return encodeExecutionCursor(id);
}
