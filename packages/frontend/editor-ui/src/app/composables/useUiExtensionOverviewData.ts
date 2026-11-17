import {
	UI_EXTENSION_DATA_LIMITS,
	type UiExtensionOverviewData,
	type UiExtensionPanelData,
	type UiExtensionRun,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ExecutionSummary, INodeTypeDescription } from 'n8n-workflow';
import { computed, shallowRef, watch, type Ref } from 'vue';

import type { IWorkflowDb } from '@/Interface';
import { getWorkflows } from '@/app/api/workflows';
import { toRun } from '@/app/composables/useUiExtensionPanelData';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { isServiceNodeType } from '@/app/utils/uiExtensionNodes';

const FAILED_STATUSES = new Set<string>(['error', 'crashed']);
const FINISHED_STATUSES = new Set<string>(['success', 'error', 'crashed', 'canceled']);

/** Newest start first. A run with no start time goes last. */
const byNewestStart = (a: UiExtensionRun, b: UiExtensionRun) =>
	(b.startedAt ?? '').localeCompare(a.startedAt ?? '');

type Service = UiExtensionOverviewData['services'][number];
type OverviewWorkflow = Pick<IWorkflowDb, 'id' | 'name' | 'active' | 'nodes'>;
type GetNodeType = (type: string, version?: number) => INodeTypeDescription | null;

/**
 * Builds the overview from the newest workflows and runs. A service is a node
 * type that signs in to an outside app. Its health comes from the newest
 * finished run of each workflow that uses it.
 */
export function buildOverview(
	workflows: OverviewWorkflow[],
	counts: { total: number; active: number },
	runs: UiExtensionRun[],
	getNodeType: GetNodeType,
): UiExtensionOverviewData {
	// The executions list puts running runs first, so sort by the start time.
	const newestFirst = [...runs].sort(byNewestStart);
	const lastRunByWorkflow = new Map<string, UiExtensionRun>();
	const lastFinishedRunByWorkflow = new Map<string, UiExtensionRun>();
	for (const run of newestFirst) {
		if (!lastRunByWorkflow.has(run.workflowId)) lastRunByWorkflow.set(run.workflowId, run);
		if (FINISHED_STATUSES.has(run.status) && !lastFinishedRunByWorkflow.has(run.workflowId)) {
			lastFinishedRunByWorkflow.set(run.workflowId, run);
		}
	}

	type Usage = {
		displayName: string;
		accounts: Set<string>;
		workflows: OverviewWorkflow[];
	};
	const usage = new Map<string, Usage>();

	for (const workflow of workflows) {
		const seenHere = new Set<string>();
		for (const node of workflow.nodes ?? []) {
			if (node.disabled) continue;
			const nodeType = getNodeType(node.type, node.typeVersion);
			if (!nodeType || !isServiceNodeType(nodeType)) continue;

			const entry = usage.get(node.type) ?? {
				displayName: nodeType.displayName,
				accounts: new Set<string>(),
				workflows: [],
			};
			for (const credential of Object.values(node.credentials ?? {})) {
				if (credential?.name) entry.accounts.add(credential.name);
			}
			if (!seenHere.has(node.type)) {
				seenHere.add(node.type);
				entry.workflows.push(workflow);
			}
			usage.set(node.type, entry);
		}
	}

	const services: Service[] = [...usage.entries()]
		.map(([nodeType, entry]): Service => {
			const lastRuns = entry.workflows.map((workflow) =>
				lastFinishedRunByWorkflow.get(workflow.id),
			);
			const health: Service['health'] = lastRuns.some(
				(run) => run && FAILED_STATUSES.has(run.status),
			)
				? 'failing'
				: lastRuns.some((run) => run)
					? 'ok'
					: 'unknown';
			return {
				nodeType,
				displayName: entry.displayName,
				workflowCount: entry.workflows.length,
				activeWorkflowCount: entry.workflows.filter((workflow) => workflow.active).length,
				health,
				accounts: [...entry.accounts].slice(0, UI_EXTENSION_DATA_LIMITS.overviewAccountsPerService),
				// Active workflows first. The sort keeps the newest-updated order within each group.
				workflows: [...entry.workflows]
					.sort((a, b) => Number(b.active) - Number(a.active))
					.slice(0, UI_EXTENSION_DATA_LIMITS.overviewWorkflowsPerService)
					.map((workflow) => {
						const run = lastRunByWorkflow.get(workflow.id);
						return {
							id: workflow.id,
							name: workflow.name,
							active: workflow.active,
							lastRun: run ? { status: run.status, stoppedAt: run.stoppedAt } : null,
						};
					}),
			};
		})
		.sort((a, b) => b.workflowCount - a.workflowCount || a.displayName.localeCompare(b.displayName))
		.slice(0, UI_EXTENSION_DATA_LIMITS.overviewServices);

	return {
		workflows: { total: counts.total, active: counts.active, scanned: workflows.length },
		runs: {
			scanned: runs.length,
			succeeded: runs.filter((run) => run.status === 'success').length,
			failed: runs.filter((run) => FAILED_STATUSES.has(run.status)).length,
		},
		services,
		failures: newestFirst
			.filter((run) => FAILED_STATUSES.has(run.status))
			.slice(0, UI_EXTENSION_DATA_LIMITS.overviewFailures),
	};
}

