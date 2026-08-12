/**
 * Deliberately not derived from `MinimalUser`, which wrongly claims non-nullable
 * names. This type also doubles as the boundary of what the endpoint may expose.
 */
export type ProjectFileUser = {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
};

/**
 * A project file as returned by the API.
 *
 * Note the absence of the binary data reference: it is server-side only, because
 * `GET /rest/binary-data?id=` performs no ownership check, so a leaked reference
 * is a cross-project read for any authenticated user.
 *
 * `createdBy`/`updatedBy` are null when the actor is no longer resolvable (the
 * user was deleted). Once the Project File node writes workflow attribution,
 * these widen to cover a workflow actor.
 */
export type ProjectFileResponse = {
	id: string;
	name: string;
	mimeType: string;
	fileSizeBytes: number;
	createdAt: string;
	updatedAt: string;
	createdBy: ProjectFileUser | null;
	updatedBy: ProjectFileUser | null;
};

/** Which budget the project draws on, and how much of it is used. */
export type ProjectFileUsageResponse = {
	usedBytes: number;
	quotaBytes: number;
	/** `personal` budgets are shared instance-wide across all personal projects. */
	scope: 'project' | 'personal';
};

export type ProjectFileListResponse = {
	count: number;
	data: ProjectFileResponse[];
	usage: ProjectFileUsageResponse;
};
