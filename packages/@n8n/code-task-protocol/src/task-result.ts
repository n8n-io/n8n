import { z } from 'zod/v4';

import { CODE_TASK_PROTOCOL_VERSION, MAX_CONSOLE_ENTRIES } from './constants';

/** The formatted arguments of one `console.log` call. */
const consoleEntrySchema = z.array(z.string());

/** One more entry than the max, for the entry that tells about the truncation. */
const consoleSchema = z.array(consoleEntrySchema).max(MAX_CONSOLE_ENTRIES + 1);

/**
 * An error that the user code threw, in the shape that the JS task runner
 * sends. Other properties of the thrown error stay on the object.
 */
const userErrorSchema = z.looseObject({
	message: z.string(),
	description: z.string().nullable().optional(),
	stack: z.string().optional(),
	lineNumber: z.number().int().optional(),
	itemIndex: z.number().int().optional(),
	context: z.record(z.string(), z.unknown()).optional(),
});

const successSchema = z.object({
	version: z.literal(CODE_TASK_PROTOCOL_VERSION),
	status: z.literal('success'),
	/** What the user code returned. n8n validates and normalizes it. */
	result: z.unknown(),
	console: consoleSchema,
});

const errorSchema = z.object({
	version: z.literal(CODE_TASK_PROTOCOL_VERSION),
	status: z.literal('error'),
	error: userErrorSchema,
	console: consoleSchema,
});

/**
 * The content of the task result file (`result.json`). The runtime writes it.
 * n8n gets it inline in the `done` event, or downloads it when it is too large.
 */
export const codeTaskResultSchema = z.discriminatedUnion('status', [successSchema, errorSchema]);

export type CodeTaskResult = z.infer<typeof codeTaskResultSchema>;
export type CodeTaskSuccessResult = z.infer<typeof successSchema>;
export type CodeTaskErrorResult = z.infer<typeof errorSchema>;
export type CodeTaskUserError = z.infer<typeof userErrorSchema>;
export type CodeTaskConsoleEntry = z.infer<typeof consoleEntrySchema>;
