import type { DataTableCreateColumnSchema, EvalPlan } from '@n8n/api-types';
import { DATA_TABLE_COLUMN_REGEX } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import {
	EVALUATION_NODE_TYPE,
	EVALUATION_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type { IConnection, INodeParameters } from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import { VIEWS } from '@/app/constants';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { insertDataTableRowApi } from '@/features/core/dataTable/dataTable.api';
import { useEvalModeStore } from '@/features/ai/evaluation.ee/evalMode.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

const NODE_X_BEFORE_OFFSET = 240;
const NODE_X_AFTER_OFFSET = 240;
const NODE_Y_BELOW_OFFSET = 200;

/**
 * Sanitize a free-form key into one that satisfies the data-table column
 * naming rules (alphanumeric + underscore, must start with a letter, ≤ 63
 * chars). Keeps the original casing where possible.
 *
 * Exported for unit testing.
 */
export function sanitizeColumnName(raw: string, fallback: string): string {
	const cleaned = raw
		.replace(/[^a-zA-Z0-9_]/g, '_')
		.replace(/^[^a-zA-Z]+/, '')
		.slice(0, 63);
	return DATA_TABLE_COLUMN_REGEX.test(cleaned) ? cleaned : fallback;
}

/**
 * Build the column descriptor list from the union of keys across all rows.
 * Drops keys that can't be sanitized to a valid column name.
 *
 * Exported for unit testing.
 */
export function buildColumns(rows: Array<Record<string, unknown>>): DataTableCreateColumnSchema[] {
	const seen = new Map<string, string>();
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			const sanitized = sanitizeColumnName(key, '');
			if (sanitized && !seen.has(sanitized)) seen.set(sanitized, key);
		}
	}
	return [...seen.keys()].map((name) => ({ name, type: 'string' as const }));
}

/**
 * Map a free-form row to a column-aligned row, sanitizing keys to match the
 * data-table column names. Values are coerced to string for MVP.
 *
 * Exported for unit testing.
 */
export function alignRowToColumns(
	row: Record<string, unknown>,
	columns: DataTableCreateColumnSchema[],
): Record<string, string> {
	const aligned: Record<string, string> = {};
	for (const column of columns) {
		const sourceKey = Object.keys(row).find((k) => sanitizeColumnName(k, '') === column.name);
		const value = sourceKey ? row[sourceKey] : undefined;
		aligned[column.name] = value === undefined || value === null ? '' : String(value);
	}
	return aligned;
}

/**
 * Build the parameters object for a setMetrics evaluation node. The metric
 * is a single numeric custom-metric assignment named after the agent's
 * `metricName`; the value is a placeholder expression the user can edit in
 * NDV to reference real workflow output.
 *
 * Exported for unit testing.
 */
export function buildSetMetricsParameters(metricName: string): INodeParameters {
	return {
		operation: 'setMetrics',
		metric: 'customMetrics',
		metrics: {
			assignments: [
				{
					id: uuidv4(),
					name: metricName,
					value: '={{ 1 }}',
					type: 'number',
				},
			],
		},
	};
}

