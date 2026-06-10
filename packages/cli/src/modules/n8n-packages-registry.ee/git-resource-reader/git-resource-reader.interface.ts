/**
 * TODO: support more resource types
 */
export type GitResourceType = 'project' | 'workflow';

export interface GitResourceReader<T> {
	resourceType: GitResourceType;
	list(): Promise<T[]>;
	read(id: string): Promise<T | undefined>;
}
