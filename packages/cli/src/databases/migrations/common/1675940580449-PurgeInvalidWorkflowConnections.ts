import { UserError } from 'n8n-workflow';

import { WorkflowEntity } from '@/databases/entities/workflow-entity';
import type { IrreversibleMigration, MigrationContext } from '@/databases/types';

export class PurgeInvalidWorkflowConnections1675940580449 implements IrreversibleMigration {
	async up({ queryRunner }: MigrationContext) {
		const workflowCount = await queryRunner.manager.count(WorkflowEntity);

		if (workflowCount > 0) {
			throw new UserError(
				'Migration "PurgeInvalidWorkflowConnections1675940580449" is no longer supported. Please upgrade to n8n@1.0.0 first.',
			);
		}
	}
}
