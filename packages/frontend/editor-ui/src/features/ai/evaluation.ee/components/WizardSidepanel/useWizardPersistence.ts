import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import {
	getDataTableRowsApi,
	insertDataTableRowApi,
	updateDataTableRowsApi,
} from '@/features/core/dataTable/dataTable.api';
import type { DataTableRow } from '@/features/core/dataTable/dataTable.types';
import type { UpsertEvaluationConfigDto } from '@n8n/api-types';
import { useEvaluationStore } from '../../evaluation.store';
import { useSliceInputs } from '../../composables/useSliceInputs';
import {
	getCanonicalEvaluationName,
	getExpectedFieldsForMetrics,
} from '../../evaluation.constants';
import { buildEvaluationConfigDto } from '../../composables/buildEvaluationConfigDto';
import {
	buildRequiredColumns,
	numericRowId,
	stripBookkeeping,
	useEvaluationPersistenceHelpers,
	type RowMutation,
} from '../../composables/useEvaluationPersistenceHelpers';

export function useWizardPersistence() {
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

	/**
	 * @param trigger Whether this is the initial run from the wizard's setup
	 * flow ('initial') or a re-run from the results step ('run_again').
	 */
	async function persistAndDispatch(
		trigger: 'initial' | 'run_again' = 'initial',
	): Promise<boolean> {
		if (isPersisting.value) return false;

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
		const requiredColumns = buildRequiredColumns([
			...inputNames,
			...expectedFields.map((f) => f.name),
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
		if (!dryRun.ok) {
			showPersistError(new Error(dryRun.reason));
			return false;
		}

		const tableName = getCanonicalEvaluationName(wf.name);
		const configName = tableName;
		let createdTableId: string | undefined;
		let addedColumns: { tableId: string; columnIds: string[] } | undefined;
		let rowMutation: RowMutation | undefined;
		let createdConfigId: string | undefined;
		let priorConfigSnapshot: { id: string; payload: UpsertEvaluationConfigDto } | undefined;

		isPersisting.value = true;
		let configId: string | undefined;
		try {
			const ensured = await ensureDataTable(tableName, projectId, requiredColumns);
			if (ensured.created) createdTableId = ensured.id;
			else addedColumns = { tableId: ensured.id, columnIds: ensured.addedColumnIds };

			const row: DataTableRow = {};
			for (const name of inputNames) row[name] = wizardStore.inputs[name] ?? '';
			for (const f of expectedFields) row[f.name] = wizardStore.expectedValues[f.name] ?? '';

			// Reuse first row on existing tables so re-runs don't accumulate.
			const existingFirst = ensured.created
				? undefined
				: (await getDataTableRowsApi(rootStore.restApiContext, ensured.id, projectId, { take: 1 }))
						.data[0];
			const existingRowId = numericRowId(existingFirst?.id);

			if (existingFirst && existingRowId !== undefined) {
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
				customChecks: wizardStore.customChecks,
				dataTableId: ensured.id,
			});
			if (!built.ok) throw new Error(built.reason);

			// Pin the canonical name — DB has (workflowId, name) unique constraint.
			const desiredDto = { ...built.dto, name: configName };
			const ensuredConfig = await ensureConfig(workflowId, desiredDto);
			if (ensuredConfig.created) {
				createdConfigId = ensuredConfig.id;
			} else {
				priorConfigSnapshot = { id: ensuredConfig.id, payload: ensuredConfig.priorPayload };
			}
			configId = ensuredConfig.id;
		} catch (error) {
			await rollback(projectId, workflowId, {
				createdTableId,
				addedColumns,
				rowMutation,
				createdConfigId,
				priorConfigSnapshot,
			});
			showPersistError(error);
			isPersisting.value = false;
			return false;
		}

		// Don't roll back on dispatch failure — config is intact, retry is safe.
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
				metric_count: wizardStore.selectedMetricKeys.length,
				custom_check_count: wizardStore.customChecks.length,
				slice_mode: wizardStore.isSliceMode,
				trigger,
			});
			await evaluationStore.fetchTestRuns(workflowId);
			return true;
		} catch (error) {
			toast.showError(error, locale.baseText('evaluations.wizardSidepanel.step2.dispatchError'));
			return false;
		} finally {
			isPersisting.value = false;
		}
	}

	return { persistAndDispatch, isPersisting };
}
