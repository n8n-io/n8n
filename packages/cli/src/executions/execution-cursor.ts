import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

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
