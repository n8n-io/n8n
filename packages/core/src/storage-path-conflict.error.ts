import { UserError } from 'n8n-workflow';

export class StoragePathError extends UserError {
	static conflict() {
		return new StoragePathError(
			'Both N8N_STORAGE_PATH and N8N_BINARY_DATA_STORAGE_PATH cannot be set to different values. N8N_BINARY_DATA_STORAGE_PATH is deprecated. Please set only N8N_STORAGE_PATH.',
		);
	}

	static mountPoint(oldPath: string, newPath: string) {
		return new StoragePathError(
			`Failed to migrate ${oldPath} to ${newPath} because ${oldPath} is a mount point. Mount the volume at ${newPath} instead, or set N8N_STORAGE_PATH=${oldPath} to keep the current path.`,
		);
	}

	static taken(oldPath: string, newPath: string) {
		return new StoragePathError(
			`Failed to migrate ${oldPath} to ${newPath} because ${newPath} already exists. Please rename ${newPath} so n8n can migrate ${oldPath} to this path.`,
		);
	}
}
