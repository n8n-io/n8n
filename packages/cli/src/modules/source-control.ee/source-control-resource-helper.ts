import type { SourceControlledFile } from '@n8n/api-types';

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
