/** A browser session that the tools drive over CDP. */
export interface CloudBrowserSession {
	id: string;
	/** Carries a signing key, so it must never be logged. */
	connectUrl: string;
}

/** The user and background task that a session is scoped to. */
export interface CloudBrowserSessionScope {
	userId: string;
	/** The thread that owns the background task. */
	threadId: string;
	/** The background task that owns the session. */
	taskId: string;
}

/**
 * Where cloud browser sessions come from. The instance uses one provider for
 * every task, so the browser tools never know how a session was created or paid for.
 */
export interface CloudBrowserSessionProvider {
	createSession(scope: CloudBrowserSessionScope): Promise<CloudBrowserSession>;
	releaseSession(scope: CloudBrowserSessionScope, sessionId: string): Promise<void>;
	getSessionLiveViewUrl(scope: CloudBrowserSessionScope, sessionId: string): Promise<string>;
}
