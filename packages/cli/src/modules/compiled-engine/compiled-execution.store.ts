import type { IExecutionResponse } from '@n8n/db';
import { ExecutionMetadataRepository, ExecutionRepository, SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ExecutionMetadataService } from '@/services/execution-metadata.service';

import type { WfrtEventCursor } from './compiled-engine.types';

/** Execution metadata key of the `wfrt` execution id of a trigger run. */
export const WFRT_ID_KEY = 'compiledEngineExecutionId';

/** Execution metadata key of the effect number that a waiting execution waits on. */
export const EFFECT_SEQ_KEY = 'compiledEngineEffectSeq';

/** How many in-progress executions the startup reconcile reads. */
const RECONCILE_BATCH = 1000;

/** The settings key of the cursor of the `wfrt` event outbox. */
export const EVENT_CURSOR_KEY = 'compiledEngine.eventCursor';

/**
 * The settings key of the nodes that run in the fallback host, because a run reached a limit
 * of `wfrt` that v1 does not have: `{ [workflowId]: nodeNames }`.
 */
export const HOST_NODES_KEY = 'compiledEngine.hostNodes';

/** Reads the stored nodes of each workflow; a value of another form is ignored. */
function readHostNodes(value: string): Record<string, string[]> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return {};
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
	const nodes: Record<string, string[]> = {};
	for (const [workflowId, names] of Object.entries(parsed)) {
		if (!Array.isArray(names)) continue;
		nodes[workflowId] = names.filter((name): name is string => typeof name === 'string');
	}
	return nodes;
}

/** Reads a stored cursor; a value that is not a seq per shard is ignored. */
function readCursor(value: string): WfrtEventCursor {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return {};
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
	const cursor: WfrtEventCursor = {};
	for (const [shard, seq] of Object.entries(parsed)) {
		if (typeof seq === 'number' && Number.isInteger(seq) && seq > 0) cursor[shard] = seq;
	}
	return cursor;
}

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
		private readonly settingsRepository: SettingsRepository,
	) {}

	/**
	 * The last fully handled seq of each shard of the `wfrt` event outbox.
	 * `wfrt` gets it as `after=` when n8n connects again.
	 */
	async readEventCursor(): Promise<WfrtEventCursor> {
		const row = await this.settingsRepository.findByKey(EVENT_CURSOR_KEY);
		return row ? readCursor(row.value) : {};
	}

	/** Stores the cursor of the event outbox; `wfrt` may then delete those events. */
	async saveEventCursor(cursor: WfrtEventCursor) {
		await this.settingsRepository.upsertByKey(EVENT_CURSOR_KEY, JSON.stringify(cursor), false, {});
	}

	/** The nodes of each workflow that run in the fallback host for a limit of `wfrt`. */
	async readHostNodes(): Promise<Record<string, string[]>> {
		const row = await this.settingsRepository.findByKey(HOST_NODES_KEY);
		return row ? readHostNodes(row.value) : {};
	}

	/** Stores the nodes that run in the fallback host, so they stay there after a restart. */
	async saveHostNodes(nodes: Record<string, string[]>) {
		await this.settingsRepository.upsertByKey(HOST_NODES_KEY, JSON.stringify(nodes), false, {});
	}

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
