import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { SourceControlPreferencesService } from '../source-control.ee/source-control-preferences.service.ee';
import { GitFolderReaderService } from './git-resource-reader/git-folder-reader.service';

@Service()
export class N8nPackagesRegistryService {
	constructor(
		private readonly logger: Logger,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly gitFolderReaderService: GitFolderReaderService,
	) {}

	isConnected(): boolean {
		const isConnected = this.sourceControlPreferencesService.isSourceControlConnected();
		this.logger.info(`Source control is connected: ${isConnected}`);
		return isConnected;
	}

	async findAllProjects() {
		return await this.gitFolderReaderService.findAllResources({ resourceType: 'project' });
	}
}
