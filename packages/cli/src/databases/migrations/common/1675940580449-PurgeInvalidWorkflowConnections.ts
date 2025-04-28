import { UserError } from 'n8n-workflow';

import type { IrreversibleMigration } from '@/databases/types';

export class PurgeInvalidWorkflowConnections1675940580449 implements IrreversibleMigration {
	async up() {
		throw new UserError(
			'Migration "PurgeInvalidWorkflowConnections1675940580449" is no longer supported. Please upgrade to n8n@1.0.0 first.',
		);
	}
}
