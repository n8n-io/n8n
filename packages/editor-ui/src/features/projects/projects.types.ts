import type { IUserResponse } from '@/Interface';

export type ProjectType = 'personal' | 'team' | 'public';
export type ProjectRole =
	| 'project:personalOwner'
	| 'project:admin'
	| 'project:editor'
	| 'project:viewer';
export type ProjectRelation = Pick<IUserResponse, 'id' | 'email' | 'firstName' | 'lastName'> & {
	role: ProjectRole;
};
export type ProjectRelationPayload = { userId: string; role: ProjectRole };
export type Project = {
	id: string;
	name: string | null;
	type: ProjectType;
	relations: ProjectRelation[];
};
export type ProjectListItem = Omit<Project, 'relations'> & {
	role: ProjectRole;
	createdAt: string;
	updatedAt: string;
};
export type ProjectCreateRequest = { name: string };
export type ProjectUpdateRequest = Pick<Project, 'id' | 'name'> & {
	relations: ProjectRelationPayload[];
};
