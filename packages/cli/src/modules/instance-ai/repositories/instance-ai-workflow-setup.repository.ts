import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { z } from 'zod/v4';

import { InstanceAiResource } from '../entities/instance-ai-resource.entity';

const stateSchema = z.object({
	snapshot: TELEMETRY_EVENT.INSTANCE_AI.WORKFLOW_SETUP_STATE_OBSERVED.properties,
	alreadyConnectedIds: z.array(z.string()),
});
export type WorkflowSetupTelemetryState = z.infer<typeof stateSchema>;

/** Workflow-scoped observation memory. It contains metadata and never enters LLM context. */
@Service()
export class InstanceAiWorkflowSetupRepository extends BaseRepository<InstanceAiResource> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiResource, dataSource.manager, transactionRunner);
	}

	private key(workflowId: string) {
		return `instance-ai:workflow-setup:${workflowId}`;
	}

	async read(workflowId: string): Promise<WorkflowSetupTelemetryState | undefined> {
		const row = await this.findOneBy({ id: this.key(workflowId) });
		const parsed = stateSchema.safeParse(row?.metadata);
		return parsed.success ? parsed.data : undefined;
	}

	async updateObservation(
		workflowId: string,
		update: (
			previous: WorkflowSetupTelemetryState | undefined,
		) => Promise<WorkflowSetupTelemetryState | undefined>,
	): Promise<void> {
		await this.runInTransaction({}, async (manager) => {
			const id = this.key(workflowId);
			await manager
				.createQueryBuilder()
				.insert()
				.into(InstanceAiResource)
				.values({ id, metadata: null, workingMemory: null })
				.orIgnore()
				.execute();
			const row = await manager.findOneOrFail(InstanceAiResource, {
				where: { id },
				lock:
					manager.connection.options.type === 'postgres'
						? { mode: 'pessimistic_write' }
						: undefined,
			});
			const parsed = stateSchema.safeParse(row.metadata);
			const next = await update(parsed.success ? parsed.data : undefined);
			if (next) await manager.update(InstanceAiResource, { id }, { metadata: next });
		});
	}

	async removeForWorkflow(workflowId: string) {
		await this.delete({ id: this.key(workflowId) });
	}
}
