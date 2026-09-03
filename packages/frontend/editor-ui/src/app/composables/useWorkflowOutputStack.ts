import { useStorage } from '@vueuse/core';
import type { INodeTypeDescription, ITaskData } from 'n8n-workflow';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue';

import { useExecutionsStore } from '@/features/execution/executions/executions.store';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { sampleEventFor, stringLeaves } from '@/app/utils/wireframeSampleEvents';

export type OutputVerdict = {
	vote: 'up' | 'down';
	note?: string;
	at: string;
	/** What the output looked like when judged — the baseline for later diffs. */
	sample?: string | null;
};

export type OutputBaseline = { executionId: string; sample: string; at: string };
export type OutputDestination = 'preview' | 'slack-dm' | 'email-draft' | 'test-channel';
export const OUTPUT_DESTINATIONS: OutputDestination[] = [
	'preview',
	'slack-dm',
	'email-draft',
	'test-channel',
];

export type WorkflowOutput = {
	nodeName: string;
	nodeId: string;
	nodeType: INodeTypeDescription | null;
	/** From a sub-workflow node: shown as "from <name>". Not populated in the wireframe. */
	from?: string;
	/** What the node would send, as text. */
	sample: string | null;
	/** True when the sample comes from the node's input because the node itself didn't run. */
	isSample: boolean;
	/** Why the node didn't send: "connect Slack" etc. */
	gap: string | null;
	ran: boolean;
	verdict: OutputVerdict | null;
	pinned: boolean;
	hidden: boolean;
	destination: OutputDestination;
};

export type OutputStackBadgeState = 'idle' | 'running' | 'needsEye' | 'flagged' | 'ok';

type StackShape = {
	pinned: string[];
	hidden: string[];
	destinations?: Record<string, OutputDestination>;
};

const verdictsKey = (workflowId: string) => `N8N_WIREFRAME_STACK_VERDICTS:${workflowId}`;

/** Executions ledger: how a given run was judged, from the same local store the badge writes. */
export function useStackVerdictCounts(workflowId: Ref<string>, executionId: Ref<string>) {
	const verdicts = useStorage<Record<string, OutputVerdict>>(
		computed(() => verdictsKey(workflowId.value)),
		{},
	);
	return computed(() => {
		const counts = { ok: 0, flagged: 0 };
		for (const [key, v] of Object.entries(verdicts.value)) {
			if (!key.startsWith(`${executionId.value}:`)) continue;
			if (v.vote === 'up') counts.ok++;
			else counts.flagged++;
		}
		return counts;
	});
}

function textOfItem(json: unknown): string | null {
	if (!json || typeof json !== 'object') return json === undefined ? null : String(json);
	const record = json as Record<string, unknown>;
	const strings = Object.values(record).filter((v): v is string => typeof v === 'string');
	if (strings.length === 0) return JSON.stringify(record, null, 1).slice(0, 400);
	// The longest string is almost always the message body.
	return strings.sort((a, b) => b.length - a.length)[0];
}

function firstItemJson(task: ITaskData | undefined): unknown {
	return task?.data?.main?.[0]?.[0]?.json;
}

/**
 * Wireframe: the *stack* — the ordered set of outputs a workflow sends. Seeded
 * from the terminal send/write nodes, filled by the active manual run, shaped
 * only by pin / hide. Verdicts live in localStorage per workflow and execution.
 */
