import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { getParentNodes, mapConnectionsByDestination } from 'n8n-workflow';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
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

export function useWizardPersistence() {
	const wizardStore = useEvaluationsWizardSidepanelStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const nodeTypesStore = useNodeTypesStore();
	const rootStore = useRootStore();
	const toast = useToast();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const sliceInputs = useSliceInputs();
	const evaluationStore = useEvaluationStore();

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
		// Dedupe by name — an input column and an expected column can share a
		// name, which would otherwise send a duplicate column and fail the
		// data-table create.
		const seenColumns = new Set<string>();
		const requiredColumns: DataTableColumnCreatePayload[] = [];
		for (const name of [...inputNames, ...expectedFields.map((f) => f.name)]) {
			if (seenColumns.has(name)) continue;
			seenColumns.add(name);
			requiredColumns.push({ name, type: 'string' as const });
		}

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

		const tableName = `Evaluation: ${wf.name ?? 'workflow'}`.slice(0, 120);
		const configName = tableName;
		let createdTableId: string | undefined;
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

	type EnsureConfigResult =
		| { created: true; id: string }
		| { created: false; id: string; priorPayload: UpsertEvaluationConfigDto };

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

	type EnsureDataTableResult = { id: string; created: boolean };

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

	return { persistAndDispatch, isPersisting };
}

function numericRowId(id: unknown): number | undefined {
	if (typeof id === 'number') return id;
	if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id);
	return undefined;
}

// Bookkeeping columns (id/createdAt/updatedAt) are rejected by the update API.
function stripBookkeeping(row: DataTableRow): DataTableRow {
	const out: DataTableRow = {};
	for (const [k, v] of Object.entries(row)) {
		if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue;
		out[k] = v;
	}
	return out;
}
