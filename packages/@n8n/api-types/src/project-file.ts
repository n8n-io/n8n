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

/** The workflow that wrote a file, via the "Add file to project" node. */
export type ProjectFileWorkflow = {
	id: string;
	name: string;
};

/**
 * Who created or last touched a file.
 *
 * A file is written either by a person through the UI or by a workflow through
 * the node — never both — so the actor is a discriminated union rather than two
 * parallel optional fields.
 */
export type ProjectFileActorResponse =
	| ({ type: 'user' } & ProjectFileUser)
	| ({ type: 'workflow' } & ProjectFileWorkflow);

/**
 * A project file as returned by the API.
 *
 * Note the absence of the binary data reference: it is server-side only, because
 * `GET /rest/binary-data?id=` performs no ownership check, so a leaked reference
 * is a cross-project read for any authenticated user.
 *
 * `createdBy`/`updatedBy` are null when the actor is no longer resolvable — a
 * deleted user or a deleted workflow, since both FKs are `ON DELETE SET NULL`.
 */
export type ProjectFileResponse = {
	id: string;
	name: string;
	mimeType: string;
	fileSizeBytes: number;
	createdAt: string;
	updatedAt: string;
	createdBy: ProjectFileActorResponse | null;
	updatedBy: ProjectFileActorResponse | null;
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
