import type { Scope } from '@n8n/permissions';
import type { IUserResponse } from '@/Interface';
import type { ProjectRole } from '@/types/roles.types';

export type ProjectType = 'personal' | 'team' | 'public';
export type ProjectRelation = Pick<IUserResponse, 'id' | 'email' | 'firstName' | 'lastName'> & {
	role: ProjectRole;
};
export type ProjectRelationPayload = { userId: string; role: ProjectRole };
export type ProjectSharingData = {
	id: string;
	name: string | null;
	type: ProjectType;
	createdAt: string;
	updatedAt: string;
};
export type Project = ProjectSharingData & {
	relations: ProjectRelation[];
	scopes: Scope[];
};
export type ProjectListItem = ProjectSharingData & {
	role: ProjectRole;
	scopes?: Scope[];
};
export type ProjectCreateRequest = { name: string };
export type ProjectUpdateRequest = Pick<Project, 'id' | 'name'> & {
	relations: ProjectRelationPayload[];
};
export type ProjectsCount = Record<ProjectType, number>;
