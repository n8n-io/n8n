import type { IPollFunctions } from 'n8n-workflow';

/**
 * Runs `poll()` inside the staging scope of the poll functions, so a cursor staged by
 * this poll can only be committed by this poll. Poll functions built without durable
 * cursors have no scope to enter, and `poll()` runs directly.
 */
export const runPollInStagingScope = async <T>(
	pollFunctions: IPollFunctions,
	poll: () => Promise<T>,
): Promise<T> => (pollFunctions.__runPoll ? await pollFunctions.__runPoll(poll) : await poll());

/** Commits the cursor this poll staged, if the poll functions store cursors at all. */
export const commitStagedCursor = async (pollFunctions: IPollFunctions): Promise<void> => {
	if (pollFunctions.__commitCursor) await pollFunctions.__commitCursor();
};
