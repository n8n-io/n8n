/**
 * When the owner is a personal, it represents the personal project that owns the resource.
 */
export type PersonalResourceOwner = {
	type: 'personal';
	/**
	 * The personal project id
	 */
	projectId?: string; // Optional for retrocompatibility
	/**
	 * The personal project name (usually the user name)
	 */
	projectName?: string; // Optional for retrocompatibility
	personalEmail: string;
};

/**
 * When the owner is a team, it represents the team project that owns the resource.
 */
export type TeamResourceOwner = {
	type: 'team';
	/**
	 * The team project id
	 */
	teamId: string;
	/**
	 * The team project name
	 */
	teamName: string;
};

/**
 * When the owner is a string, it represents the personal email of the user who owns the resource.
 */
export type RemoteResourceOwner = string | PersonalResourceOwner | TeamResourceOwner;

export type StatusResourceOwner = {
	type: 'personal' | 'team';
	projectId: string;
	projectName: string;
};
