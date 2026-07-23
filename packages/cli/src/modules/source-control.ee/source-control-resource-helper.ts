import type { SourceControlledFile } from '@n8n/api-types';

import type { SourceControlWorkflowVersionId } from './types/source-control-workflow-version-id';

export function filterByType(
	files: SourceControlledFile[],
	resourceType: SourceControlledFile['type'],
): SourceControlledFile[] {
	return files.filter((file) => file.type === resourceType);
}

function filterByStatus(
	files: SourceControlledFile[],
	resourceType: SourceControlledFile['type'],
	status: SourceControlledFile['status'],
): SourceControlledFile[] {
	return filterByType(files, resourceType).filter((file) => file.status === status);
}

function filterByStatusExcluding(
	files: SourceControlledFile[],
	resourceType: SourceControlledFile['type'],
	status: SourceControlledFile['status'],
): SourceControlledFile[] {
	return filterByType(files, resourceType).filter((file) => file.status !== status);
}

export function getDeletedResources(
	files: SourceControlledFile[],
	resourceType: SourceControlledFile['type'],
): SourceControlledFile[] {
	return filterByStatus(files, resourceType, 'deleted');
}

export function getNonDeletedResources(
	files: SourceControlledFile[],
	resourceType: SourceControlledFile['type'],
): SourceControlledFile[] {
	return filterByStatusExcluding(files, resourceType, 'deleted');
}

export function mapLocalWorkflowToSourceControlledFile(
	workflow: SourceControlWorkflowVersionId,
): SourceControlledFile {
	return {
		id: workflow.id,
		name: workflow.name ?? 'Workflow',
		type: 'workflow',
		status: 'modified',
		location: 'local',
		conflict: false,
		file: workflow.filename,
		updatedAt: workflow.updatedAt ?? new Date().toISOString(),
		owner: workflow.owner,
	};
}
