import type { LangchainMessage } from './sessions';

export interface StoredSession {
	messages: LangchainMessage[];
	previousSummary?: string;
	updatedAt: Date;
}

export interface ISessionStorage {
	/**
	 * Get a session by thread ID (format: "workflow-{workflowId}-user-{userId}")
	 * Returns null if session doesn't exist
	 */
	getSession(threadId: string): Promise<StoredSession | null>;

	/**
	 * Create or update a session (upsert semantics)
	 */
	saveSession(threadId: string, data: StoredSession): Promise<void>;

	/**
	 * Delete a session (used by /clear command)
	 */
	deleteSession(threadId: string): Promise<void>;
}
