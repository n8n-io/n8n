import type { ProjectSettings } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import type { IUserResponse } from '@/Interface';
import type { ProjectRole } from '@/types/roles.types';

export const ProjectTypes = {
	Personal: 'personal',
	Team: 'team',
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
	type: ProjectType;
	settings: ProjectSettings;
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
