<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import Modal from '@/app/components/Modal.vue';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useToast } from '@/app/composables/useToast';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { getWorkflow } from '@/app/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
import { N8nHeading, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import {
	AI_VENDOR_NODE_TYPES,
	NodeConnectionTypes,
	type INode,
	type INodeProperties,
	type INodeTypeDescription,
} from 'n8n-workflow';
import {
	INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES,
	SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
} from '@n8n/api-types';
import nodePopularity from 'virtual:node-popularity-data';

import AgentToolItem from './AgentToolItem.vue';
import WorkflowToolRow from './WorkflowToolRow.vue';

import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { AgentJsonToolRef, WorkflowToolRef } from '../types';
import { AGENT_TOOL_CONFIG_MODAL_KEY } from '../constants';
import {
	getExistingToolNames,
	nodeTypeToNewToolRef,
	toolRefToNode,
	workflowToNewToolRef,
} from '../composables/useAgentToolRefAdapter';
import { useAgentToolTelemetry } from '../composables/useAgentToolTelemetry';

const props = defineProps<{
	modalName: string;
	data: {
		tools: AgentJsonToolRef[];
		/** Optional — when present, the Available list will include workflows scoped to this project. */
		projectId?: string;
		/** Optional — tagged onto telemetry events for correlation with agent analytics. */
		agentId?: string;
		onConfirm: (tools: AgentJsonToolRef[]) => void;
	};
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const nodeHelpers = useNodeHelpers();
const uiStore = useUIStore();
const workflowsListStore = useWorkflowsListStore();
const rootStore = useRootStore();
const toast = useToast();
const toolTelemetry = useAgentToolTelemetry(props.data.agentId);

const nodePopularityMap = new Map(nodePopularity.map((node) => [node.id, node.popularity]));

interface WorkingToolEntry {
	localId: string;
	ref: AgentJsonToolRef;
}

function toWorkingToolEntries(
	tools: AgentJsonToolRef[],
	existingEntries: WorkingToolEntry[] = [],
): WorkingToolEntry[] {
	return tools.map((ref, index) => ({
		localId: existingEntries[index]?.localId ?? uuidv4(),
		ref,
	}));
}

// Local working copy — all edits go here; saved to config via onConfirm.
const workingToolEntries = ref<WorkingToolEntry[]>(toWorkingToolEntries(props.data.tools));
watch(
	() => props.data.tools,
	(tools) => {
		workingToolEntries.value = toWorkingToolEntries(tools, workingToolEntries.value);
	},
);

const workingTools = computed(() => workingToolEntries.value.map(({ ref }) => ref));

const searchQuery = ref('');
const debouncedSearchQuery = ref('');
const setDebouncedSearch = useDebounceFn((value: string) => {
	debouncedSearchQuery.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
watch(searchQuery, (value) => {
	void setDebouncedSearch(value);
});

// --- Helpers ----------------------------------------------------------------

function hasInputs(nodeType: INodeTypeDescription): boolean {
	const { inputs } = nodeType;
	if (Array.isArray(inputs)) return inputs.length > 0;
	// Expression-based inputs are considered non-empty.
	return true;
}

function hasRequiredCredentials(nodeType: INodeTypeDescription): boolean {
	return (nodeType.credentials ?? []).some((credential) => credential.required !== false);
}

function isConfigurableParameter(parameter: INodeProperties): boolean {
	return parameter.type !== 'notice' && parameter.type !== 'hidden';
}

function needsSetup(nodeType: INodeTypeDescription): boolean {
	return (
		hasRequiredCredentials(nodeType) || (nodeType.properties ?? []).some(isConfigurableParameter)
	);
}

function makeUniqueName(baseName: string, existingNames: string[]): string {
	if (!existingNames.includes(baseName)) return baseName;
	let counter = 1;
	while (existingNames.includes(`${baseName} (${counter})`)) {
		counter++;
	}
	return `${baseName} (${counter})`;
}

const agentProviderNodeTypes = new Set<string>(AI_VENDOR_NODE_TYPES);

function isAgentProviderNodeType(nodeType: INodeTypeDescription): boolean {
	return agentProviderNodeTypes.has(nodeType.name);
}

/**
 * Node types eligible to appear in "Available tools": anything the node types
 * store exposes as outputting an AI Tool connection, plus provider nodes the
 * agent builder/runtime can execute directly. Nodes that also take inputs are
 * excluded (subagents — not simple tools), except for provider nodes whose
 * dynamic inputs are optional runtime affordances.
 */
const availableToolTypes = computed<INodeTypeDescription[]>(() => {
	const names = new Set([
		...(nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames[NodeConnectionTypes.AiTool] ??
			[]),
		...AI_VENDOR_NODE_TYPES,
	]);

	return [...names]
		.map((name) => nodeTypesStore.getNodeType(name))
		.filter(
			(nt): nt is INodeTypeDescription =>
				nt !== null && !nt.hidden && (isAgentProviderNodeType(nt) || !hasInputs(nt)),
		)
		.sort((a, b) => {
			const popA = nodePopularityMap.get(a.name) ?? 0;
			const popB = nodePopularityMap.get(b.name) ?? 0;
			return popB - popA;
		});
});

// --- Workflow catalog -------------------------------------------------------

/**
 * Fetched workflows kept **local** to this modal instance — we deliberately
 * do NOT write into `useWorkflowsListStore`'s `workflowsById` cache. That
 * store is shared with the Workflows list page, project pages, etc., and
 * calling `setWorkflows` here would clobber whatever they've cached until
 * they re-fetch. `searchWorkflows` is used for its network-only side
 * (network request + return) — it doesn't mutate the store, which is exactly
 * why it's safe here.
 */
const projectWorkflows = ref<IWorkflowDb[]>([]);

onMounted(async () => {
	// Fetch on open so the Available list populates with project-scoped workflows.
	// Pre-filter by supported trigger types so users can't pick a workflow that
	// would fail backend compatibility validation on save. Failures are
	// non-fatal: the Available list just stays workflow-free.
	try {
		projectWorkflows.value = await workflowsListStore.searchWorkflows({
			projectId: props.data.projectId,
			triggerNodeTypes: [...SUPPORTED_WORKFLOW_TOOL_TRIGGERS],
		});
	} catch (error) {
		// Non-fatal — render without the Workflows section. Log so a flaky fetch
		// doesn't masquerade as "no workflows available".
		console.warn('[AgentToolsModal] failed to load workflows for project', error);
	}
});

/**
 * Workflows eligible to appear in "Workflows (N)": non-archived workflows with
 * a supported trigger (pre-filtered by the server via `triggerNodeTypes`).
 * Already-connected workflows remain listed — users can add the same workflow
 * twice with different descriptions / input schemas. Body-node incompatibility
 * (Wait / RespondToWebhook) is enforced on Connect-click via
 * `handleAddWorkflow`, and again on save in
 * `workflow-tool-factory.ts:validateCompatibility`.
 */
const availableWorkflows = computed<IWorkflowDb[]>(() =>
	projectWorkflows.value.filter((wf) => !wf.isArchived),
);

/** Configured tools annotated with their node-type description (for the icon + fallback name). */
interface ConfiguredToolView {
	localId: string;
	ref: AgentJsonToolRef;
	node: INode;
	nodeType: INodeTypeDescription;
	missingCredentials: boolean;
}

const configuredTools = computed<ConfiguredToolView[]>(() => {
	const out: ConfiguredToolView[] = [];
	for (const { localId, ref } of workingToolEntries.value) {
		if (ref.type !== 'node') continue;
		const node = toolRefToNode(ref);
		if (!node) continue;
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) continue;
		// Reuse the canvas credential validator so `displayOptions`-gated creds,
		// proxy auth (`nodeCredentialType`), and gateway-managed creds are
		// treated identically to how the workflow editor paints its red border.
		const issues = nodeHelpers.getNodeCredentialIssues(node as INodeUi, nodeType);
		out.push({
			localId,
			ref,
			node,
			nodeType,
			missingCredentials: !!issues?.credentials && Object.keys(issues.credentials).length > 0,
		});
	}
	return out;
});

/** Connected workflow tools — mirrors `configuredTools` for the Connected section. */
interface ConfiguredWorkflowView {
	localId: string;
	ref: AgentJsonToolRef;
	name: string;
	description?: string;
}

interface WorkingWorkflowEntry extends WorkingToolEntry {
	ref: WorkflowToolRef;
}

const configuredWorkflows = computed<ConfiguredWorkflowView[]>(() =>
	workingToolEntries.value
		.filter((entry): entry is WorkingWorkflowEntry => entry.ref.type === 'workflow')
		.map(({ localId, ref }) => ({
			localId,
			ref,
			name: ref.name ?? (ref.workflow as string),
			description: ref.description,
		})),
);

// --- Search filtering -------------------------------------------------------

const filteredConfiguredTools = computed(() => {
	if (!debouncedSearchQuery.value) return configuredTools.value;
	const query = debouncedSearchQuery.value.toLowerCase();
	return configuredTools.value.filter(
		(t) =>
			t.node.name.toLowerCase().includes(query) ||
			t.nodeType.displayName.toLowerCase().includes(query),
	);
});

const filteredConfiguredWorkflows = computed(() => {
	if (!debouncedSearchQuery.value) return configuredWorkflows.value;
	const query = debouncedSearchQuery.value.toLowerCase();
	return configuredWorkflows.value.filter(
		(w) =>
			w.name.toLowerCase().includes(query) || (w.description ?? '').toLowerCase().includes(query),
	);
});

const filteredAvailableTools = computed(() => {
	// Duplicates allowed: already-connected node types stay listed so users can
	// add a 2nd Slack / Gmail / etc. with a different name + config. The config
	// modal enforces tool-name uniqueness via `existingToolNames`.
	if (!debouncedSearchQuery.value) return availableToolTypes.value;
	const query = debouncedSearchQuery.value.toLowerCase();
	return availableToolTypes.value.filter(
		(nt) =>
			nt.displayName.toLowerCase().includes(query) || nt.description?.toLowerCase().includes(query),
	);
});

const filteredAvailableWorkflows = computed(() => {
	if (!debouncedSearchQuery.value) return availableWorkflows.value;
	const query = debouncedSearchQuery.value.toLowerCase();
	return availableWorkflows.value.filter(
		(wf) =>
			wf.name.toLowerCase().includes(query) || (wf.description ?? '').toLowerCase().includes(query),
	);
});

// --- Actions ---------------------------------------------------------------

function addToolRef(savedRef: AgentJsonToolRef) {
	workingToolEntries.value = [...workingToolEntries.value, { localId: uuidv4(), ref: savedRef }];
	toolTelemetry.trackAdded(savedRef);
	commit();
	uiStore.closeModal(props.modalName);
	toast.showMessage({
		title: i18n.baseText('agents.tools.added'),
		type: 'success',
	});
}

function openConfigForNewRef(newRef: AgentJsonToolRef) {
	// Connect → open the config panel first. The ref only enters workingTools
	// once the user hits Save, so a cancelled config leaves the list untouched.
	uiStore.openModalWithData({
		name: AGENT_TOOL_CONFIG_MODAL_KEY,
		data: {
			toolRef: newRef,
			existingToolNames: getExistingToolNames(workingTools.value),
			onConfirm: (savedRef: AgentJsonToolRef) => {
				addToolRef(savedRef);
			},
		},
	});
}

function handleAddTool(nodeType: INodeTypeDescription) {
	toolTelemetry.trackAddStarted('node');
	const newRef = nodeTypeToNewToolRef(nodeType);

	if (needsSetup(nodeType)) {
		openConfigForNewRef(newRef);
		return;
	}

	addToolRef({
		...newRef,
		name: makeUniqueName(
			newRef.name ?? nodeType.displayName,
			getExistingToolNames(workingTools.value),
		),
	});
}

async function handleAddWorkflow(workflow: IWorkflowDb) {
	toolTelemetry.trackAddStarted('workflow');

	// Pre-check on Connect click: the list API omits `nodes`, so body-node
	// incompatibility (Wait / RespondToWebhook / Form) can only be detected
	// after fetching the full workflow. We hit `GET /workflows/:id` directly
	// (instead of `workflowsListStore.fetchWorkflow`, which would re-enter the
	// global store cache) so this modal stays side-effect-free.
	let full: IWorkflowDb;
	try {
		full = await getWorkflow(rootStore.restApiContext, workflow.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.tools.workflow.fetchFailed.title'), {
			message: i18n.baseText('agents.tools.workflow.fetchFailed.message'),
		});
		return;
	}

	const incompatible = (full.nodes ?? []).filter((n) =>
		(INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES as readonly string[]).includes(n.type),
	);
	if (incompatible.length > 0) {
		const nodeNames = incompatible.map((n) => n.name).join(', ');
		toast.showError(
			new Error(
				i18n.baseText('agents.tools.workflow.incompatible.message', {
					interpolate: { name: workflow.name, nodes: nodeNames },
				}),
			),
			i18n.baseText('agents.tools.workflow.incompatible.title'),
		);
		return;
	}

	openConfigForNewRef(workflowToNewToolRef(workflow));
}

function handleConfigureTool(tool: ConfiguredToolView | ConfiguredWorkflowView) {
	const toolRef = tool.ref;
	// Node name collision check feeds the shared form's uniqueness logic.
	uiStore.openModalWithData({
		name: AGENT_TOOL_CONFIG_MODAL_KEY,
		data: {
			toolRef,
			existingToolNames: getExistingToolNames(workingTools.value, toolRef),
			onConfirm: (updatedRef: AgentJsonToolRef) => {
				workingToolEntries.value = workingToolEntries.value.map((entry) =>
					entry.localId === tool.localId ? { ...entry, ref: updatedRef } : entry,
				);
				toolTelemetry.trackEdited(updatedRef);
				commit();
			},
		},
	});
}

function commit() {
	props.data.onConfirm(workingTools.value);
}
</script>

<template>
	<Modal
		:name="modalName"
		width="880px"
		:custom-class="$style.modal"
		data-test-id="agent-tools-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('agents.tools.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<N8nInput
				v-model="searchQuery"
				:placeholder="i18n.baseText('agents.tools.search.placeholder')"
				clearable
				data-test-id="agent-tools-search"
				:class="$style.searchInput"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>

			<div :class="$style.listWrapper" data-test-id="agent-tools-list">
				<div
					v-if="filteredConfiguredTools.length + filteredConfiguredWorkflows.length > 0"
					:class="$style.section"
				>
					<div :class="$style.toolsList" data-test-id="agent-tools-connected-list">
						<AgentToolItem
							v-for="tool in filteredConfiguredTools"
							:key="tool.localId"
							:node-type="tool.nodeType"
							:configured-node="tool.node"
							:missing-credentials="tool.missingCredentials"
							mode="configured"
							:class="$style.toolsListItem"
							@configure="handleConfigureTool(tool)"
						/>
						<WorkflowToolRow
							v-for="wf in filteredConfiguredWorkflows"
							:key="wf.localId"
							mode="configured"
							:name="wf.name"
							:description="wf.description"
							row-test-id="agent-tools-connected-workflow-row"
							configure-test-id="agent-tools-connected-workflow-configure"
							@configure="handleConfigureTool(wf)"
						/>
					</div>
				</div>

				<div v-if="filteredAvailableTools.length > 0" :class="$style.section">
					<N8nHeading size="small" color="text-light" tag="h3">
						{{
							i18n.baseText('agents.tools.availableTools', {
								interpolate: { count: filteredAvailableTools.length },
							})
						}}
					</N8nHeading>
					<div :class="$style.toolsList" data-test-id="agent-tools-available-list">
						<AgentToolItem
							v-for="nodeType in filteredAvailableTools"
							:key="nodeType.name"
							:node-type="nodeType"
							mode="available"
							@add="handleAddTool(nodeType)"
							:class="$style.toolsListItem"
						/>
					</div>
				</div>

				<div v-if="filteredAvailableWorkflows.length > 0" :class="$style.section">
					<N8nHeading size="small" color="text-light" tag="h3">
						{{
							i18n.baseText('agents.tools.availableWorkflows', {
								interpolate: { count: filteredAvailableWorkflows.length },
							})
						}}
					</N8nHeading>
					<div :class="$style.toolsList" data-test-id="agent-tools-available-workflows-list">
						<WorkflowToolRow
							v-for="workflow in filteredAvailableWorkflows"
							:key="workflow.id"
							mode="available"
							:name="workflow.name"
							:description="workflow.description"
							row-test-id="agent-tools-available-workflow-row"
							@add="handleAddWorkflow(workflow)"
						/>
					</div>
				</div>

				<div
					v-if="
						filteredConfiguredTools.length === 0 &&
						filteredConfiguredWorkflows.length === 0 &&
						filteredAvailableTools.length === 0 &&
						filteredAvailableWorkflows.length === 0
					"
					:class="$style.emptyState"
					data-test-id="agent-tools-empty-state"
				>
					<N8nText color="text-light">
						{{
							debouncedSearchQuery
								? i18n.baseText('agents.tools.noResults.withQuery', {
										interpolate: { query: debouncedSearchQuery },
									})
								: i18n.baseText('agents.tools.noResults')
						}}
					</N8nText>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.modal {
	:global(.ndv-connection-hint-notice) {
		display: none;
	}
}

.searchInput {
	padding: var(--spacing--sm) 0;
	width: 100%;
}

.listWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: 60vh;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	margin-right: calc(-1 * var(--spacing--lg));
	padding-right: var(--spacing--lg);
	padding-top: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toolsList {
	display: flex;
	flex-direction: column;
}

.toolsListItem {
	padding-block: var(--spacing--sm);
}

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
}
</style>
