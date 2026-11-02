import type { Scope, Role } from '@n8n/permissions';
import { ProjectTypes } from '@n8n/rest-api-client';
import type {
	Project,
	ProjectImplicitMember,
	ProjectRelation,
	ProjectSharingData,
	ProjectType,
} from '@n8n/rest-api-client';

export { ProjectTypes };
export type { Project, ProjectImplicitMember, ProjectRelation, ProjectSharingData, ProjectType };

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
export type ProjectListItem = ProjectSharingData & {
	role: Role['slug'];
	scopes?: Scope[];
};
export type ProjectsCount = Record<ProjectType, number>;

export type ResourceEditorDestination =
	| { kind: 'resolved'; project: Project }
	| { kind: 'pending'; id: string; name: string; permissions: { create: boolean } };
