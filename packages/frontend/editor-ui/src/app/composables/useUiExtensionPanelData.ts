import {
	UI_EXTENSION_DATA_LIMITS,
	isUiExtensionOpenableUrl,
	type UiExtensionPageContext,
	type UiExtensionPanelData,
	type UiExtensionRun,
	type UiExtensionServiceNodeData,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	isResourceLocatorValue,
	type ExecutionFilters,
	type ExecutionSummary,
	type INodeExecutionData,
	type INodeProperties,
	type INodeTypeDescription,
	type ITaskData,
} from 'n8n-workflow';
import {
	computed,
	onScopeDispose,
	shallowRef,
	watch,
	type ComputedRef,
	type Ref,
	type ShallowRef,
} from 'vue';

import type { INodeUi } from '@/Interface';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

const FINISHED_STATUSES = new Set<string>(['success', 'error', 'crashed', 'canceled']);
const FAILED_STATUSES = new Set<string>(['error', 'crashed']);

type Fetched = {
	state: UiExtensionPanelData['state'];
	scope: 'workflow' | 'all' | null;
	runs: UiExtensionRun[];
	/** The newest finished run of the open workflow, with its run data. */
	lastExecution: IExecutionResponse | null;
};

const EMPTY: Fetched = { state: 'ready', scope: null, runs: [], lastExecution: null };

/** Cuts a text to `max` characters, with "…" at the end when it is cut. */
function cut(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function toText(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value) ?? '';
	} catch {
		return '';
	}
}

