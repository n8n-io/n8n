export type LoginSession = {
	id: string;
	/** Raw user-agent captured at login; parsed client-side for display. Null for logins without the header. */
	userAgent: string | null;
	/** IP address captured at login. Null when unavailable. */
	ipAddress: string | null;
	/** True for the session making the request. */
	current: boolean;
	/** ISO timestamp of the last request seen on this session, or null if never updated. */
	lastActiveAt: string | null;
	createdAt: string;
	/** ISO timestamp when the underlying token expires. */
	expiresAt: string;
};

export type LoginSessionList = {
	items: LoginSession[];
};

export type RevokeAllOtherSessionsResponse = {
	revokedCount: number;
};
