export interface Session {
	sessionId: string;
	messages: Array<Record<string, unknown>>;
	lastUpdated?: string;
	/** Version card message ID that the user restored to */
	activeVersionCardId?: string | null;
	/** First user message ID sent after a restore */
	resumeAfterRestoreMessageId?: string | null;
}
