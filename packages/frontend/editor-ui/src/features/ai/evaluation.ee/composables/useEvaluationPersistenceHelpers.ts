import { useI18n } from '@n8n/i18n';
import { getParentNodes, mapConnectionsByDestination } from 'n8n-workflow';
import type { EvaluationConfigDto, UpsertEvaluationConfigDto } from '@n8n/api-types';

import { useToast } from '@/app/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	addDataTableColumnApi,
	createDataTableApi,
	deleteDataTableApi,
	deleteDataTableColumnApi,
	deleteDataTableRowsApi,
	fetchDataTablesApi,
	updateDataTableRowsApi,
} from '@/features/core/dataTable/dataTable.api';
import type {
	DataTableColumnCreatePayload,
	DataTableRow,
} from '@/features/core/dataTable/dataTable.types';
import {
	createEvaluationConfig,
	deleteEvaluationConfig,
	listEvaluationConfigs,
	updateEvaluationConfig,
} from '../evaluation.api';
import { useEvaluationsWizardSidepanelStore } from '../wizardSidepanel.store';

// A single data-table row change, tracked so a failed persist can undo it.
export type RowMutation =
	| { kind: 'insert'; tableId: string; rowId?: number }
	| { kind: 'update'; tableId: string; rowId: number; priorData: DataTableRow };

// Everything a persist may have mutated, captured for rollback on failure.
export type RollbackState = {
	createdTableId?: string;
	// Columns added to a pre-existing table (id + table). Dropped on rollback so a
	// failed save doesn't permanently widen the table's schema. Irrelevant when
	// `createdTableId` is set — deleting the table already removes them.
	addedColumns?: { tableId: string; columnIds: string[] };
	rowMutation?: RowMutation;
	createdConfigId?: string;
	priorConfigSnapshot?: { id: string; payload: UpsertEvaluationConfigDto };
};

export type EnsureConfigResult =
	| { created: true; id: string }
	| { created: false; id: string; priorPayload: UpsertEvaluationConfigDto };

export type EnsureDataTableResult = {
	id: string;
	created: boolean;
	// Ids of columns added to a pre-existing table this call (empty when created).
	addedColumnIds: string[];
};

export type SliceResolution =
	| { ok: true; upstreamNodeName: string; startNodeName: string; endNodeName: string }
	| { ok: false; reason: string };

/**
 * Data-table + evaluation-config persistence primitives shared by the evaluations
 * Tests panel (`useTestCasePersistence`) and the (soon-to-be-sunset) wizard
 * (`useWizardPersistence`). Keeping one copy stops config/rollback behaviour from
 * drifting between the two surfaces.
 */
