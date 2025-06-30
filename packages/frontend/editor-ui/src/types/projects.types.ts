import type { Scope, ProjectRole } from '@n8n/permissions';
import type { IUserResponse } from '@/Interface';

export const ProjectTypes = {
	Personal: 'personal',
	Team: 'team',
	Public: 'public',
} as const;

type ProjectTypeKeys = typeof ProjectTypes;

export type ProjectType = ProjectTypeKeys[keyof ProjectTypeKeys];
export type ProjectRelation = Pick<IUserResponse, 'id' | 'email' | 'firstName' | 'lastName'> & {
	role: ProjectRole;
};
export type ProjectRelationPayload = { userId: string; role: ProjectRole };
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
	scopes: Scope[];
};
export type ProjectListItem = ProjectSharingData & {
	role: ProjectRole;
	scopes?: Scope[];
};
export type ProjectsCount = Record<ProjectType, number>;
