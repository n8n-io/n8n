import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { join } from 'path';

import {
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_PROJECT_EXPORT_FOLDER,
} from '../../source-control.ee/constants';
import type { GitResourceType } from './git-resource-reader.interface';
import { ProjectReader } from './project.reader';

@Service()
export class GitFolderReaderService {
	private readonly projectReader: ProjectReader;

	constructor(instanceSettings: InstanceSettings) {
		const gitFolder = join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		const projectFolder = join(gitFolder, SOURCE_CONTROL_PROJECT_EXPORT_FOLDER);

		this.projectReader = new ProjectReader(projectFolder);
	}

	async findAllResources(options: { resourceType: GitResourceType }) {
		if (options.resourceType === 'project') {
			return await this.projectReader.list();
		}

		throw new Error(`Unsupported resource type: ${options.resourceType}`);
	}
}
