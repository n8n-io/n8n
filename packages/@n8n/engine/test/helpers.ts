import { DataSource } from '@n8n/typeorm';

import {
	WorkflowEntity,
	WebhookEntity,
	WorkflowExecution,
	WorkflowStepExecution,
} from '../src/database/entities';

export async function createTestDataSource(dropSchema = true): Promise<DataSource> {
	const ds = new DataSource({
		type: 'postgres',
		url: process.env.DATABASE_URL ?? 'postgres://engine:engine@localhost:5433/engine_test',
		entities: [WorkflowEntity, WebhookEntity, WorkflowExecution, WorkflowStepExecution],
		synchronize: true,
		dropSchema,
		logging: false,
	});
	await ds.initialize();
	return ds;
}

export async function cleanDatabase(ds: DataSource): Promise<void> {
	// Truncate all tables in one statement — CASCADE handles FK dependencies
	await ds.query(
		'TRUNCATE TABLE workflow_step_execution, workflow_execution, webhook, workflow CASCADE',
	);
}