function toIso(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toRun(summary: ExecutionSummary): UiExtensionRun {
	return {
		id: summary.id,
		workflowId: summary.workflowId,
		workflowName: summary.workflowName ?? '',
		status: summary.status,
		mode: summary.mode,
		startedAt: toIso(summary.startedAt),
		stoppedAt: toIso(summary.stoppedAt),
	};
}

/** The first items of a node's output, as flat text. Binary data never goes in. */
function toItems(items: INodeExecutionData[]): Array<Record<string, string>> {
	return items.slice(0, UI_EXTENSION_DATA_LIMITS.itemsPerNode).map((item) =>
		Object.fromEntries(
			Object.entries(item.json ?? {})
				.slice(0, UI_EXTENSION_DATA_LIMITS.keysPerItem)
				.map(([key, value]) => [key, cut(toText(value), UI_EXTENSION_DATA_LIMITS.valueLength)]),
		),
	);
}

function toLastRun(
	executionId: string,
	task: ITaskData | undefined,
): UiExtensionServiceNodeData['lastRun'] {
	if (!task) return null;
	const output = task.data?.main?.[0] ?? [];
	const error = task.error?.message;
	return {
		executionId,
		status: task.executionStatus ?? (task.error ? 'error' : 'success'),
		finishedAt: toIso(
			Number.isFinite(task.startTime) ? new Date(task.startTime + (task.executionTime ?? 0)) : null,
		),
		itemCount: output.length,
		items: toItems(output),
		...(error !== undefined && { error: cut(error, UI_EXTENSION_DATA_LIMITS.errorLength) }),
	};
}

/** The display name of the selected option of a parameter, such as "Send" for `post`. */
function optionName(
	properties: INodeProperties[],
	name: 'resource' | 'operation',
	parameters: INodeUi['parameters'],
): string | undefined {
	const value = parameters[name];
	if (typeof value !== 'string') return undefined;
	const resource = parameters.resource;
	for (const property of properties) {
		if (property.name !== name || property.type !== 'options') continue;
		const shownFor = property.displayOptions?.show?.resource;
		if (
			name === 'operation' &&
			shownFor &&
			(typeof resource !== 'string' || !shownFor.includes(resource))
		) {
			continue;
		}
		const option = property.options?.find((o) => 'value' in o && o.value === value);
		if (option) return option.name;
	}
	return undefined;
}

/** What a node works on: the resource locator parameters at the top level, such as a channel. */
function toTargets(node: INodeUi, properties: INodeProperties[]) {
	const targets: UiExtensionServiceNodeData['targets'] = [];
	for (const [parameter, value] of Object.entries(node.parameters)) {
		if (!isResourceLocatorValue(value)) continue;
		const raw = typeof value.value === 'string' ? value.value : String(value.value ?? '');
		// An expression has no name to show until the node runs.
		const name = value.cachedResultName ?? (raw.startsWith('=') ? '' : raw);
		if (!name) continue;
		const label =
			properties.find((p) => p.name === parameter && p.type === 'resourceLocator')?.displayName ??
			parameter;
		const url = value.cachedResultUrl;
		targets.push({
			label,
			name,
			...(url && isUiExtensionOpenableUrl(url) && { url }),
		});
		if (targets.length === UI_EXTENSION_DATA_LIMITS.targetsPerNode) break;
	}
	return targets;
}

function toServiceNode(
	node: INodeUi,
	nodeType: INodeTypeDescription | null,
	execution: IExecutionResponse | null,
): UiExtensionServiceNodeData {
	const properties = nodeType?.properties ?? [];
	const resource = optionName(properties, 'resource', node.parameters);
	const operation = optionName(properties, 'operation', node.parameters);
	const credentialName = Object.values(node.credentials ?? {}).find((c) => c?.name)?.name;
	const task = execution?.data?.resultData.runData[node.name]?.at(-1);
	return {
		nodeName: node.name,
		nodeType: node.type,
		displayName: nodeType?.displayName ?? node.type,
		...(resource && { resource }),
		...(operation && { operation }),
		targets: toTargets(node, properties),
		...(credentialName && { credentialName }),
		lastRun: execution ? toLastRun(execution.id, task) : null,
	};
}

function lastErrorOf(
	execution: IExecutionResponse | null,
): NonNullable<UiExtensionPanelData['runs']>['lastError'] {
	if (!execution || !FAILED_STATUSES.has(execution.status)) return undefined;
	const error = execution.data?.resultData.error;
	const nodeName =
		(error && 'node' in error ? error.node?.name : undefined) ??
		execution.data?.resultData.lastNodeExecuted;
	return {
		...(nodeName && { nodeName }),
		message: cut(error?.message ?? '', UI_EXTENSION_DATA_LIMITS.errorLength),
	};
}

/**
 * Run and service data for the built-in side panel views. It comes from the
 * executions REST endpoints, so it holds only what the executions view shows.
 * It fetches only while `enabled` is true: when the page or the workflow
 * changes, on `refresh()`, and when a run of the open workflow finishes.
 */
export function useUiExtensionPanelData(
	pageContext: ComputedRef<UiExtensionPageContext>,
	workflowDocumentStore: Readonly<ShallowRef<WorkflowDocumentStore | null>>,
	enabled: Ref<boolean>,
) {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const pushConnectionStore = usePushConnectionStore();

	const fetched = shallowRef<Fetched>({ ...EMPTY, state: 'loading' });

	/** What to fetch for. A change of key shows loading, a refresh keeps the old data. */
	const key = computed(() => {
		const context = pageContext.value;
		if (context.page === 'workflow') {
			const id = workflowDocumentStore.value?.workflowId;
			return id ? `workflow:${id}` : 'none';
		}
		return context.page === 'workflows' ? 'all' : 'none';
	});

	async function fetchRuns(filter: ExecutionFilters) {
		const { results } = await makeRestApiRequest<{ results: ExecutionSummary[] }>(
			rootStore.restApiContext,
			'GET',
			'/executions',
			{ filter, limit: UI_EXTENSION_DATA_LIMITS.runs },
		);
		return results.slice(0, UI_EXTENSION_DATA_LIMITS.runs);
	}

	async function fetchFor(forKey: string): Promise<Fetched> {
		if (forKey === 'none') return EMPTY;
		if (forKey === 'all') {
			const runs = await fetchRuns({});
			return { state: 'ready', scope: 'all', runs: runs.map(toRun), lastExecution: null };
		}
		const workflowId = forKey.slice('workflow:'.length);
		const runs = await fetchRuns({ workflowId });
		const newestFinished = runs.find((run) => FINISHED_STATUSES.has(run.status));
		const lastExecution = newestFinished
			? await workflowsStore.fetchExecutionDataById(newestFinished.id)
			: null;
		return { state: 'ready', scope: 'workflow', runs: runs.map(toRun), lastExecution };
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
				const forKey = key.value;
				try {
					const result = await fetchFor(forKey);
					if (forKey === key.value) fetched.value = result;
				} catch {
					if (forKey === key.value) fetched.value = { ...EMPTY, state: 'error' };
				}
			} while (fetchAgain && enabled.value);
		})();
		try {
			await inFlight;
		} finally {
			inFlight = null;
		}
	}

	async function refresh() {
		if (enabled.value) await load();
	}

	watch(
		[key, enabled],
		([newKey, isEnabled], previous) => {
			if (!isEnabled) return;
			if (!previous || newKey !== previous[0]) {
				fetched.value = { ...EMPTY, state: newKey === 'none' ? 'ready' : 'loading' };
			}
			void load();
		},
		{ immediate: true },
	);

	const stopListening = pushConnectionStore.addEventListener((message) => {
		if (message.type !== 'executionFinished' || !enabled.value) return;
		if (key.value === `workflow:${message.data.workflowId}` || key.value === 'all') void load();
	});
	onScopeDispose(stopListening);

	const panelData = computed<UiExtensionPanelData>(() => {
		const { state, scope, runs, lastExecution } = fetched.value;
		const context = pageContext.value;
		const lastError = lastErrorOf(lastExecution);
		const services =
			context.page === 'workflow' && state === 'ready'
				? (workflowDocumentStore.value?.allNodes ?? [])
						.filter((node) => context.workflow?.nodes.find((n) => n.name === node.name)?.isService)
						.slice(0, UI_EXTENSION_DATA_LIMITS.serviceNodes)
						.map((node) =>
							toServiceNode(
								node,
								nodeTypesStore.getNodeType(node.type, node.typeVersion),
								lastExecution,
							),
						)
				: null;
		return {
			state,
			runs: scope ? { scope, items: runs, ...(lastError && { lastError }) } : null,
			services,
		};
	});

	return { panelData, refresh };
}
