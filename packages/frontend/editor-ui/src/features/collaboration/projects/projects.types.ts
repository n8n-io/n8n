import type { Scope, Role } from '@n8n/permissions';
import type { IUserResponse } from '@n8n/rest-api-client/api/users';

export const ProjectTypes = {
	Personal: 'personal',
	Team: 'team',
	Public: 'public',
	// PROTOTYPE (workspaces): containers that hold resources, never workflows
	Workspace: 'workspace',
	PersonalWorkspace: 'personalWorkspace',
	Instance: 'instance',
} as const;

/** PROTOTYPE (workspaces) */
export const isContainerProject = (project?: { type: string } | null) =>
	project?.type === ProjectTypes.Workspace ||
	project?.type === ProjectTypes.PersonalWorkspace ||
	project?.type === ProjectTypes.Instance;

type ProjectTypeKeys = typeof ProjectTypes;

export type ProjectType = ProjectTypeKeys[keyof ProjectTypeKeys];
export type ProjectRelation = Pick<IUserResponse, 'id' | 'email' | 'firstName' | 'lastName'> & {
	role: string;
	/** PROTOTYPE (workspaces): the role comes from the workspace member cascade. */
	inheritedFromWorkspace?: boolean;
};
/**
 * A user who reaches the project through a global role rather than a project
 * relation. The backend sends these next to `relations`; they are never part of
 * the membership the settings form edits.
 */
export type ProjectImplicitMember = Pick<
	IUserResponse,
	'id' | 'email' | 'firstName' | 'lastName'
> & {
	globalRole: { slug: string; displayName: string };
};
export type ProjectMemberData = {
	id: string;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	role: Role['slug'];
	/** Access comes from a global role, so the row is read-only and cannot be removed. */
	alwaysHasAccess?: boolean;
	/** The instance role behind `alwaysHasAccess`. */
	instanceRole?: { slug: string; displayName: string };
	isPendingUser?: boolean;
	isCurrentUser?: boolean;
	/** PROTOTYPE (workspaces) */
	inheritedFromWorkspace?: boolean;
};
export type ProjectSharingData = {
	id: string;
	name: string | null;
	icon: { type: 'emoji'; value: string } | { type: 'icon'; value: string } | null;
	type: ProjectType;
	description?: string | null;
	createdAt: string;
	updatedAt: string;
	/** PROTOTYPE (workspaces): the workspace that contains the project */
	parentId?: string | null;
};
export type Project = ProjectSharingData & {
	/** PROTOTYPE (workspaces) */
	parent?: { id: string; name: string; type: ProjectType; cascadeMembers?: boolean } | null;
	/** PROTOTYPE (workspaces): only set on workspaces */
	isPublic?: boolean;
	cascadeMembers?: boolean;
	relations: ProjectRelation[];
	implicitMembers?: ProjectImplicitMember[];
	scopes: Scope[];
	customTelemetryTags?: Array<{ key: string; value: string }>;
	/** Null on older team projects that predate creator tracking. */
	creatorId?: string | null;
	rolesManaged: boolean;
};
export type ProjectListItem = ProjectSharingData & {
	role: Role['slug'];
	scopes?: Scope[];
};
export type ProjectsCount = Record<'personal' | 'team' | 'public', number>;

export type ResourceEditorDestination =
	| { kind: 'resolved'; project: Project }
	| { kind: 'pending'; id: string; name: string; permissions: { create: boolean } };
