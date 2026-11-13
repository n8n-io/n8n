import { isRecord } from '@n8n/utils/is-record';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import type { z } from 'zod/v4';

import { CODE_TASK_PROTOCOL_VERSION } from './constants';
import { InvalidCodeTaskFileError } from './errors/invalid-code-task-file.error';
import { codeTaskInputSchema, type CodeTaskInput } from './task-input';
import { codeTaskResultSchema, type CodeTaskResult } from './task-result';

/** Checks the content of a task input file (`task.json`), after `JSON.parse`. */
export function parseCodeTaskInput(
	value: unknown,
): Result<CodeTaskInput, InvalidCodeTaskFileError> {
	return parseFile('task input', codeTaskInputSchema, value);
}

/** Checks the content of a task result file (`result.json`), after `JSON.parse`. */
export function parseCodeTaskResult(
	value: unknown,
): Result<CodeTaskResult, InvalidCodeTaskFileError> {
	return parseFile('task result', codeTaskResultSchema, value);
}

function parseFile<T>(
	fileKind: string,
	schema: z.ZodType<T>,
	value: unknown,
): Result<T, InvalidCodeTaskFileError> {
	// Check the version first. A file of another version gets one clear error,
	// not a list of unrelated field errors.
	const version = isRecord(value) ? value.version : undefined;
	if (version !== CODE_TASK_PROTOCOL_VERSION) {
		return createResultError(
			new InvalidCodeTaskFileError(fileKind, [
				`Unsupported version ${JSON.stringify(version)}. Expected version ${CODE_TASK_PROTOCOL_VERSION}.`,
			]),
		);
	}

	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		return createResultError(
			new InvalidCodeTaskFileError(
				fileKind,
				parsed.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`),
			),
		);
	}

	return createResultOk(parsed.data);
}
