import type { BaseResource } from '@/Interface';
import type { Project } from '@/features/collaboration/projects/projects.types';

export type ProjectFile = {
	id: string;
	name: string;
	mimeType: string;
	sizeBytes: number;
	projectId: string;
	createdAt: string;
	updatedAt: string;
	project?: Project;
};

/**
 * File resource type definition.
 * This extends the ModuleResources interface to add File as a resource type.
 */
export type FileResource = BaseResource &
	ProjectFile & {
		resourceType: 'file';
	};

// Extend the ModuleResources interface to include File
declare module '@/Interface' {
	interface ModuleResources {
		file: FileResource;
	}
}

export type FileStorageQuotaStatus = 'ok' | 'warn' | 'error';

export type FileStorageLimits = {
	totalBytes: number;
	maxBytes: number;
	quotaStatus: FileStorageQuotaStatus;
};

export type FileUploadStatus = 'pending' | 'uploading' | 'conflict' | 'done' | 'error' | 'canceled';

export type FileUploadSource = 'button' | 'drop' | 'replace';

export type FileConflictResolution = 'replace' | 'keepBoth' | 'cancel';

export type FileUploadQueueItem = {
	/** Client-generated identifier for this queue entry */
	id: string;
	file: File;
	name: string;
	sizeBytes: number;
	mimeType: string;
	projectId: string;
	source: FileUploadSource;
	status: FileUploadStatus;
	/** 0-100 */
	progress: number;
	errorMessage?: string;
};
