import { Service } from '@n8n/di';
import { GitResourceType } from './git-resource-reader.interface';
import { ProjectReader } from './project.reader';

@Service()
export class GitFolderReaderService {
	private readonly projectReader = new ProjectReader();
	constructor() {}

	async findAllResources({ resourceType }: { resourceType: GitResourceType }) {
		if (resourceType === 'project') {
			return this.projectReader.list();
		}

		throw new Error(`Unsupported resource type: ${resourceType}`);
	}
}
