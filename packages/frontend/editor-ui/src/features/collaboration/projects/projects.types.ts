import type { Scope, Role } from '@n8n/permissions';
import type { IUserResponse } from '@n8n/rest-api-client/api/users';

export const ProjectTypes = {
	Personal: 'personal',
	Team: 'team',
	Public: 'public',
} as const;

type ProjectTypeKeys = typeof ProjectTypes;

export type ProjectType = ProjectTypeKeys[keyof ProjectTypeKeys];
export type ProjectRelation = Pick<IUserResponse, 'id' | 'email' | 'firstName' | 'lastName'> & {
	role: string;
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
};
export type ProjectSharingData = {
	id: string;
	name: string | null;
	icon: { type: 'emoji'; value: string } | { type: 'icon'; value: string } | null;
	type: ProjectType;
	description?: string | null;
	createdAt: string;
	updatedAt: string;
};
export type Project = ProjectSharingData & {
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
export type ProjectsCount = Record<ProjectType, number>;
