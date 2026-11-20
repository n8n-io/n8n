/** A browser session that the tools drive over CDP. */
export interface CloudBrowserSession {
	id: string;
	/** Carries a signing key, so it must never be logged. */
	connectUrl: string;
	/**
	 * The country of the region the browser runs in, as a two-letter code such as "DE". Sites see
	 * the browser there unless it uses a proxy. Absent when unknown.
	 */
	regionCountry?: string;
}

/** The user and background task that a session is scoped to. */
export interface CloudBrowserSessionScope {
	userId: string;
	/** The thread that owns the background task. */
	threadId: string;
	/** The background task that owns the session. */
	taskId: string;
}

export interface CloudBrowserSessionOptions {
	/** Browse through a residential proxy in this country, for example "DE". */
	proxyCountry?: string;
}

/**
 * Where cloud browser sessions come from. The instance uses one provider for
 * every task, so the browser tools never know how a session was created or paid for.
 */
export interface CloudBrowserSessionProvider {
	createSession(
		scope: CloudBrowserSessionScope,
		options?: CloudBrowserSessionOptions,
	): Promise<CloudBrowserSession>;
	releaseSession(scope: CloudBrowserSessionScope, sessionId: string): Promise<void>;
	/**
	 * The live view of the tab with this CDP target id, or of the first tab when no id is given
	 * or no tab has it.
	 */
	getSessionLiveViewUrl(
		scope: CloudBrowserSessionScope,
		sessionId: string,
		targetId?: string,
	): Promise<string>;
}
