import type { IUser } from '@/Interface';

export type Project = { id: string; name: string | null };
export type ProjectRole =
	| 'project:personalOwner'
	| 'project:admin'
	| 'project:editor'
	| 'project:viewer';
export type ProjectCreateRequest = { name: Project['name'] };
export type ProjectRelationsRequest = {
	projectId: Project['id'];
	relations: Array<{ userId: IUser['id']; role: ProjectRole }>;
};
