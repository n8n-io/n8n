<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { Workflow } from 'n8n-workflow';
import { ChatSymbol } from '@n8n/chat/constants';
import type { Chat } from '@n8n/chat/types';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import LogsOverviewRow from '@/features/execution/logs/components/LogsOverviewRow.vue';
import RunData from '@/features/ndv/runData/components/RunData.vue';
import NodeErrorView from '@/features/ndv/runData/components/error/NodeErrorView.vue';
import {
	createLogTree,
	flattenLogEntries,
	getSubtreeTotalConsumedTokens,
} from '@/features/execution/logs/logs.utils';
import type { LatestNodeInfo, LogEntry } from '@/features/execution/logs/logs.types';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { WorkflowObjectAccessors } from '@/app/types/workflow';

const props = defineProps<{
	workflowId: string;
	workflowExecutionId: string;
}>();

const i18n = useI18n();
const executionsStore = useExecutionsStore();
const workflowsStore = useWorkflowsStore();
const workflowState = useWorkflowState();
const workflowHelpers = useWorkflowHelpers();
const nodeTypesStore = useNodeTypesStore();

// `RunData` (rendered inside `LogsViewRunData`) reads the workflow id via
// `useInjectWorkflowId()`, which throws when nothing is provided. Provide it
// here so the editor's run-data renderer works inside this side panel.
provide(
	WorkflowIdKey,
	computed(() => props.workflowId),
);

// `RunData` -> `useRunWorkflow` -> `useChat` injects `ChatSymbol`. Outside the
// chat-enabled layout it's missing and Vue logs a noisy "injection 'Chat' not
// found" warning. The consuming code only reads `chatStore?.ws` via optional
// chaining, so a null provider is functionally safe and silences the warning.
provide(ChatSymbol, null as unknown as Chat);

const loading = ref(true);
const errorMessage = ref<string | null>(null);
const execution = ref<IExecutionResponse | null>(null);
const expanded = ref<Record<string, boolean>>({});
const selected = ref<LogEntry | null>(null);

const workflow = computed<Workflow | null>(() => {
	if (!execution.value?.workflowData) return null;
	try {
		return new Workflow({
			...execution.value.workflowData,
			nodeTypes: workflowHelpers.getNodeTypes(),
		});
	} catch {
		return null;
	}
});

const entries = computed<LogEntry[]>(() => {
	if (!workflow.value || !execution.value) return [];
	return createLogTree(workflow.value, execution.value);
});

const flatEntries = computed<LogEntry[]>(() => flattenLogEntries(entries.value, expanded.value));

const latestNodeInfo = computed<Record<string, LatestNodeInfo>>(() => {
	const map: Record<string, LatestNodeInfo> = {};
	if (!workflow.value) return map;
	for (const node of Object.values(workflow.value.nodes ?? {})) {
		map[node.id] = { deleted: false, disabled: !!node.disabled, name: node.name };
	}
	return map;
});

const shouldShowTokenCountColumn = computed(() =>
	entries.value.some((entry) => getSubtreeTotalConsumedTokens(entry, true).totalTokens > 0),
);

const statusBanner = computed((): string => {
	const s = execution.value?.status;
	if (s === 'running' || s === 'new')
		return i18n.baseText('agentSessions.workflowLog.stillRunning');
	if (s === 'waiting') return i18n.baseText('agentSessions.workflowLog.waiting');
	return '';
});

function toggleExpanded(entry: LogEntry): void {
	expanded.value = { ...expanded.value, [entry.id]: !expanded.value[entry.id] };
}

function toggleSelected(entry: LogEntry): void {
	selected.value = selected.value?.id === entry.id ? null : entry;
}

const isTriggerSelected = computed((): boolean => {
	const node = selected.value?.node;
	if (!node) return false;
	const type = nodeTypesStore.getNodeType(node.type, node.typeVersion);
	return type?.group?.includes('trigger') ?? false;
});

