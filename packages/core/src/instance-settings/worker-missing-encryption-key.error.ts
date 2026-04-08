import { UserError } from 'n8n-workflow';

export class WorkerMissingEncryptionKey extends UserError {
	constructor() {
		super(
			[
				'Failed to start worker because of missing encryption key.',
				'Please set the `N8N_ENCRYPTION_KEY` env var when starting the worker.',
				'See: https://docs.n8n.io/hosting/configuration/configuration-examples/encryption-key/',
			].join(' '),
		);
	}
}
