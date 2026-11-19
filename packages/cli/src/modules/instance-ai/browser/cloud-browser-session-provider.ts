/** A browser session that the tools drive over CDP. */
export interface CloudBrowserSession {
	id: string;
	/** Carries a signing key, so it must never be logged. */
	connectUrl: string;
	/** The provider's id of the region the browser runs in, for example "eu-central-1". */
	regionId: string;
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

/** Where a session runs. A login is saved with it, and a session that uses the login must run there too. */
export interface CloudBrowserSessionLocation {
	/** The provider's id of the region, for example "eu-central-1". */
	regionId: string;
	/** Browse through a residential proxy in this country, for example "DE". */
	proxyCountry?: string;
	/** A city in `proxyCountry`. */
	proxyCity?: string;
}

/** A new session runs where it is asked to. Without a region, the provider picks one. */
export interface CloudBrowserSessionOptions extends Partial<CloudBrowserSessionLocation> {
	/**
	 * A login profile from `createLoginProfile` or `findSavedLoginProfileForDomain`. The session
	 * keeps its sign-ins in it.
	 */
	loginProfileId?: string;
}

/**
 * A browser profile that keeps the cookies and site storage of a session. Each session gets a new
 * one. When the user signs in to a site and saves the login, the profile is kept for that site.
 * Otherwise it is deleted when the session ends.
 */
export interface CloudBrowserLoginProfile {
	id: string;
	/** The registrable domain it is for, for example "linkedin.com". */
	domain: string;
	/** When the user saved it. Absent while it is not saved. */
	savedAt?: Date;
	/** Where it was saved. A session that uses it must open there. Set together with `savedAt`. */
	savedLocation?: CloudBrowserSessionLocation;
	/** When a session last used it. Set for a saved login profile. */
	lastUsedAt?: Date;
}

/** The user whose saved login profiles a call reads or deletes. These calls are not part of a task. */
export type CloudBrowserUserScope = Pick<CloudBrowserSessionScope, 'userId'>;

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
	/**
	 * Creates an empty login profile for a new session, so that the sign-ins made in the session
	 * can be saved later. Returns its id.
	 */
	createLoginProfile(scope: CloudBrowserSessionScope): Promise<string>;
	/** The user's most recently used saved login profile for `domain`, if they have one. */
	findSavedLoginProfileForDomain(
		scope: CloudBrowserUserScope,
		domain: string,
	): Promise<CloudBrowserLoginProfile | undefined>;
	/**
	 * Saves a login profile for `domain`, and returns it as saved. `location` is where its session
	 * runs.
	 */
	saveLoginProfile(
		scope: CloudBrowserSessionScope,
		loginProfile: { id: string; domain: string; location: CloudBrowserSessionLocation },
	): Promise<CloudBrowserLoginProfile>;
	/** Deletes a login profile, saved or not. */
	deleteLoginProfile(scope: CloudBrowserUserScope, id: string): Promise<void>;
	/** The user's saved login profiles, most recently used first. */
	listSavedLoginProfiles(scope: CloudBrowserUserScope): Promise<CloudBrowserLoginProfile[]>;
}
