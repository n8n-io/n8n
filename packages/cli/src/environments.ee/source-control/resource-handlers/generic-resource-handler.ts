import type { SourceControlledFile } from '@n8n/api-types';
import { Service } from '@n8n/di';

@Service()
export class GenericResourceHandler {
	filterByType(
		files: SourceControlledFile[],
		resourceType: SourceControlledFile['type'],
	): SourceControlledFile[] {
		return files.filter((file) => file.type === resourceType);
	}

	filterByStatus(
		files: SourceControlledFile[],
		resourceType: SourceControlledFile['type'],
		status: SourceControlledFile['status'],
	): SourceControlledFile[] {
		return this.filterByType(files, resourceType).filter((file) => file.status === status);
	}

	filterByStatusExcluding(
		files: SourceControlledFile[],
		resourceType: SourceControlledFile['type'],
		status: SourceControlledFile['status'],
	): SourceControlledFile[] {
		return this.filterByType(files, resourceType).filter((file) => file.status !== status);
	}

	getCreatedResources(
		files: SourceControlledFile[],
		resourceType: SourceControlledFile['type'],
	): SourceControlledFile[] {
		return this.filterByStatus(files, resourceType, 'created');
	}

	getModifiedResources(
		files: SourceControlledFile[],
		resourceType: SourceControlledFile['type'],
	): SourceControlledFile[] {
		return this.filterByStatus(files, resourceType, 'modified');
	}

	getDeletedResources(
		files: SourceControlledFile[],
		resourceType: SourceControlledFile['type'],
	): SourceControlledFile[] {
		return this.filterByStatus(files, resourceType, 'deleted');
	}

	getNonDeletedResources(
		files: SourceControlledFile[],
		resourceType: SourceControlledFile['type'],
	): SourceControlledFile[] {
		return this.filterByStatusExcluding(files, resourceType, 'deleted');
	}
}
