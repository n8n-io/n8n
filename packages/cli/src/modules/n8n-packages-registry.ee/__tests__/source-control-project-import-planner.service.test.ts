import type { SourceControlledFile } from '@n8n/api-types';
import type { CredentialsRepository, User, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { CredentialRequirementsExtractor } from '@/modules/n8n-packages/entities/credential/credential-requirements.extractor';

import { RemoteResourceSet } from '../import-planner/import-planner.types';
import { SourceControlProjectImportPlanner } from '../import-planner/source-control-project-import-planner.service';
import type { SourceControlRemoteResourceReader } from '../import-planner/source-control-remote-resource-reader.service';
import type { WorkflowDependencyExtractor } from '../import-planner/workflow-dependency-extractor';
import type { SourceControlService } from '../../source-control.ee/source-control.service.ee';
import type { ExportableFolder } from '../../source-control.ee/types/exportable-folders';
import type { SourceControlGetStatusVerboseResult } from '../../source-control.ee/types/source-control-get-status';

describe('SourceControlProjectImportPlanner', () => {
	const sourceControlService = mock<SourceControlService>();
	const remoteResourceReader = mock<SourceControlRemoteResourceReader>();
	const workflowDependencyExtractor = mock<WorkflowDependencyExtractor>();
	const credentialRequirementsExtractor = mock<CredentialRequirementsExtractor>();
	const workflowRepository = mock<WorkflowRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const dataTableRepository = mock<DataTableRepository>();
	const user = mock<User>();

	let planner: SourceControlProjectImportPlanner;

	beforeEach(() => {
		jest.clearAllMocks();

		remoteResourceReader.readSelectedResources.mockResolvedValue(new RemoteResourceSet());
		workflowRepository.find.mockResolvedValue([]);
		credentialsRepository.find.mockResolvedValue([]);
		dataTableRepository.find.mockResolvedValue([]);

		planner = new SourceControlProjectImportPlanner(
			sourceControlService,
			remoteResourceReader,
			workflowDependencyExtractor,
			credentialRequirementsExtractor,
			workflowRepository,
			credentialsRepository,
			dataTableRepository,
		);
	});

	it('selects folder changes that belong to the imported project', async () => {
		const folder = {
			id: 'folder-1',
			name: 'Imported folder',
			parentFolderId: null,
			homeProjectId: 'project-1',
			createdAt: '2026-06-10T00:00:00.000Z',
			updatedAt: '2026-06-10T00:00:00.000Z',
		} satisfies ExportableFolder;
		const folderChange = {
			file: '/tmp/folders.json',
			id: folder.id,
			name: folder.name,
			type: 'folders',
			status: 'created',
			location: 'remote',
			conflict: false,
			updatedAt: folder.updatedAt,
		} satisfies SourceControlledFile;

		sourceControlService.getStatus.mockResolvedValue({
			...emptyVerboseStatus(),
			foldersMissingInLocal: [folder],
			sourceControlledFiles: [folderChange],
		});

		const plan = await planner.planProjectImport(user, 'project-1');

		expect(sourceControlService.getStatus).toHaveBeenCalledWith(user, {
			direction: 'pull',
			preferLocalVersion: false,
			verbose: true,
		});
		expect(plan.selectedChanges).toEqual([folderChange]);
		expect(remoteResourceReader.readSelectedResources).toHaveBeenCalledWith([folderChange]);
	});
});

function emptyVerboseStatus(): SourceControlGetStatusVerboseResult {
	return {
		wfRemoteVersionIds: [],
		wfLocalVersionIds: [],
		wfMissingInLocal: [],
		wfMissingInRemote: [],
		wfModifiedInEither: [],
		credMissingInLocal: [],
		credMissingInRemote: [],
		credModifiedInEither: [],
		varMissingInLocal: [],
		varMissingInRemote: [],
		varModifiedInEither: [],
		dtMissingInLocal: [],
		dtMissingInRemote: [],
		dtModifiedInEither: [],
		tagsMissingInLocal: [],
		tagsMissingInRemote: [],
		tagsModifiedInEither: [],
		mappingsMissingInLocal: [],
		mappingsMissingInRemote: [],
		foldersMissingInLocal: [],
		foldersMissingInRemote: [],
		foldersModifiedInEither: [],
		projectsRemote: [],
		projectsLocal: [],
		projectsMissingInLocal: [],
		projectsMissingInRemote: [],
		projectsModifiedInEither: [],
		sourceControlledFiles: [],
	};
}
