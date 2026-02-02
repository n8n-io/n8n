import type { SourceControlledFile } from '@n8n/api-types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import type { StatusExportableCredential } from './exportable-credential';
import type { ExportableFolder } from './exportable-folders';
import type { ExportableProjectWithFileName } from './exportable-project';
import type { ExportableTagEntity, ExportableWorkflowTagMapping } from './exportable-tags';
import type { ExportableVariable } from './exportable-variable';
import type { SourceControlWorkflowVersionId } from './source-control-workflow-version-id';

export interface SourceControlGetStatusVerboseResult {
	wfRemoteVersionIds: SourceControlWorkflowVersionId[];
	wfLocalVersionIds: SourceControlWorkflowVersionId[];
	wfMissingInLocal: SourceControlWorkflowVersionId[];
	wfMissingInRemote: SourceControlWorkflowVersionId[];
	wfModifiedInEither: SourceControlWorkflowVersionId[];
	credMissingInLocal: StatusExportableCredential[];
	credMissingInRemote: StatusExportableCredential[];
	credModifiedInEither: StatusExportableCredential[];
	varMissingInLocal: ExportableVariable[];
	varMissingInRemote: ExportableVariable[];
	varModifiedInEither: ExportableVariable[];
	tagsMissingInLocal: ExportableTagEntity[];
	tagsMissingInRemote: ExportableTagEntity[];
	tagsModifiedInEither: ExportableTagEntity[];
	mappingsMissingInLocal: ExportableWorkflowTagMapping[];
	mappingsMissingInRemote: ExportableWorkflowTagMapping[];
	foldersMissingInLocal: ExportableFolder[];
	foldersMissingInRemote: ExportableFolder[];
	foldersModifiedInEither: ExportableFolder[];
	projectsRemote: ExportableProjectWithFileName[];
	projectsLocal: ExportableProjectWithFileName[];
	projectsMissingInLocal: ExportableProjectWithFileName[];
	projectsMissingInRemote: ExportableProjectWithFileName[];
	projectsModifiedInEither: ExportableProjectWithFileName[];
	sourceControlledFiles: SourceControlledFile[];
}

function booleanFromString(value: string | boolean): boolean {
	if (typeof value === 'boolean') {
		return value;
	}
	return value === 'true';
}

export class SourceControlGetStatus {
	@IsString()
	@IsOptional()
	direction: 'push' | 'pull';

	@IsBoolean()
	@IsOptional()
	preferLocalVersion: boolean;

	@IsBoolean()
	@IsOptional()
	verbose: boolean;

	constructor(values: {
		direction: 'push' | 'pull';
		preferLocalVersion: string | boolean;
		verbose: string | boolean;
	}) {
		this.direction = values.direction || 'push';
		this.preferLocalVersion = booleanFromString(values.preferLocalVersion) || true;
		this.verbose = booleanFromString(values.verbose) || false;
	}
}
