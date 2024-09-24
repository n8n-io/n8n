import { ApplicationError } from 'n8n-workflow';

export class MalformedManifestError extends ApplicationError {
	constructor(manifestFilePath: string, error: Error) {
		super(`Failed to parse manifest file at: ${manifestFilePath}`, {
			level: 'warning',
			cause: error,
		});
	}
}
