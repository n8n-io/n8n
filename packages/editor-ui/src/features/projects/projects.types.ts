import type { IUser } from '@/Interface';

export type Project = { id: string; name: string | null };
export type ProjectCreateRequest = { name: NonNullable<Project['name']> };
export type ProjectUpdateRequest = Project & ProjectCreateRequest;
export type ProjectRole =
	| 'project:personalOwner'
	| 'project:admin'
	| 'project:editor'
	| 'project:viewer';
export type ProjectRelationsRequest = Pick<Project, 'id'> & {
	relations: Array<{ userId: IUser['id']; role: ProjectRole }>;
};
