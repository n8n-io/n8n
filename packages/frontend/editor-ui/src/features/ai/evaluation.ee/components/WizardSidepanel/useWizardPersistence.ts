import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { getParentNodes, mapConnectionsByDestination } from 'n8n-workflow';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useToast } from '@/app/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	addDataTableColumnApi,
	createDataTableApi,
	deleteDataTableApi,
	deleteDataTableRowsApi,
	fetchDataTablesApi,
	getDataTableRowsApi,
	insertDataTableRowApi,
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
} from '../../evaluation.api';
import type { EvaluationConfigDto, UpsertEvaluationConfigDto } from '@n8n/api-types';
import { useEvaluationStore } from '../../evaluation.store';
import { useSliceInputs } from '../../composables/useSliceInputs';
import { getExpectedFieldsForMetrics } from '../../evaluation.constants';
import { buildEvaluationConfigDto } from '../../composables/buildEvaluationConfigDto';

// Step 2 → step 3 transition. Persists everything needed for the test run:
// the Data table (dataset), its first row, and the EvaluationConfig that the
// backend runner compiles into a Set Metrics workflow. Then dispatches the
// run. Returns false on any failure so the caller stays on step 2.
export function useWizardPersistence() {
	const wizardStore = useEvaluationsWizardSidepanelStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const rootStore = useRootStore();
	const toast = useToast();
	const locale = useI18n();
	const sliceInputs = useSliceInputs();
	const evaluationStore = useEvaluationStore();

	const isPersisting = ref(false);

	async function persistAndDispatch(): Promise<boolean> {
		if (isPersisting.value) return false;

		// --- Phase 1: validate everything we can without side effects. ---
		const wf = workflowDocumentStore.value;
		const projectId = wf?.homeProject?.id;
		const workflowId = wf?.workflowId;
		if (!projectId || !workflowId) {
			showPersistError(new Error('Missing project or workflow context'));
			return false;
		}

		const slice = resolveSlice();
		if (!slice.ok) {
			showPersistError(new Error(slice.reason));
			return false;
		}

		const inputNames = sliceInputs.value.fieldNames;
		const expectedFields = getExpectedFieldsForMetrics(wizardStore.selectedMetricKeys);
		const requiredColumns: DataTableColumnCreatePayload[] = [
			...inputNames.map((name) => ({ name, type: 'string' as const })),
			...expectedFields.map((f) => ({ name: f.name, type: 'string' as const })),
		];

		// Dry-run the DTO build with a placeholder id so missing-judge or other
		// shape errors are caught BEFORE any API calls — keeps the failure case
		// side-effect-free.
		const dryRun = buildEvaluationConfigDto({
			workflowName: wf.name ?? 'workflow',
			upstreamNodeName: slice.upstreamNodeName,
			startNodeName: slice.startNodeName,
			endNodeName: slice.endNodeName,
			inputFieldNames: inputNames,
			selectedMetrics: wizardStore.selectedMetricKeys,
			judgeSelectionByMetric: wizardStore.judgeSelectionByMetric,
			customScorers: wizardStore.customScorers,
			dataTableId: '__placeholder__',
		});
		if (!dryRun.ok) {
			showPersistError(new Error(dryRun.reason));
			return false;
		}

		// --- Phase 2: side effects, tracked for rollback on failure. ---
		const tableName = `Evaluation: ${wf.name ?? 'workflow'}`.slice(0, 120);
		const configName = tableName;
		let createdTableId: string | undefined;
		// Row mutation: either an insert (rollback = delete) or an update
		// (rollback = restore prior data). Mutually exclusive — one wizard
		// run touches exactly one row in exactly one of these two ways.
		let rowMutation:
			| { kind: 'insert'; tableId: string; rowId?: number }
			| { kind: 'update'; tableId: string; rowId: number; priorData: DataTableRow }
			| undefined;
		let createdConfigId: string | undefined;
		let priorConfigSnapshot: { id: string; payload: UpsertEvaluationConfigDto } | undefined;

		isPersisting.value = true;
		let configId: string | undefined;
		try {
			const ensured = await ensureDataTable(tableName, projectId, requiredColumns);
			if (ensured.created) createdTableId = ensured.id;

			const row: DataTableRow = {};
			for (const name of inputNames) row[name] = wizardStore.inputs[name] ?? '';
			for (const f of expectedFields) row[f.name] = wizardStore.expectedValues[f.name] ?? '';

			// Reuse the first row when the table already has data — running the
			// wizard twice shouldn't accumulate rows that never get cleaned up.
			// New tables (created above) skip the fetch since they're guaranteed
			// empty.
			const existingFirst = ensured.created
				? undefined
				: (await getDataTableRowsApi(rootStore.restApiContext, ensured.id, projectId, { take: 1 }))
						.data[0];
			const existingRowId = numericRowId(existingFirst?.id);

			if (existingFirst && existingRowId !== undefined) {
				// Snapshot the prior user-column values so rollback restores them
				// exactly. We strip bookkeeping (id/createdAt/updatedAt) — the
				// update API rejects writes to those columns.
				const priorData: DataTableRow = stripBookkeeping(existingFirst);
				rowMutation = { kind: 'update', tableId: ensured.id, rowId: existingRowId, priorData };
				await updateDataTableRowsApi(
					rootStore.restApiContext,
					ensured.id,
					existingRowId,
					row,
					projectId,
				);
			} else {
				const insertedRows = await insertDataTableRowApi(
					rootStore.restApiContext,
					ensured.id,
					row,
					projectId,
				);
				rowMutation = {
					kind: 'insert',
					tableId: ensured.id,
					rowId: numericRowId(insertedRows[0]?.id),
				};
			}

			const built = buildEvaluationConfigDto({
				workflowName: wf.name ?? 'workflow',
				upstreamNodeName: slice.upstreamNodeName,
				startNodeName: slice.startNodeName,
				endNodeName: slice.endNodeName,
				inputFieldNames: inputNames,
				selectedMetrics: wizardStore.selectedMetricKeys,
				judgeSelectionByMetric: wizardStore.judgeSelectionByMetric,
				customScorers: wizardStore.customScorers,
				dataTableId: ensured.id,
			});
			if (!built.ok) {
				// Shouldn't happen — dry run succeeded — but treat as a real error.
				throw new Error(built.reason);
			}

			// Force the config name we want — the DB has a (workflowId, name)
			// unique constraint, and ensureConfig keys off this name for reuse.
			const desiredDto = { ...built.dto, name: configName };
			const ensuredConfig = await ensureConfig(workflowId, desiredDto);
			if (ensuredConfig.created) {
				createdConfigId = ensuredConfig.id;
			} else {
				priorConfigSnapshot = { id: ensuredConfig.id, payload: ensuredConfig.priorPayload };
			}
			configId = ensuredConfig.id;
		} catch (error) {
			// Persistence failed (table create / row insert / config write).
			// Roll back so we don't leave the user with half-saved state.
			await rollback(projectId, workflowId, {
				createdTableId,
				rowMutation,
				createdConfigId,
				priorConfigSnapshot,
			});
			showPersistError(error);
			isPersisting.value = false;
			return false;
		}

		// Persistence done — the user's data table + row + EvaluationConfig
		// are intact, and the wizard can be safely re-run to retry from this
		// point. We deliberately do NOT rollback below: failing to dispatch
		// the test run is recoverable (retry) and rolling back would silently
		// erase the user's config edits.
		try {
			// Clear the previous activeRunId early so step 3 doesn't briefly
			// show stale data from a prior wizard session while we're
			// awaiting the dispatch round-trip.
			wizardStore.setActiveRunId(null);
			const dispatched = await evaluationStore.startTestRun(workflowId, {
				evaluationConfigId: configId,
				compileFromConfig: true,
			});
			wizardStore.setActiveRunId(dispatched?.testRunId ?? null);
			await evaluationStore.fetchTestRuns(workflowId);
			return true;
		} catch (error) {
			toast.showError(error, locale.baseText('evaluations.wizardSidepanel.step2.dispatchError'));
			return false;
		} finally {
			isPersisting.value = false;
		}
	}

	type EnsureConfigResult =
		| { created: true; id: string }
		| { created: false; id: string; priorPayload: UpsertEvaluationConfigDto };

	// Reuse an existing EvaluationConfig with the same (workflowId, name) via
	// PUT — sidesteps the unique constraint. Snapshots the prior shape so
	// rollback can restore it if a subsequent step fails.
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
		// Strip the read-only fields (id/workflowId/status/invalidReason) so
		// the result is a valid UpsertEvaluationConfigDto we can replay.
		// `datasetSource` and `datasetRef` are part of a discriminated union —
		// split branches per source keep the discriminator narrowed for TS.
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

	type EnsureDataTableResult = { id: string; created: boolean };

	// Reuse an existing data table with the same name and add any columns it
	// is missing — the wizard's required column set can grow over time as the
	// user toggles metrics on/off, and creating a fresh table on every shape
	// change would orphan past dataset rows. Columns that exist on the table
	// but aren't required this run are left alone (they may hold values from
	// previous wizard sessions or manual edits).
	async function ensureDataTable(
		baseName: string,
		projectId: string,
		required: DataTableColumnCreatePayload[],
	): Promise<EnsureDataTableResult> {
		// Walk the project's data tables until we either find a match or
		// exhaust the list — the default page size can hide a name match if
		// the project has many tables. A page size of 100 caps DB load while
		// the name filter usually returns a tiny result set anyway.
		const PAGE = 100;
		const matches: Array<{ id: string; columns: Array<{ name: string }>; name: string }> = [];
		let skip = 0;
		// Bail at a sane upper bound — names should almost never produce
		// dozens of hits and we'd rather hit `create` and 409 once than
		// loop forever on a misbehaving backend.
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
			for (const column of missing) {
				await addDataTableColumnApi(rootStore.restApiContext, existing.id, projectId, column);
			}
			return { id: existing.id, created: false };
		}

		const created = await createDataTableApi(
			rootStore.restApiContext,
			baseName,
			projectId,
			required,
		);
		return { id: created.id, created: true };
	}

	// Best-effort cleanup. For each side effect we performed during persist,
	// undo it in reverse order:
	//   - newly created config       → DELETE
	//   - updated existing config    → PUT back the snapshot we took before
	//   - newly created data table   → DELETE (covers any rows in it)
	//   - row inserted into a reused → DELETE just that row
	//   - row updated in a reused    → PATCH back the prior data we snapshotted
	// Failures here are swallowed so they don't shadow the original error.
	async function rollback(
		projectId: string,
		workflowId: string,
		state: {
			createdTableId?: string;
			rowMutation?:
				| { kind: 'insert'; tableId: string; rowId?: number }
				| { kind: 'update'; tableId: string; rowId: number; priorData: DataTableRow };
			createdConfigId?: string;
			priorConfigSnapshot?: { id: string; payload: UpsertEvaluationConfigDto };
		},
	): Promise<void> {
		const logRollbackFailure = (step: string, error: unknown) => {
			// console.error so failures are visible in DevTools without
			// shadowing the original error toast the user is already seeing.
			// eslint-disable-next-line no-console
			console.error(`[evaluations wizard] rollback ${step} failed`, error);
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
		// If we created the table and successfully deleted it, all rows are
		// already gone. Otherwise the row mutation we made on a reused table
		// needs to be undone: inserts get deleted, updates get restored.
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
	}

	type SliceResolution =
		| { ok: true; upstreamNodeName: string; startNodeName: string; endNodeName: string }
		| { ok: false; reason: string };

	// Single-AI-node mode: the user picked one AI node; we trace its main-input
	// chain back to a trigger and use that as the upstream, the AI node's first
	// non-trigger ancestor as the slice start, and the AI node itself as the
	// slice end. (The compiler rewrites `$('<trigger>')` references to the
	// injected `__eval_trigger` at run time.)
	//
	// Slice mode: the user picked an explicit Start + End. We look up the
	// upstream of Start the same way and use it for the rewrite.
	function resolveSlice(): SliceResolution {
		const wf = workflowDocumentStore.value;
		const connections = wf?.connectionsBySourceNode ?? {};
		const allNodes = wf?.allNodes ?? [];
		const byDest = mapConnectionsByDestination(connections);

		if (!wizardStore.isSliceMode) {
			const aiNode = wizardStore.aiNodeName;
			if (!aiNode) return { ok: false, reason: 'Pick an AI node to evaluate' };

			const trigger = allNodes.find((n) => nodeTypesStore.isTriggerNode(n.type));
			if (!trigger) return { ok: false, reason: 'Workflow has no trigger' };

			// Walk parents from the AI node back to the first non-trigger node
			// reachable from the trigger. That node becomes the slice start and
			// its single parent is the upstream we rewrite.
			const ancestors = getParentNodes(byDest, aiNode, 'main');
			// Most → least specific: AI node first, then its parents, then …
			// `getParentNodes` returns them in topological-ish order; reverse so
			// the AI node's *direct* parent is checked first.
			const chain = [aiNode, ...ancestors];
			let startNodeName: string | undefined;
			for (const candidate of chain) {
				if (candidate === trigger.name) continue;
				const parents = getParentNodes(byDest, candidate, 'main', 1);
				if (parents.length === 1 && parents[0] === trigger.name) {
					startNodeName = candidate;
					break;
				}
			}
			if (!startNodeName) {
				return {
					ok: false,
					reason: `Couldn't trace AI node "${aiNode}" back to the trigger`,
				};
			}
			return {
				ok: true,
				upstreamNodeName: trigger.name,
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

	return { persistAndDispatch, isPersisting };
}

// Data table row ids are numeric server-side, but some endpoints stringify
// them. Normalize at the boundary so the rest of the code only deals with
// numbers (or `undefined` if the id is missing / malformed).
function numericRowId(id: unknown): number | undefined {
	if (typeof id === 'number') return id;
	if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id);
	return undefined;
}

// Strip data-table bookkeeping columns from a fetched row before sending it
// back via PATCH — the update endpoint rejects writes to `id`/`createdAt`/
// `updatedAt`. The remaining keys are exactly the user columns.
function stripBookkeeping(row: DataTableRow): DataTableRow {
	const out: DataTableRow = {};
	for (const [k, v] of Object.entries(row)) {
		if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue;
		out[k] = v;
	}
	return out;
}