export function useEvaluationPersistenceHelpers() {
	const wizardStore = useEvaluationsWizardSidepanelStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const rootStore = useRootStore();
	const toast = useToast();
	const locale = useI18n();

	/**
	 * Create the config if none with `dto.name` exists, otherwise update it —
	 * returning the prior payload so an update can be rolled back.
	 */
	async function ensureConfig(
		workflowId: string,
		dto: UpsertEvaluationConfigDto,
	): Promise<EnsureConfigResult> {
		const configs = await listEvaluationConfigs(rootStore.restApiContext, workflowId);
		const existing = configs.find((c) => c.name === dto.name);
		if (!existing) {
			const created = await createEvaluationConfig(rootStore.restApiContext, workflowId, dto);
			return { created: true, id: created.id };
		}
		const priorPayload = toUpsertPayload(existing);
		const updated = await updateEvaluationConfig(
			rootStore.restApiContext,
			workflowId,
			existing.id,
			dto,
		);
		return { created: false, id: updated.id, priorPayload };
	}

	function toUpsertPayload(config: EvaluationConfigDto): UpsertEvaluationConfigDto {
		const base = {
			name: config.name,
			startNodeName: config.startNodeName,
			endNodeName: config.endNodeName,
			metrics: config.metrics,
		};
		if (config.datasetSource === 'data_table') {
			return { ...base, datasetSource: 'data_table', datasetRef: config.datasetRef };
		}
		return { ...base, datasetSource: 'google_sheets', datasetRef: config.datasetRef };
	}

	/**
	 * Find the data table named `baseName` (adding any missing columns) or create
	 * it. `created` tells the caller whether a rollback should delete the table.
	 */
	async function ensureDataTable(
		baseName: string,
		projectId: string,
		required: DataTableColumnCreatePayload[],
	): Promise<EnsureDataTableResult> {
		const PAGE = 100;
		const matches: Array<{ id: string; columns: Array<{ name: string }>; name: string }> = [];
		let skip = 0;
		const MAX_ITERATIONS = 50;
		for (let i = 0; i < MAX_ITERATIONS; i++) {
			const list = await fetchDataTablesApi(
				rootStore.restApiContext,
				projectId,
				{ skip, take: PAGE },
				{ name: baseName, projectId },
			);
			for (const table of list.data) matches.push(table);
			if (list.data.length < PAGE || skip + PAGE >= list.count) break;
			skip += PAGE;
		}

		const existing = matches.find((t) => t.name === baseName);
		if (existing) {
			const have = new Set(existing.columns.map((c) => c.name));
			const missing = required.filter((c) => !have.has(c.name));
			const addedColumnIds: string[] = [];
			for (const column of missing) {
				const added = await addDataTableColumnApi(
					rootStore.restApiContext,
					existing.id,
					projectId,
					column,
				);
				addedColumnIds.push(added.id);
			}
			return { id: existing.id, created: false, addedColumnIds };
		}

		const created = await createDataTableApi(
			rootStore.restApiContext,
			baseName,
			projectId,
			required,
		);
		return { id: created.id, created: true, addedColumnIds: [] };
	}

	/**
	 * Best-effort undo of a partially-applied persist. Each step is guarded so a
	 * later failure can't mask an earlier one; failures are logged, not thrown.
	 */
	async function rollback(
		projectId: string,
		workflowId: string,
		state: RollbackState,
	): Promise<void> {
		const logRollbackFailure = (step: string, error: unknown) => {
			console.error(`[evaluations] rollback ${step} failed`, error);
		};

		if (state.createdConfigId) {
			try {
				await deleteEvaluationConfig(rootStore.restApiContext, workflowId, state.createdConfigId);
			} catch (error) {
				logRollbackFailure('delete config', error);
			}
		} else if (state.priorConfigSnapshot) {
			try {
				await updateEvaluationConfig(
					rootStore.restApiContext,
					workflowId,
					state.priorConfigSnapshot.id,
					state.priorConfigSnapshot.payload,
				);
			} catch (error) {
				logRollbackFailure('restore prior config', error);
			}
		}

		let tableDeleted = false;
		if (state.createdTableId) {
			try {
				await deleteDataTableApi(rootStore.restApiContext, state.createdTableId, projectId);
				tableDeleted = true;
			} catch (error) {
				logRollbackFailure('delete data table', error);
			}
		}
		if (!tableDeleted && state.rowMutation) {
			const mutation = state.rowMutation;
			if (mutation.kind === 'insert' && mutation.rowId !== undefined) {
				try {
					await deleteDataTableRowsApi(
						rootStore.restApiContext,
						mutation.tableId,
						[mutation.rowId],
						projectId,
					);
				} catch (error) {
					logRollbackFailure('delete data table row', error);
				}
			} else if (mutation.kind === 'update') {
				try {
					await updateDataTableRowsApi(
						rootStore.restApiContext,
						mutation.tableId,
						mutation.rowId,
						mutation.priorData,
						projectId,
					);
				} catch (error) {
					logRollbackFailure('restore prior data table row', error);
				}
			}
		}
		// Drop any columns this save added to a pre-existing table so a failure
		// doesn't leave the schema permanently widened. Skipped when the whole
		// table was deleted above (those columns went with it).
		if (!tableDeleted && state.addedColumns) {
			for (const columnId of state.addedColumns.columnIds) {
				try {
					await deleteDataTableColumnApi(
						rootStore.restApiContext,
						state.addedColumns.tableId,
						projectId,
						columnId,
					);
				} catch (error) {
					logRollbackFailure('delete added data table column', error);
				}
			}
		}
	}

	/**
	 * Resolve the upstream/start/end node names for the current evaluation slice.
	 * In single-AI-node mode it traces the chosen AI node back to a trigger; in
	 * slice mode it uses the explicit start/end node names.
	 */
	function resolveSlice(): SliceResolution {
		const wf = workflowDocumentStore.value;
		const connections = wf?.connectionsBySourceNode ?? {};
		const allNodes = wf?.allNodes ?? [];
		const byDest = mapConnectionsByDestination(connections);

		if (!wizardStore.isSliceMode) {
			const aiNode = wizardStore.aiNodeName;
			if (!aiNode) return { ok: false, reason: 'Pick an AI node to evaluate' };

			// A workflow can have several triggers; don't assume the first one is
			// the AI node's upstream. Match the chain against any trigger so a
			// multi-trigger graph still resolves.
			const triggerNames = new Set(
				allNodes.filter((n) => nodeTypesStore.isTriggerNode(n.type)).map((n) => n.name),
			);
			if (triggerNames.size === 0) return { ok: false, reason: 'Workflow has no trigger' };

			const ancestors = getParentNodes(byDest, aiNode, 'main');
			const chain = [aiNode, ...ancestors];
			let startNodeName: string | undefined;
			let upstreamNodeName: string | undefined;
			for (const candidate of chain) {
				if (triggerNames.has(candidate)) continue;
				const parents = getParentNodes(byDest, candidate, 'main', 1);
				if (parents.length === 1 && triggerNames.has(parents[0])) {
					startNodeName = candidate;
					upstreamNodeName = parents[0];
					break;
				}
			}
			if (!startNodeName || !upstreamNodeName) {
				return {
					ok: false,
					reason: `Couldn't trace AI node "${aiNode}" back to a trigger`,
				};
			}
			return {
				ok: true,
				upstreamNodeName,
				startNodeName,
				endNodeName: aiNode,
			};
		}

		const start = wizardStore.startNodeName;
		const end = wizardStore.endNodeName;
		if (!start || !end) return { ok: false, reason: 'Pick a start and end node for the slice' };

		const parents = getParentNodes(byDest, start, 'main', 1);
		if (parents.length !== 1) {
			return {
				ok: false,
				reason: `Start node "${start}" must have exactly one upstream node (found ${parents.length})`,
			};
		}
		return { ok: true, upstreamNodeName: parents[0], startNodeName: start, endNodeName: end };
	}

	function showPersistError(error: unknown) {
		toast.showError(error, locale.baseText('evaluations.wizardSidepanel.step2.persistError'));
	}

	return { ensureConfig, ensureDataTable, rollback, resolveSlice, showPersistError };
}

// ---------------------------------------------------------------------------
// Module-level pure helpers (no closure dependencies)
// ---------------------------------------------------------------------------

export function numericRowId(id: unknown): number | undefined {
	if (typeof id === 'number') return id;
	if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id);
	return undefined;
}

// Build the string-typed columns a data table needs from a list of names,
// deduped in order (an input and an expected column can share a name). Callers
// decide which names to include (e.g. the per-case name column).
export function buildRequiredColumns(columnNames: string[]): DataTableColumnCreatePayload[] {
	const seen = new Set<string>();
	const columns: DataTableColumnCreatePayload[] = [];
	for (const name of columnNames) {
		if (seen.has(name)) continue;
		seen.add(name);
		columns.push({ name, type: 'string' });
	}
	return columns;
}

// Bookkeeping columns (id/createdAt/updatedAt) are rejected by the update API.
export function stripBookkeeping(row: DataTableRow): DataTableRow {
	const out: DataTableRow = {};
	for (const [k, v] of Object.entries(row)) {
		if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue;
		out[k] = v;
	}
	return out;
}