const LOADING: UiExtensionPanelData = { state: 'loading', runs: null, services: null };

/**
 * Overview data for the built-in Services overview page. It comes from the
 * workflows and executions REST endpoints, so it holds only what the user can
 * already see in those lists. It fetches only while `enabled` is true: when it
 * turns true, and on `refresh()`.
 */
export function useUiExtensionOverviewData(enabled: Readonly<Ref<boolean>>) {
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();

	const fetched = shallowRef<UiExtensionPanelData>(LOADING);

	async function fetchOverview(): Promise<UiExtensionOverviewData> {
		const context = rootStore.restApiContext;
		const [, workflows, activeWorkflows, executions] = await Promise.all([
			// The list page and the page route do not always load node types.
			nodeTypesStore.loadNodeTypesIfNotLoaded(),
			getWorkflows(
				context,
				{ isArchived: false },
				{
					take: UI_EXTENSION_DATA_LIMITS.overviewWorkflows,
					sortBy: 'updatedAt:desc',
					includeScopes: false,
				},
				['id', 'name', 'active', 'nodes'],
			),
			getWorkflows(
				context,
				{ isArchived: false, active: true },
				{ take: 1, includeScopes: false },
				['id'],
			),
			makeRestApiRequest<{ results: ExecutionSummary[] }>(context, 'GET', '/executions', {
				filter: {},
				limit: UI_EXTENSION_DATA_LIMITS.overviewRuns,
			}),
		]);

		const runs = executions.results.slice(0, UI_EXTENSION_DATA_LIMITS.overviewRuns).map(toRun);
		return buildOverview(
			workflows.data.slice(0, UI_EXTENSION_DATA_LIMITS.overviewWorkflows),
			{ total: workflows.count, active: activeWorkflows.count },
			runs,
			(type, version) => nodeTypesStore.getNodeType(type, version),
		);
	}

	let inFlight: Promise<void> | null = null;
	let fetchAgain = false;

	/** Calls that overlap merge into one more fetch after the running one. */
	async function load(): Promise<void> {
		if (inFlight) {
			fetchAgain = true;
			return await inFlight;
		}
		inFlight = (async () => {
			do {
				fetchAgain = false;
				try {
					const overview = await fetchOverview();
					fetched.value = { state: 'ready', runs: null, services: null, overview };
				} catch {
					fetched.value = { state: 'error', runs: null, services: null };
				}
			} while (fetchAgain && enabled.value);
		})();
		try {
			await inFlight;
		} finally {
			inFlight = null;
		}
	}

	function refresh() {
		if (enabled.value) void load();
	}

	watch(
		enabled,
		(isEnabled) => {
			if (isEnabled) void load();
		},
		{ immediate: true },
	);

	const data = computed(() => fetched.value);

	return { data, refresh };
}
