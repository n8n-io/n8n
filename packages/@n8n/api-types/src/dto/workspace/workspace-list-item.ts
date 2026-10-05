import type { ProjectIcon } from '../../schemas/project.schema';

/** PROTOTYPE (workspaces): one row of `GET /workspaces`. */
export type WorkspaceListItem = {
	id: string;
	name: string;
	icon: ProjectIcon | null;
	description: string | null;
	type: 'workspace' | 'personalWorkspace';
	/** The workspace shows in the user's sidebar. */
	joined: boolean;
	/** The user has a direct role on the workspace. */
	isMember: boolean;
	role: string | null;
	projectCount: number;
	memberCount: number;
	/** Anyone on the instance can join without approval. */
	isPublic: boolean;
	/** Members get the same role on every project in the workspace. */
	cascadeMembers: boolean;
	/** Who would review a request to join. */
	adminNames: string[];
	/**
	 * Instance admins join and leave freely, and joining only changes their sidebar.
	 * Other users can join public workspaces, which makes them viewers.
	 */
	canJoin: boolean;
	canLeave: boolean;
	/** Users who can see the workspace but must ask its admins to join. */
	canRequestAccess: boolean;
	canCreateProject: boolean;
};
