import type { IExecutionResponse } from '@n8n/db';
import { ExecutionMetadataRepository, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ExecutionMetadataService } from '@/services/execution-metadata.service';

/** Execution metadata key of the `wfrt` execution id of a trigger run. */
export const WFRT_ID_KEY = 'compiledEngineExecutionId';

/** Execution metadata key of the effect number that a waiting execution waits on. */
export const EFFECT_SEQ_KEY = 'compiledEngineEffectSeq';

/** How many in-progress executions the startup reconcile reads. */
const RECONCILE_BATCH = 1000;

/**
 * The execution rows that the compiled engine reads and writes besides the
 * lifecycle hooks: the mapping to `wfrt` ids, rows to adopt after a restart,
 * and rows to mark as crashed.
 */
@Service()
export class CompiledExecutionStore {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly executionMetadataRepository: ExecutionMetadataRepository,
		private readonly executionMetadataService: ExecutionMetadataService,
		private readonly executionCrashService: ExecutionCrashService,
	) {}

	async saveMapping(executionId: string, values: Record<string, string>) {
		await this.executionMetadataService.save(executionId, values);
	}

	/** The n8n execution id of a `wfrt` id. A manual run uses the n8n id in `wfrt` too. */
	async findExecutionId(wfrtId: string): Promise<string | undefined> {
		if (/^\d+$/.test(wfrtId)) return wfrtId;
		const row = await this.executionMetadataRepository.findOneBy({
			key: WFRT_ID_KEY,
			value: wfrtId,
		});
		return row?.executionId;
	}

	async readMapping(executionId: string): Promise<{ wfrtId: string; effectSeq?: string }> {
		const rows = await this.executionMetadataRepository.findBy({ executionId });
		const value = (key: string) => rows.find((r) => r.key === key)?.value;
		return { wfrtId: value(WFRT_ID_KEY) ?? executionId, effectSeq: value(EFFECT_SEQ_KEY) };
	}

	async findExecution(executionId: string): Promise<IExecutionResponse | undefined> {
		return await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
	}

	async findInProgressIds(): Promise<string[]> {
		return await this.executionRepository.getInProgressExecutionIds(RECONCILE_BATCH);
	}

	async markAsCrashed(executionIds: string[]) {
		if (executionIds.length === 0) return;
		await this.executionCrashService.markAsCrashed(executionIds, 'startup-recovery');
	}
}
