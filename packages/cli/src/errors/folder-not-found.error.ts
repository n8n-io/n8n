import { OperationalError } from '@n8n/errors';

export class FolderNotFoundError extends OperationalError {
	constructor(folderId: string) {
		super(`Could not find the folder: ${folderId}`, {
			level: 'warning',
		});
	}
}