export function useWorkflowOutputStack(
	options: {
		/** A specific run to show (the Executions tab). Defaults to the canvas's active run. */
		execution?: Ref<IExecutionResponse | null | undefined>;
	} = {},
) {
	const documentStore = injectWorkflowDocumentStore();
	const executionStore = injectWorkflowExecutionStateStore();
	const nodeTypesStore = useNodeTypesStore();
	const projectsStore = useProjectsStore();

	const workflowId = computed(() => documentStore.value.workflowId);
	// `homeProject` is only assembled with sharing on; fall back to the project in view.
	const projectId = computed(
		() =>
			documentStore.value.homeProject?.id ??
			projectsStore.currentProjectId ??
			projectsStore.personalProject?.id,
	);
	// A run started from a pinned event trigger can finish on the server while the
	// canvas still holds a placeholder "in progress" execution. Fall back to the last
	// successful run's data in that case so the outputs still show.
	const rootStore = useRootStore();
	const executionsStore = useExecutionsStore();
	const latestFetched = ref<IExecutionResponse | null>(null);
	async function loadLatestExecution() {
		if (options.execution || !workflowId.value) return;
		try {
			const page = await makeRestApiRequest<{ results?: Array<{ id: string }> }>(
				rootStore.restApiContext,
				'GET',
				'/executions',
				{ filter: JSON.stringify({ workflowId: workflowId.value }), limit: 1 },
			);
			const id = page.results?.[0]?.id;
			if (!id || latestFetched.value?.id === id) return;
			latestFetched.value = (await executionsStore.fetchExecution(id)) ?? null;
		} catch {
			// Nothing to show yet; the badge simply stays quiet.
		}
	}
	const fallbackExecution = computed(() => {
		if (latestFetched.value) return latestFetched.value;
		const lastId = executionStore.value.lastSuccessfulExecutionId;
		if (!lastId) return null;
		return useExecutionDataStore(createExecutionDataId(lastId)).execution ?? null;
	});
	const execution = computed(() => {
		if (options.execution) return options.execution.value ?? null;
		const active = executionStore.value.activeExecution;
		if (active && active.id !== '__IN_PROGRESS__') return active;
		return fallbackExecution.value ?? active;
	});
	// Refresh the fallback when a run settles — and keep polling while the canvas
	// is stuck on its in-progress placeholder.
	watch(
		[workflowId, () => executionStore.value.activeExecution?.status],
		() => void loadLatestExecution(),
		{ immediate: true },
	);
	let stalePoll: ReturnType<typeof setInterval> | undefined;
	watch(
		() => executionStore.value.activeExecution?.id === '__IN_PROGRESS__',
		(stale) => {
			clearInterval(stalePoll);
			if (stale && !options.execution)
				stalePoll = setInterval(() => void loadLatestExecution(), 3000);
		},
		{ immediate: true },
	);
	onScopeDispose(() => clearInterval(stalePoll));
	function runDataFor(nodeName: string): ITaskData[] | null {
		// The execution-data store types its run data as deeply readonly; we only read it.
		return (
			(execution.value?.data?.resultData?.runData?.[nodeName] as ITaskData[] | undefined) ?? null
		);
	}
	const executionId = computed(() => execution.value?.id ?? null);
	const isRunning = computed(
		() => execution.value?.status === 'running' || execution.value?.status === 'waiting',
	);

	const shape = useStorage<StackShape>(
		computed(() => `N8N_WIREFRAME_STACK:${workflowId.value}`),
		{ pinned: [], hidden: [], destinations: {} },
	);
	const verdicts = useStorage<Record<string, OutputVerdict>>(
		computed(() => verdictsKey(workflowId.value)),
		{},
	);
	const rules = useStorage<Array<{ nodeName: string; text: string; at: string }>>(
		computed(() => `N8N_WIREFRAME_STACK_RULES:${workflowId.value}`),
		[],
	);

	function verdictKey(nodeName: string) {
		return `${executionId.value ?? 'none'}:${nodeName}`;
	}

	// Hand-typed values in the workflow (Set / Edit Fields assignments). Wherever
	// they show up in an output, the text is made up, not real data.
	const literals = computed<string[]>(() => {
		const out = new Set<string>();
		for (const node of documentStore.value.allNodes) {
			if (!/\.set$/.test(node.type)) continue;
			const assignments = (
				node.parameters as { assignments?: { assignments?: Array<{ value?: unknown }> } }
			).assignments?.assignments;
			for (const a of assignments ?? []) {
				if (typeof a.value === 'string' && !a.value.startsWith('=') && a.value.trim().length > 1) {
					out.add(a.value.trim());
				}
			}
		}
		for (const l of pinnedTriggerLiterals.value) out.add(l);
		return [...out].sort((a, b) => b.length - a.length);
	});

	/** Upstream nodes of an output and the string bits each one supplied to it. */
	function traceFor(nodeName: string): Array<{ nodeId: string; nodeName: string; bits: string[] }> {
		const output = all.value.find((o) => o.nodeName === nodeName);
		const sample = output?.sample ?? '';
		const seen = new Set<string>([nodeName]);
		const queue = [nodeName];
		const result: Array<{ nodeId: string; nodeName: string; bits: string[] }> = [];
		while (queue.length > 0) {
			const current = queue.shift() as string;
			for (const parent of parentNames(current)) {
				if (seen.has(parent)) continue;
				seen.add(parent);
				queue.push(parent);
				const node = documentStore.value.getNodeByName(parent);
				if (!node) continue;
				const firstItem = firstItemJson(runDataFor(parent)?.[0]);
				const pinned = documentStore.value.getNodePinData(parent)?.[0]?.json;
				const bits = [...new Set(stringLeaves(firstItem ?? pinned))].filter(
					(b) => b !== sample.trim() && sample.includes(b),
				);
				result.push({ nodeId: node.id, nodeName: parent, bits });
			}
		}
		return result;
	}

	/** Approved outputs of a node from earlier runs, newest first. */
	function baselinesFor(nodeName: string): OutputBaseline[] {
		return Object.entries(verdicts.value)
			.filter(
				([key, v]) =>
					key.endsWith(`:${nodeName}`) && v.vote === 'up' && typeof v.sample === 'string',
			)
			.map(([key, v]) => ({
				executionId: key.slice(0, key.length - nodeName.length - 1),
				sample: v.sample ?? '',
				at: v.at,
			}))
			.filter((b) => b.executionId !== (executionId.value ?? 'none'))
			.sort((a, b) => b.at.localeCompare(a.at));
	}

	// Event triggers can't be pressed. The Tester drafts a sample event, pins it on the
	// trigger, and the normal run button does the rest. Pinned trigger data counts as
	// made up, so it renders purple downstream.
	const MANUAL_LIKE =
		/manualTrigger|scheduleTrigger|formTrigger|chatTrigger|executeWorkflowTrigger/;
	const eventTriggers = computed(() =>
		documentStore.value.allNodes.filter((node) => {
			if (node.disabled || MANUAL_LIKE.test(node.type)) return false;
			return (
				nodeTypesStore.getNodeType(node.type, node.typeVersion)?.group.includes('trigger') === true
			);
		}),
	);
	const hasManualTrigger = computed(() =>
		documentStore.value.allNodes.some((node) => !node.disabled && MANUAL_LIKE.test(node.type)),
	);
	const unpinnedEventTriggers = computed(() =>
		eventTriggers.value.filter((node) => !documentStore.value.getNodePinData(node.name)?.length),
	);
	/** True when the workflow can only run with a sample event. */
	const needsSimulation = computed(
		() =>
			!hasManualTrigger.value &&
			eventTriggers.value.length > 0 &&
			unpinnedEventTriggers.value.length > 0,
	);
	const pinnedTriggerLiterals = computed(() =>
		eventTriggers.value.flatMap((node) =>
			(documentStore.value.getNodePinData(node.name) ?? []).flatMap((item) =>
				stringLeaves(item.json),
			),
		),
	);

	function pinSampleEvents() {
		for (const node of unpinnedEventTriggers.value) {
			documentStore.value.pinNodeData(node.name, [{ json: sampleEventFor(node.type) }]);
		}
	}

	// Terminal nodes that aren't triggers: the branch ends where something leaves the workflow.
	const outputNodes = computed(() => {
		const doc = documentStore.value;
		return doc.allNodes.filter((node) => {
			if (node.disabled) return false;
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (nodeType?.group.includes('trigger')) return false;
			const outgoing = doc.outgoingConnectionsByNodeName(node.name)?.main ?? [];
			return !outgoing.some((branch) => (branch?.length ?? 0) > 0);
		});
	});

	function parentNames(nodeName: string): string[] {
		const parents: string[] = [];
		const doc = documentStore.value;
		for (const source of doc.allNodes) {
			for (const branch of doc.outgoingConnectionsByNodeName(source.name)?.main ?? []) {
				if (branch?.some((c) => c.node === nodeName)) parents.push(source.name);
			}
		}
		return parents;
	}

	const all: ComputedRef<WorkflowOutput[]> = computed(() => {
		const items = outputNodes.value.map((node): WorkflowOutput => {
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			const task = runDataFor(node.name)?.[0];
			const ran = task !== undefined && !task.error;
			let sample = ran ? textOfItem(firstItemJson(task)) : null;
			let isSample = false;
			if (!ran) {
				// Show what *would* be sent: the input the node received.
				for (const parent of parentNames(node.name)) {
					const parentTask = runDataFor(parent)?.[0];
					const text = textOfItem(firstItemJson(parentTask));
					if (text) {
						sample = text;
						isSample = true;
						break;
					}
				}
			}
			const error = task?.error?.message ?? null;
			const gap = error
				? /credential/i.test(error)
					? (nodeType?.displayName ?? node.type)
					: error
				: task
					? null
					: execution.value
						? (nodeType?.displayName ?? node.type)
						: null;
			return {
				nodeName: node.name,
				nodeId: node.id,
				nodeType,
				sample,
				isSample,
				gap,
				ran,
				verdict: verdicts.value[verdictKey(node.name)] ?? null,
				pinned: shape.value.pinned.includes(node.name),
				hidden: shape.value.hidden.includes(node.name),
				destination: shape.value.destinations?.[node.name] ?? 'preview',
			};
		});
		// Pinned first, otherwise canvas order.
		return items.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
	});

	const visible = computed(() => all.value.filter((o) => !o.hidden));
	const hidden = computed(() => all.value.filter((o) => o.hidden));
	const needsEye = computed(() =>
		visible.value.filter((o) => execution.value && !o.verdict && o.sample !== null),
	);
	const flagged = computed(() => visible.value.filter((o) => o.verdict?.vote === 'down'));
	const ok = computed(() => visible.value.filter((o) => o.verdict?.vote === 'up'));

	const badgeState = computed<OutputStackBadgeState>(() => {
		if (isRunning.value) return 'running';
		if (!execution.value || visible.value.length === 0) return 'idle';
		if (flagged.value.length > 0) return 'flagged';
		if (needsEye.value.length > 0) return 'needsEye';
		if (ok.value.length > 0) return 'ok';
		return 'idle';
	});

	function setVerdict(nodeName: string, vote: 'up' | 'down', note?: string) {
		const sample = all.value.find((o) => o.nodeName === nodeName)?.sample ?? null;
		verdicts.value = {
			...verdicts.value,
			[verdictKey(nodeName)]: { vote, note, at: new Date().toISOString(), sample },
		};
		if (vote === 'down' && note?.trim()) {
			rules.value = [...rules.value, { nodeName, text: note.trim(), at: new Date().toISOString() }];
		}
	}

	function undoLastRule() {
		const last = rules.value[rules.value.length - 1];
		if (!last) return;
		rules.value = rules.value.slice(0, -1);
		const key = verdictKey(last.nodeName);
		const { [key]: _dropped, ...rest } = verdicts.value;
		verdicts.value = rest;
	}

	function togglePinned(nodeName: string) {
		const pinned = shape.value.pinned.includes(nodeName)
			? shape.value.pinned.filter((n) => n !== nodeName)
			: [...shape.value.pinned, nodeName];
		shape.value = { ...shape.value, pinned };
	}

	function setDestination(nodeName: string, destination: OutputDestination) {
		shape.value = {
			...shape.value,
			destinations: { ...(shape.value.destinations ?? {}), [nodeName]: destination },
		};
	}

	function setHidden(nodeName: string, value: boolean) {
		const hidden = value
			? [...new Set([...shape.value.hidden, nodeName])]
			: shape.value.hidden.filter((n) => n !== nodeName);
		shape.value = { ...shape.value, hidden };
	}

	return {
		workflowId,
		projectId,
		execution,
		executionId,
		isRunning,
		all,
		visible,
		hidden,
		needsEye,
		flagged,
		ok,
		badgeState,
		rules,
		literals,
		baselinesFor,
		needsSimulation,
		pinSampleEvents,
		traceFor,
		setVerdict,
		undoLastRule,
		togglePinned,
		setHidden,
		setDestination,
	};
}
