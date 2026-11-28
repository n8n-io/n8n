import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type {
	AgentThreadRedactionService,
	ThreadReader,
} from '../../agent-thread-redaction.service';

/** An n8n user who reads a thread. */
export function asReader(userId: string): ThreadReader {
	return { user: mock<User>({ id: userId }) };
}

/** A thread redaction that redacts nothing, for tests of other behavior. */
export function passthroughThreadRedaction() {
	const redaction = mock<AgentThreadRedactionService>();
	redaction.redactForReader.mockImplementation(async (turns) => turns);
	return redaction;
}
