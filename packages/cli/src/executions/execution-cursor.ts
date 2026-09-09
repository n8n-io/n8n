import type { SerializedCursor } from '@n8n/api-types';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { isExecutionIdV2 } from './execution-id';

const Cursor = z
	.object({
		version: z.literal(1),
		// TODO: add a `v2` position for engine 2.0 (UUID) execution ids, as a followup.
		v1: z
			.string()
			.regex(/^[1-9]\d*$/)
			.refine((id) => Number(id) <= 2147483647),
	})
	.strict();

/** Parse a cursor into the execution ID to page from, or `undefined` for the first page. */
export function parseExecutionCursor(value?: string): string | undefined {
	if (value === undefined) return undefined;
	try {
		if (!value.length || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) {
			throw new BadRequestError('Invalid execution cursor');
		}
		return Cursor.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))).v1;
	} catch {
		throw new BadRequestError('Invalid execution cursor');
	}
}

export function encodeExecutionCursor(id: string): SerializedCursor {
	return Buffer.from(JSON.stringify({ version: 1, v1: id })).toString(
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