export function useEvalApply() {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const dataTableStore = useDataTableStore();
	const router = useRouter();
	const workflowSaving = useWorkflowSaving({ router });
	const canvasOperations = useCanvasOperations();
	const evalModeStore = useEvalModeStore();
	const projectsStore = useProjectsStore();

	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);

	/**
	 * Pick a project to host the eval dataset's Data Table. Prefers the
	 * workflow's home project; falls back to the user's personal project for
	 * unsaved / freshly-imported workflows whose homeProject hasn't been
	 * hydrated yet. Lazy-loads the personal project if the projects store
	 * hasn't fetched it. Returns undefined only if both lookups fail.
	 */
	async function resolveProjectId(homeProjectId: string | undefined): Promise<string | undefined> {
		if (homeProjectId) return homeProjectId;
		if (!projectsStore.personalProject) {
			try {
				await projectsStore.getPersonalProject();
			} catch {
				// Fall through — caller surfaces the friendly error.
			}
		}
		return projectsStore.personalProject?.id;
	}

	function connectMain(sourceName: string, targetName: string): void {
		const sourceConn: IConnection = {
			node: sourceName,
			type: NodeConnectionTypes.Main,
			index: 0,
		};
		const targetConn: IConnection = {
			node: targetName,
			type: NodeConnectionTypes.Main,
			index: 0,
		};
		workflowDocumentStore.value.addConnection({ connection: [sourceConn, targetConn] });
	}

	async function apply(plan: EvalPlan, userIntent: string, llmNodeName: string): Promise<void> {
		const workflow = workflowsStore.workflow;
		const projectId = await resolveProjectId(workflow.homeProject?.id);
		if (!projectId) {
			throw new Error(
				"Couldn't resolve a project to host the evaluation dataset. Make sure your account has a personal project.",
			);
		}

		const llmNode = workflowDocumentStore.value.allNodes.find(
			(n: INodeUi) => n.name === llmNodeName,
		);
		if (!llmNode) {
			throw new Error(
				`Couldn't find the LLM node "${llmNodeName}" in this workflow. It may have been renamed or deleted.`,
			);
		}

		// 1. Materialise the dataset as a Data Table.
		const columns = buildColumns(plan.datasetRows);
		const tableLabel = userIntent.trim() ? userIntent.trim().slice(0, 40) : llmNode.name;
		const tableName = `Eval — ${tableLabel}`.trim();
		const dataTable = await dataTableStore.createDataTable(tableName, projectId, columns);

		// 2. Insert rows one at a time (no bulk API today).
		for (const row of plan.datasetRows) {
			const aligned = alignRowToColumns(row, columns);
			await insertDataTableRowApi(rootStore.restApiContext, dataTable.id, aligned, projectId);
		}

		// 3. Add the EvaluationTrigger to the LEFT of the LLM node and wire its
		// main output into the LLM's main input. During eval runs, each pinned
		// row becomes the LLM's input; production runs are unaffected because
		// the existing upstream connection stays intact (the LLM just gets two
		// possible main-input sources, only one of which is active per run).
		const [evalTriggerNode] = await canvasOperations.addNodes(
			[
				{
					type: EVALUATION_TRIGGER_NODE_TYPE,
					position: [
						llmNode.position[0] - NODE_X_BEFORE_OFFSET,
						llmNode.position[1] + NODE_Y_BELOW_OFFSET,
					],
					parameters: { source: 'dataTable', dataTableId: dataTable.id },
				},
			],
			{ keepPristine: true },
		);
		if (evalTriggerNode) {
			connectMain(evalTriggerNode.name, llmNode.name);
		}

		// 4. Add one setMetrics node per metric, terminal-leaf-wired off the
		// LLM node's main output. Stacked vertically below the LLM so multiple
		// metrics don't overlap.
		const metricSpecs = plan.metrics.map((metric, idx) => ({
			type: EVALUATION_NODE_TYPE,
			position: [
				llmNode.position[0] + NODE_X_AFTER_OFFSET,
				llmNode.position[1] + NODE_Y_BELOW_OFFSET * (idx + 1),
			] as [number, number],
			parameters: buildSetMetricsParameters(metric.name),
		}));
		const metricNodes = await canvasOperations.addNodes(metricSpecs, { keepPristine: true });
		for (const metricNode of metricNodes) {
			connectMain(llmNode.name, metricNode.name);
		}

		// 5. Persist + navigate. The eval-mode toggle is flipped on post-nav so
		// the canvas mounts with eval nodes lit up rather than dimmed.
		await workflowSaving.saveCurrentWorkflow();
		await router.push({ name: VIEWS.WORKFLOW, params: { name: workflow.id } });
		evalModeStore.isEvalMode = true;
	}

	return { apply };
}
