import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import { useEvaluationsWizardSidepanelStore } from '../wizardSidepanel.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import {
	deleteDataTableRowsApi,
	getDataTableRowsApi,
	insertDataTableRowApi,
	updateDataTableRowsApi,
} from '@/features/core/dataTable/dataTable.api';
import type { DataTableRow } from '@/features/core/dataTable/dataTable.types';
import { listEvaluationConfigs } from '../evaluation.api';
import type { UpsertEvaluationConfigDto } from '@n8n/api-types';
import { useEvaluationStore } from '../evaluation.store';
import { useSliceInputs } from './useSliceInputs';
import {
	getCanonicalEvaluationName,
	getExpectedFieldsForMetrics,
	TEST_CASE_NAME_COLUMN,
} from '../evaluation.constants';
import { buildEvaluationConfigDto } from './buildEvaluationConfigDto';
import {
	buildRequiredColumns,
	numericRowId,
	stripBookkeeping,
	useEvaluationPersistenceHelpers,
	type RowMutation,
} from './useEvaluationPersistenceHelpers';

// Serialize every evaluations persistence mutation across all callers — the
// per-case auto-save, the suite-config auto-save, single-case runs, run-all, and
// deletes all target the same table + config, and live in separate components.
// One module-wide queue means a run can't race, or be dropped by, an auto-save
// happening elsewhere.
let persistenceQueue: Promise<unknown> = Promise.resolve();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function useTestCasePersistence() {
	const wizardStore = useEvaluationsWizardSidepanelStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const rootStore = useRootStore();
	const toast = useToast();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const sliceInputs = useSliceInputs();
	const evaluationStore = useEvaluationStore();
	const { ensureConfig, ensureDataTable, rollback, resolveSlice, showPersistError } =
		useEvaluationPersistenceHelpers();

	const isPersisting = ref(false);
	// Count of this composable's ops queued/running, so the per-instance
	// `isPersisting` loading flag stays true until they all settle.
	let activeOps = 0;

	// Route a mutation through the shared queue: it runs after any in-flight op
	// (in this component or another) settles, rather than racing or bailing.
	async function enqueue<T>(op: () => Promise<T>): Promise<T> {
		activeOps += 1;
		isPersisting.value = true;
		// `run` and the queue reassignment happen synchronously (before the await),
		// so ops are ordered by call order. `persistenceQueue` only ever holds
		// `settled` (which never rejects), so a plain `.then(op)` always fires.
		const run = persistenceQueue.then(op);
		const settled = run.then(
			() => undefined,
			() => undefined,
		);
		persistenceQueue = settled;
		void settled.then(() => {
			activeOps -= 1;
			if (activeOps === 0) isPersisting.value = false;
		});
		return await run;
	}

	type PersistCaseResult =
		| { ok: true; configId: string; resolvedIndex: number; isNewCase: boolean }
		| { ok: false; error: unknown };

	/**
	 * Persist the currently-edited test case to the data table (INSERT when
	 * `activeRowIndex` is null, UPDATE otherwise) plus its evaluation config,
	 * without dispatching a run. Rolls back its own mutations on failure. The
	 * caller owns the `isPersisting` guard.
	 */
	async function persistCase(): Promise<PersistCaseResult> {
		const wf = workflowDocumentStore.value;
		const projectId = wf?.homeProject?.id;
		const workflowId = wf?.workflowId;
		if (!projectId || !workflowId) {
			return { ok: false, error: new Error('Missing project or workflow context') };
		}

		const slice = resolveSlice();
		if (!slice.ok) return { ok: false, error: new Error(slice.reason) };

		const inputNames = sliceInputs.value.fieldNames;
		const expectedFields = getExpectedFieldsForMetrics(wizardStore.selectedMetricKeys);
		// `TEST_CASE_NAME_COLUMN` holds the per-case name; kept out of the config's
		// input/expected mapping so runs ignore it.
		const requiredColumns = buildRequiredColumns([
			...inputNames,
			...expectedFields.map((f) => f.name),
			TEST_CASE_NAME_COLUMN,
		]);

		// Dry-run before any API calls so shape errors don't leave half-state.
		const dryRun = buildEvaluationConfigDto({
			workflowName: wf.name ?? 'workflow',
			upstreamNodeName: slice.upstreamNodeName,
			startNodeName: slice.startNodeName,
			endNodeName: slice.endNodeName,
			inputFieldNames: inputNames,
			selectedMetrics: wizardStore.selectedMetricKeys,
			judgeSelectionByMetric: wizardStore.judgeSelectionByMetric,
			customChecks: wizardStore.customChecks,
			dataTableId: '__placeholder__',
		});
		if (!dryRun.ok) return { ok: false, error: new Error(dryRun.reason) };

		const tableName = getCanonicalEvaluationName(wf.name);
		const configName = tableName;
		let createdTableId: string | undefined;
		let addedColumns: { tableId: string; columnIds: string[] } | undefined;
		let rowMutation: RowMutation | undefined;
		let createdConfigId: string | undefined;
		let priorConfigSnapshot: { id: string; payload: UpsertEvaluationConfigDto } | undefined;

		const isNewCase = wizardStore.activeRowIndex === null;

		try {
			const ensured = await ensureDataTable(tableName, projectId, requiredColumns);
			if (ensured.created) createdTableId = ensured.id;
			else addedColumns = { tableId: ensured.id, columnIds: ensured.addedColumnIds };

			const row: DataTableRow = {};
			for (const name of inputNames) row[name] = wizardStore.inputs[name] ?? '';
			for (const f of expectedFields) row[f.name] = wizardStore.expectedValues[f.name] ?? '';
			row[TEST_CASE_NAME_COLUMN] = wizardStore.caseName ?? '';

			let resolvedIndex: number;
			if (isNewCase) {
				// ADD path: determine append index then insert.
				const countResult = await getDataTableRowsApi(
					rootStore.restApiContext,
					ensured.id,
					projectId,
					{ take: 1 },
				);
				const appendIndex = countResult.count;
				const insertedRows = await insertDataTableRowApi(
					rootStore.restApiContext,
					ensured.id,
					row,
					projectId,
				);
				const insertedId = numericRowId(insertedRows[0]?.id);
				rowMutation = { kind: 'insert', tableId: ensured.id, rowId: insertedId };
				// setActiveRow is deferred until the config commits (below) so a
				// rollback of this insert can't strand the store on a deleted row.
				resolvedIndex = appendIndex;
			} else {
				// EDIT path: update the row at activeRowIndex. One fetch yields both
				// the row id (when not already known) and the prior data for rollback.
				const n = wizardStore.activeRowIndex;
				if (n === null) throw new Error('Cannot resolve active row index for edit');
				const priorFetch = await getDataTableRowsApi(
					rootStore.restApiContext,
					ensured.id,
					projectId,
					{ skip: n, take: 1 },
				);
				const rowId = wizardStore.activeRowId ?? numericRowId(priorFetch.data[0]?.id) ?? null;
				if (rowId === null) {
					throw new Error(`Could not resolve row id for index ${n}`);
				}
				const priorData: DataTableRow = stripBookkeeping(priorFetch.data[0] ?? {});
				rowMutation = { kind: 'update', tableId: ensured.id, rowId, priorData };
				await updateDataTableRowsApi(rootStore.restApiContext, ensured.id, rowId, row, projectId);
				resolvedIndex = n;
			}

			const built = buildEvaluationConfigDto({
				workflowName: wf.name ?? 'workflow',
				upstreamNodeName: slice.upstreamNodeName,
				startNodeName: slice.startNodeName,
				endNodeName: slice.endNodeName,
				inputFieldNames: inputNames,
				selectedMetrics: wizardStore.selectedMetricKeys,
				judgeSelectionByMetric: wizardStore.judgeSelectionByMetric,
				customChecks: wizardStore.customChecks,
				dataTableId: ensured.id,
			});
			if (!built.ok) throw new Error(built.reason);

			const desiredDto = { ...built.dto, name: configName };
			const ensuredConfig = await ensureConfig(workflowId, desiredDto);
			if (ensuredConfig.created) {
				createdConfigId = ensuredConfig.id;
			} else {
				priorConfigSnapshot = { id: ensuredConfig.id, payload: ensuredConfig.priorPayload };
			}
			// Row + config committed: safe to point the store at the inserted row.
			if (rowMutation?.kind === 'insert') {
				wizardStore.setActiveRow(resolvedIndex, rowMutation.rowId ?? null);
			}
			return { ok: true, configId: ensuredConfig.id, resolvedIndex, isNewCase };
		} catch (error) {
			await rollback(projectId, workflowId, {
				createdTableId,
				addedColumns,
				rowMutation,
				createdConfigId,
				priorConfigSnapshot,
			});
			return { ok: false, error };
		}
	}

	/**
	 * Persist the currently-edited test case (row + config) without running it.
	 * Used for auto-save on edit so a case is never lost just because it hasn't
	 * been run yet. When `silent`, failures (e.g. node not yet chosen) are
	 * swallowed — suitable for debounced auto-save.
	 */
	async function doSaveCase(opts?: { silent?: boolean }): Promise<boolean> {
		const result = await persistCase();
		if (!result.ok) {
			if (!opts?.silent) showPersistError(result.error);
			return false;
		}
		return true;
	}

	/**
	 * Persist the currently-edited test case and then dispatch a test run scoped
	 * to that single row via `rowIndices`.
	 */
	async function doPersistAndRunCase(
		trigger: 'initial' | 'run_again' = 'initial',
	): Promise<boolean> {
		const result = await persistCase();
		if (!result.ok) {
			showPersistError(result.error);
			return false;
		}

		const wf = workflowDocumentStore.value;
		const workflowId = wf?.workflowId;
		// persistCase only succeeds with a workflow id present; guard rather than
		// assert so a missing id can't slip a bad dispatch through.
		if (!workflowId) return false;
		const { configId, resolvedIndex, isNewCase } = result;

		// Don't roll back on dispatch failure — config is intact, retry is safe.
		try {
			wizardStore.setActiveRunId(null);
			const dispatched = await evaluationStore.startTestRun(workflowId, {
				evaluationConfigId: configId,
				compileFromConfig: true,
				rowIndices: [resolvedIndex],
			});
			wizardStore.setActiveRunId(dispatched?.testRunId ?? null);
			telemetry.track('User ran evaluation', {
				workflow_id: workflowId,
				run_id: dispatched?.testRunId ?? null,
				row_index: resolvedIndex,
				is_new_case: isNewCase,
				trigger,
				metric_count: wizardStore.selectedMetricKeys.length,
				custom_check_count: wizardStore.customChecks.length,
				slice_mode: wizardStore.isSliceMode,
			});
			await evaluationStore.fetchTestRuns(workflowId);
			return true;
		} catch (error) {
			toast.showError(error, locale.baseText('evaluations.wizardSidepanel.step2.dispatchError'));
			return false;
		}
	}

	/**
	 * Persist the suite-level config (node under test + metrics) to the
	 * EvaluationConfig without touching any row or dispatching a run. Used by the
	 * overview's suite-config editor. Returns the config id, or null on failure.
	 * When `silent`, failures (e.g. node not yet chosen) are swallowed — suitable
	 * for debounced auto-save.
	 */
	async function doSaveConfig(opts?: { silent?: boolean }): Promise<string | null> {
		const wf = workflowDocumentStore.value;
		const projectId = wf?.homeProject?.id;
		const workflowId = wf?.workflowId;
		if (!projectId || !workflowId) return null;

		const slice = resolveSlice();
		if (!slice.ok) {
			if (!opts?.silent) showPersistError(new Error(slice.reason));
			return null;
		}

		const inputNames = sliceInputs.value.fieldNames;
		const expectedFields = getExpectedFieldsForMetrics(wizardStore.selectedMetricKeys);
		// `TEST_CASE_NAME_COLUMN` holds the per-case name; kept out of the config's
		// input/expected mapping so runs ignore it.
		const requiredColumns = buildRequiredColumns([
			...inputNames,
			...expectedFields.map((f) => f.name),
			TEST_CASE_NAME_COLUMN,
		]);

		const tableName = getCanonicalEvaluationName(wf.name);
		try {
			const ensured = await ensureDataTable(tableName, projectId, requiredColumns);
			const built = buildEvaluationConfigDto({
				workflowName: wf.name ?? 'workflow',
				upstreamNodeName: slice.upstreamNodeName,
				startNodeName: slice.startNodeName,
				endNodeName: slice.endNodeName,
				inputFieldNames: inputNames,
				selectedMetrics: wizardStore.selectedMetricKeys,
				judgeSelectionByMetric: wizardStore.judgeSelectionByMetric,
				customChecks: wizardStore.customChecks,
				dataTableId: ensured.id,
			});
			if (!built.ok) {
				if (!opts?.silent) showPersistError(new Error(built.reason));
				return null;
			}
			const ensuredConfig = await ensureConfig(workflowId, { ...built.dto, name: tableName });
			return ensuredConfig.id;
		} catch (error) {
			// `silent` skips the toast (debounced auto-save) but still leaves a trace —
			// an invisible save error is otherwise impossible to diagnose.
			if (opts?.silent) console.warn('[evaluations] silent saveConfig failed', error);
			else showPersistError(error);
			return null;
		}
	}

	/**
	 * Run all rows of the current evaluation config without mutating any row.
	 * Picks the canonical config (by name) if present, else falls back to the
	 * last config — same selection rule as `useWizardHydration`.
	 */
	async function doRunAll(): Promise<boolean> {
		const wf = workflowDocumentStore.value;
		const workflowId = wf?.workflowId;
		if (!workflowId) {
			showPersistError(new Error('Missing workflow context'));
			return false;
		}

		// Best-effort: persist any pending suite-config edits first so "Run all"
		// uses the latest node + metrics. Runs inline (same queue slot) so it can't
		// race a separate auto-save. Falls back to the existing config if it can't
		// run (e.g. node not resolvable here).
		await doSaveConfig({ silent: true });

		let configId: string;
		try {
			const configs = await listEvaluationConfigs(rootStore.restApiContext, workflowId);
			const canonicalName = getCanonicalEvaluationName(wf.name);
			const config = configs.find((c) => c.name === canonicalName) ?? configs[configs.length - 1];
			if (!config) {
				toast.showError(
					new Error('No evaluation config found. Run a single test case first.'),
					locale.baseText('evaluations.wizardSidepanel.step2.persistError'),
				);
				return false;
			}
			configId = config.id;
		} catch (error) {
			showPersistError(error);
			return false;
		}

		try {
			wizardStore.setActiveRunId(null);
			const dispatched = await evaluationStore.startTestRun(workflowId, {
				evaluationConfigId: configId,
				compileFromConfig: true,
			});
			wizardStore.setActiveRunId(dispatched?.testRunId ?? null);
			telemetry.track('User ran evaluation', {
				workflow_id: workflowId,
				run_id: dispatched?.testRunId ?? null,
				trigger: 'run_all',
			});
			await evaluationStore.fetchTestRuns(workflowId);
			return true;
		} catch (error) {
			toast.showError(error, locale.baseText('evaluations.wizardSidepanel.step2.dispatchError'));
			return false;
		}
	}

	/**
	 * Delete the currently-open test case's row from the data table. Resolves the
	 * table via the workflow's evaluation config and the row via `activeRowId`
	 * (falling back to a lookup by `activeRowIndex`). Leaves the config untouched.
	 */
	async function doDeleteCase(): Promise<boolean> {
		const wf = workflowDocumentStore.value;
		const projectId = wf?.homeProject?.id;
		const workflowId = wf?.workflowId;
		const rowIndex = wizardStore.activeRowIndex;
		if (!projectId || !workflowId || rowIndex === null) return false;

		try {
			const configs = await listEvaluationConfigs(rootStore.restApiContext, workflowId);
			const canonicalName = getCanonicalEvaluationName(wf.name);
			const config = configs.find((c) => c.name === canonicalName) ?? configs[configs.length - 1];
			if (!config || config.datasetSource !== 'data_table') {
				throw new Error('No data table found for this evaluation');
			}
			const tableId = config.datasetRef.dataTableId;

			let rowId = wizardStore.activeRowId;
			if (rowId === null) {
				const fetched = await getDataTableRowsApi(rootStore.restApiContext, tableId, projectId, {
					skip: rowIndex,
					take: 1,
				});
				rowId = numericRowId(fetched.data[0]?.id) ?? null;
			}
			if (rowId === null) throw new Error(`Could not resolve row id for index ${rowIndex}`);

			await deleteDataTableRowsApi(rootStore.restApiContext, tableId, [rowId], projectId);
			telemetry.track('User deleted evaluation test case', {
				workflow_id: workflowId,
				row_index: rowIndex,
			});
			return true;
		} catch (error) {
			showPersistError(error);
			return false;
		}
	}

	// Public entry points — each queues its core through the shared serializer.
	async function saveCase(opts?: { silent?: boolean }): Promise<boolean> {
		return await enqueue(async () => await doSaveCase(opts));
	}
	async function persistAndRunCase(trigger: 'initial' | 'run_again' = 'initial'): Promise<boolean> {
		return await enqueue(async () => await doPersistAndRunCase(trigger));
	}
	async function saveConfig(opts?: { silent?: boolean }): Promise<string | null> {
		return await enqueue(async () => await doSaveConfig(opts));
	}
	async function runAll(): Promise<boolean> {
		return await enqueue(async () => await doRunAll());
	}
	async function deleteCase(): Promise<boolean> {
		return await enqueue(async () => await doDeleteCase());
	}

	return { persistAndRunCase, saveCase, runAll, saveConfig, deleteCase, isPersisting };
}
