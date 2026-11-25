import { OperationalError } from '@n8n/errors';
import type { CodeTaskDoneEvent, CodeTaskErrorEvent, CodeTaskEvent } from '@n8n/sandbox-client';

export type CodeTaskOutcome = CodeTaskDoneEvent | CodeTaskErrorEvent;

/** The task stream ended before a `done` or `error` event, so the task may or may not have run! */
export class CodeTaskOutcomeUnknownError extends OperationalError {
	constructor(cause?: unknown) {
		super('The code sandbox stopped sending events before the task ended', { cause });
	}
}

export async function readTaskOutcome(
	events: AsyncIterable<CodeTaskEvent>,
	signal?: AbortSignal,
): Promise<CodeTaskOutcome> {
	try {
		for await (const event of events) {
			if (event.type === 'done' || event.type === 'error') return event;
		}
	} catch (error) {
		if (signal?.aborted) throw error; // n8n cancelled, so outcome does not matter
		throw new CodeTaskOutcomeUnknownError(error);
	}

	throw new CodeTaskOutcomeUnknownError();
}
