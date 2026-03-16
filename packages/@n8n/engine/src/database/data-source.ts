import { DataSource } from '@n8n/typeorm';

import {
	WorkflowEntity,
	WebhookEntity,
	WorkflowExecution,
	WorkflowStepExecution,
} from './entities';

export function createDataSource(url?: string): DataSource {
	return new DataSource({
		type: 'postgres',
		url: url ?? process.env.DATABASE_URL ?? 'postgres://engine:engine@localhost:5433/engine',
		entities: [WorkflowEntity, WebhookEntity, WorkflowExecution, WorkflowStepExecution],
		synchronize: true, // Auto-create tables for PoC
		logging: process.env.DB_LOGGING === 'true',
	});
}