// Non-null view of the selected entry; only read inside the `v-if="selected"` branch
// of the template. Helps vue-tsc's inferer pick the right LogEntry type when
// passing to child components — n8n-workflow's `Workflow` types deep-recurse and can
// trip up template type-narrowing of refs across module boundaries.
// vue-tsc can't reconcile the deeply-recursive `Workflow` / `WorkflowExpression`
// types across reactive ref boundaries; cast through `unknown` so the prop
// bindings to `RunData` line up.
const selectedWorkflow = computed(
	() => selected.value?.workflow as unknown as WorkflowObjectAccessors,
);

// Resolve the source-node binding for the input pane — for non-trigger nodes,
// `RunData`'s input mode walks back to the previous node's output, so we point
// at the source of the selected entry's first input. Mirrors the logic in
// `LogsViewRunData` (which we no longer use for these panes).
const inputBinding = computed(() => {
	const entry = selected.value;
	if (!entry) return null;
	const source = entry.runData?.source?.[0];
	if (!source) return null;
	const prevNode = entry.workflow.getNode(source.previousNode);
	if (!prevNode) return null;
	return {
		node: { ...prevNode, disabled: false },
		runIndex: source.previousNodeRun ?? 0,
		overrideOutputs: [source.previousNodeOutput ?? 0],
	};
});

// `runData.error` is typed as `ExecutionError` (the broad union), but at runtime
// errors raised by node executions are `NodeApiError`/`NodeOperationError`/
// `NodeError` — the shape `NodeErrorView` accepts. Cast to a permissive type
// for the prop binding; importing the concrete types brings deep workflow-type
// recursion that vue-tsc struggles with.
type NodeErrorViewError = InstanceType<typeof NodeErrorView>['$props']['error'];

const selectedError = computed((): NodeErrorViewError | null => {
	const err = selected.value?.runData?.error;
	if (!err || typeof err !== 'object') return null;
	return err as unknown as NodeErrorViewError;
});

// Snapshot of the workflowsStore's execution data before we hijack it on mount.
// We restore it on unmount so navigating back to the editor doesn't surprise the user.
let previousWorkflowExecutionData: typeof workflowsStore.workflowExecutionData | null = null;
let unmounted = false;

onMounted(async () => {
	previousWorkflowExecutionData = workflowsStore.workflowExecutionData;
	try {
		// RunData / NodeErrorView need node-type metadata to render properly — load
		// before fetching the execution so the panes are ready when data arrives.
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
		if (unmounted) return;
		const result = await executionsStore.fetchExecution(props.workflowExecutionId);
		// If the user closed the panel or selected another row while the fetch
		// was in flight, the unmount hook has already restored the previous
		// execution data — writing it now would clobber the real workflow state.
		if (unmounted) return;
		if (!result) {
			errorMessage.value = i18n.baseText('agentSessions.workflowLog.unavailable');
		} else {
			execution.value = result;
			// Populate the workflow execution data into the store. RunDataTable,
			// pairedItemMappings, and various NodeErrorView code paths read from the
			// store rather than the prop, so the prop alone isn't enough to make the
			// table/JSON views render correctly for non-trivial nodes.
			workflowState.setWorkflowExecutionData(result);
			// Default-select the first entry (the trigger) so the user sees data immediately.
			const first = flatEntries.value[0];
			if (first) selected.value = first;
		}
	} catch {
		if (unmounted) return;
		errorMessage.value = i18n.baseText('agentSessions.workflowLog.unavailable');
	} finally {
		if (!unmounted) loading.value = false;
	}
});

onBeforeUnmount(() => {
	unmounted = true;
	// Restore whatever execution data was in the store before we hijacked it.
	workflowState.setWorkflowExecutionData(previousWorkflowExecutionData);
});
</script>

