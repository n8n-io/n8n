/** A browser session that the tools drive over CDP. */
export interface CloudBrowserSession {
	id: string;
	/** Carries a signing key, so it must never be logged. */
	connectUrl: string;
}

/** One tab of a session. `liveViewUrl` lets anyone who has it control the browser: never log or store it. */
export interface CloudBrowserLivePage {
	/** The browser's own id for the tab (its CDP target id). */
	id: string;
	liveViewUrl: string;
}

/** The user and background job that a session is scoped to. */
export interface CloudBrowserSessionScope {
	userId: string;
	/** The thread that owns the background job. */
	threadId: string;
	/** The background job that owns the session. */
	jobId: string;
}

/**
 * Where cloud browser sessions come from. The instance uses one provider for
 * every job, so the browser tools never know how a session was created or paid for.
 */
export interface CloudBrowserSessionProvider {
	createSession(scope: CloudBrowserSessionScope): Promise<CloudBrowserSession>;
	releaseSession(scope: CloudBrowserSessionScope, sessionId: string): Promise<void>;
	/** The session's tabs, oldest first. */
	getLivePages(scope: CloudBrowserSessionScope, sessionId: string): Promise<CloudBrowserLivePage[]>;
}
