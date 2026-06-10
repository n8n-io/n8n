import { Logger } from '@n8n/backend-common';
import type { SourceControlledFile } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { SourceControlPreferencesService } from '../source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '../source-control.ee/source-control.service.ee';
import type { SourceControlGetStatus } from '../source-control.ee/types/source-control-get-status';
import { GitFolderReaderService } from './git-resource-reader/git-folder-reader.service';

type SourceControlProjectGroup = {
	project: {
		id: string | null;
		name: string;
		type: 'team' | 'personal' | 'global';
	};
	changes: SourceControlledFile[];
};

type ProjectGroupIdentifier = SourceControlProjectGroup['project'] & {
	groupId: string;
};

@Service()
export class N8nPackagesRegistryService {
	constructor(
		private readonly logger: Logger,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly gitFolderReaderService: GitFolderReaderService,
		private readonly sourceControlService: SourceControlService,
	) {}

	isConnected(): boolean {
		const isConnected = this.sourceControlPreferencesService.isSourceControlConnected();
		this.logger.info(`Source control is connected: ${isConnected}`);
		return isConnected;
	}

	async findAllProjects() {
		return await this.gitFolderReaderService.findAllResources({ resourceType: 'project' });
	}

	async findImportableChangesGroupedByProject(user: User): Promise<SourceControlProjectGroup[]> {
		const options = {
			direction: 'pull',
			preferLocalVersion: false,
			verbose: false,
		} satisfies SourceControlGetStatus;

		const status = await this.sourceControlService.getStatus(user, options);
		const changes = Array.isArray(status) ? status : status.sourceControlledFiles;
		const groupsByProjectId = new Map<string, SourceControlProjectGroup>();

		for (const change of changes) {
			const project = this.getProjectGroupIdentifier(change);
			const existingGroup = groupsByProjectId.get(project.groupId);

			if (existingGroup) {
				existingGroup.changes.push(change);
				continue;
			}

			groupsByProjectId.set(project.groupId, {
				project: {
					id: project.id,
					name: project.name,
					type: project.type,
				},
				changes: [change],
			});
		}

		return [...groupsByProjectId.values()].sort((a, b) =>
			a.project.name.localeCompare(b.project.name),
		);
	}

	private getProjectGroupIdentifier(change: SourceControlledFile): ProjectGroupIdentifier {
		if (change.owner) {
			return {
				groupId: change.owner.projectId,
				id: change.owner.projectId,
				name: change.owner.projectName,
				type: change.owner.type,
			};
		}

		return {
			groupId: 'global',
			id: null,
			name: 'Global changes',
			type: 'global',
		};
	}
}
