import { GitResourceReader } from './git-resource-reader.interface';

export interface ProjectGitResource {
	id: string;
	name: string;
}

export class ProjectReader implements GitResourceReader<ProjectGitResource> {
	readonly resourceType = 'project';

	async list(): Promise<ProjectGitResource[]> {
		return [];
	}

	async read(id: string): Promise<ProjectGitResource | undefined> {
		return undefined;
	}
}