<template>
	<div :class="$style.root">
		<div v-if="loading" :class="$style.loading">
			{{ i18n.baseText('agentSessions.workflowLog.loading') }}
		</div>
		<template v-else-if="errorMessage">
			<div :class="$style.errorBanner">{{ errorMessage }}</div>
		</template>
		<template v-else>
			<div v-if="statusBanner" :class="$style.banner">{{ statusBanner }}</div>
			<div :class="$style.rows">
				<LogsOverviewRow
					v-for="entry in flatEntries"
					:key="entry.id"
					data-test-id="log-node-row"
					:data="entry"
					:is-selected="selected?.id === entry.id"
					:is-read-only="true"
					:should-show-token-count-column="shouldShowTokenCountColumn"
					:is-compact="true"
					:latest-info="latestNodeInfo[entry.node.id]"
					:expanded="!!expanded[entry.id]"
					:can-open-ndv="false"
					@toggle-expanded="toggleExpanded(entry)"
					@toggle-selected="toggleSelected(entry)"
				/>
			</div>
			<div v-if="selected" :class="$style.detail">
				<div :class="$style.detailHeader">{{ selected.node.name }}</div>
				<div v-if="!isTriggerSelected && inputBinding" :class="$style.pane">
					<div :class="$style.paneTitle">
						{{ i18n.baseText('agentSessions.timeline.input') }}
					</div>
					<RunData
						:key="`input-${selected.id}`"
						:node="inputBinding.node"
						:run-index="inputBinding.runIndex"
						:override-outputs="inputBinding.overrideOutputs"
						:workflow-object="selectedWorkflow"
						:workflow-execution="selected.execution"
						pane-type="input"
						display-mode="schema"
						:disable-display-mode-selection="true"
						:disable-run-index-selection="true"
						:compact="true"
						:show-actions-on-hover="true"
						:disable-pin="true"
						:disable-edit="true"
						:disable-hover-highlight="true"
						:disable-settings-hint="true"
						:collapsing-table-column-name="null"
						table-header-bg-color="light"
						executing-message=""
						no-data-in-branch-message=""
					/>
				</div>
				<div :class="$style.pane">
					<div :class="$style.paneTitle">
						{{ i18n.baseText('agentSessions.timeline.output') }}
					</div>
					<div v-if="selectedError" :class="$style.errorPaneBody" data-test-id="node-error-card">
						<NodeErrorView :error="selectedError" :compact="true" show-details />
					</div>
					<RunData
						v-else
						:key="`output-${selected.id}`"
						:node="selected.node"
						:run-index="selected.runIndex"
						:workflow-object="selectedWorkflow"
						:workflow-execution="selected.execution"
						pane-type="output"
						display-mode="schema"
						:disable-display-mode-selection="true"
						:disable-run-index-selection="true"
						:compact="true"
						:show-actions-on-hover="true"
						:disable-pin="true"
						:disable-edit="true"
						:disable-hover-highlight="true"
						:disable-settings-hint="true"
						:collapsing-table-column-name="null"
						table-header-bg-color="light"
						executing-message=""
						no-data-in-branch-message=""
					/>
				</div>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.loading {
	padding: var(--spacing--sm);
	color: var(--color--text--tint-1);
}
.banner {
	background-color: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
}
.errorBanner {
	background-color: var(--color--danger--tint-4);
	color: var(--color--danger);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
}
.rows {
	display: flex;
	flex-direction: column;
}
.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) 0;
	border-top: var(--border);
}
.detailHeader {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}
.pane {
	display: flex;
	flex-direction: column;
	height: 280px;
	flex-shrink: 0;
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}
.paneTitle {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
	background-color: var(--color--foreground--tint-2);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	flex-shrink: 0;
}

/* RunData renders its actions (including the search icon) flush against the
   top of its container — add a little headroom so they don't sit right
   under the pane title. `flex: 1; min-height: 0` constrains RunData to the
   pane height so its internal `dataContainer` handles scrolling instead of
   the pane growing to fit potentially-huge schema trees. */
.pane > :not(.paneTitle):not(.errorPaneBody) {
	padding-top: var(--spacing--2xs);
	flex: 1;
	min-height: 0;
	overflow: hidden;
}

/* When the selected node has an error, NodeErrorView fills the output pane —
   this just gives it a scrollable body so a tall stack trace doesn't blow out
   the side panel. */
.errorPaneBody {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--xs);
}
.openButton {
	align-self: flex-start;
}
</style>
